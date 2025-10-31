import { LessonRepository, LessonRecord, LessonContentRecord, TraceRecord } from '@domains/lesson/domain/repositories/LessonRepository'

export interface LessonDetailsDTO {
  lesson: LessonRecord
  content: LessonContentRecord | null
  traces: TraceRecord[]
}

export class GetLessonDetails {
  private readonly repository: LessonRepository

  constructor(repository: LessonRepository) {
    this.repository = repository
  }

  async execute(lessonId: string): Promise<LessonDetailsDTO> {
    // Try to use consolidated query first (more efficient)
    const consolidated = await this.repository.getLessonDetailsById(lessonId)
    
    if (consolidated) {
      // Transform multi-agent traces to TraceRecord format
      let allTraces = consolidated.traces
      if (consolidated.multiAgentTraces && consolidated.multiAgentTraces.length > 0) {
        for (const ma of consolidated.multiAgentTraces) {
          const converted = ma.trace_data.map((step: any, index: number) => ({
            id: `${ma.id}-${index}`,
            lesson_id: lessonId,
            attempt_number: 1,
            prompt: `Multi-agent step ${step.step}: ${step.agent} - ${step.action}`,
            model: 'gpt-4o',
            response: JSON.stringify(step.output),
            tokens: null,
            validation: { passed: true, errors: [] },
            compilation: { success: true, error: null },
            error: null,
            created_at: step.timestamp
          }))
          allTraces = [...allTraces, ...converted]
        }
      }

      return {
        lesson: consolidated.lesson,
        content: consolidated.content,
        traces: allTraces
      }
    }

    // Fallback to individual queries for backward compatibility
    const lesson = await this.repository.getLessonById(lessonId)
    if (!lesson) {
      throw new Error('Lesson not found')
    }

    const [content, traces, multiAgent] = await Promise.all([
      this.repository.getLatestContentByLesson(lessonId),
      this.repository.getTracesByLesson(lessonId),
      this.repository.getMultiAgentTracesByLesson(lessonId),
    ])

    let allTraces = traces
    if (multiAgent && multiAgent.length > 0) {
      const ma = multiAgent[0]
      const converted = ma.trace_data.map((step: any, index: number) => ({
        id: `${ma.id}-${index}`,
        lesson_id: lessonId,
        attempt_number: 1,
        prompt: `Multi-agent step ${step.step}: ${step.agent} - ${step.action}`,
        model: 'gpt-4o',
        response: JSON.stringify(step.output),
        tokens: null,
        validation: { passed: true, errors: [] },
        compilation: { success: true, error: null },
        error: null,
        created_at: step.timestamp
      }))
      allTraces = [...allTraces, ...converted]
    }

    return { lesson, content, traces: allTraces }
  }
}



