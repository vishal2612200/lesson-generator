const canRun = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
if (!canRun) {
  // Skip entire file when env missing
  describe('integration (skipped - missing env)', () => { it('skipped', () => expect(true).toBe(true)) })
}

describe('Integration Test: Full Lesson Generation Flow', () => {
  let lessonId: string

  beforeAll(() => {
    process.env.LLM_API_KEY_OR_MOCK = 'MOCK'
    process.env.MODEL_NAME = 'gpt-4'
  })

  afterAll(async () => {
    if (lessonId) {
      await supabaseAdmin.from('lessons').delete().eq('id', lessonId)
    }
  })

  it('should generate a lesson with valid TypeScript and compiled JS', async () => {
    if (!canRun) return
    const { supabaseAdmin } = require('../src/lib/supabase/server') as typeof import('../src/lib/supabase/server')
    const { generateLesson } = require('../src/worker/generator') as typeof import('../src/worker/generator')
    const { data: lesson, error: insertError } = await supabaseAdmin
      .from('lessons')
      .insert({
        title: 'Test Quiz',
        outline: 'Create a simple quiz with 2 questions',
        status: 'queued',
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(lesson).toBeDefined()
    lessonId = lesson!.id

    await generateLesson(lessonId)

    const { data: updatedLesson } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    expect(updatedLesson?.status).toBe('generated')

    const { data: contents } = await supabaseAdmin
      .from('lesson_contents')
      .select('*')
      .eq('lesson_id', lessonId)
      .single()

    expect(contents).toBeDefined()
    expect(contents?.typescript_source).toBeTruthy()
    expect(contents?.compiled_js).toBeTruthy()
    expect(contents?.compiled_js).toContain('export default')

    const { data: traces } = await supabaseAdmin
      .from('traces')
      .select('*')
      .eq('lesson_id', lessonId)

    expect(traces).toBeDefined()
    expect(traces!.length).toBeGreaterThan(0)
    expect(traces![0].validation.passed).toBe(true)
    expect(traces![0].compilation.success).toBe(true)
  }, 30000)
})

