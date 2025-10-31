# Viewing Traces

Understand how to access and interpret generation traces for debugging and optimization.

## Overview

Generation traces provide complete visibility into the lesson generation process. Every generation attempt is logged with full details, including prompts, responses, validation results, and compilation errors.

## Accessing Traces

### Via Lesson Detail Page

1. Navigate to any lesson (`/lessons/[id]`)
2. Scroll to the **"AI Generation Traces & Debug Info"** section
3. Expand the section to view all traces

Traces appear chronologically, showing each generation attempt.

## Trace Information

Each trace includes comprehensive information:

### Basic Metadata

- **Attempt Number**: Sequential number for retry attempts
- **Timestamp**: When the attempt was made
- **Model**: Which LLM was used (e.g., `gpt-4o`, `gpt-4o-mini`)
- **Duration**: Time between attempts

### Complete Prompts

- Full system prompt sent to LLM
- Context and instructions provided
- Previous attempt feedback (for retries)

### LLM Responses

- Complete raw response from the AI
- Generated TypeScript/TSX code
- All markdown and formatting

### Token Usage

- **Prompt Tokens**: Tokens in the input
- **Completion Tokens**: Tokens in the output
- **Total Tokens**: Sum of both (for cost calculation)

### Validation Results

- Security checks (forbidden tokens)
- Content quality scoring
- Validation issues and suggestions
- Quality metrics breakdown

### Compilation Results

- TypeScript compilation success/failure
- Specific TypeScript errors
- Line numbers and error details
- ESBuild bundling errors (if applicable)

### Error Information

- Exception messages
- Stack traces (when applicable)
- Retry reasoning

## Trace Visualization

### Timeline View

Traces are displayed chronologically:

```
Attempt 1 (0s):   🔴 Validation Failed
Attempt 2 (+3s):  🟠 Compilation Failed
Attempt 3 (+7s):  🟢 Success
```

### Status Indicators

- 🟢 **Green**: Successful generation
- 🟡 **Yellow**: Validation failed (content issues)
- 🟠 **Orange**: Compilation failed (code errors)
- 🔴 **Red**: Critical error (system failure)

### Expandable Sections

Click any trace to expand and view:
- Full prompt sent to LLM
- Raw LLM response
- Token usage breakdown
- Validation issues
- Compilation errors
- Error messages

## Understanding Traces

### Successful Generation

A successful generation trace shows:

```
Status: ✅ Success
Model: gpt-4o
Tokens: 3,250 (1,900 prompt + 1,350 completion)
Duration: +4.1s

Validation: Passed
Compilation: Success
Quality Score: 92.8%

Generation completed successfully!
```

### Validation Failed

When validation fails:

```
Status: 🟡 Validation Failed
Model: gpt-4o
Tokens: 2,450 (1,200 prompt + 1,250 completion)

Issues:
- Content lacks specific examples
- Learning objectives too vague
- Missing interactive elements

Suggestions:
- Add code examples for each concept
- Define measurable learning outcomes
- Include quiz or practice exercise

Quality Score: 62.5%
```

**Action**: Review suggestions and retry with improved outline

### Compilation Failed

When TypeScript compilation fails:

```
Status: 🟠 Compilation Failed
Model: gpt-4o
Tokens: 3,100 (1,850 prompt + 1,250 completion)

TypeScript Errors:
- Line 45: Property 'useState' does not exist
- Line 67: Cannot find name 'React'
- Line 89: Expected ';' but found '}'

Validation: Passed
Quality Score: 85.2%
```

**Action**: System will automatically retry (up to 2 repair attempts)

### Critical Error

When a critical error occurs:

```
Status: 🔴 Critical Error
Model: gpt-4o

Error: Rate limit exceeded. Please try again later.

Stack Trace:
  at LLMClient.call (llm.ts:123)
  at generateLesson (generator.ts:456)
```

**Action**: Check error message and wait if rate limited

## Quality Metrics

### Validation Score Breakdown

Quality is measured across multiple dimensions:

- **Content Relevance** (25%): Matches the outline
- **Educational Value** (25%): Clear explanations
- **Interactivity** (20%): Engaging elements
- **Code Quality** (15%): Clean, well-structured
- **Completeness** (15%): All topics covered

### Score Interpretation

- **90-100%**: Excellent - Publication ready
- **75-89%**: Good - Minor improvements needed
- **60-74%**: Fair - Significant gaps exist
- **< 60%**: Poor - Major rework required

## Debugging with Traces

### Common Issues

#### Security Validation Failed

**Problem**: Forbidden tokens detected (eval, fetch, etc.)

**Trace Shows**:
```
Validation: Failed
Forbidden Tokens: ['eval', 'fetch', 'document']

Error: Security check failed - forbidden API usage
```

**Solution**: Regenerate with safer code patterns

#### Compilation Errors

**Problem**: TypeScript syntax errors

**Trace Shows**:
```
Compilation: Failed
TypeScript Errors:
  Line 45: Property 'useState' does not exist
  Line 67: Cannot find name 'React'
```

**Solution**: System automatically retries with error feedback

#### Content Quality Issues

**Problem**: Low validation score

**Trace Shows**:
```
Quality Score: 58.3%
Issues:
- Content lacks specific examples
- Learning objectives too vague
```

**Solution**: Improve outline with more detail

### Analyzing Patterns

Look for patterns across multiple traces:

- **Consistent failures**: May indicate outline issues
- **High token usage**: May indicate overly complex requests
- **Slow generation**: May indicate API rate limits

## Token Usage & Costs

### Token Consumption Patterns

**Average Successful Generation**:
- Attempt 1 (Initial): ~2,500 tokens
- Attempt 2 (Retry): ~3,000 tokens
- Attempt 3 (Retry): ~3,200 tokens
- **Total Average**: ~6,500 tokens

**Failed Generations**:
- Can consume 10,000+ tokens over 5 attempts

### Cost Estimates (GPT-4o-mini)

- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- **Average lesson**: ~$0.001-0.003
- **Failed lesson**: ~$0.005-0.010

### Optimization Tips

1. **Better Initial Prompts**: Reduce retry attempts
2. **Clear Outlines**: Help AI understand requirements
3. **Structured Input**: Use bullet points, clear sections
4. **Complexity Management**: Break large lessons into smaller parts

## Advanced Trace Analysis

### Viewing Raw Data

All trace data is stored in the `traces` table:

```sql
SELECT 
  lesson_id,
  attempt_number,
  model,
  tokens->>'total_tokens' as total_tokens,
  validation->>'passed' as validation_passed,
  compilation->>'success' as compilation_success,
  timestamp
FROM traces
WHERE lesson_id = 'your-lesson-id'
ORDER BY attempt_number;
```

### Exporting Traces

Use the API endpoint:

```bash
GET /api/lessons/[id]
```

Response includes full `traces` array with all metadata.

## Best Practices

### For Users

1. **Check traces** for all failed generations
2. **Review suggestions** before retrying
3. **Learn from patterns** in successful generations
4. **Improve outlines** based on validation feedback

### For Developers

1. **Review traces** for all failed generations
2. **Analyze patterns** in successful generations
3. **Optimize prompts** based on feedback
4. **Monitor token usage** to control costs
5. **Set up alerts** for high failure rates

## Next Steps

- **[Creating Lessons](/docs/user-guide/creating-lessons)** - How to create lessons
- **[Understanding Status](/docs/user-guide/lesson-status)** - Status workflow
- **[Best Practices](/docs/user-guide/best-practices)** - Tips for better results

