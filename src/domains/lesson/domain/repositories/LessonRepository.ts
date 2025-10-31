export interface LessonRecord {
  id: string
  title: string
  outline: string
  status: 'queued' | 'generating' | 'generated' | 'failed'
  created_at: string
  updated_at: string
}

export interface LessonContentRecord {
  id: string
  lesson_id: string
  typescript_source: string | null
  compiled_js: string | null
  version: number
  created_at: string
}

export interface TraceRecord {
  id: string
  lesson_id: string
  attempt_number: number
  prompt: string
  model: string
  response: string
  tokens: any
  validation: any
  compilation: any
  error?: string | null
  created_at: string
}

export interface MultiAgentTraceRecord {
  id: string
  lesson_id: string
  trace_data: any[]
  created_at: string
}

export interface LessonDetailsRecord {
  lesson: LessonRecord
  content: LessonContentRecord | null
  traces: TraceRecord[]
  multiAgentTraces: MultiAgentTraceRecord[]
}

export interface CreateLessonInput {
  title: string
  outline: string
  status: 'queued' | 'generating' | 'generated' | 'failed'
}

export interface InsertTraceInput {
  lesson_id: string
  attempt_number: number
  prompt: string
  model: string
  response: string
  tokens: any
  validation: any
  compilation: any
  error?: string | null
}

export interface LessonRepository {
  getLessonById(id: string): Promise<LessonRecord | null>
  getLatestContentByLesson(id: string): Promise<LessonContentRecord | null>
  getTracesByLesson(id: string): Promise<TraceRecord[]>
  getMultiAgentTracesByLesson(id: string): Promise<MultiAgentTraceRecord[]>
  getLessonDetailsById(id: string): Promise<LessonDetailsRecord | null>

  listLessons(): Promise<LessonRecord[]>
  createLesson(input: CreateLessonInput): Promise<LessonRecord>
  updateLessonStatus(id: string, status: 'queued' | 'generating' | 'generated' | 'failed'): Promise<void>
  insertTrace(input: InsertTraceInput): Promise<void>
}



