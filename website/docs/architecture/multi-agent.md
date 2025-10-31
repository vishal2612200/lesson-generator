# Multi-Agent System

Planner and author agents working together for high-quality lesson generation.

## Overview

The multi-agent system uses two specialized agents working in sequence to generate high-quality interactive React components:

1. **Planner Agent** - Analyzes topic and creates component plan
2. **Author Agent** - Generates TSX code based on plan

## Architecture

```
User Outline
    ↓
orchestrateComponentGeneration()
    ↓
Planner Agent
    ↓
Component Plan
    ↓
Author Agent
    ↓
TSX Code
    ↓
Safety Check
    ↓
Compilation
    ↓
Preview & Quality Check
    ↓
Save Results
```

## Planner Agent

### Purpose

Analyzes the topic and creates a structured component plan with learning objectives, component structure, and pedagogical guidance.

### Input

```typescript
interface PlannerAgentInput {
  topic: string
  pedagogy: {
    gradeBand: '3-5' | '6-12' | 'college' | 'professional'
    readingLevel: 'basic' | 'intermediate' | 'advanced'
    languageTone: 'friendly' | 'formal' | 'casual'
    cognitiveLoad: 'low' | 'medium' | 'high'
    accessibility: {...}
  }
}
```

### Output

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

### Process

1. **Topic Analysis** - Understands the topic and intent
2. **Pedagogy Detection** - Determines appropriate teaching approach
3. **Component Planning** - Designs component structure
4. **Interactivity Planning** - Plans interactive elements
5. **Objective Definition** - Creates learning objectives

### Example Output

```typescript
{
  lessonType: 'quiz',
  learningObjectives: [
    'Understand basic arithmetic operations',
    'Practice mental math skills',
    'Get immediate feedback'
  ],
  componentStructure: {
    sections: [
      {
        type: 'introduction',
        purpose: 'Explain the concept',
        elements: ['text', 'example']
      },
      {
        type: 'quiz',
        purpose: 'Practice problems',
        elements: ['questions', 'input', 'feedback']
      }
    ]
  },
  interactivityPlan: {
    interactions: ['multiple choice', 'immediate feedback'],
    feedback: 'Correct/incorrect with explanations',
    assessment: 'Score tracking'
  }
}
```

## Author Agent

### Purpose

Generates TSX React component code based on the planner's component plan.

### Input

```typescript
interface AuthorAgentInput {
  topic: string
  plan: ComponentPlan
  pedagogy: {...}
  lessonId: string
}
```

### Output

```typescript
interface ComponentArtifact {
  tsxSource: string
  componentName: string
  propsSchema?: any
}
```

### Process

1. **Code Generation** - Generates TSX code following the plan
2. **React Patterns** - Uses modern React hooks and patterns
3. **Interactivity** - Implements planned interactive elements
4. **Visual Design** - Includes Tailwind CSS styling
5. **Accessibility** - Ensures WCAG compliance

### Generated Code Structure

```typescript
'use client';
import React, { useState } from 'react';

const InteractiveLesson: React.FC = () => {
  const [state, setState] = useState(0);
  
  // Component implementation
  return (
    <div className="p-6">
      {/* Interactive content */}
    </div>
  );
};

export default InteractiveLesson;
```

## Orchestration

### Flow

```typescript
async function orchestrateComponentGeneration(input) {
  // Step 1: Planner Agent
  const plan = await plannerAgent({
    topic: input.topic,
    pedagogy: input.pedagogy
  })
  
  // Step 2: Author Agent
  const artifact = await authorAgent({
    topic: input.topic,
    plan: plan,
    pedagogy: input.pedagogy,
    lessonId: input.lessonId
  })
  
  // Step 3: Safety Check
  const safetyResult = await safetyCheck(artifact.tsxSource)
  
  // Step 4: Compilation
  const compileResult = await compileTypeScript(artifact.tsxSource)
  
  // Step 5: Preview & Quality
  const qualityResult = await evaluateQuality(compileResult)
  
  // Step 6: Save
  await saveResults(input.lessonId, artifact)
}
```

## Pedagogy Detection

### Grade Bands

- **3-5** - Elementary level, simple concepts
- **6-12** - Middle/high school, moderate complexity
- **College** - Advanced concepts, deeper understanding
- **Professional** - Expert-level, practical applications

### Cognitive Load

- **Low** - Simple concepts, minimal steps
- **Medium** - Moderate complexity, some scaffolding
- **High** - Complex topics, advanced understanding

### Language Tone

- **Friendly** - Conversational, approachable
- **Formal** - Professional, structured
- **Casual** - Relaxed, informal

## Quality Standards

### Code Quality

- Modern React patterns
- Proper TypeScript types
- Clean code structure
- Performance optimized

### Educational Quality

- Clear learning objectives
- Appropriate difficulty
- Engaging interactions
- Immediate feedback

### Visual Quality

- Modern UI design
- Responsive layout
- Accessible design
- Consistent styling

## Comparison: Single vs Multi-Agent

| Feature | Single-Agent | Multi-Agent |
|---------|-------------|-------------|
| Generation Time | 10-20s | 30-60s |
| Code Quality | Good | Excellent |
| Educational Quality | Good | Excellent |
| Complexity Handling | Moderate | High |
| Success Rate | 85-90% | 90-95% |
| Use Case | Simple topics | Complex topics |

## Configuration

### Enable/Disable Planner

```bash
# Enable planner (default)
ENABLE_MULTI_AGENT_PLANNER=true

# Disable planner (faster, less structured)
ENABLE_MULTI_AGENT_PLANNER=false
```

### Complexity Threshold

```bash
# Higher = more likely to use multi-agent
COMPLEXITY_THRESHOLD=70  # 0-100
```

## Next Steps

- **[Rendering System](/docs/architecture/rendering)** - Component rendering
- **[Security Model](/docs/architecture/security)** - Security validation
- **[Development](/docs/development/setup)** - Development setup

