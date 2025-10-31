import React from 'react'
import { CalloutBlock as CalloutBlockType } from '@domains/lesson/domain/blocks'

function CalloutBlockComponent({ variant, title, content, icon }: CalloutBlockType) {
  const styles = {
    info: { bg: 'bg-gradient-to-r from-blue-50 to-blue-100/50', border: 'border-blue-300', text: 'text-blue-900', iconBg: 'bg-blue-500', icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), title: 'text-blue-800' },
    tip: { bg: 'bg-gradient-to-r from-green-50 to-emerald-100/50', border: 'border-green-300', text: 'text-green-900', iconBg: 'bg-green-500', icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ), title: 'text-green-800' },
    warning: { bg: 'bg-gradient-to-r from-yellow-50 to-yellow-100/50', border: 'border-yellow-300', text: 'text-yellow-900', iconBg: 'bg-yellow-500', icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ), title: 'text-yellow-800' },
    danger: { bg: 'bg-gradient-to-r from-red-50 to-red-100/50', border: 'border-red-300', text: 'text-red-900', iconBg: 'bg-red-500', icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), title: 'text-red-800' },
    success: { bg: 'bg-gradient-to-r from-emerald-50 to-green-100/50', border: 'border-emerald-300', text: 'text-emerald-900', iconBg: 'bg-emerald-500', icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), title: 'text-emerald-800' },
  } as const

  const style = styles[variant]

  return (
    <div className={`${style.bg} ${style.border} border-l-4 rounded-xl shadow-md overflow-hidden my-6`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`${style.iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
            {icon ? <span className="text-xl">{icon}</span> : style.icon}
          </div>
          <div className="flex-1">
            {title && (
              <h4 className={`font-bold mb-2 text-lg ${style.title}`}>{title}</h4>
            )}
            <div className={`${style.text} leading-relaxed`}>
              {content.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0">{line}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(CalloutBlockComponent)


