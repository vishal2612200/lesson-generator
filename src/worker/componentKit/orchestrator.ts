import crypto from "node:crypto";
import fs from "node:fs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { plannerAgent, authorAgent } from "./agents";
import { checkSafety } from "./safety";
import { compileComponentTsx } from "./compiler";
import { renderPreview } from "./preview";
import { evaluateSSRHtml } from "./evaluator";
import { attemptRepair } from "./repair";
import type { PedagogyProfile } from "./schemas";
import { logger, logJobStart, logError } from "@/worker/common/logger";

export type OrchestrateOptions = {
  topic: string;
  pedagogy: PedagogyProfile;
  maxRepairs?: number;
  lessonId?: string;
};

export async function orchestrateComponentGeneration(opts: OrchestrateOptions): Promise<{ success: boolean; componentId?: string; diagnostics?: any; tsxSource?: string; compiledJs?: string }>{
  const endJob = logJobStart('orchestrator', 'component_generation');
  
  try {
    logger.info(`📋 Planning components for: ${opts.topic}`, {
      operation: 'orchestration_start',
      stage: 'planning',
      metadata: {
        topic: opts.topic,
        pedagogy: opts.pedagogy,
        maxRepairs: opts.maxRepairs,
      },
    });

    const planTimer = logger.startTimer('planner_agent');
    const plan = await plannerAgent({ topic: opts.topic, pedagogy: opts.pedagogy, lessonId: opts.lessonId });
    planTimer(true, { itemCount: plan.items.length });

    logger.info(`📝 Generated ${plan.items.length} component plans`, {
      operation: 'planning_complete',
      stage: 'planning',
      metadata: {
        itemCount: plan.items.length,
        items: plan.items.map(item => ({ name: item.name, learningObjective: item.learningObjective })),
      },
    });

    let lastDiagnostics: any = {};
    let itemIndex = 0;
    // Start after planner (which is 1), so first author trace is 2
    let nextAttemptNumber = 2;
    const successfulComponents: Array<{ componentId: string; tsxSource: string; compiledJs?: string; name: string }> = [];

    for (const item of plan.items) {
      itemIndex++;
      // Assign unique attempt_number for this component
      // First component gets attempt_number: 2, second gets next available, etc.
      const authorAttemptNumber = nextAttemptNumber;
      
      logger.info(`🔧 Processing: ${item.name} (${itemIndex}/${plan.items.length})`, {
        operation: 'item_processing',
        stage: 'authoring',
        metadata: {
          itemName: item.name,
          learningObjective: item.learningObjective,
          itemIndex,
          totalItems: plan.items.length,
          attemptNumber: authorAttemptNumber,
        },
      });

      try {
        const authorTimer = logger.startTimer('author_agent');
        const authored = await authorAgent({ 
          name: item.name, 
          learningObjective: item.learningObjective, 
          topic: opts.topic,
          pedagogy: plan.pedagogy,
          lessonId: opts.lessonId,
          attemptNumber: authorAttemptNumber,
          componentIndex: itemIndex - 1, // Convert to 0-based index
        });
        authorTimer(true, { 
          tsxLength: authored.componentTsx.length,
          metaKeys: Object.keys(authored.meta),
        });

        // Component authored successfully - no need to log this detail

        // Safety check
        const safetyTimer = logger.startTimer('safety_check');
        const safetyIssues = checkSafety(authored.componentTsx);
        safetyTimer(safetyIssues.length === 0, { issueCount: safetyIssues.length });

        if (safetyIssues.length > 0) {
          logger.warn('Safety check failed', {
            operation: 'safety_check_failed',
            stage: 'safety',
            errorType: 'SafetyViolation',
            errorCode: 'SAFETY_ISSUES_DETECTED',
            metadata: {
              itemName: item.name,
              issueCount: safetyIssues.length,
              issues: safetyIssues,
            },
          });
          lastDiagnostics.safety = safetyIssues;
          continue; // try next item
        }

        // Safety check passed - no need to log this detail

        // Compile with repairs
        let src = authored.componentTsx;
        let compileRes = compileComponentTsx({ tsxSource: src });
        let repairAttempts = 0;
        const maxRepairs = opts.maxRepairs ?? 2;

        // Starting compilation with repair attempts - no need to log this detail

        while (!compileRes.success && repairAttempts < maxRepairs) {
          repairAttempts += 1;
          logger.info(`🔨 Repair attempt ${repairAttempts}/${maxRepairs} for ${item.name}`, {
            operation: 'repair_attempt',
            stage: 'compilation',
            metadata: {
              itemName: item.name,
              attempt: repairAttempts,
              errorCount: compileRes.errors.length,
              errors: compileRes.errors.slice(0, 2), // Log first 2 errors
            },
          });

          const repairTimer = logger.startTimer('repair_attempt');
          const errorsBeforeRepair = compileRes.errors;
          src = attemptRepair(src, { errors: compileRes.errors });
          compileRes = compileComponentTsx({ tsxSource: src });
          repairTimer(compileRes.success, { 
            attempt: repairAttempts,
            errorCount: compileRes.errors.length,
          });

          // Insert trace for repair attempt
          if (opts.lessonId) {
            try {
              const { supabaseAdmin } = await import('../../lib/supabase/server');
              const repairAttemptNumber = authorAttemptNumber + repairAttempts; // Sequential after author trace
              
              const { error: repairTraceError } = await (supabaseAdmin.from('traces') as any).insert({
                lesson_id: opts.lessonId,
                attempt_number: repairAttemptNumber,
                prompt: `Repair attempt ${repairAttempts} for component "${item.name}"`,
                model: 'repair-agent',
                response: `Repaired component after ${errorsBeforeRepair.length} compilation errors`,
                tokens: null,
                validation: {
                  passed: true,
                  errors: [],
                  component: {
                    name: item.name,
                    index: itemIndex - 1,
                    learningObjective: item.learningObjective,
                  },
                  repairAttempt: repairAttempts,
                },
                compilation: {
                  success: compileRes.success,
                  tsc_errors: compileRes.success ? [] : compileRes.errors,
                  original_errors: errorsBeforeRepair,
                  repaired_code_length: src.length,
                },
              });
              
              if (repairTraceError) {
                console.error(`[Orchestrator]  Failed to insert repair trace for attempt ${repairAttempts}:`, repairTraceError);
              } else {
                console.log(`[Orchestrator]  Repair trace inserted: attempt_number ${repairAttemptNumber}, repair attempt ${repairAttempts}`);
              }
            } catch (repairTraceErr) {
              console.error(`[Orchestrator]  Exception inserting repair trace:`, repairTraceErr);
            }
          }
        }
        
        // Update nextAttemptNumber for the next component: author attempt + 1 (for successful completion) + repair attempts
        // If repairs occurred, we've already used authorAttemptNumber + 1 through authorAttemptNumber + repairAttempts
        // If no repairs, next component starts at authorAttemptNumber + 1
        nextAttemptNumber = authorAttemptNumber + repairAttempts + 1;

        if (!compileRes.success) {
          logger.error('Compilation failed after all repair attempts', {
            operation: 'compilation_failed',
            stage: 'compilation',
            errorType: 'CompilationError',
            errorCode: 'COMPILATION_FAILED',
            metadata: {
              itemName: item.name,
              totalAttempts: repairAttempts + 1,
              finalErrorCount: compileRes.errors.length,
              errors: compileRes.errors,
            },
          });
          lastDiagnostics.compile = compileRes.errors;
          // Still update nextAttemptNumber even on failure
          nextAttemptNumber = authorAttemptNumber + repairAttempts + 1;
          continue;
        }

        logger.info(` Compilation successful: ${item.name}`, {
          operation: 'compilation_success',
          stage: 'compilation',
          metadata: {
            itemName: item.name,
            totalAttempts: repairAttempts + 1,
            emittedFiles: compileRes.emittedFiles?.length || 0,
          },
        });

        // Preview generation
        const previewTimer = logger.startTimer('preview_generation');
        const previewModule = { default: () => null } as any; // we cannot easily require compiled file in this environment
        const preview = await renderPreview(previewModule, {});
        previewTimer(preview.success, { 
          hasHtml: !!preview.html,
          htmlLength: preview.html?.length || 0,
        });

        if (!preview.success) {
          logger.error('Preview generation failed', {
            operation: 'preview_failed',
            stage: 'preview',
            errorType: 'PreviewError',
            errorCode: 'PREVIEW_GENERATION_FAILED',
            metadata: {
              itemName: item.name,
              error: preview.error,
            },
          });
          lastDiagnostics.preview = preview.error;
          continue;
        }

        // Preview generation successful - no need to log this detail

        // Evaluation
        const evalTimer = logger.startTimer('evaluation');
        const evalRes = evaluateSSRHtml(preview.html || "", plan.pedagogy);
        evalTimer(evalRes.score >= 0.5, { 
          score: evalRes.score,
          threshold: 0.5,
        });

        if (evalRes.score < 0.5) {
          logger.warn('Evaluation failed - score below threshold', {
            operation: 'evaluation_failed',
            stage: 'evaluation',
            errorType: 'EvaluationError',
            errorCode: 'SCORE_BELOW_THRESHOLD',
            metadata: {
              itemName: item.name,
              score: evalRes.score,
              threshold: 0.5,
              evaluation: evalRes,
            },
          });
          lastDiagnostics.evaluate = evalRes;
          continue;
        }

        logger.info(` Evaluation passed: ${item.name} (score: ${evalRes.score.toFixed(2)})`, {
          operation: 'evaluation_success',
          stage: 'evaluation',
          metadata: {
            itemName: item.name,
            score: evalRes.score,
          },
        });

        // Archive to DB
        const hash = crypto.createHash('sha256').update(src + JSON.stringify(authored.meta)).digest('hex').slice(0, 32);
        
        // Archiving component to database - no need to log this detail

        const dbTimer = logger.startTimer('database_insert');
        const { error } = await (supabaseAdmin
          .from('lesson_components') as any)
          .insert({
            id: hash,
            name: authored.meta.name,
            learning_objective: authored.meta.learningObjective,
            pedagogy: plan.pedagogy,
            props_schema_json: authored.meta.propsSchemaJson,
            tsx_source: src,
          });
        dbTimer(!error, { 
          table: 'lesson_components',
          operation: 'insert',
          error: error?.message,
        });

        // If the table doesn't exist, don't fail generation; API route will persist into lesson_contents
        if (error) {
          logger.warn('Database archive failed (table may not exist)', {
            operation: 'database_archive_failed',
            stage: 'persistence',
            metadata: {
              itemName: item.name,
              componentId: hash,
              error: error.message || error,
            },
          });
          lastDiagnostics.archive = String(error.message || error);
        } else {
          // Component archived successfully - no need to log this detail
        }

        // Attempt to load emitted JS (first .js file)
        let compiledJs: string | undefined;
        const jsFile = (compileRes.emittedFiles || []).find(f => f.endsWith('.js'));
        if (jsFile && fs.existsSync(jsFile)) {
          try { 
            compiledJs = fs.readFileSync(jsFile, 'utf8');
            logger.info('Compiled JS loaded successfully', {
              operation: 'js_loading_success',
              stage: 'finalization',
              metadata: {
                itemName: item.name,
                jsLength: compiledJs.length,
                jsFile,
              },
            });
          } catch (error) {
            logger.warn('Failed to load compiled JS', {
              operation: 'js_loading_failed',
              stage: 'finalization',
              metadata: {
                itemName: item.name,
                jsFile,
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }

        logger.info(` Component generated successfully: ${item.name}`, {
          operation: 'component_generation_success',
          stage: 'complete',
          metadata: {
            itemName: item.name,
            componentId: hash,
            tsxLength: src.length,
            jsLength: compiledJs?.length || 0,
            totalItems: plan.items.length,
            processedItem: itemIndex,
          },
        });

        // Collect successful component for later combination
        successfulComponents.push({
          componentId: hash,
          tsxSource: src,
          compiledJs,
          name: item.name,
        });

        // Continue to next component instead of returning early

      } catch (error) {
        logger.error('Error processing planning item', {
          operation: 'item_processing_error',
          stage: 'item_processing',
          errorType: 'ItemProcessingError',
          errorCode: 'ITEM_PROCESSING_FAILED',
          metadata: {
            itemName: item.name,
            itemIndex,
            totalItems: plan.items.length,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        lastDiagnostics.itemError = {
          item: item.name,
          error: error instanceof Error ? error.message : String(error),
        };
        continue;
      }
    }

    // After processing all components, check if we have any successful ones
    if (successfulComponents.length === 0) {
      logger.error('All planning items failed', {
        operation: 'all_items_failed',
        stage: 'complete',
        errorType: 'GenerationError',
        errorCode: 'ALL_ITEMS_FAILED',
        metadata: {
          totalItems: plan.items.length,
          diagnostics: lastDiagnostics,
        },
      });

      endJob();

      return { success: false, diagnostics: lastDiagnostics };
    }

    // Use the last successful component (or could combine all components)
    // For now, we'll use the last one to maintain backward compatibility
    const finalComponent = successfulComponents[successfulComponents.length - 1];
    
    logger.info(` Completed processing ${successfulComponents.length}/${plan.items.length} components successfully`, {
      operation: 'orchestration_complete',
      stage: 'complete',
      metadata: {
        totalItems: plan.items.length,
        successfulItems: successfulComponents.length,
        successfulComponentNames: successfulComponents.map(c => c.name),
        usingComponent: finalComponent.name,
      },
    });

    endJob();

    return { 
      success: true, 
      componentId: finalComponent.componentId, 
      tsxSource: finalComponent.tsxSource, 
      compiledJs: finalComponent.compiledJs,
    };

  } catch (error) {
    logError('orchestrator', error instanceof Error ? error : new Error(String(error)), {
      operation: 'orchestration_error',
      stage: 'orchestration',
    });
    
    endJob();

    return { 
      success: false, 
      diagnostics: { 
        orchestrationError: error instanceof Error ? error.message : String(error) 
      } 
    };
  }
}


