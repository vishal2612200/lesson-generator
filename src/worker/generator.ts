import { supabaseAdmin } from '@/lib/supabase/server'
import { scanForForbiddenTokens } from './security'
import { callLLM } from './llm'
import { compileTypeScript } from './compiler'
import { COMPONENT_GENERATION_PROMPT, COMPONENT_FIX_PROMPT } from './componentPrompt'
import { PRIMARY_PROMPT, FIX_LOOP_PROMPT } from './prompts'
import { validateLessonContent, extractLessonData } from './contentValidator'

// Component-based generation (removes token limits, enables unlimited creativity)
// Force-disable legacy in-generator component emission; use new components pipeline instead
const USE_COMPONENT_GENERATION = false

const MAX_ATTEMPTS = 5

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

import { logger, logJobStart, logError } from './logger';

// Legacy logJob function for backward compatibility - now uses enhanced logger
function logJob(lessonId: string, level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
  const context = {
    lessonId,
    operation: 'legacy_log',
    stage: 'generation',
    metadata: meta,
  };

  switch (level) {
    case 'error':
      logger.error(message, context);
      break;
    case 'warn':
      logger.warn(message, context);
      break;
    default:
      logger.info(message, context);
  }
}

export async function generateLesson(lessonId: string): Promise<void> {
  const endJob = logJobStart(lessonId, 'legacy_generation');
  
  try {
    logger.info('Starting legacy lesson generation', {
      operation: 'legacy_generation_start',
      stage: 'generation',
      metadata: { lessonId },
    });

    const { data: lesson } = await (supabaseAdmin
      .from('lessons') as any)
      .select('*')
      .eq('id', lessonId)
      .single()

    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`)
    }

    logger.info('Lesson found, starting generation', {
      operation: 'lesson_found',
      stage: 'generation',
      metadata: {
        lessonId,
        status: lesson.status,
        title: lesson.title,
        outline: lesson.outline?.substring(0, 100) + '...',
      },
    });

    // Update status to generating
    const { error: updateError } = await (supabaseAdmin
      .from('lessons') as any)
      .update({ status: 'generating' })
      .eq('id', lessonId);

    if (updateError) {
      logger.error('Failed to update lesson status to generating', {
        operation: 'status_update_failed',
        stage: 'generation',
        errorType: 'DatabaseError',
        errorCode: 'STATUS_UPDATE_FAILED',
        metadata: {
          lessonId,
          error: updateError.message || updateError,
        },
      });
      throw new Error(`Failed to update lesson status: ${updateError.message || updateError}`);
    }

    logger.info('Lesson status updated to generating', {
      operation: 'status_updated',
      stage: 'generation',
      metadata: { lessonId },
    });

    let attemptNumber = 0
    let lastSource = ''
    let lastErrors = ''

  while (attemptNumber < MAX_ATTEMPTS) {
    attemptNumber++

    const { data: attempt } = await (supabaseAdmin
      .from('generation_attempts') as any)
      .insert({
        lesson_id: lessonId,
        attempt_number: attemptNumber,
        status: 'in_progress',
      })
      .select()
      .single()

    try {
      // Select prompt based on generation mode
      const basePrompt = USE_COMPONENT_GENERATION 
        ? COMPONENT_GENERATION_PROMPT
        : PRIMARY_PROMPT
      
      const fixPrompt = USE_COMPONENT_GENERATION ? COMPONENT_FIX_PROMPT : FIX_LOOP_PROMPT
      
      const prompt =
        attemptNumber === 1
          ? basePrompt.replace('{{OUTLINE}}', lesson.outline)
          : fixPrompt.replace('{{CODE}}', lastSource).replace(
              '{{ERRORS}}',
              lastErrors
            )

      const model = process.env.MODEL_NAME || 'gpt-4'
      const llmResponse = await callLLM(prompt, model)
      logJob(lessonId, 'info', `LLM response (attempt ${attemptNumber})`, { model, tokens: llmResponse.tokens })

      const securityCheck = scanForForbiddenTokens(llmResponse.content)

      if (!securityCheck.passed) {
        logJob(lessonId, 'warn', 'Security check failed', { forbidden: securityCheck.forbiddenTokens })
        
        try {
          const { error: traceError } = await (supabaseAdmin.from('traces') as any).insert({
            lesson_id: lessonId,
            attempt_number: attemptNumber,
            prompt,
            model,
            response: llmResponse.content,
            tokens: llmResponse.tokens,
            validation: {
              passed: false,
              forbidden_tokens: securityCheck.forbiddenTokens,
            },
            compilation: {
              success: false,
            },
          })
          
          if (traceError) {
            console.error('[Generator] Failed to insert security failure trace:', traceError)
          } else {
            console.log('[Generator] Security failure trace inserted successfully')
          }
        } catch (traceErr) {
          console.error('[Generator] Exception inserting security failure trace:', traceErr)
        }

        throw new Error(
          `Security check failed: forbidden tokens found: ${securityCheck.forbiddenTokens.join(', ')}`
        )
      }
      console.log('LLM Response:', llmResponse.content)
      const typeScriptSource = extractTypeScriptCode(llmResponse.content)
      logJob(lessonId, 'info', 'TypeScript extracted', { length: typeScriptSource.length })
      
      // Validate component for external imports
      const validation = validateComponent(typeScriptSource)
      if (!validation.isValid) {
        logJob(lessonId, 'warn', 'Component validation failed', { errors: validation.errors })
        lastErrors = `Component uses external imports: ${validation.errors.join(', ')}`
        throw new Error(lastErrors)
      }
      
      // Sanitize generated component to avoid common TSX pitfalls
      const sanitizedSource = sanitizeComponent(typeScriptSource)
      const BYTE_LIMIT = Number(process.env.GENERATED_CODE_MAX_BYTES) || 200 * 1024
      if (Buffer.from(sanitizedSource, 'utf8').length > BYTE_LIMIT) {
        lastErrors = `Generated code exceeds byte limit (${BYTE_LIMIT} bytes).`
        console.warn('[Generator] Byte limit exceeded for lesson', lessonId)
        throw new Error(lastErrors)
      }
      lastSource = sanitizedSource

      const compilationResult = await compileTypeScript(sanitizedSource)
      logJob(lessonId, 'info', 'Compilation result', {
        success: compilationResult.success,
        tscErrors: compilationResult.tscErrors?.length || 0,
        esbuildErrors: compilationResult.esbuildErrors?.length || 0
      })
      lastErrors = compilationResult.tscErrors.join('\n')

      // Insert trace with error handling
      try {
        const traceData = {
          lesson_id: lessonId,
          attempt_number: attemptNumber,
          prompt,
          model,
          response: llmResponse.content,
          tokens: llmResponse.tokens,
          validation: {
            passed: true,
            errors: [],
            forbidden_tokens: [],
          },
          compilation: {
            success: compilationResult.success,
            tsc_errors: compilationResult.tscErrors,
            esbuild_errors: compilationResult.esbuildErrors,
          },
        }
        
        console.log(`[Generator] Inserting trace for attempt ${attemptNumber}...`)
        const { data: insertedTrace, error: traceError } = await (supabaseAdmin.from('traces') as any).insert(traceData).select()
        
        if (traceError) {
          console.error('[Generator] ❌ Failed to insert trace:', traceError)
          console.error('[Generator] Trace data was:', JSON.stringify(traceData, null, 2))
        } else {
          console.log(`[Generator] ✅ Trace inserted successfully:`, insertedTrace?.[0]?.id)
        }
      } catch (traceErr) {
        console.error('[Generator] ❌ Exception inserting trace:', traceErr)
      }

      if (compilationResult.success) {
        // Validate content quality
        const lessonData = extractLessonData(typeScriptSource)
        const contentValidation = lessonData ? validateLessonContent(lessonData, lesson.outline) : null
        if (contentValidation) {
          logJob(lessonId, 'info', 'Content validation', {
            valid: contentValidation.valid,
            score: contentValidation.score,
            issues: contentValidation.issues
          })
        } else {
          console.log('[Generator] No structured lesson data found for validation')
        }
        
        if (contentValidation && !contentValidation.valid) {
          logJob(lessonId, 'warn', 'Content validation failed', {
            score: contentValidation.score,
            issues: contentValidation.issues,
            suggestions: contentValidation.suggestions
          })
          
          // Update trace with validation results
          await (supabaseAdmin.from('traces') as any)
            .update({
              validation: {
                passed: false,
                score: contentValidation.score,
                issues: contentValidation.issues,
                suggestions: contentValidation.suggestions,
                metrics: contentValidation.metrics
              }
            })
            .eq('lesson_id', lessonId)
            .eq('attempt_number', attemptNumber)
          
          // Create validation error message for retry
          lastErrors = [
            'Content validation failed:',
            ...contentValidation.issues,
            '',
            'Suggestions:',
            ...contentValidation.suggestions,
            '',
            `Quality score: ${(contentValidation.score * 100).toFixed(1)}%`
          ].join('\n')
          
          continue // Retry with validation feedback
        }

        // Content validation passed, save the lesson
        logJob(lessonId, 'info', 'Saving lesson_contents')
        
        // Try insert first
        const { error: insertError } = await (supabaseAdmin.from('lesson_contents') as any)
          .insert({
            lesson_id: lessonId,
            typescript_source: sanitizedSource,
            compiled_js: null, // Compilation happens in browser with @babel/standalone
            version: 1,
          })
        
        // If insert fails due to unique constraint, try update
        if (insertError) {
          logJob(lessonId, 'info', 'Insert failed, trying update', { error: insertError.message })
          const { error: updateError } = await (supabaseAdmin.from('lesson_contents') as any)
            .update({
              typescript_source: sanitizedSource,
              compiled_js: null, // Compilation happens in browser with @babel/standalone
              version: 1,
            })
            .eq('lesson_id', lessonId)
          
          if (updateError) {
            logJob(lessonId, 'error', 'Failed to save lesson_contents', { error: updateError.message })
            throw new Error(`Failed to save lesson content: ${updateError.message}`)
          }
        }

        // Mark generated and return immediately to avoid any later failure flips
        logJob(lessonId, 'info', `Status -> generated`)
        await (supabaseAdmin
          .from('lessons') as any)
          .update({ status: 'generated' })
          .eq('id', lessonId)

        await (supabaseAdmin
          .from('generation_attempts') as any)
          .update({
            status: 'success',
            finished_at: new Date().toISOString(),
          })
          .eq('id', attempt!.id)

        logJob(lessonId, 'info', `Generation success${contentValidation ? ` (quality ${(contentValidation.score * 100).toFixed(1)}%)` : ''}`)
        return
      }

      logJob(lessonId, 'warn', `Attempt ${attemptNumber} failed`, { errors: lastErrors })
      await (supabaseAdmin
        .from('generation_attempts') as any)
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: lastErrors,
        })
        .eq('id', attempt!.id)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      logJob(lessonId, 'error', `Attempt ${attemptNumber} exception`, { error: errorMessage })

      // Audit trace for LLM/other errors
      try {
        await (supabaseAdmin.from('traces') as any).insert({
          lesson_id: lessonId,
          attempt_number: attemptNumber,
          prompt: 'see previous attempt prompt',
          model: process.env.MODEL_NAME || 'gpt-4',
          response: '',
          tokens: null,
          validation: { passed: false },
          compilation: { success: false },
          error: errorMessage
        })
      } catch {}
      await (supabaseAdmin
        .from('generation_attempts') as any)
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: errorMessage,
        })
        .eq('id', attempt!.id)

      if (attemptNumber >= MAX_ATTEMPTS) {
        logJob(lessonId, 'error', 'Max attempts reached, marking failed')
        await (supabaseAdmin
          .from('lessons') as any)
          .update({ status: 'failed' })
          .eq('id', lessonId)
        throw error
      }
      // Exponential backoff between attempts (idempotent; state is persisted per attempt)
      const wait = Math.min(2000 * Math.pow(2, attemptNumber - 1), 10000)
      await sleep(wait)
    }
  }

  logJob(lessonId, 'error', 'Exiting loop with failure')
  await (supabaseAdmin
    .from('lessons') as any)
    .update({ status: 'failed' })
    .eq('id', lessonId)

  endJob();

  } catch (error) {
    logError(lessonId, error instanceof Error ? error : new Error(String(error)), {
      operation: 'legacy_generation_error',
      stage: 'generation',
    });

    logger.error('Legacy generation failed', {
      operation: 'legacy_generation_failed',
      stage: 'generation',
      errorType: 'GenerationError',
      errorCode: 'LEGACY_GENERATION_FAILED',
      metadata: {
        lessonId,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    endJob();

    throw error;
  }
}

function extractTypeScriptCode(response: string): string {
  // Extract fenced code blocks with proper regex
  const codeBlockRegex = /```(?:typescript|tsx|ts)?\n([\s\S]*?)\n```/g
  const matches = Array.from(response.matchAll(codeBlockRegex))
  
  if (matches.length > 0) {
    // Get the last (most likely to be complete) code block
    const lastMatch = matches[matches.length - 1]
    return lastMatch[1].trim()
  }
  
  // Fallback: return raw content
  return response.trim()
}

    // Validate that component doesn't use external imports
    function validateComponent(source: string): { isValid: boolean; errors: string[] } {
      const errors: string[] = []
      
      // Check for external imports
      const externalImports = source.match(/import\s+.*?from\s+['"](?!react)[^'"]*['"]/g)
      if (externalImports) {
        errors.push(`External imports detected: ${externalImports.join(', ')}`)
      }
      
      // Check for require statements
      const requireStatements = source.match(/require\s*\([^)]*\)/g)
      if (requireStatements) {
        errors.push(`Require statements detected: ${requireStatements.join(', ')}`)
      }
      
      // Check for dynamic imports
      const dynamicImports = source.match(/import\s*\([^)]*\)/g)
      if (dynamicImports) {
        errors.push(`Dynamic imports detected: ${dynamicImports.join(', ')}`)
      }
      
      // Check for common external library usage patterns (comprehensive list)
      const externalLibraryPatterns = [
        // Chart libraries
        /recharts/i,
        /d3/i,
        /chart\.js/i,
        /chartjs/i,
        /highcharts/i,
        /plotly/i,
        /victory/i,
        /nivo/i,
        /visx/i,
        
        // Animation libraries
        /framer-motion/i,
        /react-spring/i,
        /gsap/i,
        /anime\.js/i,
        
        // UI libraries
        /material-ui/i,
        /mui/i,
        /@mui\//i,
        /antd/i,
        /ant-design/i,
        /chakra/i,
        /chakra-ui/i,
        /semantic-ui/i,
        /bootstrap/i,
        /react-bootstrap/i,
        /mantine/i,
        /blueprint/i,
        /evergreen/i,
        
        // Styling libraries
        /styled-components/i,
        /emotion/i,
        /@emotion\//i,
        /tailwindcss/i,
        
        // Utility libraries
        /lodash/i,
        /underscore/i,
        /ramda/i,
        /moment/i,
        /dayjs/i,
        /date-fns/i,
        /luxon/i,
        /axios/i,
        /fetch/i,
        /swr/i,
        /react-query/i,
        
        // State management
        /redux/i,
        /zustand/i,
        /jotai/i,
        /recoil/i,
        /mobx/i,
        
        // Form libraries
        /formik/i,
        /react-hook-form/i,
        /yup/i,
        /zod/i,
        
        // Icons
        /react-icons/i,
        /heroicons/i,
        /font-awesome/i,
        /feather-icons/i
      ]
      
      // Check for specific component usage without imports
      const componentUsagePatterns = [
        /motion\./i,  // motion.div, motion.span, etc.
        /<motion\./i,  // <motion.div>, <motion.span>, etc.
        /\bmotion\b/i,  // standalone motion usage
        /LineChart/i,
        /BarChart/i,
        /PieChart/i,
        /AreaChart/i,
        /ScatterChart/i,
        /RadarChart/i,
        /<Chart\b/i,
        /Button\s+from/i,  // "Button from '@mui/material'"
        /Icon\s+from/i
      ]
      
      // Check for common undefined variable patterns
      // Look for JSX elements that might be undefined
      const undefinedPatterns = [
        /<([A-Z][a-zA-Z0-9]*)\s/g,  // JSX components like <ComponentName
        /React\.createElement\(([A-Z][a-zA-Z0-9]*)[,\)]/g  // React.createElement calls
      ]
      
      for (const pattern of externalLibraryPatterns) {
        if (pattern.test(source)) {
          errors.push(`External library usage detected: ${pattern.source}`)
        }
      }
      
      for (const pattern of componentUsagePatterns) {
        if (pattern.test(source)) {
          errors.push(`External component usage detected: ${pattern.source}`)
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      }
    }

    // Best-effort sanitizer to enforce compilable TSX without template literal pitfalls
    function sanitizeComponent(source: string): string {
      let out = source
      
      // Remove markdown fences if any leaked
      out = out.replace(/```[\s\S]*?```/g, (m) => {
        const inner = m.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '')
        return inner
      })

      // Remove ALL non-React imports aggressively
      // Side-effect imports like: import 'tailwindcss/tailwind.css'
      out = out.replace(/import\s+['"][^'"]+['"];?\s*/g, (m) => {
        return /import\s+['"]react['"];?/.test(m) ? m : ''
      })
      // Normal imports like: import X from 'some-lib' or import { X } from 'some-lib'
      out = out.replace(/import\s+.*?from\s+['"](?!react)[^'"]*['"];?\s*/g, '')
      
      // Remove any remaining import statements that might have been missed
      out = out.replace(/import\s+.*?;?\s*/g, '')
      
      // Remove any require statements
      out = out.replace(/require\s*\([^)]*\)\s*/g, '')
      
      // Remove any dynamic imports
      out = out.replace(/import\s*\([^)]*\)\s*/g, '')

      // Replace className={`...`} with className="..." when no interpolation
      out = out.replace(/className=\{`([^`$}]*)`\}/g, 'className="$1"')

      // For any className with interpolation, fall back to a safe static class
      out = out.replace(/className=\{`[\s\S]*?`\}/g, 'className="lesson-section"')

      // Replace any remaining backticks in JSX attributes with quotes
      out = out.replace(/=\s*`([^`]*?)`/g, '="$1"')

      // Strip ambient module declarations that break app TS
      out = out.replace(/declare\s+module\s+[^\n]+\n?/g, '')

      // Normalize stray $ tokens inside JSX attribute contexts
      out = out.replace(/className=\{\$[^}]*\}/g, 'className="lesson-section"')

      return out
    }

