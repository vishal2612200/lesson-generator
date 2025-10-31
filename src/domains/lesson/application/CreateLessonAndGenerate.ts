import { LessonRepository, LessonRecord } from '@domains/lesson/domain/repositories/LessonRepository'
import { generateLessonHybrid } from '@/worker/generation'

export class CreateLessonAndGenerate {
  private readonly repo: LessonRepository

  constructor(repo: LessonRepository) {
    this.repo = repo
  }

  async execute(outline: string): Promise<LessonRecord> {
    if (!outline || typeof outline !== 'string') {
      throw new Error('Outline is required')
    }

    const firstLine = outline.split('\n')[0].trim()
    const title = firstLine.length > 0 && firstLine.length <= 100 ? firstLine : 'Untitled Lesson'

    const lesson = await this.repo.createLesson({ title, outline, status: 'generating' })

    try {
      await generateLessonHybrid(lesson.id)
      const updated = await this.repo.getLessonById(lesson.id)
      if (!updated) throw new Error('Failed to fetch generated lesson')
      return updated
    } catch (error: any) {
      await this.repo.updateLessonStatus(lesson.id, 'failed')
      await this.repo.insertTrace({
        lesson_id: lesson.id,
        attempt_number: 1,
        prompt: 'API-level generation failure',
        model: 'api-error',
        response: '',
        tokens: null,
        validation: { passed: false, errors: [error?.message ?? 'Unknown error'] },
        compilation: { success: false, error: error?.message ?? 'Unknown error' },
        error: error?.message ?? 'Unknown error',
      })
      throw new Error('Failed to generate lesson content')
    }
  }
}
