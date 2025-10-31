// Registers a custom element <lesson-renderer lesson-id="..."> that renders
// a compiled lesson component into a Shadow DOM with optional scoped CSS.

import React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import presetCss from './preset.css'

type BundleResponse = { jsUrl: string; cssText: string; hash: string }

async function ensureReactGlobals(): Promise<void> {
  const g: any = globalThis as any
  // Bind the app's React instance to globalThis so the compiled module uses the same React
  if (!g.React) g.React = React
  // Provide a ReactDOM-like global for banner compatibility; use the app's client renderer
  if (!g.ReactDOM) g.ReactDOM = ReactDOMClient
}

function defineElementSafely() {
  if (typeof window === 'undefined' || typeof (globalThis as any).HTMLElement === 'undefined' || typeof customElements === 'undefined') {
    return
  }

  class LessonRendererElement extends HTMLElement {
    private root: ShadowRoot | null = null
    private reactRoot: ReactDOMClient.Root | null = null
    private mountVersion: number = 0

    static get observedAttributes() {
      return ['lesson-id']
    }

    connectedCallback() { this.mount() }
    disconnectedCallback() {
      // Defer unmount to avoid race with React concurrent rendering
      queueMicrotask(() => {
        if (this.reactRoot) { this.reactRoot.unmount(); this.reactRoot = null }
        this.root = null
      })
    }
    attributeChangedCallback() { this.mount() }

    private async mount() {
      const currentVersion = ++this.mountVersion
      const lessonId = this.getAttribute('lesson-id')
      if (!lessonId) return
      try {
        // Ensure Shadow root exists early and show a lightweight skeleton while loading
        if (!this.root) { this.root = this.attachShadow({ mode: 'open' }) }
        let existingSkeleton = this.root.querySelector('[data-lr-skeleton]')
        if (!existingSkeleton) {
          const skeleton = document.createElement('div')
          skeleton.setAttribute('data-lr-skeleton', 'true')
          skeleton.innerHTML = `
            <div class="lr-card" style="padding:16px;">
              <div class="lr-skeleton lg" style="width:60%; margin-bottom:12px;"></div>
              <div class="lr-skeleton" style="width:95%; margin-bottom:8px;"></div>
              <div class="lr-skeleton" style="width:90%;"></div>
            </div>`
          const preset = document.createElement('style')
          preset.setAttribute('data-lr-preset', 'true')
          preset.textContent = presetCss
          if (!this.root.querySelector('style[data-lr-preset="true"]')) this.root.appendChild(preset)
          this.root.appendChild(skeleton)
          existingSkeleton = skeleton
        }

        const resp = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/bundle`)
        if (!resp.ok) throw new Error('Bundle not available')
        const bundle = (await resp.json()) as BundleResponse

        // Always render into Shadow DOM with ordered CSS injection
        if (!this.root) { this.root = this.attachShadow({ mode: 'open' }) }
        // Update or insert bundle style (keep host/portal nodes intact)
        const existingBundleStyle = this.root.querySelector('style[data-lr-bundle="true"]') as HTMLStyleElement | null
        if (bundle.cssText) {
          if (existingBundleStyle) {
            existingBundleStyle.textContent = bundle.cssText
          } else {
            const bundleStyle = document.createElement('style')
            bundleStyle.setAttribute('data-lr-bundle', 'true')
            bundleStyle.textContent = bundle.cssText
            const firstChild = this.root.firstChild
            if (firstChild) { this.root.insertBefore(bundleStyle, firstChild) } else { this.root.appendChild(bundleStyle) }
          }
        } else if (existingBundleStyle) {
          existingBundleStyle.remove()
        }
        // Ensure preset exists
        if (!this.root.querySelector('style[data-lr-preset="true"]')) {
          const preset = document.createElement('style')
          preset.setAttribute('data-lr-preset', 'true')
          preset.textContent = presetCss
          this.root.appendChild(preset)
        }
        // Always load frozen Tailwind subset for generated components
        if (!this.root.querySelector('link[data-lr-gen-tailwind="true"]')) {
          const tw = document.createElement('link')
          tw.setAttribute('rel', 'stylesheet')
          tw.setAttribute('href', '/gen-tailwind.css')
          tw.setAttribute('data-lr-gen-tailwind', 'true')
          this.root.appendChild(tw)
        }
        // Ensure host containers exist
        let host = this.root.querySelector('#lr-host') as HTMLDivElement | null
        if (!host) {
          host = document.createElement('div')
          host.setAttribute('id', 'lr-host')
          this.root.appendChild(host)
        }
        let portal = this.root.querySelector('#lr-portal-root') as HTMLDivElement | null
        if (!portal) {
          portal = document.createElement('div')
          portal.setAttribute('id', 'lr-portal-root')
          this.root.appendChild(portal)
        }

        await ensureReactGlobals()
        const mod = await import(/* webpackIgnore: true */ bundle.jsUrl)
        const Comp = (mod as any).default
        if (typeof Comp !== 'function') throw new Error('Invalid component export')

        if (currentVersion !== this.mountVersion) return

        if (!this.reactRoot) {
          this.reactRoot = ReactDOMClient.createRoot(host)
        }
        // Wrap generated component with an error boundary to prevent crashing the host app
        class GeneratedErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
          constructor(props: any) {
            super(props)
            this.state = { hasError: false, error: null }
          }
          static getDerivedStateFromError(error: any) {
            return { hasError: true, error }
          }
          componentDidCatch(error: any, info: any) {
            // Intentionally scoped to shadow; do not rethrow
          }
          render() {
            const state = this.state
            if (state?.hasError) {
              return React.createElement(
                'div',
                { className: 'lr-card', style: { padding: 16, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 8 } },
                React.createElement('div', { style: { fontWeight: 600, marginBottom: 8 } }, 'Generated component error'),
                React.createElement('div', { style: { fontSize: 12, whiteSpace: 'pre-wrap' } }, String(state?.error?.message || 'Unknown error'))
              )
            }
            return (this.props as any).children
          }
        }
        this.reactRoot!.render(
          React.createElement(GeneratedErrorBoundary as any, null, React.createElement(Comp as any))
        )
        // Remove skeleton after successful render
        if (existingSkeleton && existingSkeleton.parentNode) {
          existingSkeleton.parentNode.removeChild(existingSkeleton)
        }
        this.dispatchEvent(new CustomEvent('ready', { bubbles: false }))
      } catch (e: any) {
        this.dispatchEvent(new CustomEvent('error', { detail: { message: e?.message || String(e) }, bubbles: false }))
        if (this.root) { const err = document.createElement('div'); err.textContent = 'Render error'; this.root.appendChild(err) }
      }
    }
  }

  if (!customElements.get('lesson-renderer')) {
    customElements.define('lesson-renderer', LessonRendererElement)
  }
}

defineElementSafely()
export {}


