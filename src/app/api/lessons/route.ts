import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { generateLessonHybrid } from '@/worker/hybridGenerator'
import { orchestrateComponentGeneration } from '@/worker/componentKit/orchestrator'

export const maxDuration = 300 // 5 minutes for lesson generation
export const dynamic = 'force-dynamic'

// Simple in-memory rate limiter (serverless instance scoped)
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10     // per IP per window
const ipHits = new Map<string, { count: number; windowStart: number }>()

function allowRequest(ip: string | null): boolean {
  if (!ip) return true
  const now = Date.now()
  const rec = ipHits.get(ip)
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (rec.count < MAX_REQUESTS) {
    rec.count += 1
    return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    // Basic rate limit by client IP
    const ip = request.headers.get('x-forwarded-for') || request.ip || null
    if (!allowRequest(ip)) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { outline } = body

    if (!outline) {
      return NextResponse.json(
        { error: 'Outline is required' },
        { status: 400 }
      )
    }

    // Auto-generate title from first line of outline or use default
    const firstLine = outline.split('\n')[0].trim()
    const title = firstLine.length > 0 && firstLine.length <= 100 
      ? firstLine 
      : 'Untitled Lesson'

    const { data: lesson, error } = await (supabaseAdmin
      .from('lessons') as any)
      .insert({
        title,
        outline,
        status: 'generating' as const,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lesson:', error)
      return NextResponse.json(
        { error: 'Failed to create lesson' },
        { status: 500 }
      )
    }

    try {
      // Process the lesson immediately
      console.log(`Starting lesson generation for lesson ${lesson.id}`)
      
      // Generate the lesson content
      await generateLessonHybrid(lesson.id)
      
      // Get the updated lesson with generated content
      const { data: updatedLesson, error: fetchError } = await (supabaseAdmin
        .from('lessons') as any)
        .select('*')
        .eq('id', lesson.id)
        .single()

      if (fetchError) {
        console.error('Error fetching updated lesson:', fetchError)
        await (supabaseAdmin.from('lessons') as any)
          .update({ status: 'failed' })
          .eq('id', lesson.id)
        
        return NextResponse.json(
          { error: 'Failed to fetch generated lesson' },
          { status: 500 }
        )
      }

      console.log(`Successfully generated lesson ${lesson.id}`)
      return NextResponse.json({ data: updatedLesson }, { status: 201 })
      
    } catch (error) {
      console.error('Error generating lesson:', error)
      
      // Mark lesson as failed
      await (supabaseAdmin.from('lessons') as any)
        .update({ status: 'failed' })
        .eq('id', lesson.id)
      
      // Save a failure trace for debugging
      try {
        await (supabaseAdmin.from('traces') as any).insert({
          lesson_id: lesson.id,
          attempt_number: 1,
          prompt: 'API-level generation failure',
          model: 'api-error',
          response: '',
          tokens: null,
          validation: { 
            passed: false, 
            errors: [error instanceof Error ? error.message : 'Unknown error']
          },
          compilation: { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      } catch (traceError) {
        console.error('Failed to save failure trace:', traceError)
      }
      
      return NextResponse.json(
        { error: 'Failed to generate lesson content' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in POST /api/lessons:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data: lessons, error } = await (supabaseAdmin
      .from('lessons') as any)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lessons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: lessons })
  } catch (error) {
    console.error('Error in GET /api/lessons:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

