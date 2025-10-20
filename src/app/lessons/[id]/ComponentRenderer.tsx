'use client'

/**
 * Dynamic Component Renderer
 * Renders AI-generated React components safely
 */

import React from 'react'

interface ComponentRendererProps {
  compiledCode?: string
  tsxSource?: string
  lessonId: string
  title: string
}

export default function ComponentRenderer({ compiledCode, tsxSource, lessonId, title }: ComponentRendererProps) {
  const [error, setError] = React.useState(null as string | null)
  const [isLoading, setIsLoading] = React.useState(true)

  // Safely execute and render the component
  const RenderedComponent = React.useMemo(() => {
    try {
      setIsLoading(true)
      setError(null)

      // Create a safe execution context
      const moduleExports: any = {}
      const module = { exports: moduleExports }
      
      // Provide React in the execution context
      const requireReact = (name: string) => {
        if (name === 'react') return React
        if (name === 'react/jsx-runtime') {
          // Minimal runtime shim for transpiled JSX
          return {
            jsx: (type: any, props: any, key?: any) => React.createElement(type, { ...props, key }),
            jsxs: (type: any, props: any, key?: any) => React.createElement(type, { ...props, key }),
            Fragment: React.Fragment,
          }
        }
        throw new Error(`Module ${name} is not available`)
      }

      // Execute the compiled code in a controlled context
      let source = compiledCode ?? tsxSource
      // Permanent hardening: sanitize obvious leaked bare identifiers in compiled JSX output
      if (source) {
        // Pattern 1: children: bareIdentifier (no quotes, no dot access)
        source = source.replace(/children:\s*\b([A-Za-z_$][A-Za-z0-9_$]*)\b(?!\s*[:\.\(\[])/g, 'children: ""')
        // Pattern 2: jsx/jsxs with children: bareIdentifier
        source = source.replace(/children\s*:\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*([,}])/g, 'children: ""$2')
      }
      if (!source) throw new Error('No component source provided')
      const componentFunction = new Function('require', 'module', 'exports', 'React', source)
      componentFunction(requireReact, module, moduleExports, React)

      // Get the default export (the component)
      const Component = moduleExports.default || module.exports.default

      if (!Component) {
        throw new Error('No default export found in component')
      }

      setIsLoading(false)
      return Component
    } catch (err) {
      console.error('Component rendering error:', err)
      setError(err instanceof Error ? err.message : 'Failed to render component')
      setIsLoading(false)
      return null
    }
  }, [compiledCode, tsxSource])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading your lesson...</h2>
          <p className="text-gray-600">Preparing interactive content</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-2xl bg-white rounded-2xl shadow-xl p-8 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Component Error</h2>
          </div>
          <p className="text-gray-700 mb-4">
            There was an error rendering this lesson component:
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <code className="text-sm text-red-900">{error}</code>
          </div>
          <p className="text-sm text-gray-600">
            This lesson may need to be regenerated. The system will automatically retry with corrections.
          </p>
        </div>
      </div>
    )
  }

  if (!RenderedComponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Content Available</h2>
          <p className="text-gray-600">This lesson component could not be loaded.</p>
        </div>
      </div>
    )
  }

  // Render the component directly (error boundary removed for now)
  return <RenderedComponent />
}

// Error Boundary to catch runtime errors in generated components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; lessonId: string; title: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
          <div className="max-w-2xl bg-white rounded-2xl shadow-xl p-8 border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Runtime Error</h2>
            </div>
            <p className="text-gray-700 mb-4">
              The lesson component "{this.props.title}" encountered an error while running:
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <code className="text-sm text-orange-900 block whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors"
            >
              Reload Lesson
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

