import { supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  LessonRepository,
  LessonRecord,
  LessonContentRecord,
  TraceRecord,
  MultiAgentTraceRecord,
  LessonDetailsRecord,
  CreateLessonInput,
  InsertTraceInput,
} from '@domains/lesson/domain/repositories/LessonRepository'

export class LessonRepositorySupabase implements LessonRepository {
  async getLessonById(id: string): Promise<LessonRecord | null> {
    const { data, error } = await supabaseAdmin.from('lessons')
      .select('id,title,outline,status,created_at')
      .eq('id', id)
      .single()
    if (error) return null
    return data as LessonRecord
  }

  async getLatestContentByLesson(id: string): Promise<LessonContentRecord | null> {
    const { data, error } = await supabaseAdmin.from('lesson_contents')
      .select('typescript_source,compiled_js,created_at,lesson_id,id,version')
      .eq('lesson_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error) return null
    return data as LessonContentRecord
  }

  async getTracesByLesson(id: string): Promise<TraceRecord[]> {
    const { data, error } = await supabaseAdmin.from('traces')
      .select('*')
      .eq('lesson_id', id)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data as TraceRecord[]
  }

  async getMultiAgentTracesByLesson(id: string): Promise<MultiAgentTraceRecord[]> {
    const { data, error } = await supabaseAdmin.from('multi_agent_traces')
      .select('*')
      .eq('lesson_id', id)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data as MultiAgentTraceRecord[]
  }

  async getLessonDetailsById(id: string): Promise<LessonDetailsRecord | null> {
    // Use Supabase nested selects to fetch all related data in a single query
    // Note: PostgREST doesn't support limiting nested relations in the same way,
    // so we fetch all lesson_contents and select the latest in code
    const { data, error } = await supabaseAdmin
      .from('lessons')
      .select(`
        id,
        title,
        outline,
        status,
        created_at,
        updated_at,
        lesson_contents!left(
          id,
          lesson_id,
          typescript_source,
          compiled_js,
          version,
          created_at
        ),
        traces!left(
          id,
          lesson_id,
          attempt_number,
          prompt,
          model,
          response,
          tokens,
          validation,
          compilation,
          error,
          created_at
        ),
        multi_agent_traces!left(
          id,
          lesson_id,
          trace_data,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    // Type the nested query result
    const typedData = data as any

    // Transform the nested structure to match LessonDetailsRecord
    const lesson: LessonRecord = {
      id: typedData.id,
      title: typedData.title,
      outline: typedData.outline,
      status: typedData.status as LessonRecord['status'],
      created_at: typedData.created_at,
      updated_at: typedData.updated_at || typedData.created_at,
    }

    // Get latest content by sorting all contents by created_at DESC and taking first
    const contents = (typedData.lesson_contents as any[]) || []
    const sortedContents = contents.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const content: LessonContentRecord | null = sortedContents.length > 0
      ? {
          id: sortedContents[0].id,
          lesson_id: sortedContents[0].lesson_id,
          typescript_source: sortedContents[0].typescript_source,
          compiled_js: sortedContents[0].compiled_js,
          version: sortedContents[0].version,
          created_at: sortedContents[0].created_at,
        }
      : null

    // Get traces and sort by created_at ascending
    const tracesRaw = (typedData.traces as any[]) || []
    const traces: TraceRecord[] = tracesRaw
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((t) => ({
        id: t.id,
        lesson_id: t.lesson_id,
        attempt_number: t.attempt_number,
        prompt: t.prompt,
        model: t.model,
        response: t.response,
        tokens: t.tokens,
        validation: t.validation,
        compilation: t.compilation,
        error: t.error ?? null,
        created_at: t.created_at,
      }))

    // Get multi-agent traces and sort by created_at ascending
    const multiAgentTracesRaw = (typedData.multi_agent_traces as any[]) || []
    const multiAgentTraces: MultiAgentTraceRecord[] = multiAgentTracesRaw
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((mat) => ({
        id: mat.id,
        lesson_id: mat.lesson_id,
        trace_data: mat.trace_data,
        created_at: mat.created_at,
      }))

    return {
      lesson,
      content,
      traces,
      multiAgentTraces,
    }
  }

  async listLessons(): Promise<LessonRecord[]> {
    const { data, error } = await supabaseAdmin.from('lessons')
      .select('id,title,status,created_at')
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data as LessonRecord[]
  }

  async createLesson(input: CreateLessonInput): Promise<LessonRecord> {
    const insertPayload = {
      title: input.title,
      outline: input.outline,
      status: input.status,
    } satisfies Database['public']['Tables']['lessons']['Insert']

    const { data, error } = await (supabaseAdmin as any).from('lessons')
      .insert([insertPayload])
      .select('id,title,outline,status,created_at')
      .single()
    if (error || !data) {
      throw new Error('Failed to create lesson')
    }
    return data as LessonRecord
  }

  async updateLessonStatus(id: string, status: 'queued' | 'generating' | 'generated' | 'failed'): Promise<void> {
    const updatePayload = { status } satisfies Database['public']['Tables']['lessons']['Update']
    const { error } = await (supabaseAdmin as any).from('lessons')
      .update(updatePayload)
      .eq('id', id)
    if (error) {
      throw new Error('Failed to update lesson status')
    }
  }

  async insertTrace(input: InsertTraceInput): Promise<void> {
    const { error } = await (supabaseAdmin as any).from('traces').insert({
      lesson_id: input.lesson_id,
      attempt_number: input.attempt_number,
      prompt: input.prompt,
      model: input.model,
      response: input.response,
      tokens: input.tokens,
      validation: input.validation,
      compilation: input.compilation,
      error: input.error ?? null,
    })
    if (error) {
      // Best effort; do not throw to avoid masking primary failures
      console.error('Failed to insert trace:', error)
    }
  }
}



