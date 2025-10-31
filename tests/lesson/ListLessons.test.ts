import { ListLessons } from '@/domains/lesson/application/ListLessons'
import { LessonRepository, LessonRecord } from '@domains/lesson/domain/repositories/LessonRepository'
import { makeRepoMock } from '../utils/repoMock'

describe('ListLessons', () => {
  it('returns lessons from repository', async () => {
    const now = new Date().toISOString()
    const lessons: LessonRecord[] = [
      { id: '1', title: 'A', outline: 'o', status: 'generated', created_at: now, updated_at: now },
    ]

    const repo = makeRepoMock({
      listLessons: jest.fn(async () => lessons),
    })

    const useCase = new ListLessons(repo)
    const result = await useCase.execute()

    expect(result).toEqual(lessons)
  })
})
