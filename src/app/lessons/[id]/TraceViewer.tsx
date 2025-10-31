'use client'

import React from 'react'

interface Trace {
  id: string
  lesson_id: string
  attempt_number: number
  timestamp: string
  prompt: string
  model: string
  response: string
  tokens: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  validation: {
    passed: boolean
    errors?: string[]
    forbidden_tokens?: string[]
    score?: number
    issues?: string[]
    suggestions?: string[]
    metrics?: any
  }
  compilation: {
    success: boolean
    tsc_errors?: string[]
    esbuild_errors?: string[]
  }
  outline_metadata?: {
    outline: string
  }
  error?: string
  created_at: string
}

interface TraceViewerProps {
  traces: Trace[]
  lessonTitle: string
}

export default function TraceViewer({ traces, lessonTitle }: TraceViewerProps) {
  const [selectedTrace, setSelectedTrace] = React.useState(null as Trace | null)
  const [expandedSections, setExpandedSections] = React.useState(new Set(['overview']) as Set<string>)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const formatTokens = (tokens: any) => {
    if (!tokens) return 'N/A'
    return `${tokens.total_tokens || 0} (${tokens.prompt_tokens || 0} + ${tokens.completion_tokens || 0})`
  }

  const formatDuration = (trace: Trace, prevTrace?: Trace) => {
    if (!prevTrace) return 'Start'
    const current = new Date(trace.timestamp).getTime()
    const previous = new Date(prevTrace.timestamp).getTime()
    const diff = (current - previous) / 1000
    return `+${diff.toFixed(2)}s`
  }

  const getStatusColor = (trace: Trace) => {
    if (trace.error) return 'red'
    if (!trace.validation.passed) return 'yellow'
    if (!trace.compilation.success) return 'orange'
    return 'green'
  }

  const getStatusIcon = (trace: Trace) => {
    if (trace.error) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }
    if (!trace.validation.passed) {
      return (
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    if (!trace.compilation.success) {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  if (traces.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Traces Available</h3>
        <p className="text-gray-600">Generation traces will appear here once the lesson is generated.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeline View */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Generation Timeline</h3>
            <p className="text-sm text-gray-500">{traces.length} {traces.length === 1 ? 'attempt' : 'attempts'} • {lessonTitle}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>

          <div className="space-y-6">
            {traces.map((trace, index) => {
              const statusColor = getStatusColor(trace)
              const prevTrace = index > 0 ? traces[index - 1] : undefined

              return (
                <div key={trace.id} className="relative pl-16">
                  {/* Timeline dot */}
                  <div className={`absolute left-3 w-6 h-6 rounded-full border-4 border-white shadow-lg flex items-center justify-center
                    ${statusColor === 'green' ? 'bg-green-500' : 
                      statusColor === 'yellow' ? 'bg-yellow-500' : 
                      statusColor === 'orange' ? 'bg-orange-500' : 
                      'bg-red-500'}`}
                  >
                    <span className="text-xs font-bold text-white">{trace.attempt_number}</span>
                  </div>

                  {/* Trace card */}
                  <div
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${selectedTrace?.id === trace.id 
                        ? 'border-blue-500 bg-blue-50 shadow-lg' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'}`}
                    onClick={() => setSelectedTrace(selectedTrace?.id === trace.id ? null : trace)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(trace)}
                        <div>
                          <h4 className="font-semibold text-gray-900">Attempt {trace.attempt_number}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(trace.timestamp).toLocaleString()} • {formatDuration(trace, prevTrace)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge bg-gray-100 text-gray-700 text-xs">
                          {trace.model}
                        </span>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${selectedTrace?.id === trace.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xs text-gray-500">Validation</div>
                        <div className={`text-sm font-semibold ${trace.validation.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {trace.validation.passed ? 'Passed' : 'Failed'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xs text-gray-500">Compilation</div>
                        <div className={`text-sm font-semibold ${trace.compilation.success ? 'text-green-600' : 'text-red-600'}`}>
                          {trace.compilation.success ? 'Success' : 'Failed'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xs text-gray-500">Tokens</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {trace.tokens?.total_tokens || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {selectedTrace?.id === trace.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-fadeIn">
                        {/* Prompt Section */}
                        <CollapsibleSection
                          title="Prompt"
                          icon="📝"
                          expanded={expandedSections.has('prompt')}
                          onToggle={() => toggleSection('prompt')}
                        >
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-96">
                            {trace.prompt}
                          </pre>
                        </CollapsibleSection>

                        {/* Response Section */}
                        <CollapsibleSection
                          title="LLM Response"
                          icon="🤖"
                          expanded={expandedSections.has('response')}
                          onToggle={() => toggleSection('response')}
                        >
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-96">
                            {trace.response}
                          </pre>
                        </CollapsibleSection>

                        {/* Token Usage */}
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">📊</div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-blue-900 mb-2">Token Usage</h5>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-blue-700 font-medium">Prompt:</span>{' '}
                                  <span className="text-blue-900">{trace.tokens?.prompt_tokens || 0}</span>
                                </div>
                                <div>
                                  <span className="text-blue-700 font-medium">Completion:</span>{' '}
                                  <span className="text-blue-900">{trace.tokens?.completion_tokens || 0}</span>
                                </div>
                                <div>
                                  <span className="text-blue-700 font-medium">Total:</span>{' '}
                                  <span className="text-blue-900 font-bold">{trace.tokens?.total_tokens || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Validation Details */}
                        {!trace.validation.passed && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl"></div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-red-900 mb-2">Validation Issues</h5>
                                {trace.validation.issues && trace.validation.issues.length > 0 && (
                                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                                    {trace.validation.issues.map((issue, i) => (
                                      <li key={i}>{issue}</li>
                                    ))}
                                  </ul>
                                )}
                                {trace.validation.suggestions && trace.validation.suggestions.length > 0 && (
                                  <>
                                    <h6 className="font-semibold text-red-900 mt-3 mb-1">Suggestions:</h6>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                                      {trace.validation.suggestions.map((suggestion, i) => (
                                        <li key={i}>{suggestion}</li>
                                      ))}
                                    </ul>
                                  </>
                                )}
                                {trace.validation.score !== undefined && (
                                  <div className="mt-3 text-sm text-red-900">
                                    Quality Score: <span className="font-bold">{(trace.validation.score * 100).toFixed(1)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Compilation Errors */}
                        {!trace.compilation.success && (
                          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">🔧</div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-orange-900 mb-2">Compilation Errors</h5>
                                {trace.compilation.tsc_errors && trace.compilation.tsc_errors.length > 0 && (
                                  <div className="mb-3">
                                    <h6 className="text-sm font-semibold text-orange-800 mb-1">TypeScript Errors:</h6>
                                    <pre className="bg-orange-100 p-3 rounded text-xs text-orange-900 overflow-x-auto">
                                      {trace.compilation.tsc_errors.join('\n')}
                                    </pre>
                                  </div>
                                )}
                                {trace.compilation.esbuild_errors && trace.compilation.esbuild_errors.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-semibold text-orange-800 mb-1">Build Errors:</h6>
                                    <pre className="bg-orange-100 p-3 rounded text-xs text-orange-900 overflow-x-auto">
                                      {trace.compilation.esbuild_errors.join('\n')}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {trace.error && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl"></div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-red-900 mb-2">Error</h5>
                                <p className="text-sm text-red-800">{trace.error}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success State */}
                        {trace.validation.passed && trace.compilation.success && (
                          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl"></div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-green-900">Generation Successful</h5>
                                <p className="text-sm text-green-800">
                                  This attempt successfully generated valid, compilable TypeScript code.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{traces.length}</div>
              <div className="text-xs text-gray-500">Total Attempts</div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {traces.filter(t => t.compilation.success).length}
              </div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {traces.reduce((sum, t) => sum + (t.tokens?.total_tokens || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total Tokens</div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(() => {
                  if (traces.length < 2) return '0s'
                  const first = new Date(traces[0].timestamp).getTime()
                  const last = new Date(traces[traces.length - 1].timestamp).getTime()
                  const diff = (last - first) / 1000
                  return `${diff.toFixed(1)}s`
                })()}
              </div>
              <div className="text-xs text-gray-500">Total Duration</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  children,
  expanded,
  onToggle
}: {
  title: string
  icon: string
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

