'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
const ShadowRenderer = dynamic(() => import('../renderer/ShadowRenderer'), { ssr: false })
const TraceViewer = dynamic(() => import('@domains/lesson/ui/TraceViewer'), { ssr: false })

interface Lesson {
  id: string
  title: string
  outline: string
  status: 'queued' | 'generating' | 'generated' | 'failed'
  created_at: string
  updated_at: string
}

interface LessonContent {
  id: string
  lesson_id: string
  typescript_source: string
  compiled_js: string | null
  version: number
  created_at: string
}

interface LessonTrace {
  id: string
  lesson_id: string
  attempt_number: number
  timestamp: string
  prompt: string
  model: string
  response: string
  tokens?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  validation?: {
    success?: boolean
    errors?: string[]
    warnings?: string[]
  }
  compilation: {
    success: boolean
    errors?: string[]
  }
  created_at: string
}

export default function LessonPage() {
  const params = useParams()
  const id = params?.id as string

  const [lesson, setLesson] = React.useState(null as Lesson | null)
  const [content, setContent] = React.useState(null as LessonContent | null)
  const [traces, setTraces] = React.useState([] as LessonTrace[])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [showTraces, setShowTraces] = React.useState(false)

  const fetchLesson = async () => {
    try {
      const response = await fetch(`/api/lessons/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch lesson')
      }

      const { data } = await response.json()
      console.log('Lesson data received:', {
        lesson: data.lesson?.title,
        hasContent: !!data.content,
        tracesCount: data.traces?.length || 0,
        traces: data.traces
      })
      setLesson(data.lesson)
      setContent(data.content)
      setTraces(data.traces || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!id) return

    fetchLesson()

    const channel = supabase
      .channel(`lesson-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lessons',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchLesson()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_contents',
          filter: `lesson_id=eq.${id}`,
        },
        () => {
          fetchLesson()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])
  
  // Fallback polling in case realtime updates are unavailable (local dev or Realtime disabled)
  React.useEffect(() => {
    if (!id) return
    // Only poll while lesson is in a non-terminal state or content hasn't arrived
    const shouldPoll = lesson == null || lesson.status === 'queued' || lesson.status === 'generating' || (lesson.status === 'generated' && !content)
    if (!shouldPoll) return

    const intervalId = setInterval(() => {
      fetchLesson()
    }, 2500)

    return () => {
      clearInterval(intervalId)
    }
  }, [id, lesson?.status, content])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading your lesson...</p>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-xl text-red-600 mb-6">{error || 'Lesson not found'}</p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
            <StatusBadge status={lesson.status} />
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero Card */}
          <div className="card p-8 mb-8 animate-fadeIn">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{lesson.title}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(lesson.created_at).toLocaleDateString()}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last updated {new Date(lesson.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {lesson.outline && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-lg font-bold text-gray-900">Lesson Outline</h2>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{lesson.outline}</p>
                </div>
              </div>
            )}
          </div>

          {(lesson.status === 'generating' || (lesson.status === 'generated' && !content)) && (
            <div className="card p-6 mb-8 bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-300 animate-pulse-soft">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Generating your lesson...</h3>
                  <p className="text-sm text-blue-700">This may take a minute. The AI is crafting engaging content for you.</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span>Processing your outline and generating interactive content...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {lesson.status === 'failed' && (
            <div className="card p-6 mb-8 bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-red-900 mb-1">Generation failed</h3>
                  <p className="text-sm text-red-700">Check generation traces below for details.</p>
                </div>
              </div>
            </div>
          )}

          {/* Render content if available, even if status mismatches (e.g., 'failed') */}
          {content && (
            <div className="mt-6">
              {(() => {
                // Check if this is a component-based lesson (has 'use client' directive or React component patterns)
                const isComponentBased = content.typescript_source?.includes("'use client'") ||
                                       content.typescript_source?.includes('"use client"') ||
                                       content.typescript_source?.includes('export default function') ||
                                       content.typescript_source?.includes('export default const') ||
                                       content.typescript_source?.includes('React.FC') ||
                                       content.typescript_source?.includes('useState') ||
                                       content.typescript_source?.includes('useEffect') ||
                                       content.compiled_js?.includes("'use client'") || 
                                       content.compiled_js?.includes('"use client"')
                
                if (isComponentBased) {
                  return (
                    <ShadowRenderer lessonId={lesson.id} title={lesson.title} />
                  )
                } else {
                  // Legacy format not supported - component-based lessons only
                  return (
                    <div className="card p-8 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Legacy Format Not Supported</h3>
                      <p className="text-gray-600 mb-4">
                        This lesson was generated using a legacy format that is no longer supported.
                        Please regenerate the lesson to use the modern component-based format.
                      </p>
                    </div>
                  )
                }
              })()}
            </div>
          )}

          {/* AI Traces Section - Always show */}
          <div className="mb-8">
            <button
              onClick={() => setShowTraces((s) => !s)}
              className="card p-6 w-full flex items-center justify-between text-left group hover:shadow-lg transition-shadow mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">AI Generation Traces & Debug Info</h3>
                  <p className="text-sm text-gray-500">
                    {traces.length > 0 ? (
                      <>
                        {traces.length} {traces.length === 1 ? 'attempt' : 'attempts'} • 
                        View complete workflow with prompts, responses, and metrics
                      </>
                    ) : (
                      <>
                        {lesson.status === 'generating' ? 'Generating... traces will appear here' : 
                         lesson.status === 'queued' ? 'Queued - traces will appear when generation starts' :
                         'No traces available for this lesson'}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {traces.length > 0 ? (
                  <span className="badge bg-blue-100 text-blue-700">
                    {traces.filter((t: LessonTrace) => t.compilation.success).length} successful
                  </span>
                ) : (
                  <span className="badge bg-gray-100 text-gray-600">
                    No traces yet
                  </span>
                )}
                <svg className={`w-6 h-6 text-gray-400 transition-transform ${showTraces ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showTraces && (
              <div className="animate-fadeIn">
                {traces.length > 0 ? (
                  <TraceViewer
                    traces={
                      traces.map(t => ({
                        ...t,
                        tokens: t.tokens || { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
                        validation: t.validation || { passed: false },
                      })) as any
                    }
                    lessonTitle={lesson.title}
                  />
                ) : (
                  <div className="card p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Traces Available</h3>
                    {lesson.status === 'generating' ? (
                      <p className="text-gray-600 mb-4">
                        The lesson is currently being generated. Traces will appear here as the AI processes your request.
                        <br />
                        <span className="text-sm text-gray-500 mt-2 block">Refresh the page in a few moments to see the traces.</span>
                      </p>
                    ) : lesson.status === 'queued' ? (
                      <p className="text-gray-600">
                        The lesson is queued for generation. Traces will appear once processing begins.
                      </p>
                    ) : lesson.status === 'failed' ? (
                      <p className="text-gray-600">
                        This lesson generation failed, but no trace data was captured.
                        Try regenerating the lesson to see detailed traces.
                      </p>
                    ) : (
                      <div className="text-gray-600">
                        <p className="mb-4">
                          This lesson was generated before tracing was implemented, so no trace data is available.
                        </p>
                        <p className="text-sm text-gray-500">
                          <strong>Note:</strong> All new lessons will have comprehensive traces including:
                        </p>
                        <ul className="text-left max-w-md mx-auto mt-3 space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Complete prompts sent to the AI</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Full AI responses and generated code</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Token usage and cost tracking</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Validation and compilation results</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Quality scores and improvement suggestions</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    queued: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    },
    generating: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )
    },
    generated: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    failed: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 ${config.color}`}>
      {config.icon}
      <span className="capitalize">{status}</span>
    </span>
  )
}


