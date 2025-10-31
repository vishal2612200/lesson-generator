# Rendering System

Component detection and Shadow DOM rendering for safe execution of React components.

## Overview

The rendering system safely displays generated React components by detecting React component patterns and rendering them in isolated Shadow DOM using a custom web component. All generated content is React components with full interactivity.

## Component Detection

### Detection Logic

```typescript
const isComponentBased = 
  content.typescript_source?.includes("'use client'") ||
  content.typescript_source?.includes('export default function') ||
  content.typescript_source?.includes('export default const') ||
  content.typescript_source?.includes('React.FC') ||
  content.typescript_source?.includes('useState') ||
  content.typescript_source?.includes('useEffect') ||
  content.compiled_js?.includes("'use client'")
```

### Detection Patterns

- `'use client'` directive
- `export default function` declarations
- `export default const` declarations
- `React.FC` type annotations
- `useState` hook usage
- `useEffect` hook usage

### Routing

```typescript
// All generated content is React components
if (isComponentBased) {
  // Render as React component in Shadow DOM
  return <ShadowRenderer lessonId={lesson.id} title={lesson.title} />
} else {
  // Legacy format not supported
  return <LegacyFormatMessage />
}
```

## React Component Rendering

### ShadowRenderer Process

Complete rendering pipeline:

1. **ShadowRenderer Component** - Wraps custom web element with UI controls
2. **Custom Element Registration** - `<lesson-renderer>` element defined
3. **Shadow DOM Creation** - Attaches Shadow DOM (mode: 'open')
4. **Skeleton Display** - Shows loading state
5. **Preset CSS Injection** - Injects scoped CSS styles
6. **Bundle Fetch** - Requests bundle from `/api/lessons/{id}/bundle`
7. **Bundle CSS Injection** - Injects bundle styles (if available)
8. **Tailwind CSS Load** - Loads `/gen-tailwind.css` for generated components
9. **Host Containers** - Creates `#lr-host` and `#lr-portal-root` divs
10. **React Globals Setup** - Ensures React/ReactDOM available on `globalThis`
11. **Module Import** - Dynamically imports ESM JavaScript module
12. **Error Boundary Wrap** - Wraps component in error boundary
13. **React Rendering** - Renders component using ReactDOM.createRoot
14. **Skeleton Removal** - Removes loading state
15. **Ready Event** - Dispatches custom 'ready' event

### ShadowRenderer Component

The ShadowRenderer component wraps the custom web element and provides UI controls:

```typescript
export default function ShadowRenderer({ lessonId, title }) {
  const ref = React.useRef<HTMLElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [wide, setWide] = React.useState(false)
  const [showBg, setShowBg] = React.useState(true)

  // Dynamically import custom element definition
  React.useEffect(() => {
    import('./lessonElement').catch((e) => setError(e?.message || 'Init error'))
  }, [])

  // Listen for custom events from web element
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const onError = (e: CustomEvent) => setError(e.detail?.message || 'Render error')
    el.addEventListener('error', onError)
    return () => el.removeEventListener('error', onError)
  }, [])

  if (error) {
    return <ErrorDisplay error={error} />
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl shadow-sm">
      {/* Header with controls */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Generated Component</div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setWide(!wide)}>Widen/Constrain</button>
          <button onClick={() => setShowBg(!showBg)}>BG On/Off</button>
          <button onClick={() => requestFullscreen()}>Fullscreen</button>
        </div>
      </div>
      
      {/* Custom web element */}
      <div className={`mx-auto ${wide ? 'max-w-none' : 'max-w-4xl'}`}>
        <lesson-renderer
          ref={ref}
          lesson-id={lessonId}
          style={{ display: 'block', minHeight: 600 }}
        />
      </div>
    </div>
  )
}
```

**Features**:
- Error handling with custom event listeners
- Width toggle (wide/narrow layout)
- Background toggle
- Fullscreen support
- Loading state handling

### Custom Web Element

The `<lesson-renderer>` custom element manages the Shadow DOM lifecycle:

```typescript
class LessonRendererElement extends HTMLElement {
  private root: ShadowRoot | null = null
  private reactRoot: ReactDOMClient.Root | null = null
  private mountVersion: number = 0  // Prevents race conditions

  connectedCallback() {
    this.mount()
  }

  private async mount() {
    const currentVersion = ++this.mountVersion
    const lessonId = this.getAttribute('lesson-id')
    if (!lessonId) return

    try {
      // 1. Create Shadow DOM
      if (!this.root) {
        this.root = this.attachShadow({ mode: 'open' })
      }

      // 2. Show skeleton loading state
      this.showSkeleton()

      // 3. Inject preset CSS (scoped styles for Shadow DOM)
      this.injectPresetCSS()

      // 4. Fetch bundle information
      const resp = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/bundle`)
      if (!resp.ok) throw new Error('Bundle not available')
      const bundle = await resp.json()

      // 5. Inject bundle CSS (if available)
      if (bundle.cssText) {
        this.injectBundleCSS(bundle.cssText)
      }

      // 6. Load Tailwind CSS subset for generated components
      this.loadTailwindCSS()

      // 7. Create host containers
      const host = this.ensureHostContainer('#lr-host')
      const portal = this.ensureHostContainer('#lr-portal-root')

      // 8. Ensure React globals are available
      await ensureReactGlobals()

      // 9. Dynamically import ESM module
      const mod = await import(bundle.jsUrl)
      const Component = mod.default
      if (typeof Component !== 'function') {
        throw new Error('Invalid component export')
      }

      // 10. Check mount version (prevent race conditions)
      if (currentVersion !== this.mountVersion) return

      // 11. Create React root if needed
      if (!this.reactRoot) {
        this.reactRoot = ReactDOMClient.createRoot(host)
      }

      // 12. Render component with error boundary
      this.reactRoot.render(
        React.createElement(GeneratedErrorBoundary, null,
          React.createElement(Component)
        )
      )

      // 13. Remove skeleton
      this.removeSkeleton()

      // 14. Dispatch ready event
      this.dispatchEvent(new CustomEvent('ready', { bubbles: false }))
    } catch (e) {
      this.dispatchEvent(new CustomEvent('error', {
        detail: { message: e?.message || String(e) },
        bubbles: false
      }))
      this.showError(e)
    }
  }
}

customElements.define('lesson-renderer', LessonRendererElement)
```

**Key Implementation Details**:

1. **Mount Version Tracking**: Prevents race conditions when component unmounts/remounts quickly
2. **Skeleton Loading**: Shows loading state while bundle/module are fetched
3. **Preset CSS**: Injected first with scoped styles for Shadow DOM isolation
4. **Tailwind CSS Subset**: Loads `/gen-tailwind.css` for generated component styling
5. **Host Containers**: `#lr-host` for main component, `#lr-portal-root` for React portals
6. **React Globals**: `ensureReactGlobals()` binds React/ReactDOM to `globalThis`
7. **Error Boundary**: Wraps generated component to catch render errors
8. **Custom Events**: Dispatches `ready` and `error` events for parent component

### Bundle API Endpoint

**GET** `/api/lessons/{id}/bundle`

Returns bundle information for ShadowRenderer:

```json
{
  "jsUrl": "/api/lessons/{id}/module",
  "cssText": "",
  "hash": ""
}
```

**Implementation**:
```typescript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  
  // Fetch lesson content
  const { data: content } = await supabaseAdmin
    .from('lesson_contents')
    .select('typescript_source, compiled_js')
    .eq('lesson_id', id)
    .single()

  // Build absolute URL for dynamic import
  const origin = new URL(req.url).origin
  const jsUrl = new URL(`/api/lessons/${id}/module`, origin).toString()
  
  return NextResponse.json({
    jsUrl,
    cssText: '',  // Currently empty, reserved for future use
    hash: ''      // Content hash for cache busting
  })
}
```

**Notes**:
- Returns absolute URL for ESM module import
- `cssText` is currently empty (may be used for CSS-in-JS in future)
- `hash` is currently empty (may be used for cache invalidation)

### Module API Endpoint

**GET** `/api/lessons/{id}/module`

Transforms and serves the compiled JavaScript module as ESM:

**Process**:
1. **Fetches TypeScript Source** - Gets `typescript_source` from database
2. **Strips Imports** - Removes all import statements using Babel parser
3. **ESBuild Transformation** - Transforms TSX → ESM JavaScript
4. **React Globals Banner** - Adds React/ReactDOM globals access
5. **Returns Compiled JS** - Returns as ESM module with proper headers

**Implementation**:
```typescript
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  // 1. Fetch TypeScript source from database
  const { data: content } = await supabaseAdmin
    .from('lesson_contents')
    .select('typescript_source, compiled_js')
    .eq('lesson_id', id)
    .single()

  const tsx = content.typescript_source
  if (!tsx) return new Response('No source', { status: 400 })

  // 2. Strip imports using Babel parser
  const stripped = stripImportsAst(tsx)

  // 3. React globals banner
  const banner = `const React = globalThis.React;
const ReactDOM = globalThis.ReactDOM;
const { useState, useEffect, useMemo, useCallback, useRef, Fragment } = React;
`

  // 4. Transform with esbuild
  const result = await esbuild.transform(stripped, {
    loader: 'tsx',
    format: 'esm',
    target: 'es2018',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    banner
  })

  // 5. Return as ESM module
  return new Response(result.code, {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}
```

**Important Details**:
- Uses `format: 'esm'` for ES module output
- `Cache-Control: no-store` ensures fresh modules (no caching)
- Banner provides React hooks via destructuring from `globalThis.React`
- JSX transforms to `React.createElement` calls
- Target is `es2018` for modern browser support

### Import Stripping

```typescript
function stripImportsAst(src: string): string {
  const ast = parse(src, { 
    sourceType: 'module', 
    plugins: ['typescript', 'jsx'] 
  })
  
  traverse(ast, {
    ImportDeclaration(path) {
      path.remove()  // Remove all imports
    },
  })
  
  return generate(ast).code
}
```

## Storage Strategy

### TypeScript Source

- **`typescript_source`**: Contains the full TSX React component code
- Stored in `lesson_contents` table
- Used for rendering React components

### Module Compilation

- **Server-side compilation** using esbuild
- Transforms TypeScript to ESM JavaScript on-demand
- No client-side Babel transformation
- ESM modules loaded dynamically via dynamic import

## Security Considerations

### Shadow DOM Isolation

Shadow DOM provides isolation:

- **Style Scoping** - CSS isolated to Shadow DOM
- **DOM Isolation** - Element tree isolated from parent
- **Event Isolation** - Events don't bubble to parent (by default)
- **Script Isolation** - JavaScript execution within Shadow DOM

### Content Security

- Generated code validated before rendering
- Security checks in place
- No external imports allowed
- No DOM manipulation outside Shadow DOM
- React globals provided via `globalThis` (shared instance)

### Variable Scope

- React globals provided via `globalThis`
- Component code uses app's React instance (shared)
- Isolated execution environment within Shadow DOM
- No access to parent window variables
- React hooks available via banner: `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `Fragment`

### React Globals Setup

```typescript
async function ensureReactGlobals(): Promise<void> {
  const g = globalThis as any
  // Bind the app's React instance to globalThis
  if (!g.React) g.React = React
  // Provide ReactDOM-like global for compatibility
  if (!g.ReactDOM) g.ReactDOM = ReactDOMClient
}
```

This ensures the dynamically imported module uses the same React instance as the host app, preventing version conflicts and enabling proper React features like context sharing.

### Error Boundaries

Generated components are automatically wrapped in an error boundary:

```typescript
class GeneratedErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: any, info: any) {
    // Intentionally scoped to shadow; do not rethrow
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="lr-card" style={{ padding: 16, border: '1px solid #fecaca', background: '#fef2f2' }}>
          <div style={{ fontWeight: 600 }}>Generated component error</div>
          <div style={{ fontSize: 12 }}>{this.state.error.message}</div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Benefits**:
- Errors caught within Shadow DOM
- Prevents crashes from affecting main app
- Error messages displayed within Shadow DOM
- Custom error styling via preset CSS

## Performance Optimization

### Lazy Loading

- Components loaded on demand
- Custom element definition loaded dynamically
- Bundle fetched only when ShadowRenderer mounts
- Module import deferred until Shadow DOM is ready
- Shadow DOM created only when component connects

### Loading States

- **Skeleton State**: Shows lightweight loading UI while fetching bundle
- **Preset CSS**: Injected immediately for consistent styling
- **Progressive Enhancement**: Component renders incrementally

### Caching

- Module API uses `Cache-Control: no-store` (always fresh, no stale code)
- Bundle endpoint could cache (currently returns fresh)
- Shadow DOM styles cached per element instance
- Preset CSS injected once per element (reused on remount)

### Optimization

- **Server-side esbuild transformation**: Fast TypeScript → JavaScript compilation
- **ESM modules**: Enable tree shaking and modern import patterns
- **Shared React instance**: Components share app's React (memory efficient)
- **Mount version tracking**: Prevents unnecessary re-renders on rapid remounts
- **Error boundary**: Prevents full component tree re-renders on errors

## Troubleshooting

### Component Not Rendering

**Symptoms**: White screen or error

**Check**:
1. Console errors in Shadow DOM
2. Module import failures
3. React globals availability
4. Bundle API endpoint accessibility

**Fix**: Check network tab for bundle/module requests

### Module Import Errors

**Symptoms**: "Failed to fetch module" or import errors

**Check**:
1. Module API endpoint working (`/api/lessons/{id}/module`)
2. ESBuild transformation success
3. Import statements stripped correctly
4. ESM format correct

**Fix**: Check `/api/lessons/{id}/module` response in network tab

### Style Issues

**Symptoms**: Missing styles or layout broken

**Check**:
1. Preset CSS injected
2. Bundle CSS text available
3. Shadow DOM style isolation
4. Tailwind CSS subset loaded (`/gen-tailwind.css`)

**Fix**: Verify style elements in Shadow DOM via DevTools

### React Globals Missing

**Symptoms**: "React is not defined" errors

**Check**:
1. `globalThis.React` available
2. Banner added to module correctly
3. React instance shared properly

**Fix**: Ensure React is bound to `globalThis` before module import

## Next Steps

- **[Security Model](/docs/architecture/security)** - Security validation
- **[Development](/docs/development/setup)** - Development setup
- **[API Reference](/docs/api/rest-api)** - Bundle and Module endpoints
