import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { generateLessonHybrid } from './generation/hybridGenerator'
import { orchestrateComponentGeneration } from './componentKit/orchestrator'
import { logger, logJobStart, logError } from './common/logger'

export async function processQueue(): Promise<void> {
  // Try atomic claim via RPC; fallback to select+update if RPC unavailable
  let claimed: any | null = null
  try {
    const rpcRes = await supabaseAdmin
      .rpc('claim_next_lesson')
      .select('id,title,outline,status')
      .single()
    if (!rpcRes.error) {
      claimed = rpcRes.data
    }
  } catch {}

  if (!claimed) {
    // Fallback: Find one queued lesson (id only), then attempt conditional update
    const { data: lessons, error } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error || !lessons || lessons.length === 0) {
      return
    }

    const lesson = (lessons as Pick<Database['public']['Tables']['lessons']['Row'], 'id'>[])[0]
    const { data: claimedRes } = await (supabaseAdmin as any)
      .from('lessons')
      .update({ status: 'generating' })
      .eq('id', lesson.id)
      .eq('status', 'queued')
      .select('id,title,outline,status')
      .single()
    claimed = claimedRes
  }

  if (!claimed) return

  const endJob = logJobStart(claimed.id, 'lesson_generation');

  try {
    // Use hybrid generator that intelligently routes
    // Prefer new components pipeline unless legacy is explicitly requested
    const mode = (process.env.MODE || '').toLowerCase();
    
    logger.info(`🚀 Starting lesson generation: ${claimed.title}`, {
      operation: 'generation_start',
      stage: 'generation',
      metadata: {
        lessonId: claimed.id,
        title: claimed.title,
        mode,
        useLegacy: mode === 'legacy',
      },
    });

    if (mode === 'legacy') {
      await generateLessonHybrid(claimed.id)
    } else {
      // Infer pedagogy from topic keywords using keyword sets
      const ADVANCED_KEYWORDS = new Set([
        'javascript', 'typescript', 'react', 'programming', 'code', 'algorithm',
        'advanced', 'college', 'university', 'professional', 'software engineering'
      ]);
      
      const INTERMEDIATE_KEYWORDS = new Set([
        'algebra', 'equation', 'geometry', 'chemistry', 'physics', 'biology',
        'intermediate', 'high school', 'middle school'
      ]);
      
      const topicLower = claimed.outline.toLowerCase();
      const words = topicLower.split(/\s+/);
      
      const hasAdvanced = words.some((word: string) => ADVANCED_KEYWORDS.has(word));
      const hasIntermediate = words.some((word: string) => INTERMEDIATE_KEYWORDS.has(word));
      
      let gradeBand: 'K-2' | '3-5' | '6-8' | '9-12' = '3-5';
      let readingLevel: 'emergent' | 'basic' | 'intermediate' | 'advanced' = 'basic';
      let cognitiveLoad: 'low' | 'medium' | 'high' = 'low';
      
      if (hasAdvanced) {
        gradeBand = '9-12';
        readingLevel = 'advanced';
        cognitiveLoad = 'high';
      } else if (hasIntermediate) {
        gradeBand = '6-8';
        readingLevel = 'intermediate';
        cognitiveLoad = 'medium';
      }
      
      const result = await orchestrateComponentGeneration({
        topic: claimed.outline,
        lessonId: claimed.id,
        pedagogy: {
          gradeBand,
          readingLevel,
          languageTone: 'friendly',
          cognitiveLoad,
          accessibility: { minFontSizePx: 16, highContrast: true, captionsPreferred: false }
        }
      });

      if (result.success) {
        // Save to lesson_contents table for UI compatibility (upsert to prevent duplicates)
        const { error: contentError } = await (supabaseAdmin
          .from('lesson_contents') as any)
          .upsert({
            lesson_id: claimed.id,
            typescript_source: result.tsxSource || '',
            compiled_js: result.compiledJs || null,
            version: 1
          }, {
            onConflict: 'lesson_id'
          });

        if (contentError) {
          logger.error('Failed to save lesson content', {
            operation: 'content_save_failed',
            stage: 'generation',
            metadata: {
              lessonId: claimed.id,
              error: contentError.message || contentError,
            },
          });
        } else {
          logger.info('Lesson content saved to lesson_contents table', {
            operation: 'content_saved',
            stage: 'generation',
            metadata: { lessonId: claimed.id },
          });
        }

        // Update lesson status to generated
        const { error: updateError } = await (supabaseAdmin
          .from('lessons') as any)
          .update({ status: 'generated' })
          .eq('id', claimed.id);

        if (updateError) {
          logger.error('Failed to update lesson status to generated', {
            operation: 'status_update_failed',
            stage: 'generation',
            metadata: {
              lessonId: claimed.id,
              error: updateError.message || updateError,
            },
          });
        } else {
          logger.info('Lesson status updated to generated', {
            operation: 'status_updated',
            stage: 'generation',
            metadata: { lessonId: claimed.id },
          });
        }
      } else {
        throw new Error(`Component generation failed: ${JSON.stringify(result.diagnostics)}`);
      }
    }
    
    logger.info(` Lesson generation completed successfully: ${claimed.title}`, {
      operation: 'generation_success',
      stage: 'generation',
      metadata: {
        lessonId: claimed.id,
        title: claimed.title,
        mode,
      },
    });

    endJob();

  } catch (error) {
    logError(claimed.id, error instanceof Error ? error : new Error(String(error)), {
      operation: 'generation_error',
      stage: 'generation',
    });

    logger.error(` Lesson generation failed: ${claimed.title}`, {
      operation: 'generation_failed',
      stage: 'generation',
      metadata: {
        lessonId: claimed.id,
        title: claimed.title,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    // Mark as failed if still in processing state
    try {
      const { error: updateError } = await (supabaseAdmin
        .from('lessons') as any)
        .update({ status: 'failed' })
        .eq('id', claimed.id)
        .eq('status', 'generating');

      if (updateError) {
        logger.error('Failed to update lesson status to failed', {
          operation: 'status_update_failed',
          stage: 'generation',
          metadata: {
            lessonId: claimed.id,
            error: updateError.message || updateError,
          },
        });
      } else {
        logger.info('Lesson status updated to failed', {
          operation: 'status_updated',
          stage: 'generation',
          metadata: { lessonId: claimed.id },
        });
      }
    } catch (updateError) {
      logger.error('Exception updating lesson status', {
        operation: 'status_update_exception',
        stage: 'generation',
        metadata: {
          lessonId: claimed.id,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        },
      });
    }

    endJob();
  }
}

async function main() {
  console.log('🔄 Worker started - monitoring for lesson generation tasks...');

  // Best-effort debouncing to avoid stampedes on bursts of updates
  let realtimePending = false
  const triggerProcess = async () => {
    if (realtimePending) return
    realtimePending = true
    try {
      await processQueue()
    } finally {
      realtimePending = false
    }
  }

  // Realtime: push-based processing on INSERT or status transition to queued
  try {
    const channel = supabaseAdmin
      .channel('lessons-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lessons' },
        (payload: any) => {
          if (payload?.new?.status === 'queued') {
            logger.info('Realtime INSERT queued lesson received', {
              operation: 'realtime_insert',
              stage: 'realtime',
              metadata: { lessonId: payload.new.id },
            })
            void triggerProcess()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lessons' },
        (payload: any) => {
          if (payload?.new?.status === 'queued' && payload?.old?.status !== 'queued') {
            logger.info('Realtime UPDATE to queued received', {
              operation: 'realtime_update',
              stage: 'realtime',
              metadata: { lessonId: payload.new.id },
            })
            void triggerProcess()
          }
        }
      )

    await channel.subscribe()
    logger.info('Subscribed to Supabase realtime for lessons', {
      operation: 'realtime_subscribed',
      stage: 'startup',
    })
  } catch (err) {
    logger.warn('Realtime subscription failed; continuing with polling only', {
      operation: 'realtime_failed',
      stage: 'startup',
      metadata: { error: err instanceof Error ? err.message : String(err) },
    })
  }

  // Polling fallback: keeps draining occasionally even if realtime misses events
  const INTER_JOB_DELAY_MS = 8000
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processQueue();
    } catch (error) {
      logger.error('Error in worker cycle', {
        operation: 'cycle_error',
        stage: 'cycle_processing',
        errorType: 'CycleError',
        errorCode: 'CYCLE_ERROR',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, INTER_JOB_DELAY_MS))
  }
}

main().catch((error) => {
  logger.fatal('Fatal worker error, shutting down', {
    operation: 'fatal_error',
    stage: 'shutdown',
    errorType: 'FatalError',
    errorCode: 'FATAL_ERROR',
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });
  
  // Generate final report before exit
  const report = logger.generateReport();
  console.log('Final worker report:', JSON.stringify(report, null, 2));
  
  process.exit(1)
})

