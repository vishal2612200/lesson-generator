import { CodeBlock as CodeBlockType } from '../types/blocks'
import React from 'react'

export default function CodeBlock({ language, code, title, highlightLines = [] }: CodeBlockType) {
  const [copied, setCopied] = React.useState(false)
  const lines = code.split('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 group">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-xl border-b-2 border-blue-500/30">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            {title && (
              <span className="text-gray-200 text-sm font-semibold">{title}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-md uppercase">
              {language}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-gray-950 text-gray-100 p-5 overflow-x-auto font-mono text-sm rounded-b-xl border border-gray-800 shadow-2xl">
        <pre className="leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div 
                key={i}
                className={`transition-colors ${highlightLines.includes(i + 1) ? 'bg-blue-500/20 border-l-2 border-blue-400 -ml-5 pl-4 pr-1' : ''}`}
              >
                <span className="text-gray-600 select-none mr-4 inline-block w-8 text-right">{i + 1}</span>
                <span className="text-gray-200">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}


