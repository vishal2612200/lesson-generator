import { NextRequest, NextResponse } from 'next/server'
import { generateLessonHybrid } from '@/worker/generation'
import { orchestrateComponentGeneration } from '@/worker/componentKit'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const signKey = request.headers.get('X-Sign-Key')
    const expectedKey = process.env.SIGNING_KEY

    if (!signKey || signKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Concurrency guard: avoid double-processing the same lesson
    const { data: lesson } = await (supabaseAdmin
      .from('lessons') as any)
      .select('id,status')
      .eq('id', id)
      .single()

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Only allow kickoff when lesson is queued. If it's already generating/generated/failed, no-op.
    if (lesson.status !== 'queued') {
      console.log('[InternalGenerate] Skip kickoff:', { id, status: lesson.status })
      return NextResponse.json({ success: true, skipped: true, reason: `Lesson status is '${lesson.status}', not 'queued'` })
    }

    // Proceed with generation
    console.log('[InternalGenerate] Kickoff generation for lesson', id)
    // Mark as generating
    await (supabaseAdmin
      .from('lessons') as any)
      .update({ status: 'generating' })
      .eq('id', id)
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') || ''
    if (mode !== 'legacy') {
      // Load lesson topic/outline for pedagogy defaults
      const { data } = await (supabaseAdmin
        .from('lessons') as any)
        .select('outline')
        .eq('id', id)
        .single()

      const topic = data?.outline || 'General topic'
      const pedagogy = {
        gradeBand: '3-5' as const,
        readingLevel: 'basic' as const,
        languageTone: 'friendly' as const,
        cognitiveLoad: 'low' as const,
        accessibility: { minFontSizePx: 16, highContrast: true, captionsPreferred: false }
      }
      const res = await orchestrateComponentGeneration({ topic, pedagogy })
      if (res.success) {
        await (supabaseAdmin
          .from('lessons') as any)
          .update({ status: 'generated' })
          .eq('id', id)
        // Persist lesson_contents for backward compatibility with renderer paths
        await (supabaseAdmin
          .from('lesson_contents') as any)
          .insert({
            lesson_id: id,
            typescript_source: res.tsxSource || null,
            compiled_js: res.compiledJs || null,
            version: 1
          })
      } else {
        await (supabaseAdmin
          .from('lessons') as any)
          .update({ status: 'failed' })
          .eq('id', id)
      }
      return NextResponse.json({ success: res.success, componentId: res.componentId, diagnostics: res.diagnostics })
    } else {
      await generateLessonHybrid(id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/internal/generate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

