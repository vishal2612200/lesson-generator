# Worker System

Real-time processing architecture for background lesson generation.

## Overview

The worker process continuously monitors the database for queued lessons and processes them sequentially. It uses Supabase realtime channels for instant processing with polling fallback.

## Architecture

```
Worker Process
    ↓
Supabase Connection
    ↓
Realtime Channel Subscription
    ↓
Listen for INSERT/UPDATE Events
    ↓
When Event:
    processQueue()
    ↓
Atomic Claim (CAS)
    ↓
Check MODE env var
    ↓
    ┌─────────────────┬─────────────────────┐
    │ MODE=legacy     │ MODE not set         │
    │ (Legacy Path)   │ (Default Path)       │
    └─────────────────┴─────────────────────┘
         ↓                        ↓
generateLessonHybrid()  Infer Pedagogy from Topic
         ↓                        ↓
    (complexity-based      orchestrateComponentGeneration()
     routing)              (with inferred pedagogy)
         ↓                        ↓
    Single or Multi        Status Updates
    Agent based on
    complexity
         ↓
    Status Updates
```

## Real-Time Processing

### Supabase Realtime

```typescript
const channel = supabaseAdmin
  .channel('lessons-realtime')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'lessons' 
  }, (payload) => {
    if (payload?.new?.status === 'queued') {
      triggerProcess()  // Instant processing
    }
  })
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'lessons' 
  }, (payload) => {
    if (payload?.new?.status === 'queued' && 
        payload?.old?.status !== 'queued') {
      triggerProcess()  // Instant processing
    }
  })
  .subscribe()
```

**Benefits**:
- Instant processing on INSERT/UPDATE
- No polling overhead when idle
- Efficient resource usage

### Polling Fallback

```typescript
const INTER_JOB_DELAY_MS = 8000  // 8 seconds

setInterval(async () => {
  await processQueue()
}, INTER_JOB_DELAY_MS)
```

**Benefits**:
- Catches missed realtime events
- Redundant reliability layer
- Handles connection failures

## Atomic Job Claiming

### Compare-And-Set (CAS)

```typescript
// Atomic claim - only one worker gets each lesson
const { data: claimed } = await supabaseAdmin
  .from('lessons')
  .update({ status: 'generating' })
  .eq('id', lesson.id)
  .eq('status', 'queued')  // CAS: only update if still queued
  .select('id,title,outline,status')
  .single()
```

**Benefits**:
- Prevents duplicate processing
- Fair distribution across workers
- Reliable status updates
- Safe for multiple workers

### RPC Alternative

```sql
CREATE OR REPLACE FUNCTION claim_next_lesson()
RETURNS TABLE(...) AS $$
BEGIN
  UPDATE lessons
  SET status = 'generating'
  WHERE id = (
    SELECT id FROM lessons
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING ...;
END;
$$ LANGUAGE plpgsql;
```

**Benefits**:
- Database-level atomicity
- Handles concurrent access
- Efficient locking

## Sequential Processing

### One Lesson at a Time

The worker processes one lesson at a time:

```typescript
async function processQueue(): Promise<void> {
  const claimed = await claimNextLesson()
  if (!claimed) return
  
  await generateLessonHybrid(claimed.id)
  
  // Wait before processing next
  await sleep(INTER_JOB_DELAY_MS)
  await processQueue()
}
```

**Benefits**:
- Prevents API rate limits
- Predictable performance
- Easier debugging
- Resource control

### Throughput

- **Single worker**: ~30-60 lessons/hour
- **Sequential processing**: One at a time
- **Generation time**: 30-60 seconds per lesson

## Processing Flow

### Step 1: Claim Lesson

```typescript
// Try RPC first
const rpcRes = await supabaseAdmin
  .rpc('claim_next_lesson')
  .select('id,title,outline,status')
  .single()

// Fallback to CAS update
if (!rpcRes.data) {
  // Find one queued lesson
  const { data: lessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
  
  if (lessons && lessons.length > 0) {
    // Atomic claim with CAS
    const { data } = await supabaseAdmin
      .from('lessons')
      .update({ status: 'generating' })
      .eq('id', lessons[0].id)
      .eq('status', 'queued')  // CAS: only update if still queued
      .select('id,title,outline,status')
      .single()
  }
}
```

### Step 2: Generate Content

```typescript
// Check MODE environment variable
const mode = (process.env.MODE || '').toLowerCase();

if (mode === 'legacy') {
  // Legacy path: Uses generateLessonHybrid() which routes internally
  await generateLessonHybrid(lessonId);
} else {
  // Default path: Infers pedagogy from topic keywords and calls orchestrateComponentGeneration()
  const topicLower = claimed.outline.toLowerCase();
  // Infer pedagogy settings (gradeBand, readingLevel, cognitiveLoad)
  const pedagogy = inferPedagogyFromTopic(topicLower);
  
  await orchestrateComponentGeneration({
    topic: claimed.outline,
    lessonId: claimed.id,
    pedagogy: pedagogy
  });
}
```

### Step 3: Update Status

```typescript
// Success
await supabaseAdmin
  .from('lessons')
  .update({ status: 'generated' })
  .eq('id', lessonId)

// Or failure
await supabaseAdmin
  .from('lessons')
  .update({ status: 'failed' })
  .eq('id', lessonId)
```

## Error Handling

### Try/Catch Block

```typescript
try {
  await generateLessonHybrid(lessonId)
} catch (error) {
  // Log error
  logger.error('Generation failed', { lessonId, error })
  
  // Update status
  await supabaseAdmin
    .from('lessons')
    .update({ status: 'failed' })
    .eq('id', lessonId)
  
  // Insert trace
  await insertTrace({ lessonId, error: error.message })
}
```

### Retry Logic

The system supports automatic retries:

- Max attempts: 3
- Exponential backoff: 1s, 2s, 4s
- Tracks attempts in `generation_attempts` table

## Monitoring

### Logging

```typescript
logger.info('Processing lesson', {
  lessonId,
  status: 'generating',
  timestamp: new Date()
})
```

### Metrics

- Processing time
- Success rate
- Error rates
- Queue depth

## Scaling Considerations

### Single Worker (Current)

- **Throughput**: ~30-60 lessons/hour
- **Limitations**: Sequential processing
- **Suitable for**: &lt;1000 lessons/day

### Multiple Workers (Future)

To scale horizontally:

1. **Distributed Locking**: Redis or PostgreSQL advisory locks
2. **Job Queue**: BullMQ, Celery, or similar
3. **Worker Coordination**: Leader election or queue-based

**Benefits**:
- Higher throughput
- Parallel processing
- Better resource utilization

### Database Connection Pooling

For multiple workers:

- Use connection pooling
- Limit connections per worker
- Monitor connection usage

## Running the Worker

### Development

```bash
npm run worker
```

### Production

```bash
# Railway/Render/Heroku
npm run worker

# Or with PM2
pm2 start npm --name worker -- run worker
```

### Environment Variables

Required for worker:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
LLM_API_KEY_OR_MOCK=...
MODEL_NAME=gpt-4o-mini
```

## Troubleshooting

### Worker Not Processing

**Symptoms**: Lessons stuck in "queued" status

**Check**:
1. Worker process running: `ps aux | grep "tsx src/worker/cli.ts"`
2. Database connection: Verify `SUPABASE_SERVICE_ROLE_KEY`
3. Realtime enabled: Check Supabase dashboard

**Fix**: Restart worker

```bash
pkill -f cli.ts
npm run worker
```

### High Queue Depth

**Symptoms**: Many lessons queued for long time

**Check**:
1. Worker throughput
2. Generation success rate
3. API rate limits

**Fix**: Add more workers or optimize generation

### Memory Issues

**Symptoms**: Worker crashes or slow

**Check**:
1. Memory usage
2. Compilation timeouts
3. Large lesson generation

**Fix**: Optimize memory usage or add worker limits

## Next Steps

- **[Multi-Agent System](/docs/architecture/multi-agent)** - Multi-agent generation details
- **[Rendering System](/docs/architecture/rendering)** - Component rendering
- **[Security Model](/docs/architecture/security)** - Security validation
- **[Operations](/docs/operations/monitoring)** - Monitoring and operations

