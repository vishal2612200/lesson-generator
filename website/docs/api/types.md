# TypeScript Types

Key TypeScript interfaces and types used throughout the system.

## Database Types

### Lesson

```typescript
interface Lesson {
  id: string
  title: string
  outline: string
  status: 'queued' | 'generating' | 'generated' | 'failed'
  created_at: string
  updated_at: string
}
```

### LessonContent

```typescript
interface LessonContent {
  id: string
  lesson_id: string
  typescript_source: string
  compiled_js: string | null
  blocks: Block[] | null
  version: number
  created_at: string
}
```

### Trace

```typescript
interface Trace {
  id: string
  lesson_id: string
  attempt_number: number
  timestamp: string
  prompt: string
  model: string
  response: string
  tokens: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  } | null
  validation: ValidationResult
  compilation: CompilationResult
  error: string | null
  created_at: string
}
```

## Generation Types

### GenerationStrategy

```typescript
type GenerationStrategy = 'single' | 'multi'
```

### ComponentPlan

```typescript
interface ComponentPlan {
  lessonType: 'quiz' | 'explanation' | 'practice' | 'simulation'
  learningObjectives: string[]
  componentStructure: {
    sections: Array<{
      type: string
      purpose: string
      elements: string[]
    }>
  }
  interactivityPlan: {
    interactions: string[]
    feedback: string
    assessment: string
  }
}
```

### ComponentArtifact

```typescript
interface ComponentArtifact {
  tsxSource: string
  componentName: string
  propsSchema?: any
}
```

## Validation Types

### ValidationResult

```typescript
interface ValidationResult {
  passed: boolean
  errors?: string[]
  forbiddenTokens?: string[]
  score?: number
  issues?: string[]
  suggestions?: string[]
  metrics?: {
    relevance: number
    educationalValue: number
    interactivity: number
    codeQuality: number
    completeness: number
  }
}
```

### CompilationResult

```typescript
interface CompilationResult {
  success: boolean
  tsc_errors?: string[]
  esbuild_errors?: string[]
  compiledCode?: string
}
```

## Block Types

### Block

```typescript
type Block =
  | TextBlock
  | QuizBlock
  | CodeBlock
  | CalloutBlock
  | ImageBlock
  | SVGBlock
  | VideoBlock
  | TabsBlock
  | TwoColumnBlock
  | HTMLBlock
```

### TextBlock

```typescript
interface TextBlock {
  type: 'text'
  content: string
}
```

### QuizBlock

```typescript
interface QuizBlock {
  type: 'quiz'
  questions: Array<{
    question: string
    options: string[]
    correctAnswer: string
  }>
}
```

### CodeBlock

```typescript
interface CodeBlock {
  type: 'code'
  language: string
  code: string
}
```

## Next Steps

- **[REST API](/docs/api/rest-api)** - API endpoints
- **[Database Schema](/docs/api/database-schema)** - Database structure

