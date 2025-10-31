# Security Model

5-layer validation pipeline ensuring safe, high-quality generated content.

## Overview

The security model uses a 5-layer validation pipeline to ensure all generated content is safe, secure, and high-quality before rendering.

## 5-Layer Validation Pipeline

```
1. Input Sanitization
    ↓
2. Pattern Scanning
    ↓
3. TypeScript Compilation
    ↓
4. Preview Rendering
    ↓
5. Content Evaluation
    ↓
Approved Content
```

## Layer 1: Input Sanitization

### Purpose

Escape and sanitize user input to prevent injection attacks.

### Implementation

```typescript
function sanitizeInput(outline: string): string {
  // Escape HTML
  const escaped = outline
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  
  // Validate length
  if (escaped.length > 10000) {
    throw new Error('Outline too long')
  }
  
  return escaped
}
```

### Checks

- HTML escaping
- Length validation
- Character validation
- SQL injection prevention (via parameterized queries)

## Layer 2: Pattern Scanning

### Purpose

Block dangerous keywords and patterns in generated code.

### Forbidden Patterns

```typescript
const FORBIDDEN_PATTERNS = [
  'eval(',
  'Function(',
  'require(',
  'import(',
  'fetch(',
  'XMLHttpRequest',
  'document.',
  'window.',
  'process.env',
  'child_process',
  'fs.',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'requestAnimationFrame'
]
```

### Implementation

```typescript
function safetyCheck(code: string): SafetyResult {
  const forbidden = FORBIDDEN_PATTERNS.filter(pattern =>
    code.includes(pattern)
  )
  
  if (forbidden.length > 0) {
    return {
      passed: false,
      forbiddenTokens: forbidden,
      error: `Forbidden patterns detected: ${forbidden.join(', ')}`
    }
  }
  
  return { passed: true }
}
```

### Blocked Patterns Explained

- **`eval()`** - Arbitrary code execution
- **`Function()`** - Dynamic code creation
- **`fetch()`** - Network requests
- **`document.`** - DOM manipulation
- **`window.`** - Global scope access
- **`require()`** - Module loading
- **`import()`** - Dynamic imports
- **Timers** - `setTimeout`, `setInterval` - Resource abuse

## Layer 3: TypeScript Compilation

### Purpose

Validate code syntax and type safety before execution.

### Implementation

```typescript
async function compileTypeScript(code: string): Promise<CompileResult> {
  try {
    // Compile with TypeScript
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        skipLibCheck: true
      }
    })
    
    // Check for semantic errors
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createSourceFile('component.tsx', code, ts.ScriptTarget.ES2020)
    )
    
    if (diagnostics.length > 0) {
      return {
        success: false,
        errors: diagnostics.map(d => d.messageText)
      }
    }
    
    return {
      success: true,
      compiledCode: result.outputText
    }
  } catch (error) {
    return {
      success: false,
      errors: [error.message]
    }
  }
}
```

### Validation

- Syntax checking
- Type checking
- Semantic validation
- JSX validation

## Layer 4: Preview Rendering

### Purpose

Server-side rendering validation to ensure component actually works.

### Implementation

```typescript
async function previewGeneration(code: string): Promise<PreviewResult> {
  try {
    // Transform TSX to JavaScript
    const jsCode = transform(code, {
      presets: ['react', 'typescript']
    }).code
    
    // Create virtual DOM
    const React = require('react')
    const ReactDOMServer = require('react-dom/server')
    
    // Attempt to render
    const Component = new Function('React', jsCode)(React)
    const html = ReactDOMServer.renderToString(
      React.createElement(Component)
    )
    
    // Validate output
    if (!html || html.length < 10) {
      return {
        success: false,
        error: 'Component rendered empty output'
      }
    }
    
    return {
      success: true,
      html: html
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

### Checks

- Component renders successfully
- No runtime errors
- Produces valid HTML
- Output length validation

## Layer 5: Content Evaluation

### Purpose

Validate educational quality and content appropriateness.

### Implementation

```typescript
async function evaluateQuality(
  code: string,
  outline: string
): Promise<QualityResult> {
  // Analyze code for educational value
  const metrics = {
    relevance: calculateRelevance(code, outline),
    educationalValue: calculateEducationalValue(code),
    interactivity: calculateInteractivity(code),
    codeQuality: calculateCodeQuality(code),
    completeness: calculateCompleteness(code, outline)
  }
  
  // Calculate overall score
  const score = (
    metrics.relevance * 0.25 +
    metrics.educationalValue * 0.25 +
    metrics.interactivity * 0.20 +
    metrics.codeQuality * 0.15 +
    metrics.completeness * 0.15
  )
  
  return {
    score,
    metrics,
    passed: score >= 0.60,
    issues: score < 0.60 ? identifyIssues(metrics) : []
  }
}
```

### Metrics

- **Relevance** (25%): Matches the outline
- **Educational Value** (25%): Clear explanations
- **Interactivity** (20%): Engaging elements
- **Code Quality** (15%): Clean, well-structured
- **Completeness** (15%): All topics covered

### Quality Thresholds

- **90-100%**: Excellent - Publication ready
- **75-89%**: Good - Minor improvements needed
- **60-74%**: Fair - Significant gaps exist
- **< 60%**: Poor - Major rework required

## Security Features

### Shadow DOM Isolation

React components are rendered in Shadow DOM using custom web elements:

```typescript
class LessonRendererElement extends HTMLElement {
  connectedCallback() {
    this.root = this.attachShadow({ mode: 'open' })
    // Component rendered in isolated Shadow DOM
  }
}
```

**Isolation Benefits**:
- **Style Scoping** - CSS isolated to Shadow DOM
- **DOM Isolation** - Element tree isolated from parent
- **Event Isolation** - Events don't bubble to parent by default
- **Script Isolation** - JavaScript execution within Shadow DOM

### Content Security

- Generated code validated before rendering
- Security checks in place
- No external imports allowed
- No DOM manipulation outside Shadow DOM
- React globals provided via `globalThis` (shared instance)

### Variable Isolation

- React globals provided via `globalThis`
- Component code uses app's React instance
- Isolated execution environment within Shadow DOM
- No direct access to parent window variables

## Repair Loop

### Automatic Repair

When compilation fails, the system attempts automatic repair:

```typescript
async function repairLoop(code: string, errors: string[]): Promise<string> {
  let repairedCode = code
  let attempts = 0
  const MAX_ATTEMPTS = 2
  
  while (attempts < MAX_ATTEMPTS && hasErrors(repairedCode)) {
    // Send errors to LLM for repair
    repairedCode = await requestRepair(repairedCode, errors)
    attempts++
    
    // Re-validate
    const result = await compileTypeScript(repairedCode)
    if (result.success) break
    
    errors = result.errors
  }
  
  return repairedCode
}
```

### Repair Process

1. **Error Analysis** - Identify compilation errors
2. **LLM Repair** - Send errors to LLM for fixes
3. **Re-validation** - Recompile and check
4. **Iteration** - Up to 2 repair attempts

## Security Best Practices

### For Developers

1. **Never trust user input** - Always sanitize
2. **Validate all code** - Multiple layers
3. **Sandbox execution** - Isolated environments
4. **Monitor for issues** - Log security events
5. **Regular audits** - Review security regularly

### For Users

1. **Use clear outlines** - Better generation quality
2. **Review generated content** - Check before sharing
3. **Report issues** - Security concerns
4. **Follow guidelines** - Best practices

## Next Steps

- **[Rendering System](/docs/architecture/rendering)** - Component rendering
- **[Development](/docs/development/setup)** - Development setup
- **[Operations](/docs/operations/monitoring)** - Monitoring and operations

