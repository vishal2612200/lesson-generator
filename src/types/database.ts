export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      lessons: {
        Row: {
          id: string
          title: string
          outline: string
          status: 'queued' | 'generating' | 'generated' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          outline: string
          status?: 'queued' | 'generating' | 'generated' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          outline?: string
          status?: 'queued' | 'generating' | 'generated' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      lesson_contents: {
        Row: {
          id: string
          lesson_id: string
          typescript_source: string
          compiled_js: string | null
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          typescript_source: string
          compiled_js?: string | null
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          typescript_source?: string
          compiled_js?: string | null
          version?: number
          created_at?: string
        }
      }
      traces: {
        Row: {
          id: string
          lesson_id: string
          attempt_number: number
          timestamp: string
          prompt: string
          model: string
          response: string
          tokens: Json
          validation: Json
          compilation: Json
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          attempt_number: number
          timestamp?: string
          prompt: string
          model: string
          response: string
          tokens?: Json
          validation: Json
          compilation: Json
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          attempt_number?: number
          timestamp?: string
          prompt?: string
          model?: string
          response?: string
          tokens?: Json
          validation?: Json
          compilation?: Json
          created_at?: string
        }
      }
      generation_attempts: {
        Row: {
          id: string
          lesson_id: string
          attempt_number: number
          started_at: string
          finished_at: string | null
          status: 'in_progress' | 'success' | 'failed'
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          attempt_number: number
          started_at?: string
          finished_at?: string | null
          status: 'in_progress' | 'success' | 'failed'
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          attempt_number?: number
          started_at?: string
          finished_at?: string | null
          status?: 'in_progress' | 'success' | 'failed'
          error?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

