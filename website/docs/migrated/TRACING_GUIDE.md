# AI Generation Tracing Guide

## Overview

The Digital Lessons platform includes comprehensive tracing for all AI-generated content. This allows you to:
- View complete generation workflow
- Debug failed generations
- Optimize prompts
- Analyze token usage
- Track quality metrics

## Accessing Traces

### Via Lesson Detail Page

1. Navigate to any lesson (`/lessons/[id]`)
2. Click on "AI Generation Traces & Debug Info" section
3. Traces are automatically captured during generation

### Trace Information Captured

Each trace includes:

#### Basic Metadata
- **Attempt Number**: Sequential number for retry attempts
- **Timestamp**: When the attempt was made
- **Model**: Which LLM was used (e.g., gpt-4, claude-2)
- **Duration**: Time between attempts

#### Complete Prompts
- Full system prompt sent to LLM
- Context and instructions provided
- Previous attempt feedback (for retries)

#### LLM Responses
- Complete raw response from the AI
- Generated TypeScript/TSX code
- All markdown and formatting

#### Token Usage
- **Prompt Tokens**: Tokens in the input
- **Completion Tokens**: Tokens in the output
- **Total Tokens**: Sum of both (for cost calculation)

#### Validation Results
- Security checks (forbidden tokens)
- Content quality scoring
- Validation issues and suggestions
- Quality metrics

#### Compilation Results
- TypeScript compilation success/failure
- Specific TypeScript errors
- ESBuild bundling errors
- Line numbers and error details

#### Error Information
- Exception messages
- Stack traces (when applicable)
- Retry reasoning

## Trace Visualization

### Timeline View
- Chronological display of all attempts
- Color-coded status indicators:
  - 🟢 **Green**: Successful generation
  - 🟡 **Yellow**: Validation failed
  - 🟠 **Orange**: Compilation failed
  - 🔴 **Red**: Critical error
- Duration between attempts

### Expandable Sections
Click on any trace to expand and view:
- 📝 **Prompt**: Full prompt sent to LLM
- 🤖 **LLM Response**: Raw AI output
- 📊 **Token Usage**: Detailed breakdown
- ⚠️ **Validation Issues**: Content quality problems
- 🔧 **Compilation Errors**: TypeScript/build errors
- ❌ **Error Messages**: Exception details

### Summary Statistics
- Total attempts made
- Success rate
- Total tokens consumed
- Total generation time

## Sample Trace Walkthrough

### Example: Successful Generation (3 Attempts)

#### Attempt 1: Validation Failed
```
Status: ⚠️ Validation Failed
Model: gpt-4
Tokens: 2,450 (1,200 prompt + 1,250 completion)
Duration: 0s (start)

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

#### Attempt 2: Compilation Failed
```
Status: 🔧 Compilation Failed
Model: gpt-4
Tokens: 3,100 (1,850 prompt + 1,250 completion)
Duration: +3.2s

TypeScript Errors:
- Line 45: Property 'useState' does not exist
- Line 67: Cannot find name 'React'
- Line 89: Expected ';' but found '}'

Validation: Passed
Quality Score: 85.2%
```

#### Attempt 3: Success
```
Status: ✅ Success
Model: gpt-4
Tokens: 3,250 (1,900 prompt + 1,350 completion)
Duration: +4.1s

Validation: Passed
Compilation: Success
Quality Score: 92.8%

Generation completed successfully!
```

**Total**: 8,800 tokens, 7.3 seconds, 3 attempts

## Understanding Quality Metrics

### Validation Score Breakdown
- **Content Relevance**: Matches the outline (25%)
- **Educational Value**: Clear explanations (25%)
- **Interactivity**: Engaging elements (20%)
- **Code Quality**: Clean, well-structured (15%)
- **Completeness**: All topics covered (15%)

### Score Interpretation
- **90-100%**: Excellent - Publication ready
- **75-89%**: Good - Minor improvements needed
- **60-74%**: Fair - Significant gaps exist
- **< 60%**: Poor - Major rework required

## Debugging Failed Generations

### Common Issues

#### 1. Security Validation Failed
**Problem**: Forbidden tokens detected (eval, fetch, etc.)
**Solution**: Regenerate with safer code patterns
**Example**:
```typescript
// ❌ Forbidden
eval(userInput)
fetch('http://api.com/data')

// ✅ Allowed
const result = calculateSafely(userInput)
// Use static data instead of fetching
```

#### 2. Compilation Errors
**Problem**: TypeScript syntax errors
**Solution**: Check for:
- Missing React imports
- Incorrect JSX syntax
- Type mismatches
- Missing semicolons/brackets

#### 3. Content Quality Issues
**Problem**: Low validation score
**Solution**: Review suggestions:
- Add more examples
- Improve explanations
- Include interactive elements
- Better organization

## Token Usage & Cost Optimization

### Token Consumption Patterns
```
Average Successful Generation:
- Attempt 1 (Initial): ~2,500 tokens
- Attempt 2 (Retry): ~3,000 tokens
- Attempt 3 (Retry): ~3,200 tokens
Total Average: ~6,500 tokens

Failed Generations:
- Can consume 10,000+ tokens over 5 attempts
```

### Cost Estimates (GPT-4)
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens
- Average lesson: ~$0.40-0.60
- Failed lesson: ~$0.80-1.20

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

### Trace Data Structure
```typescript
interface Trace {
  id: string
  lesson_id: string
  attempt_number: number
  timestamp: string
  prompt: string              // Full prompt
  model: string               // LLM model used
  response: string            // Raw LLM response
  tokens: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  validation: {
    passed: boolean
    errors?: string[]
    forbidden_tokens?: string[]
    score?: number
    issues?: string[]
    suggestions?: string[]
    metrics?: {
      relevance: number
      educational_value: number
      interactivity: number
      code_quality: number
      completeness: number
    }
  }
  compilation: {
    success: boolean
    tsc_errors?: string[]
    esbuild_errors?: string[]
  }
  outline_metadata?: {
    outline: string
  }
  error?: string
  created_at: string
}
```

## Integration with External Tools

### Logging Platforms
The trace data can be integrated with:
- **Langfuse**: LLM observability platform
- **LangSmith**: LangChain debugging
- **Weights & Biases**: ML experiment tracking
- **Custom dashboards**: Via API export

### Webhook Integration (Future)
```typescript
// Configure webhook for trace events
POST /api/webhooks/traces
{
  "url": "https://your-analytics.com/traces",
  "events": ["generation.started", "generation.completed", "generation.failed"]
}
```

## Privacy & Security

### Data Retention
- Traces stored for 90 days by default
- Can be configured per deployment
- PII is not included in traces

### Access Control
- Traces only visible to lesson creators
- No sharing between users
- Admin access for debugging

### Sensitive Data
- API keys never logged
- User data sanitized
- Code is the only UGC logged

## Best Practices

### For Developers
1. **Review traces** for all failed generations
2. **Analyze patterns** in successful generations
3. **Optimize prompts** based on feedback
4. **Monitor token usage** to control costs
5. **Set up alerts** for high failure rates

### For Content Creators
1. **Check validation suggestions** before retrying
2. **Provide detailed outlines** to reduce retries
3. **Review successful patterns** for your content type
4. **Learn from compilation errors** to improve future outlines

## Troubleshooting

### Traces Not Appearing
- Wait 5-10 seconds after generation
- Refresh the page
- Check lesson status (must be "generating" or "generated/failed")

### Missing Information
- Some fields optional (validation metrics, etc.)
- Early versions may have limited data
- Upgrade to latest version for full tracing

### Performance Issues
- Large traces (>10 attempts) may load slowly
- Use collapsible sections to manage
- Export and analyze offline if needed

## Future Enhancements

### Planned Features
- [ ] Multi-agent trace visualization
- [ ] Real-time trace streaming
- [ ] Trace comparison tools
- [ ] Automated prompt optimization
- [ ] Cost prediction models
- [ ] Quality trend analysis

## Support

For issues with tracing:
1. Check this guide
2. Review sample traces
3. Contact support with lesson ID
4. Export trace data for debugging

---

**Last Updated**: December 2024
**Version**: 1.0.0

