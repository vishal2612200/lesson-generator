'use client'

import React from 'react'

export default function ShadowRenderer({ lessonId, title }: { lessonId: string; title: string }) {
  const ref = React.useRef<HTMLElement>(null)
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [wide, setWide] = React.useState(false)
  const [showBg, setShowBg] = React.useState(true)

  React.useEffect(() => {
    let active = true
    import('./lessonElement').catch((e) => active && setError(e?.message || 'Init error'))
    return () => { active = false }
  }, [])

  React.useEffect(() => {
    const el = ref.current as any
    if (!el) return
    const onReady = () => {}
    const onError = (e: CustomEvent) => setError(e.detail?.message || 'Render error')
    el.addEventListener('ready', onReady as any)
    el.addEventListener('error', onError as any)
    return () => {
      el.removeEventListener('ready', onReady as any)
      el.removeEventListener('error', onError as any)
    }
  }, [])

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="text-red-700 font-semibold mb-2">Render error</div>
        <div className="text-red-800 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div
      ref={frameRef}
      className={`border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden ${showBg ? 'bg-gradient-to-br from-gray-50 via-white to-gray-50' : 'bg-white'}`}
    >
      <div className="px-4 py-3 border-b border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500">Generated Component</div>
          <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWide(!wide)}
            className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            title={wide ? 'Constrain width' : 'Widen content'}
          >
            {wide ? 'Constrain' : 'Widen'}
          </button>
          <button
            onClick={() => setShowBg(!showBg)}
            className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            title={showBg ? 'Disable background' : 'Enable background'}
          >
            {showBg ? 'BG Off' : 'BG On'}
          </button>
          <button
            onClick={async () => {
              try {
                const el = frameRef.current
                if (!el) return
                if (document.fullscreenElement) {
                  await document.exitFullscreen()
                } else {
                  await el.requestFullscreen()
                }
              } catch {}
            }}
            className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            title="Toggle fullscreen"
          >
            Fullscreen
          </button>
        </div>
      </div>
      <div className={`mx-auto ${wide ? 'max-w-none' : 'max-w-4xl'} w-full`}>
        <div className="p-4 md:p-6">
          <lesson-renderer
            ref={ref as any}
            lesson-id={lessonId}
            title={title}
            style={{ display: 'block', minHeight: 600 } as any}
          />
        </div>
      </div>
    </div>
  )
}


