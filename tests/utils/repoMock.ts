import { LessonRepository } from '@domains/lesson/domain/repositories/LessonRepository'

export function makeRepoMock(overrides: Partial<LessonRepository> = {}): LessonRepository {
  const base: any = {
    getLessonById: jest.fn(),
    getLatestContentByLesson: jest.fn(),
    getTracesByLesson: jest.fn(),
    getMultiAgentTracesByLesson: jest.fn(),
    listLessons: jest.fn(),
    createLesson: jest.fn(),
    updateLessonStatus: jest.fn(),
    insertTrace: jest.fn(),
  }
  return { ...base, ...overrides }
}
