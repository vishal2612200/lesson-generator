import { NextRequest, NextResponse } from 'next/server'
import { nowMs } from '@/worker/common/perf'
import { LessonRepositorySupabase } from '@domains/lesson/infrastructure/supabase/LessonRepositorySupabase'
import { CreateLessonAndGenerate, ListLessons } from '@domains/lesson/application'

export const maxDuration = 300 // 5 minutes for lesson generation
export const dynamic = 'force-dynamic'

// Simple in-memory rate limiter (serverless instance scoped)
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10     // per IP per window
const ipHits = new Map<string, { count: number; windowStart: number }>()

function allowRequest(ip: string | null): boolean {
  if (!ip) return true
  const now = nowMs()
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

    const repo = new LessonRepositorySupabase()
    const useCase = new CreateLessonAndGenerate(repo)
    const lesson = await useCase.execute(outline)

    return NextResponse.json({ data: lesson }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/lessons:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const repo = new LessonRepositorySupabase()
    const useCase = new ListLessons(repo)
    const lessons = await useCase.execute()
    return NextResponse.json({ data: lessons })
  } catch (error) {
    console.error('Error in GET /api/lessons:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

