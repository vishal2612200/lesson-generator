# System Architecture

**Last Updated**: 2025-01-27  
**System Version**: 2.1 (Enhanced React Component Generation)

## Overview

AI-powered educational content generator supporting **two generation modes**:
1. **Block-based generation** (structured, multi-format content)
2. **React component generation** (interactive, unlimited complexity)

**Core Philosophy**: Content-agnostic renderer. Zero hardcoded educational content. All content is dynamically generated from user prompts.

---

## System Architecture

### High-Level Flow

```
User Request → Queue → Worker → LLM → Validation → Storage → UI Render
```

### Data Flow

```
┌─────────────┐
│   Browser   │ POST /api/lessons {outline}
└──────┬──────┘
       ↓
┌─────────────────────────────────────────────────┐
│  Next.js API Routes                             │
│  • POST /api/lessons → insert queued lesson     │
│  • GET  /api/lessons → list all                 │
│  • GET  /api/lessons/[id] → fetch with content  │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│  Supabase PostgreSQL                            │
│  Tables:                                        │
│  • lessons (id, outline, status, timestamps)    │
│  • lesson_contents (tsx_source, compiled_js)    │
│  • lesson_components (archive)                  │
│  • traces (debugging, telemetry)                │
└──────────────────┬──────────────────────────────┘
                   ↓ (poll every 5s)
┌─────────────────────────────────────────────────┐
│  Worker Process (src/worker/cli.ts)             │
│  1. Claim queued lesson (atomic update)         │
│  2. Route to generation pipeline                │
│  3. Call LLM with structured prompts            │
│  4. Validate & compile                          │
│  5. Save results                                │
│  6. Update status (generated/failed)            │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│  UI Renderer (src/app/lessons/[id]/page.tsx)    │
│  • React Component → IframeTSXRenderer (Babel)  │
│  • Block-based → ModernLessonRenderer           │
│  • Real-time updates via polling                │
└─────────────────────────────────────────────────┘
```

---

## Generation Pipelines

### 1. Block-Based Generation (Legacy/Structured)

**Best for**: Quizzes, explanations, tutorials with mixed content types

```typescript
// Flow
Outline → Planner → Content Generator → Block Formatter → JSON Storage

// Output Structure
{
  type: 'rich-content',
  blocks: [
    { type: 'text', content: '...' },
    { type: 'quiz', questions: [...] },
    { type: 'code', language: 'python', code: '...' },
    { type: 'callout', variant: 'info', content: '...' },
    { type: 'svg', svg: '<svg>...</svg>' }
  ]
}
```

**Supported Block Types**:
- `text` - Rich text with markdown
- `quiz` - Multiple choice with scoring
- `code` - Syntax-highlighted code blocks
- `callout` - Info/warning/success boxes
- `image` - Images with captions
- `video` - Embedded videos
- `svg` - Custom SVG graphics
- `tabs` - Tabbed content sections
- `two-column` - Side-by-side layouts
- `html` - Sanitized custom HTML

**Advantages**:
- Predictable structure
- No compilation needed
- Supports multimedia
- Fast rendering

### 2. React Component Generation (New/Interactive)

**Best for**: Interactive simulations, complex visualizations, state-driven experiences

```typescript
// Flow
Outline → Pedagogy Detection → Planner Agent → Author Agent
  → Safety Check → TypeScript Compilation → Preview Generation
  → Quality Evaluation → Storage

// Output
'use client';
import React, { useState } from 'react';

const InteractiveLesson: React.FC = () => {
  const [state, setState] = useState(0);
  // Full React component with hooks, interactivity
  return <div>...</div>;
};

export default InteractiveLesson;
```

**Pipeline Stages**:

1. **Pedagogy Detection**
   - Analyzes topic keywords
   - Sets grade level (3-5, 6-12, college/professional)
   - Determines cognitive load and reading level

2. **Planner Agent**
   - Intent detection (test vs explanation vs practice)
   - Component planning (1-3 components per lesson)
   - Learning objective definition

3. **Author Agent**
   - Generates TSX code with React hooks
   - Follows content type guidance (quiz/explanation/practice)
   - Ensures visual elements + interactivity
   - **Quality Requirements**: Correctness, clarity, engagement

4. **Safety Check**
   - Blocks: fetch, eval, document/window access, require, import
   - Validates: No external URLs, no DOM manipulation

5. **TypeScript Compilation**
   - Sandboxed compilation using typescript API
   - Captures semantic errors
   - Transpilation fallback if needed

6. **Repair Loop**
   - Max 2 repair attempts
   - Sends compilation errors back to LLM
   - Iterative fixes

7. **Preview Generation**
   - Server-side rendering (SSR) for validation
   - Ensures component can actually render

8. **Quality Evaluation**
   - Checks rendered HTML for content
   - Validates educational value
   - Pass/fail decision

**Advantages**:
- Unlimited interactivity
- No token limits
- Full React ecosystem
- LLM-native (trained on React)

**Constraints**:
- No network calls (fetch, axios)
- No DOM access (document, window)
- No timers (setTimeout, setInterval)
- No external imports
- Inline SVG only

---

## Key Design Decisions

### 1. Atomic Job Claiming

**Problem**: Multiple workers could claim the same job  
**Solution**: Atomic CAS (Compare-And-Set) update

```typescript
// src/worker/cli.ts:35-41
const { data: claimed } = await supabase
  .from('lessons')
  .update({ status: 'generating' })
  .eq('id', lesson.id)
  .eq('status', 'queued')  // CAS: only update if still queued
  .select('id,title,outline,status')
  .single();
```

### 2. Intent-Based Content Generation

**Problem**: "A test on counting" was generating teaching tools, not quizzes  
**Solution**: Explicit intent detection in planner agent

```typescript
// Component generation agents
IF topic contains: "test", "quiz", "assessment"
→ CREATE: Interactive quiz with questions, scoring, feedback

IF topic contains: "explain", "understand", "what is"
→ CREATE: Educational explanation with diagrams, examples

IF topic contains: "practice", "learn", "tutorial"
→ CREATE: Practice tool with exercises, instant feedback
```

### 3. Value-Based Answer Checking

**Problem**: Quiz answers compared array indices, not actual values  
**Solution**: Store and compare actual answer values

```typescript
// WRONG: comparing indices
if (questions[qIndex].options[selectedIndex] === questions[qIndex].answer)

// CORRECT: comparing values
if (selectedValue === questions[qIndex].correctAnswer)
```

### 4. Client-Side Component Execution

**Problem**: Can't execute arbitrary TSX server-side safely  
**Solution**: Babel transform + sandboxed execution in browser

```typescript
// src/app/lessons/[id]/IframeTSXRenderer.tsx
1. Strip 'use client' and imports
2. Inject React hooks via destructuring
3. Transform with @babel/standalone
4. Execute with new Function()'React', code)
5. Render returned component
```

### 5. React Component Detection (v2.1)

**Problem**: System was generating React components but falling back to JSON rendering  
**Solution**: Enhanced detection logic for React component patterns

```typescript
// src/app/lessons/[id]/page.tsx
const isComponentBased = content.typescript_source?.includes("'use client'") ||
                       content.typescript_source?.includes('export default function') ||
                       content.typescript_source?.includes('export default const') ||
                       content.typescript_source?.includes('React.FC') ||
                       content.typescript_source?.includes('useState') ||
                       content.typescript_source?.includes('useEffect') ||
                       content.compiled_js?.includes("'use client'")
```

**Detection Patterns**:
- `'use client'` directive
- `export default function` declarations
- `export default const` declarations  
- `React.FC` type annotations
- `useState` hook usage
- `useEffect` hook usage

### 6. Variable Scope Management (v2.1)

**Problem**: Generated components had undefined variables (styles, examples, etc.)  
**Solution**: Comprehensive variable declaration handling in iframe

```typescript
// src/app/lessons/[id]/IframeTSXRenderer.tsx
// Early variable assignment
const commonVars = ['examples', 'questions', 'steps', 'data', 'items', 'options', 'answers', 'feedback', 'results', 'learningObjectives', 'styles'];
commonVars.forEach(varName => {
  if (processedCode.includes(varName)) {
    variableAssignments += `if (typeof ${varName} !== 'undefined') { window.${varName} = ${varName}; }\n`;
  }
});

// Global variable resolver
const globalVarResolver = `
  const commonVars = ['examples', 'questions', 'steps', 'data', 'items', 'options', 'answers', 'feedback', 'results', 'learningObjectives', 'styles'];
  commonVars.forEach(varName => {
    try {
      if (typeof window[varName] === 'undefined') {
        const value = eval(varName);
        if (value !== undefined) {
          window[varName] = value;
        }
      }
    } catch (e) {
      // Variable not found, continue
    }
  });
`;
```

### 7. Storage Access in Data URLs (v2.1)

**Problem**: `sessionStorage` and `localStorage` disabled in data URLs  
**Solution**: Blob URLs + storage polyfills

```typescript
// Use blob URLs instead of data URLs
const blob = new Blob([sandboxHtml], { type: 'text/html' });
const iframeSrc = URL.createObjectURL(blob);

// Storage polyfills for restricted environments
if (!window.localStorage) {
  window.localStorage = {
    _data: {},
    getItem: function(key) { return this._data[key] || null; },
    setItem: function(key, value) { this._data[key] = value; },
    // ... other methods
  };
}
```

### 8. Tailwind CSS Safelist

**Problem**: Dynamically generated components use classes not found at build time  
**Solution**: Safelist commonly used utilities

```javascript
// tailwind.config.js
safelist: [
  'p-2', 'p-4', 'p-6', 'bg-blue-500', 'text-white', ...
]
```

---

## Recent Improvements (v2.1)

### System Status
- ✅ **React Component Generation**: Fully functional with multi-agent system
- ✅ **Component Detection**: Enhanced logic properly identifies TSX components
- ✅ **Variable Scope Management**: All common variables (styles, examples, etc.) now work
- ✅ **Storage Access**: Blob URLs enable full localStorage/sessionStorage support
- ✅ **Error Handling**: Comprehensive error recovery and fallback mechanisms
- ✅ **Multi-Agent Traces**: Full traceability of generation process

### Key Fixes Implemented

1. **React Component Detection**: Fixed issue where system was generating React components but falling back to JSON rendering due to `compiled_js` being `null`

2. **Variable Scope Issues**: Resolved "undefined variable" errors for common variables like `styles`, `examples`, `learningObjectives`, etc.

3. **Storage Access**: Fixed `sessionStorage`/`localStorage` errors in iframe by switching from data URLs to blob URLs

4. **White Screen Issues**: Simplified variable handling to prevent execution failures

5. **Multi-Agent System**: Ensured proper routing between single-agent and multi-agent generation based on complexity

### Current Generation Flow

```
User Input → Queue → Worker → Multi-Agent System → React Component → Iframe Renderer
```

**Primary Path**: Multi-agent system generates interactive React components
**Fallback Path**: Single-agent system for simpler content
**Rendering**: All React components use sandboxed iframe with Babel transformation

---

## Database Schema

```sql
-- Lessons (main entity)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  outline TEXT NOT NULL,  -- User's prompt/outline
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'generated', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content storage
CREATE TABLE lesson_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  typescript_source TEXT,      -- TSX source code (React components)
  compiled_js TEXT,             -- Compiled JavaScript (often null, compiled in browser)
  blocks JSONB,                 -- Block-based content (legacy)
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Component archive (debugging)
CREATE TABLE lesson_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id),
  name TEXT NOT NULL,
  tsx_source TEXT NOT NULL,
  compiled_js TEXT,
  props_schema JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debugging/telemetry
CREATE TABLE traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id),
  stage TEXT NOT NULL,  -- 'planning', 'authoring', 'compilation', etc.
  agent TEXT,           -- 'planner', 'author', 'critic', etc.
  input_data JSONB,
  output_data JSONB,
  metadata JSONB,       -- Tokens, model, duration, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Environment Configuration

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
LLM_API_KEY_OR_MOCK=sk-xxx  # or "MOCK" for testing
MODEL_NAME=gpt-4o            # or gpt-4o-mini
SIGNING_KEY=random-secret-key

# Optional
MODE=                        # "" = component mode, "legacy" = blocks
LOG_LEVEL=info              # debug|info|warn|error
```

---

## Performance Characteristics

### Generation Times
- **Block-based**: 10-20s (single LLM call)
- **Component-based**: 30-60s (multi-agent pipeline)

### Costs (OpenAI)
- **gpt-4o-mini**: $0.01-0.03 per lesson
- **gpt-4o**: $0.10-0.30 per lesson

### Success Rates
- **Block-based**: 95%+ (simple structure)
- **Component-based**: 85-90% (compilation can fail)

### Worker Throughput
- Sequential processing: ~1 lesson per minute
- Poll interval: 5 seconds
- Auto-retry: 3 attempts with exponential backoff

---

## Rendering System

### Component Detection Logic

The system automatically determines whether to render content as a React component or block-based content:

```typescript
// src/app/lessons/[id]/page.tsx
const isComponentBased = content.typescript_source?.includes("'use client'") ||
                       content.typescript_source?.includes('export default function') ||
                       content.typescript_source?.includes('export default const') ||
                       content.typescript_source?.includes('React.FC') ||
                       content.typescript_source?.includes('useState') ||
                       content.typescript_source?.includes('useEffect') ||
                       content.compiled_js?.includes("'use client'")

if (isComponentBased) {
  // Render as React component in sandboxed iframe
  return <IframeTSXRenderer code={tsxSource} title={lesson.title} />
} else {
  // Render as block-based content
  return <ModernLessonRenderer lesson={lessonForRenderer} />
}
```

### IframeTSXRenderer Process

1. **Code Processing**: Strips `'use client'` and imports
2. **Variable Assignment**: Adds global assignments for common variables
3. **Blob URL Creation**: Creates blob URL instead of data URL for storage access
4. **Babel Transformation**: Transforms TSX to JavaScript
5. **Safe Execution**: Executes in sandboxed iframe with React globals
6. **Variable Resolution**: Resolves any undefined variables
7. **Component Rendering**: Renders the React component

### Storage Strategy

- **`typescript_source`**: Contains the full TSX React component code
- **`compiled_js`**: Often `null` - compilation happens in browser with Babel
- **Browser Compilation**: Uses `@babel/standalone` for real-time TSX transformation
- **Blob URLs**: Enable full storage access (localStorage/sessionStorage)

---

## Security Model

### 5-Layer Validation Pipeline

1. **Input Sanitization**: Escape user input in prompts
2. **Pattern Scanning**: Block dangerous keywords (eval, fetch, document)
3. **TypeScript Compilation**: Type checking catches many issues
4. **Preview Rendering**: SSR validation ensures it actually works
5. **Content Evaluation**: Validates educational quality

### Blocked Patterns
```typescript
const FORBIDDEN = [
  'eval(', 'Function(', 'require(', 'import(',
  'fetch(', 'XMLHttpRequest', 'document.', 'window.',
  'process.env', 'child_process', 'fs.'
];
```

---

## Monitoring & Debugging

### Structured Logging

```typescript
// src/worker/logger.ts
logger.info('Component generation started', {
  operation: 'generation_start',
  stage: 'planning',
  metadata: { topic, pedagogy }
});
```

### Trace Storage

All LLM calls, compilation results, and errors are stored in `traces` table with:
- Full prompt text
- LLM response
- Token counts
- Timing data
- Error details

### Worker Logs

```bash
# View real-time logs
tail -f /tmp/worker.log

# Filter by level
grep ERROR /tmp/worker.log

# Filter by lesson ID
grep "lessonId:abc123" /tmp/worker.log
```

---

## Testing Strategy

### Unit Tests
- Compilation pipeline
- Safety checks
- Block validation
- Quality scoring

### Integration Tests
- End-to-end lesson generation (mocked LLM)
- Database operations
- Worker claim logic

### Stress Tests
- 5x concurrent generation
- Rate limit handling
- Error recovery

```bash
npm test                    # All tests
npm test -- --watch         # Watch mode
npm test stress.test.ts     # Stress test only
```

---

## Deployment Architecture

### Development
```
Terminal 1: npm run dev      # Next.js (port 3000)
Terminal 2: npm run worker   # Worker process
```

### Production

**Frontend (Vercel)**:
- Auto-deploys from GitHub
- Environment variables in dashboard
- Edge functions for API routes

**Worker (Railway/Render/Heroku)**:
- Containerized worker process
- `npm run worker` as start command
- Requires: Node 18+, DATABASE_URL, LLM_API_KEY

**Database (Supabase)**:
- Managed PostgreSQL
- Row Level Security (RLS) disabled for service role
- Realtime enabled (optional)

---

## Future Improvements

1. **Multi-worker scaling**: Distributed job queue with Redis
2. **Caching layer**: Cache similar prompts/components
3. **Streaming responses**: Show generation progress in real-time
4. **A/B testing**: Compare single vs multi-agent quality
5. **User feedback loop**: Capture ratings, improve prompts
6. **Component library**: Reuse successful components
7. **Analytics**: Track success rates, timing, costs per topic type

---

## References

- Component generation pipeline - Multi-agent system for creating interactive React components
- Rendering system - IframeTSXRenderer and component detection logic

