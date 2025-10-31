import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    const { data: content, error } = await supabaseAdmin.from('lesson_contents')
      .select('typescript_source, compiled_js')
      .eq('lesson_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !content) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Build absolute URL for dynamic import
    const origin = new URL(req.url).origin
    const jsUrl = new URL(`/api/lessons/${encodeURIComponent(id)}/module`, origin).toString()
    const cssText = ''
    const hash = ''
    return NextResponse.json({ jsUrl, cssText, hash })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


