import { LessonRepository, LessonRecord } from '@domains/lesson/domain/repositories/LessonRepository'

export class ListLessons {
  private readonly repo: LessonRepository

  constructor(repo: LessonRepository) {
    this.repo = repo
  }

  async execute(): Promise<LessonRecord[]> {
    return await this.repo.listLessons()
  }
}
