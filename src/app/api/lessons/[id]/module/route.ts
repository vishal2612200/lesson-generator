import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import * as esbuild from 'esbuild'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'

export const dynamic = 'force-dynamic'

function stripImportsAst(src: string): string {
  const ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  traverse(ast, {
    ImportDeclaration(path) {
      path.remove()
    },
  })
  const { code } = generate(ast, { concise: false })
  return code
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const { data: content, error } = await supabaseAdmin.from('lesson_contents')
    .select('typescript_source, compiled_js')
    .eq('lesson_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !content) {
    return new Response('Not found', { status: 404 })
  }

  const tsx = (content as Pick<Database['public']['Tables']['lesson_contents']['Row'], 'typescript_source' | 'compiled_js'>).typescript_source as string | null
  if (!tsx) return new Response('No source', { status: 400 })

  const banner = "const React = (globalThis).React; const ReactDOM = (globalThis).ReactDOM; const { useState, useEffect, useMemo, useCallback, useRef, Fragment } = React;\n"
  const stripped = stripImportsAst(tsx)

  const result = await esbuild.transform(stripped, {
    loader: 'tsx',
    format: 'esm',
    target: 'es2018',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    banner,
  })

  return new Response(result.code, {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}


