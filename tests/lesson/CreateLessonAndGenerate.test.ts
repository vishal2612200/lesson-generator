import { CreateLessonAndGenerate } from '@/domains/lesson/application/CreateLessonAndGenerate'
import { LessonRepository, LessonRecord } from '@domains/lesson/domain/repositories/LessonRepository'
import { makeRepoMock } from '../utils/repoMock'

function sampleLesson(overrides: Partial<LessonRecord> = {}): LessonRecord {
  const now = new Date().toISOString()
  return {
    id: 'lesson-1',
    title: 'Title',
    outline: 'Outline',
    status: 'generating',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

jest.mock('@/worker/generation', () => ({
  generateLessonHybrid: jest.fn(async () => {}),
}))

describe('CreateLessonAndGenerate', () => {
  it('creates, generates, and returns updated lesson', async () => {
    const created = sampleLesson({ id: 'id-1' })
    const updated = sampleLesson({ id: 'id-1', status: 'generated', title: 'Final' })

    const repo = makeRepoMock({
      createLesson: jest.fn(async () => created),
      getLessonById: jest.fn(async () => updated),
    })

    const useCase = new CreateLessonAndGenerate(repo)
    const result = await useCase.execute('My Outline')

    expect(repo.createLesson).toHaveBeenCalled()
    expect(result).toEqual(updated)
  })

  it('marks failed and inserts trace on generation error', async () => {
    const created = sampleLesson({ id: 'id-2' })

    const repo = makeRepoMock({
      createLesson: jest.fn(async () => created),
      getLessonById: jest.fn(async () => null),
      updateLessonStatus: jest.fn(async () => {}),
      insertTrace: jest.fn(async () => {}),
    })

    const { generateLessonHybrid } = require('@/worker/generation')
    generateLessonHybrid.mockImplementationOnce(async () => {
      throw new Error('boom')
    })

    const useCase = new CreateLessonAndGenerate(repo)
    await expect(useCase.execute('Outline')).rejects.toThrow('Failed to generate lesson content')

    expect(repo.updateLessonStatus).toHaveBeenCalledWith('id-2', 'failed')
    expect(repo.insertTrace).toHaveBeenCalled()
  })
})
