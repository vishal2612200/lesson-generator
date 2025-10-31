import { NextRequest, NextResponse } from 'next/server'
import { GetLessonDetails } from '@domains/lesson/application/GetLessonDetails'
import { LessonRepositorySupabase } from '@domains/lesson/infrastructure/supabase/LessonRepositorySupabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repo = new LessonRepositorySupabase()
    const useCase = new GetLessonDetails(repo)
    const result = await useCase.execute(params.id)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}