'use client'

import React from 'react'

interface IframeTSXRendererProps {
  code: string
  title: string
}

export default function IframeTSXRenderer({ code, title }: IframeTSXRendererProps) {
  const [error, setError] = React.useState(null as string | null)
  const [loading, setLoading] = React.useState(true)
  const [Component, setComponent] = React.useState(null as any)

  // Basic front-end security validation
  const validateCode = (src: string): string | null => {
    const BYTE_LIMIT = 200 * 1024 // 200KB
    if (new Blob([src]).size > BYTE_LIMIT) {
      return `Code too large (>${BYTE_LIMIT} bytes).`
    }
    const forbiddenPatterns: Array<[RegExp, string]> = [
      [/\bfetch\s*\(/i, 'fetch is not allowed'],
      [/\beval\s*\(/i, 'eval is not allowed'],
      [/new\s+Function\s*\(/i, 'new Function is not allowed'],
      [/import\s*\(\s*['"]http/i, 'Dynamic import from URL is not allowed'],
      [/import\s+[^;]*from\s+['"]https?:\/\//i, 'External URL imports are not allowed'],
      [/\bXMLHttpRequest\b/i, 'XHR is not allowed'],
      [/\bWebSocket\b/i, 'WebSocket is not allowed'],
    ]
    
    // Check for external URLs but allow XML namespaces
    const urlPattern = /https?:\/\/[^\s'"]+/i
    if (urlPattern.test(src)) {
      // Allow common XML namespaces
      const allowedNamespaces = [
        'http://www.w3.org/2000/svg',
        'http://www.w3.org/1999/xlink',
        'http://www.w3.org/XML/1998/namespace'
      ]
      
      const urls = src.match(urlPattern)
      if (urls) {
        for (const url of urls) {
          if (!allowedNamespaces.includes(url)) {
            return 'External URLs are not allowed in generated code'
          }
        }
      }
    }
    for (const [re, msg] of forbiddenPatterns) {
      if (re.test(src)) return msg
    }
    return null
  }

  React.useEffect(() => {
    const processCode = async () => {
      setLoading(true)
      setError(null)
      setComponent(null)

      const violation = validateCode(code)
      if (violation) {
        setError(`Security violation: ${violation}`)
        setLoading(false)
        return
      }

      try {
        // Create a unique iframe ID for this component
        const iframeId = `lesson-iframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Create iframe with the processed code embedded
        const sandboxHtml = buildSandboxHtml(code, iframeId)
        
        // Create a blob URL instead of data URL to avoid storage restrictions
        const blob = new Blob([sandboxHtml], { type: 'text/html' })
        const iframeSrc = URL.createObjectURL(blob)
        
        setLoading(false)
        setComponent(() => () => {
          // Cleanup blob URL when component unmounts
          React.useEffect(() => {
            return () => {
              URL.revokeObjectURL(iframeSrc)
            }
          }, [])
          
          return (
            <iframe
              src={iframeSrc}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title={title}
              sandbox="allow-scripts allow-same-origin"
            />
          )
        })
      } catch (err) {
        setError(`Code transformation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setLoading(false)
      }
    }
    
    processCode()
  }, [code, title])

  return (
    <div className="min-h-[400px]">
      {loading && (
        <div className="card p-12 flex flex-col items-center justify-center min-h-[400px] animate-fadeIn">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Interactive Component</h3>
          <p className="text-gray-600 text-center max-w-md">
            Preparing your AI-generated interactive lesson...
          </p>
        </div>
      )}
      
      {error && (
        <div className="card p-8 border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 animate-fadeIn">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-2">Component Error</h3>
              <p className="text-red-800 mb-4">
                There was an issue loading this interactive component:
              </p>
              <div className="bg-red-100 border-l-4 border-red-500 rounded-lg p-4">
                <code className="text-sm text-red-900 font-mono">{error}</code>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !error && Component && (
        <div className="card overflow-hidden animate-fadeIn">
          {/* Component Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Interactive Component</h3>
                  <p className="text-blue-100 text-sm">AI-Generated Learning Experience</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                  Live
                </span>
              </div>
            </div>
          </div>
          
          {/* Component Content */}
          <div className="p-6 bg-gradient-to-br from-white to-gray-50 min-h-[300px]">
            <Component 
              title={title}
              description="Interactive learning component generated by AI"
            />
          </div>
          
          {/* Component Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Securely rendered in isolated environment</span>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !error && !Component && (
        <div className="card p-8 border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100/50 animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-900 mb-2">Component Not Available</h3>
              <p className="text-yellow-800">
                The component could not be rendered. This lesson may need to be regenerated.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildSandboxHtml(code: string, iframeId: string): string {
  // Process the code to remove imports and exports
  let processedCode = code.replace(/'use client';\s*/, '').replace(/^'use client';/, '')
  
  // Remove all import statements - they cause issues in the sandbox
  processedCode = processedCode.replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*/g, '')
  processedCode = processedCode.replace(/import\s*{\s*[^}]*\s*}\s*from\s*['"][^'"]+['"];?\s*/g, '')
  processedCode = processedCode.replace(/import\s+['"][^'"]+['"];?\s*/g, '')
  
  // Handle export default - convert to regular function/const declaration and assign to global
  processedCode = processedCode.replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
  processedCode = processedCode.replace(/export\s+default\s+const\s+(\w+)/g, 'const $1')
  
  // Handle export default with arrow functions more carefully
  processedCode = processedCode.replace(/export\s+default\s+\(\)\s*=>/g, '() =>')
  processedCode = processedCode.replace(/export\s+default\s+\([^)]*\)\s*=>/g, (match) => match.replace('export default ', ''))
  
  // Remove remaining export default statements
  processedCode = processedCode.replace(/export\s+default\s+/g, '')
  processedCode = processedCode.replace(/export\s*{\s*[^}]*\s*}/g, '')
  processedCode = processedCode.replace(/export\s+/g, '')
  
  // Final cleanup - remove any remaining export keywords
  processedCode = processedCode.replace(/\bexport\b/g, '')
  
  // Clean up any orphaned return statements that might be outside functions
  // This can happen if export default was removed incorrectly
  // Only comment out return statements that are at the top level (not inside functions)
  const lines = processedCode.split('\n');
  let braceCount = 0;
  let processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Count braces to track if we're inside a function
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;
    
    // If we're at the top level (braceCount === 0) and there's a return statement, comment it out
    if (braceCount === 0 && trimmedLine.startsWith('return ')) {
      processedLines.push(line.replace(/^(\s*)return\s+/, '$1// return '));
    } else {
      processedLines.push(line);
    }
  }
  
  processedCode = processedLines.join('\n');
  
  // Extract component name from the original code - look for actual component declarations
  let componentName = 'Component'
  
  // Look for function components first
  const functionMatch = processedCode.match(/function\s+(\w+)\s*\(/)
  if (functionMatch) {
    componentName = functionMatch[1]
  } else {
    // Look for const components with React.FC or arrow functions
    const constComponentMatch = processedCode.match(/const\s+(\w+)\s*:\s*React\.FC\s*=\s*\(/)
    if (constComponentMatch) {
      componentName = constComponentMatch[1]
    } else {
      // Look for const components with arrow functions (more specific pattern)
      const arrowFunctionMatch = processedCode.match(/const\s+(\w+)\s*=\s*\(\)\s*=>\s*{/)
      if (arrowFunctionMatch) {
        componentName = arrowFunctionMatch[1]
      } else {
        // Fallback: look for any const that ends with a component-like pattern
        const fallbackMatch = processedCode.match(/const\s+(\w+)\s*=\s*\(\)\s*=>/)
        if (fallbackMatch) {
          componentName = fallbackMatch[1]
        }
      }
    }
  }
  
  console.log('Detected component name:', componentName);
  console.log('Processed code preview:', processedCode.substring(0, 500));
  
  // Add assignment to global scope for const declarations
        if (processedCode.includes(`const ${componentName}`)) {
          processedCode += `\nwindow.${componentName} = ${componentName};`
        }
        
        // Note: Variable assignments are handled by the global variable resolver after code execution

  // Escape the processed code for safe embedding
  const escapedCode = processedCode
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,body,#root{margin:0;padding:0;height:100%;font-family:ui-sans-serif,system-ui}
    </style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Storage polyfills for restricted environments
      if (!window.localStorage) {
        window.localStorage = {
          _data: {},
          getItem: function(key) { return this._data[key] || null; },
          setItem: function(key, value) { this._data[key] = value; },
          removeItem: function(key) { delete this._data[key]; },
          clear: function() { this._data = {}; },
          length: 0
        };
      }
      
      if (!window.sessionStorage) {
        window.sessionStorage = {
          _data: {},
          getItem: function(key) { return this._data[key] || null; },
          setItem: function(key, value) { this._data[key] = value; },
          removeItem: function(key) { delete this._data[key]; },
          clear: function() { this._data = {}; },
          length: 0
        };
      }
      
      try {
        console.log('Processing component code...')
        
        // Processed code embedded safely
        const processedCode = \`${escapedCode}\`
        
        // Simple and reliable variable resolver
        const globalVarResolver = \`
          // Simple variable resolver - runs after main code execution
          console.log('Starting variable resolution...');
          
          const commonVars = ['examples', 'questions', 'steps', 'data', 'items', 'options', 'answers', 'feedback', 'results', 'learningObjectives', 'styles'];
          
          // Also try to find chart components and other React components
          const chartComponents = ['LineChart', 'BarChart', 'PieChart', 'AreaChart', 'ScatterChart', 'RadarChart', 'ComposedChart', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'Legend', 'ResponsiveContainer'];
          
          // Combine all variables to check
          const allVars = [...commonVars, ...chartComponents];
          
          allVars.forEach(varName => {
            try {
              if (typeof window[varName] === 'undefined') {
                const value = eval(varName);
                if (value !== undefined) {
                  window[varName] = value;
                  console.log('Resolved variable:', varName);
                }
              }
            } catch (e) {
              console.log('Could not resolve variable:', varName);
            }
          });
          
          console.log('Variable resolution complete.');
        \`;
        
        // Transform the code with Babel
          const transformed = Babel.transform(processedCode, {
            presets: ['react'],
            plugins: [['transform-typescript', { isTSX: true, allExtensions: true }]]
          }).code
          
        console.log('Transformed code:', transformed)
        console.log('Processed code sample:', processedCode.substring(0, 1000))
        
        // Create mock chart components to handle missing chart libraries
        const mockChartComponent = (name) => React.createElement('div', { 
          style: { 
            padding: '20px', 
            border: '2px dashed #ccc', 
            borderRadius: '8px', 
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            color: '#666'
          } 
        }, \`\${name} Component (Chart library not available)\`);
        
        // Create a safe execution environment
        const safeGlobals = {
          React,
          ReactDOM,
          useState: React.useState,
          useEffect: React.useEffect,
          useCallback: React.useCallback,
          useMemo: React.useMemo,
          useRef: React.useRef,
          console: console,
          setTimeout: setTimeout,
          clearTimeout: clearTimeout,
          setInterval: setInterval,
          clearInterval: clearInterval,
          // Mock chart components
          LineChart: (props) => mockChartComponent('LineChart'),
          BarChart: (props) => mockChartComponent('BarChart'),
          PieChart: (props) => mockChartComponent('PieChart'),
          AreaChart: (props) => mockChartComponent('AreaChart'),
          ScatterChart: (props) => mockChartComponent('ScatterChart'),
          RadarChart: (props) => mockChartComponent('RadarChart'),
          ComposedChart: (props) => mockChartComponent('ComposedChart'),
          XAxis: (props) => React.createElement('div', { style: { display: 'none' } }),
          YAxis: (props) => React.createElement('div', { style: { display: 'none' } }),
          CartesianGrid: (props) => React.createElement('div', { style: { display: 'none' } }),
          Tooltip: (props) => React.createElement('div', { style: { display: 'none' } }),
          Legend: (props) => React.createElement('div', { style: { display: 'none' } }),
          ResponsiveContainer: (props) => React.createElement('div', props, props.children)
        }
        
        // Execute the transformed code
        const fn = new Function(...Object.keys(safeGlobals), transformed)
        fn(...Object.values(safeGlobals))
        
        // Run global variable resolver
        const resolverFn = new Function(...Object.keys(safeGlobals), globalVarResolver)
        resolverFn(...Object.values(safeGlobals))
        
        // Get the component from the global scope with better debugging
        console.log('Looking for component:', '${componentName}');
        console.log('Available window properties:', Object.keys(window).filter(k => typeof window[k] === 'function'));
        
        let componentToRender = null;
        const Comp = window['${componentName}']
        
        if (Comp && typeof Comp === 'function') {
          // Component found successfully
          componentToRender = Comp;
          console.log('Using detected component:', '${componentName}');
        } else {
          // Try to find any component-like function in the global scope
          const possibleComponents = Object.keys(window).filter(k => {
            const val = window[k];
            return typeof val === 'function' && k.match(/^[A-Z]/); // Capitalized names are likely components
          });
          
          console.log('Possible components found:', possibleComponents);
          
          if (possibleComponents.length > 0) {
            componentToRender = window[possibleComponents[0]];
            console.log('Using fallback component:', possibleComponents[0]);
          } else {
            throw new Error('Component not found or not a function: ${componentName}. Available globals: ' + Object.keys(window).filter(k => typeof window[k] === 'function').join(', '))
          }
        }
          
          // Render the component
        const root = ReactDOM.createRoot(document.getElementById('root'))
        root.render(React.createElement(componentToRender))
        console.log('Component rendered successfully')
        } catch (e) {
          console.error('Iframe render error:', e)
        document.getElementById('root').innerHTML = \`
          <div style="padding: 20px; color: red; font-family: monospace;">
            <h3>Component Error</h3>
            <p>\${e.message}</p>
            <details>
              <summary>Stack Trace</summary>
              <pre>\${e.stack}</pre>
            </details>
          </div>
        \`
      }
    </script>
  </body>
  </html>`
}


