import { supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { scanForForbiddenTokens } from '../common/security'
import { callLLM } from '../common/llm'
import { compileTypeScript } from './compiler'
import { PRIMARY_PROMPT, FIX_LOOP_PROMPT } from '../content/prompts'
import { getSelectedPersona, getPersonaIntro } from '../content/persona'
import { validateLessonContent, extractLessonData, validateSvgAlignment, validateStyleHeuristics } from '../content/contentValidator'
import { sanitizeComponentAst, validateComponentAst, extractTypeScriptFromResponse } from './sanitizer'

const MAX_ATTEMPTS = 5
const USE_CHAT_PROMPTS = (process.env.USE_CHAT_PROMPTS || 'true').toLowerCase() === 'true'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

import { logger, logJobStart, logError } from '../common/logger';

export async function generateLesson(lessonId: string): Promise<void> {
  const endJob = logJobStart(lessonId, 'legacy_generation');
  
  try {
    logger.info('Starting legacy lesson generation', {
      operation: 'legacy_generation_start',
      stage: 'generation',
      metadata: { lessonId },
    });

    const { data: lesson } = await supabaseAdmin
      .from('lessons')
      .select('id,title,outline,status')
      .eq('id', lessonId)
      .single()

    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`)
    }

    const l = lesson as Pick<Database['public']['Tables']['lessons']['Row'], 'id' | 'title' | 'outline' | 'status'>

    logger.info('Lesson found, starting generation', {
      operation: 'lesson_found',
      stage: 'generation',
      metadata: {
        lessonId,
        status: l.status,
        title: l.title,
        outline: l.outline?.substring(0, 100) + '...',
      },
    });

    // Update status to generating
    const { error: updateError } = await (supabaseAdmin as any)
      .from('lessons')
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

    const { data: attempt } = await (supabaseAdmin as any)
      .from('generation_attempts')
      .insert({
        lesson_id: lessonId,
        attempt_number: attemptNumber,
        status: 'in_progress',
      })
      .select()
      .single()

    try {
      const basePrompt = PRIMARY_PROMPT
      const fixPrompt = FIX_LOOP_PROMPT
      
      const prompt = (() => {
        const isFirst = attemptNumber === 1
        if (!USE_CHAT_PROMPTS) {
          return isFirst
            ? basePrompt
                .replace('{{PERSONA_INTRO}}', getPersonaIntro(getSelectedPersona()))
                .replace('{{OUTLINE}}', l.outline)
            : fixPrompt
                .replace('{{CODE}}', lastSource)
                .replace('{{ERRORS}}', lastErrors)
        }

        if (isFirst) {
          const persona = getPersonaIntro(getSelectedPersona())
          const user = (`=== PERSONA: ${getSelectedPersona()} ===\n` + basePrompt)
            .replace('{{PERSONA_INTRO}}', getPersonaIntro(getSelectedPersona()))
            .replace('{{OUTLINE}}', l.outline)
          const system = 'You are a senior ML educator and instructional designer. Follow strict topic alignment, pedagogical quality, accessibility, and technical constraints. Avoid off-topic elementary examples.'
          return { system, user }
        }

        const user = fixPrompt
          .replace('{{CODE}}', lastSource)
          .replace('{{ERRORS}}', lastErrors)
        const system = 'You are a senior TypeScript/React engineer preserving educational intent and topic alignment while fixing compilation/runtime issues.'
        return { system, user }
      })()

      const model = process.env.MODEL_NAME || 'gpt-4'
      const llmResponse = await callLLM(prompt as any, model)
      logger.info(`LLM response (attempt ${attemptNumber})`, {
        lessonId,
        operation: 'llm_response',
        stage: 'generation',
        metadata: { model, attemptNumber, tokens: llmResponse.tokens },
      })

      const securityCheck = scanForForbiddenTokens(llmResponse.content)

      if (!securityCheck.passed) {
        logger.warn('Security check failed', {
          lessonId,
          operation: 'security_check_failed',
          stage: 'generation',
          metadata: { forbidden: securityCheck.forbiddenTokens },
        })
        
        try {
          const { error: traceError } = await (supabaseAdmin as any).from('traces').insert({
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
      const typeScriptSource = extractTypeScriptFromResponse(llmResponse.content)
      logger.info('TypeScript extracted', {
        lessonId,
        operation: 'typescript_extracted',
        stage: 'generation',
        metadata: { length: typeScriptSource.length },
      })
      
      // Validate component for external imports
      const validation = validateComponentAst(typeScriptSource)
      if (!validation.isValid) {
        logger.warn('Component validation failed', {
          lessonId,
          operation: 'component_validation_failed',
          stage: 'generation',
          metadata: { errors: validation.errors },
        })
        lastErrors = `Component uses external imports: ${validation.errors.join(', ')}`
        throw new Error(lastErrors)
      }
      
      // Sanitize generated component to avoid common TSX pitfalls
      const sanitizedSource = sanitizeComponentAst(typeScriptSource)
      const BYTE_LIMIT = Number(process.env.GENERATED_CODE_MAX_BYTES) || 200 * 1024
      if (Buffer.from(sanitizedSource, 'utf8').length > BYTE_LIMIT) {
        lastErrors = `Generated code exceeds byte limit (${BYTE_LIMIT} bytes).`
        console.warn('[Generator] Byte limit exceeded for lesson', lessonId)
        throw new Error(lastErrors)
      }
      lastSource = sanitizedSource

      const compilationResult = await compileTypeScript(sanitizedSource)
      logger.info('Compilation result', {
        lessonId,
        operation: 'compilation_result',
        stage: 'generation',
        metadata: {
          success: compilationResult.success,
          tscErrors: compilationResult.tscErrors?.length || 0,
          esbuildErrors: compilationResult.esbuildErrors?.length || 0,
        },
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
        const { data: insertedTrace, error: traceError } = await (supabaseAdmin as any).from('traces').insert(traceData).select()
        
        if (traceError) {
          console.error('[Generator]  Failed to insert trace:', traceError)
          console.error('[Generator] Trace data was:', JSON.stringify(traceData, null, 2))
        } else {
          console.log(`[Generator]  Trace inserted successfully:`, insertedTrace?.[0]?.id)
        }
      } catch (traceErr) {
        console.error('[Generator]  Exception inserting trace:', traceErr)
      }

      if (compilationResult.success) {
        // SVG alignment validation (optional rollout)
        const enforceSvg = (process.env.ENFORCE_SVG_ALIGNMENT || 'true').toLowerCase() === 'true'
        const svgCheck = validateSvgAlignment(sanitizedSource, l.outline)
        if (enforceSvg && !svgCheck.valid) {
          logger.warn('SVG alignment validation failed', {
            lessonId,
            operation: 'svg_validation_failed',
            stage: 'generation',
            metadata: { issues: svgCheck.issues, score: svgCheck.score, signals: svgCheck.signals },
          })
          lastErrors = [
            'SVG alignment validation failed:',
            ...svgCheck.issues,
            '',
            'Please add an inline SVG grounded in Topic Entities with labels and at least one relationship; include viewBox, <title>/<desc>, aria-labelledby, <g data-entity>, and a meaningful micro-interaction.'
          ].join('\n')
          continue
        }
        // Validate content quality
        const lessonData = extractLessonData(typeScriptSource)
        const contentValidation = lessonData ? validateLessonContent(lessonData, l.outline) : null
        if (contentValidation) {
          // Simple readability/jargon signals from source text
          const plain = sanitizedSource.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          const sentences = plain.split(/[.!?]+\s/).filter(Boolean)
          const avgLen = sentences.length ? (plain.split(/\s+/).length / sentences.length) : 0
          const jargonList = ['orthogonal','idempotent','stationarity','homoscedastic','isomorphic','manifold']
          const jargonHits = jargonList.reduce((n, w) => n + (plain.toLowerCase().includes(w) ? 1 : 0), 0)
          const style = validateStyleHeuristics(sanitizedSource)
          logger.info('Content validation', {
            lessonId,
            operation: 'content_validation',
            stage: 'generation',
            metadata: {
              valid: contentValidation.valid,
              score: contentValidation.score,
              issues: contentValidation.issues,
              readability_avg_sentence_words: Number(avgLen.toFixed(2)),
              jargon_hits: jargonHits,
              style_signals: style.signals,
              style_issues: style.issues,
            },
          })
        } else {
          console.log('[Generator] No structured lesson data found for validation')
        }
        
        if (contentValidation && !contentValidation.valid) {
          logger.warn('Content validation failed', {
            lessonId,
            operation: 'content_validation_failed',
            stage: 'generation',
            metadata: {
              score: contentValidation.score,
              issues: contentValidation.issues,
              suggestions: contentValidation.suggestions,
            },
          })
          
          // Update trace with validation results
          await (supabaseAdmin as any).from('traces')
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

        // Content validation passed, save the lesson (single upsert)
        logger.info('Saving lesson_contents via upsert', {
          lessonId,
          operation: 'save_lesson_contents',
          stage: 'generation',
        })
        const { error: upsertError } = await (supabaseAdmin as any).from('lesson_contents')
          .upsert({
            lesson_id: lessonId,
            typescript_source: sanitizedSource,
            compiled_js: null, // Compilation happens in browser with @babel/standalone
            version: 1,
          }, { onConflict: 'lesson_id' })

        if (upsertError) {
          logger.error('Failed to upsert lesson_contents', {
            lessonId,
            operation: 'upsert_failed',
            stage: 'generation',
            errorType: 'DatabaseError',
            metadata: { error: upsertError.message },
          })
          throw new Error(`Failed to save lesson content: ${upsertError.message}`)
        }

        // Mark generated and return immediately to avoid any later failure flips
        logger.info('Status -> generated', {
          lessonId,
          operation: 'status_updated',
          stage: 'generation',
        })
        await (supabaseAdmin as any)
          .from('lessons')
          .update({ status: 'generated' })
          .eq('id', lessonId)

        await (supabaseAdmin as any)
          .from('generation_attempts')
          .update({
            status: 'success',
            finished_at: new Date().toISOString(),
          })
          .eq('id', attempt!.id)

        logger.info(`Generation success${contentValidation ? ` (quality ${(contentValidation.score * 100).toFixed(1)}%)` : ''}`, {
          lessonId,
          operation: 'generation_success',
          stage: 'generation',
        })
        return
      }

      logger.warn(`Attempt ${attemptNumber} failed`, {
        lessonId,
        operation: 'attempt_failed',
        stage: 'generation',
        metadata: { errors: lastErrors },
      })
      await (supabaseAdmin as any)
        .from('generation_attempts')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: lastErrors,
        })
        .eq('id', attempt!.id)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      logger.error(`Attempt ${attemptNumber} exception`, {
        lessonId,
        operation: 'attempt_exception',
        stage: 'generation',
        errorType: 'AttemptError',
        metadata: { error: errorMessage },
      })

      // Audit trace for LLM/other errors
      try {
        await (supabaseAdmin as any).from('traces').insert({
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
      await (supabaseAdmin as any)
        .from('generation_attempts')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: errorMessage,
        })
        .eq('id', attempt!.id)

      if (attemptNumber >= MAX_ATTEMPTS) {
        logger.error('Max attempts reached, marking failed', {
          lessonId,
          operation: 'max_attempts_reached',
          stage: 'generation',
        })
        await (supabaseAdmin as any)
          .from('lessons')
          .update({ status: 'failed' })
          .eq('id', lessonId)
        throw error
      }
      // Exponential backoff between attempts (idempotent; state is persisted per attempt)
      const wait = Math.min(2000 * Math.pow(2, attemptNumber - 1), 10000)
      await sleep(wait)
    }
  }

  logger.error('Exiting loop with failure', {
    lessonId,
    operation: 'loop_failure',
    stage: 'generation',
  })
  await (supabaseAdmin as any)
    .from('lessons')
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
    // Prefer the largest block to maximize completeness
    const largest = matches.reduce((best, m) => (
      (m[1]?.length || 0) > (best[1]?.length || 0) ? m : best
    ))
    return (largest[1] || '').trim()
  }
  
  // Fallback: return raw content
  return response.trim()
}

    // (Removed regex-based sanitizer and validators in favor of AST-based implementations)
