const canRun = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
if (!canRun) {
  // Skip entire file when env missing
  describe('stress (skipped - missing env)', () => { it('skipped', () => expect(true).toBe(true)) })
}
// Defer requiring generator until inside runnable test

describe('Stress Test: 5x Mocked Generation', () => {
  const lessonIds: string[] = []

  beforeAll(() => {
    process.env.LLM_API_KEY_OR_MOCK = 'MOCK'
    process.env.MODEL_NAME = 'gpt-4'
  })

  afterAll(async () => {
    for (const id of lessonIds) {
      await supabaseAdmin.from('lessons').delete().eq('id', id)
    }
  })

  it('should successfully generate 5 lessons concurrently', async () => {
    if (!canRun) return
    const { supabaseAdmin } = require('../src/lib/supabase/server') as typeof import('../src/lib/supabase/server')
    const { generateLesson } = require('../src/worker/generator') as typeof import('../src/worker/generator')
    const lessons = await Promise.all(
      Array.from({ length: 5 }, async (_, i) => {
        const { data, error } = await supabaseAdmin
          .from('lessons')
          .insert({
            title: `Stress Test Lesson ${i + 1}`,
            outline: `Test outline ${i + 1}`,
            status: 'queued',
          })
          .select()
          .single()

        expect(error).toBeNull()
        lessonIds.push(data!.id)
        return data!
      })
    )

    await Promise.all(lessons.map((lesson) => generateLesson(lesson.id)))

    const { data: results } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .in('id', lessonIds)

    expect(results).toHaveLength(5)
    results!.forEach((lesson) => {
      expect(lesson.status).toBe('generated')
    })

    const { data: contents } = await supabaseAdmin
      .from('lesson_contents')
      .select('*')
      .in('lesson_id', lessonIds)

    expect(contents).toHaveLength(5)
    contents!.forEach((content) => {
      expect(content.compiled_js).toBeTruthy()
    })
  }, 60000)
})

