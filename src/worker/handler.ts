import { generateLesson } from './generation/generator'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function handler(event: any) {
  const { lessonId } = event

  if (!lessonId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'lessonId is required' }),
    }
  }

  try {
    // Prefer new internal API to run the components pipeline and persist lesson_contents
    const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.APP_ORIGIN || 'http://localhost:3000'
    const res = await fetch(`${urlBase}/api/internal/generate/${lessonId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sign-Key': process.env.SIGNING_KEY || ''
      }
    })
    if (!res.ok) {
      // Fall back to legacy generator if internal API is unavailable
      await generateLesson(lessonId)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    }
  } catch (error) {
    console.error('Handler error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

