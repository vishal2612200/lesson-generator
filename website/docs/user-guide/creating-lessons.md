# Creating Lessons

Learn how to create and generate interactive educational content.

## Overview

AI Lesson Generator transforms text outlines into fully interactive lessons. Simply describe what you want to teach, and the system generates engaging, interactive content automatically.

## Creating a New Lesson

### Step 1: Enter Your Outline

Navigate to the homepage (`http://localhost:3000` in development) and find the lesson creation form.

Enter a lesson outline describing what you want to teach:

```
Introduction to Machine Learning
• What is machine learning?
• Types of ML algorithms
• Real-world applications
• Getting started with Python
```

**Best Practices**:
- Start with a clear title
- Use bullet points for structure
- Be specific about topics
- Include learning objectives if possible

### Step 2: Generate

Click the **Generate Lesson** button. The system uses the **API path** (synchronous generation):

1. Creates lesson record with status "generating" directly
2. AI generates content synchronously (typically 30-60 seconds)
3. Status changes to "generated" (success) or "failed" (error)
4. API returns lesson data immediately

**Note**: The API path performs synchronous generation, so the lesson is created with status "generating" and completes before the API returns. There is no "queued" status in the API path - that is only used by the worker path for asynchronous background processing.

### Step 3: View Results

Once generation completes (typically 30-60 seconds):

- Click the lesson card to view the generated content
- See interactive, rendered React component in Shadow DOM

## Lesson Outline Best Practices

### Good Outlines

✅ **Clear and Structured**
```
Introduction to React Hooks
• What are hooks?
• useState hook
• useEffect hook
• Custom hooks
• Common patterns
```

✅ **Specific Topics**
```
Calculus Fundamentals: Derivatives
• Definition of derivative
• Basic derivative rules
• Chain rule
• Product and quotient rules
• Applications in physics
```

✅ **With Context**
```
Web Development Basics for Beginners
• HTML structure and semantic elements
• CSS styling and layouts
• JavaScript fundamentals
• Building your first website
```

### Avoid

❌ **Too Vague**
```
Programming
Stuff about code
```

❌ **Too Complex**
```
Everything about computer science including algorithms, data structures, networking, databases, operating systems, compilers, artificial intelligence, machine learning, deep learning, neural networks, computer vision, natural language processing...
```

❌ **Unclear Structure**
```
Math things and also science maybe some history too
```

## Generation Strategy

The API path (used by the web interface) automatically chooses between single-agent and multi-agent generation based on your outline complexity:

### Single-Agent Generation

Faster generation for simple topics:

- Direct LLM call to generate React component
- Typically 30-40 seconds
- Best for straightforward lessons

### Multi-Agent Generation

Higher quality for complex topics:

- Planner agent creates component plan
- Author agent generates React component
- Typically 50-60 seconds
- Best for interactive quizzes, simulations, complex visualizations

The system automatically detects which strategy is appropriate based on your outline complexity and keywords. This routing is controlled by environment variables (`COMPLEXITY_THRESHOLD`, `ENABLE_HYBRID_ROUTING`) and applies to the API path only.

**Note**: If you use the worker path (asynchronous processing), routing is controlled by the `MODE` environment variable instead.

## Status Workflow

Lessons progress through these states:

1. **queued** - Waiting for worker to pick up
2. **generating** - Currently being processed
3. **generated** - Successfully created
4. **failed** - Generation failed (check traces for details)

### Monitoring Status

- Status updates in real-time via Supabase realtime
- Lesson cards show status badges
- Generating lessons show spinner animation

## Viewing Generated Content

### React Components

When viewing a generated lesson:

- Component renders in Shadow DOM via custom web element
- Fully interactive with state management
- Includes React hooks, animations, and visualizations
- Safe execution environment with style and DOM isolation
- Rich text formatting
- Interactive quizzes and assessments
- Code examples with syntax highlighting
- Images, videos, and multimedia elements

## Tips for Better Results

### 1. Be Specific

Instead of "Python basics", try:
```
Python Programming Basics
• Variables and data types
• Control flow (if/else, loops)
• Functions and modules
• File I/O basics
```

### 2. Include Learning Objectives

Mention what students should learn:
```
Understanding Photosynthesis
By the end, you'll understand:
• How plants convert light to energy
• The role of chlorophyll
• The two stages of photosynthesis
```

### 3. Specify Interactivity Needs

If you want interactive elements, mention them:
```
Interactive Quiz: World Geography
• Multiple choice questions about countries
• Interactive map exploration
• Score tracking and feedback
```

### 4. Provide Context

Include grade level or difficulty:
```
Introduction to Fractions (Elementary)
• What are fractions?
• Visual representations
• Adding and subtracting fractions
```

### 5. Structure Your Outline

Use clear hierarchy:
```
Main Topic
• Subtopic 1
  - Detail 1
  - Detail 2
• Subtopic 2
```

## Troubleshooting

### Generation Fails

If a lesson fails to generate:

1. **Check Traces** - Click the lesson and expand "AI Generation Traces"
2. **Review Errors** - Look for compilation errors, validation issues
3. **Retry** - Create a new lesson with a clearer outline
4. **Simplify** - Break complex topics into smaller lessons

### Content Not Interactive

If content appears as text instead of interactive:

1. **Review Outline** - Add keywords like "interactive", "quiz", "simulation"
2. **Check Status** - Ensure generation completed successfully
3. **Check Traces** - Look for rendering errors in generation traces

### Slow Generation

If generation takes too long:

1. **Check Worker** - Ensure worker process is running
2. **API Limits** - Check OpenAI rate limits
3. **Complexity** - Simplify the outline for faster generation

For more help, see [Troubleshooting](/docs/operations/troubleshooting).

## Next Steps

- **[Understanding Status](/docs/user-guide/lesson-status)** - Learn about status workflow
- **[Viewing Traces](/docs/user-guide/traces)** - Debug generation issues
- **[Best Practices](/docs/user-guide/best-practices)** - Tips for optimal results

