// Minimal, non-invasive preset for Shadow DOM isolation. Scoped via :host.

const presetCss = `
:host {
  color: inherit;
  font: inherit;
}
:host *, :host *::before, :host *::after {
  box-sizing: border-box;
}

/* Tokens (conservative defaults) */
:host {
  --lr-color-fg: currentColor;
  --lr-color-muted: rgba(0,0,0,0.6);
  --lr-color-border: rgba(0,0,0,0.12);
  --lr-bg-surface: transparent;
  --lr-bg-elevated: #ffffff;
  --lr-primary: #0ea5e9; /* sky-500 */
  --lr-primary-600: #0284c7; /* sky-600 */
  --lr-primary-700: #0369a1; /* sky-700 */
  --lr-neutral-900: #0f172a; /* slate-900 */
  --lr-radius: 12px;
  --lr-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10);
  --lr-ring: 0 0 #0000;
}
@media (prefers-color-scheme: dark) {
  :host {
    --lr-color-muted: rgba(255,255,255,0.7);
    --lr-color-border: rgba(255,255,255,0.16);
  }
}

/* Typography baseline */
:host h1 { font-size: 1.875rem; line-height: 2.25rem; margin: 1rem 0; }
:host h2 { font-size: 1.5rem; line-height: 2rem; margin: 0.875rem 0; }
:host h3 { font-size: 1.25rem; line-height: 1.75rem; margin: 0.75rem 0; }
:host p { margin: 0.5rem 0; }
:host ul, :host ol { padding-left: 1.25rem; margin: 0.5rem 0; }
:host code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.875em; }
:host pre { background: rgba(127,127,127,0.08); border: 1px solid var(--lr-color-border); padding: 0.75rem; border-radius: var(--lr-radius); overflow: auto; }

/* Containers */
:host .lr-card { background: var(--lr-bg-surface); border: 1px solid var(--lr-color-border); border-radius: var(--lr-radius); box-shadow: var(--lr-shadow); }
:host .lr-muted { color: var(--lr-color-muted); }

/* Skeleton */
:host .lr-skeleton { display: block; width: 100%; height: 1rem; background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12), rgba(0,0,0,0.05)); background-size: 200% 100%; border-radius: 8px; animation: lr-shimmer 1.2s ease-in-out infinite; }
:host .lr-skeleton.sm { height: 0.75rem; }
:host .lr-skeleton.lg { height: 1.25rem; }
@keyframes lr-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

/* Minimal utility subset to support common generated classes (Tailwind-like) */
/* Layout & sizing */
:host .max-w-xl { max-width: 36rem; }
  :host .max-w-md { max-width: 28rem; }
:host .max-w-4xl { max-width: 56rem; }
:host .w-full { width: 100%; }
:host .h-64 { height: 16rem; }
:host .mx-auto { margin-left: auto; margin-right: auto; }
  :host .flex { display: flex; }
  :host .flex-col { flex-direction: column; }
  :host .items-center { align-items: center; }
  :host .justify-center { justify-content: center; }
  :host .backdrop-blur { backdrop-filter: blur(8px); }

/* Spacing */
:host .p-4 { padding: 1rem; }
:host .p-6 { padding: 1.5rem; }
  :host .p-8 { padding: 2rem; }
:host .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
:host .px-4 { padding-left: 1rem; padding-right: 1rem; }
:host .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
:host .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
:host .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
:host .mt-2 { margin-top: 0.5rem; }
:host .mt-4 { margin-top: 1rem; }
:host .mb-2 { margin-bottom: 0.5rem; }
:host .mb-4 { margin-bottom: 1rem; }
:host .mr-2 { margin-right: 0.5rem; }
:host .ml-2 { margin-left: 0.5rem; }
:host .ml-5 { margin-left: 1.25rem; }
  :host .space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.5rem; }
  :host .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }

/* SVG safety defaults to prevent overflow and ensure consistent text */
:host svg { overflow: hidden; }
:host svg text { font-size: 12px; line-height: 1; dominant-baseline: middle; }

/* Typography */
:host .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  :host .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  :host .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  :host .text-base { font-size: 1rem; line-height: 1.5rem; }
:host .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
:host .font-bold { font-weight: 700; }
:host .font-semibold { font-weight: 600; }
:host .text-white { color: #ffffff; }
  :host .text-blue-700 { color: #1d4ed8; }
  :host .text-gray-700 { color: #374151; }

/* Lists */
:host .list-disc { list-style-type: disc; }

/* Borders & radius */
:host .border { border: 1px solid var(--lr-color-border); }
  :host .border-gray-200 { border-color: #e5e7eb; }
  :host .border-gray-300 { border-color: #d1d5db; }
  :host .border-green-500 { border-color: #22c55e; }
:host .rounded { border-radius: 0.25rem; }
:host .rounded-lg { border-radius: 0.5rem; }
  :host .rounded-xl { border-radius: 0.75rem; }
  :host .rounded-2xl { border-radius: 1rem; }
  :host .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
  :host .shadow { box-shadow: var(--lr-shadow); }
  :host .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  :host .ring-1 { box-shadow: var(--lr-ring), 0 0 0 1px var(--lr-color-border); }
  :host .ring-slate-200 { --lr-color-border: #e5e7eb; }
  :host .ring-white\/20 { --lr-color-border: rgba(255,255,255,0.2); }
  :host .ring-offset-1 { box-shadow: 0 0 0 1px #fff inset, 0 0 0 1px var(--lr-color-border); }

/* Buttons & backgrounds (palette subset) */
:host .bg-blue-500 { background-color: #3b82f6; }
  :host .bg-blue-700 { background-color: #1d4ed8; }
:host .bg-yellow-500 { background-color: #eab308; }
  :host .bg-yellow-700 { background-color: #a16207; }
:host .bg-green-500 { background-color: #22c55e; }
  :host .bg-green-700 { background-color: #15803d; }
:host .bg-purple-500 { background-color: #a855f7; }
  :host .bg-purple-700 { background-color: #6d28d9; }
  :host .bg-gray-50 { background-color: #f9fafb; }
  :host .bg-gray-100 { background-color: #f3f4f6; }
  :host .bg-slate-100 { background-color: #f1f5f9; }
  :host .bg-sky-50 { background-color: #f0f9ff; }
  :host .from-slate-50 { background-image: linear-gradient(to bottom right, #f8fafc, var(--tw-gradient-to, rgba(255,255,255,0))); }
  :host .to-sky-50 { --tw-gradient-to: #f0f9ff; }
  :host .from-sky-500 { background-image: linear-gradient(to right, #0ea5e9, var(--tw-gradient-to, rgba(255,255,255,0))); }
  :host .to-indigo-600 { --tw-gradient-to: #4f46e5; }
  :host .from-slate-100 { background-image: linear-gradient(to right, #f1f5f9, var(--tw-gradient-to, rgba(255,255,255,0))); }
  :host .to-sky-100 { --tw-gradient-to: #e0f2fe; }
  :host .bg-gradient-to-r { background-size: cover; }
  :host .bg-gradient-to-br { background-size: cover; }

  /* Hover utilities */
  :host .hover\:bg-blue-700:hover { background-color: #1d4ed8; }
  :host .hover\:bg-green-700:hover { background-color: #15803d; }
  :host .hover\:bg-purple-700:hover { background-color: #6d28d9; }
  :host .hover\:bg-yellow-700:hover { background-color: #a16207; }

  /* Transitions */
  :host .transition-colors { transition-property: color, background-color, border-color; }
  :host .duration-300 { transition-duration: 300ms; }
  :host .transition-all { transition: all 200ms ease-out; }
  :host .duration-200 { transition-duration: 200ms; }
  :host .ease-out { transition-timing-function: cubic-bezier(0,0,0.2,1); }
  :host .hover\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  :host .hover\:ring-sky-300:hover { --lr-color-border: #7dd3fc; }

/* Modern button styles */
:host .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 0.875rem; border-radius: 0.75rem; font-weight: 600; transition: all 200ms ease-out; line-height: 1.25rem; }
:host .btn:disabled { opacity: 0.6; cursor: not-allowed; }
:host .btn-primary { color: #ffffff; background: var(--lr-primary); box-shadow: var(--lr-shadow); }
:host .btn-primary:hover { background: var(--lr-primary-600); box-shadow: 0 6px 12px -2px rgba(2,132,199,0.25); }
:host .btn-primary:active { background: var(--lr-primary-700); transform: translateY(0.5px); }
:host .btn-outline { color: var(--lr-neutral-900); background: #ffffff; box-shadow: var(--lr-ring), 0 0 0 1px #e5e7eb inset; }
:host .btn-outline:hover { box-shadow: var(--lr-ring), 0 0 0 1px #7dd3fc inset; }

/* Modern input styles */
:host .input { width: 100%; background: #ffffff; border-radius: 0.75rem; padding: 0.625rem 0.875rem; box-shadow: var(--lr-ring), 0 0 0 1px #e5e7eb inset; transition: box-shadow 200ms ease-out, background 200ms ease-out; }
:host .input::placeholder { color: rgba(15,23,42,0.45); }
:host .input:focus { outline: none; box-shadow: 0 0 0 2px #bae6fd inset, 0 0 0 1px #7dd3fc; background: #f8fafc; }
:host .input-lg { padding: 0.75rem 1rem; border-radius: 1rem; }

/* Accessible focus outline */
:host button:focus, :host input:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
`

export default presetCss


