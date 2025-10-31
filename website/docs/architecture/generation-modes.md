# React Component Generation

Understanding how AI Lesson Generator creates interactive React components.

## Overview

AI Lesson Generator generates fully interactive, dynamic React components from simple text outlines. All lessons are created as React components with unlimited customization possibilities.

**Best for**: Interactive quizzes, simulations, practice tools, visualizations, complex interactions, and any educational content requiring interactivity.

## Component Structure

Generated components follow this structure:

```typescript
'use client';
// Note: Imports are stripped during module transformation
// React globals are provided via globalThis banner

const InteractiveLesson: React.FC = () => {
  const [state, setState] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="lr-card">
      <h1>Lesson Title</h1>
      <button onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? 'Hide' : 'Show'} Details
      </button>
      {showDetails && (
        <div>
          {/* Interactive content */}
        </div>
      )}
      {/* SVG graphics, visualizations, practice tools */}
    </div>
  );
};

export default InteractiveLesson;
```

**Note**: All `import` statements are stripped during module transformation. React and hooks are provided via a banner that binds `globalThis.React` and destructures hooks from it. The component is rendered in Shadow DOM isolation.

## Generation Pipeline

### Default Path: Multi-Agent Generation

The default generation path uses `orchestrateComponentGeneration()` which always uses a multi-agent system:

1. **Pedagogy Inference** (Worker)
   - Analyzes topic keywords to infer grade band, reading level, cognitive load
   - Default: `gradeBand: '3-5'`, `readingLevel: 'basic'`, `cognitiveLoad: 'low'`
   - Advanced topics (JavaScript, React, programming) → `gradeBand: '9-12'`, `readingLevel: 'advanced'`, `cognitiveLoad: 'high'`
   - Intermediate topics (algebra, geometry, chemistry) → `gradeBand: '6-8'`, `readingLevel: 'intermediate'`, `cognitiveLoad: 'medium'`

2. **Planner Agent**
   - Analyzes topic and intent (test, explain, practice, demonstrate)
   - Creates component plan with 1-3 components
   - Defines learning objectives for each component
   - Returns `ComponentPlan` with items and pedagogy profile

3. **Author Agent** (per component)
   - Generates TSX code with React hooks
   - Follows content type guidance (quiz/explanation/practice)
   - Ensures interactivity (buttons, toggles, inputs)
   - Includes visual elements (SVG, color-coding, diagrams)
   - Quality requirements: correctness, clarity, engagement

4. **Safety Check**
   - Blocks: `fetch`, `eval`, `document`/`window` access, `require`, `import`
   - Validates: No external URLs, no DOM manipulation outside Shadow DOM
   - If safety issues found, skip to next component

5. **TypeScript Compilation**
   - Compiles TSX using TypeScript API
   - Captures semantic and syntax errors
   - Returns compilation result with errors

6. **Repair Loop** (max 2 attempts)
   - If compilation fails, sends errors to repair agent
   - Repair agent attempts to fix compilation errors
   - Recompiles and validates
   - If all repairs fail, skip to next component

7. **Preview Generation** (SSR)
   - Server-side renders component for validation
   - Ensures component can actually render
   - Returns HTML output

8. **Quality Evaluation**
   - Evaluates rendered HTML against pedagogy profile
   - Checks for educational content, interactivity, visual elements
   - Score threshold: 0.5 (pass/fail)
   - If evaluation fails, skip to next component

9. **Component Archiving** (optional)
   - Attempts to save component to `lesson_components` table
   - Creates hash-based component ID
   - If table doesn't exist, generation continues (saved to `lesson_contents` via API)

10. **Result Return**
    - Returns first successfully generated component
    - Includes `tsxSource`, `compiledJs`, and `componentId`
    - If all components fail, returns error diagnostics

### Legacy Path: Single-Agent Generation

When `MODE=legacy` is set, the system uses `generateLessonHybrid()` which routes to `generateLesson()`:

- Direct LLM call with prompt
- Single pass generation
- Validation and compilation
- No multi-agent planning
- Faster but lower quality for complex topics

## Advantages

- ✅ Unlimited interactivity
- ✅ No token limits
- ✅ Full React ecosystem
- ✅ LLM-native (trained on React)
- ✅ Dynamic state management
- ✅ Complex visualizations
- ✅ Real-time feedback
- ✅ Interactive simulations

## Disadvantages

- ❌ Requires compilation
- ❌ More complex rendering
- ❌ Longer generation time (30-60 seconds)

## Constraints

For security and isolation, generated components cannot use:

- ❌ **Network calls**: `fetch`, `axios`, `XMLHttpRequest`
- ❌ **DOM access**: `document`, `window` (except via React)
- ❌ **Timers**: `setTimeout`, `setInterval` (may be restricted)
- ❌ **External imports**: All imports are stripped by Babel parser
- ❌ **External resources**: Images must be inline SVG or base64 data URIs
- ❌ **Eval**: `eval()`, `Function()` constructor

**Allowed**:
- ✅ React hooks: `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`
- ✅ React components and JSX
- ✅ Inline SVG graphics
- ✅ CSS styling (via Tailwind subset)
- ✅ Client-side state management
- ✅ Interactive UI elements (buttons, inputs, toggles)

## Generation Strategy

### API Path (POST /api/lessons)

The API path always calls `generateLessonHybrid()` which routes internally based on complexity:

- **Generation Time**: 30-60 seconds
- **Routing**: Complexity-based (not MODE env var)
  - High complexity → Multi-agent via `orchestrateComponentGeneration()`
  - Low complexity → Single-agent via `generateLesson()`
- **Process**: Complexity Analysis → Route Decision → Generation → Validation → Compilation

### Worker Path (Default: Multi-Agent)

The worker uses multi-agent generation by default when MODE is not set:

- **Generation Time**: 30-60 seconds
- **Best for**: All topics (interactive quizzes, explanations, practice, simulations)
- **Process**: Pedagogy Inference → Planner Agent → Author Agent → Safety → Compilation → Repair → Preview → Quality → Archive
- **Route**: `orchestrateComponentGeneration()` directly (with pedagogy inference)

### Worker Path (Legacy: MODE=legacy)

When `MODE=legacy` is set, the worker calls `generateLessonHybrid()`:

- **Generation Time**: 30-40 seconds
- **Best for**: Simple topics, straightforward lessons
- **Process**: Complexity Analysis → Route Decision → Direct LLM call → TypeScript → Compilation → Validation
- **Route**: `generateLessonHybrid()` → `generateLesson()` (single-agent) or `orchestrateComponentGeneration()` (multi-agent, based on complexity)

**Note**: Legacy mode is maintained for backward compatibility. The default multi-agent system provides better structure and quality for all topics.

### Configuration

```bash
# Default: multi-agent generation (blank = components, multi-agent)
MODE=  # blank = multi-agent components (default)

# Legacy: single-agent generation
MODE=legacy  # Use legacy single-agent generation
```

**Routing Logic**:
- **API Path** (`POST /api/lessons`): Always calls `generateLessonHybrid()` which routes internally based on complexity (does NOT check MODE env var)
  - Analyzes topic complexity
  - Routes to single-agent or multi-agent automatically
- **Worker Path**: Routes based on MODE env var
  - `MODE` is blank or not set → Multi-agent generation via `orchestrateComponentGeneration()`
  - `MODE=legacy` → Calls `generateLessonHybrid()` which routes internally based on complexity
- **Internal Endpoint** (`POST /api/internal/generate/[id]`): Routes based on MODE env var (similar to worker)

### Pedagogy Inference

The worker (when MODE is not set) automatically infers pedagogy settings from topic keywords:

```typescript
// Advanced topics (JavaScript, React, programming, algorithms, college, professional)
→ gradeBand: '9-12', readingLevel: 'advanced', cognitiveLoad: 'high'

// Intermediate topics (algebra, equation, geometry, chemistry, physics, biology)
→ gradeBand: '6-8', readingLevel: 'intermediate', cognitiveLoad: 'medium'

// Default (all other topics)
→ gradeBand: '3-5', readingLevel: 'basic', cognitiveLoad: 'low'
```

These settings are passed to both the Planner and Author agents to guide component generation.

## Next Steps

- **[Worker System](/docs/architecture/worker-system)** - How generation is processed
- **[Multi-Agent System](/docs/architecture/multi-agent)** - Multi-agent generation details
- **[Rendering System](/docs/architecture/rendering)** - How components are displayed
