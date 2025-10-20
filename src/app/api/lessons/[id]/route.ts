import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch lesson
    const { data: lesson, error: lessonError } = await (supabaseAdmin
      .from('lessons') as any)
      .select('*')
      .eq('id', params.id)
      .single()

    if (lessonError) {
      console.error('Error fetching lesson:', lessonError)
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Fetch lesson content
    const { data: content, error: contentError } = await (supabaseAdmin
      .from('lesson_contents') as any)
      .select('*')
      .eq('lesson_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fetch traces
    const { data: traces, error: tracesError } = await (supabaseAdmin
      .from('traces') as any)
      .select('*')
      .eq('lesson_id', params.id)
      .order('created_at', { ascending: true })

    // Fetch multi-agent traces and convert to regular trace format
    const { data: multiAgentTraces, error: multiAgentError } = await (supabaseAdmin
      .from('multi_agent_traces') as any)
      .select('*')
      .eq('lesson_id', params.id)
      .order('created_at', { ascending: true })

    // Convert multi-agent traces to regular trace format
    let allTraces = tracesError ? [] : traces
    if (!multiAgentError && multiAgentTraces && multiAgentTraces.length > 0) {
      const multiAgentTrace = multiAgentTraces[0] // Get the most recent one
      const convertedTraces = multiAgentTrace.trace_data.map((step: any, index: number) => ({
        id: `${multiAgentTrace.id}-${index}`,
        lesson_id: params.id,
        attempt_number: 1,
        prompt: `Multi-agent step ${step.step}: ${step.agent} - ${step.action}`,
        model: 'gpt-4o',
        response: JSON.stringify(step.output),
        tokens: null,
        validation: {
          passed: true,
          errors: []
        },
        compilation: {
          success: true,
          error: null
        },
        error: null,
        created_at: step.timestamp
      }))
      allTraces = [...allTraces, ...convertedTraces]
    }

    return NextResponse.json({ 
      data: { 
        lesson, 
        content: contentError ? null : content,
        traces: allTraces
      } 
    })
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}