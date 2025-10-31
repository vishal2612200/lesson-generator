# Understanding Lesson Status

Learn how lessons progress through the generation workflow.

## Status Overview

There are two different status workflows depending on how lessons are created:

### API Path (Synchronous - Used by Web Interface)

```
generating → generated/failed
```

Lessons created via `POST /api/lessons` start with status "generating" and complete synchronously before the API returns.

### Worker Path (Asynchronous - Background Processing)

```
queued → generating → generated/failed
```

Lessons created with status "queued" are processed asynchronously by the worker process.

Each status indicates the current state of lesson generation.

## Status Types

### queued

**Worker Path Only**: The lesson has been created and is waiting for the worker process to pick it up.

**What happens**:
- Lesson is inserted into the database with status `queued`
- Worker process is notified (via realtime or polling)
- Worker will claim the lesson and begin generation

**Timing**: Usually instant via Supabase realtime, or within 8 seconds via polling fallback

**User sees**: Lesson card shows "queued" status with clock icon

**Note**: The API path (synchronous generation) does NOT use "queued" status. Lessons created via `POST /api/lessons` start directly with "generating" status.

### generating

The lesson is actively being processed and content is being generated.

**API Path**:
- Lesson is created directly with status `generating`
- Generation runs synchronously
- AI processes the outline and generates content
- Multiple validation and compilation steps occur
- Status changes to `generated` or `failed` before API returns

**Worker Path**:
- Worker claims the lesson from `queued` status
- Worker updates lesson status to `generating`
- AI processes the outline and generates content
- Multiple validation and compilation steps occur
- Content is saved to database

**Timing**: Typically 30-60 seconds, depending on:
- Outline complexity
- Generation mode (single vs multi-agent)
- API response times
- Compilation and validation steps

**User sees**: Lesson card shows "generating" status with spinner animation

### generated

The lesson has been successfully generated and is ready to view.

**What happens**:
- Content is saved to `lesson_contents` table
- Lesson status updates to `generated`
- React component is ready
- Lesson can be viewed and interacted with

**Timing**: Immediately after successful generation

**User sees**: Lesson card shows "generated" status with checkmark icon

### failed

Generation failed and the lesson cannot be viewed.

**What happens**:
- Worker encountered an error during generation
- Error details are stored in `traces` table
- Lesson status updates to `failed`
- User can check traces for debugging

**Common causes**:
- Compilation errors (TypeScript syntax issues)
- Validation failures (security checks)
- API errors (rate limits, invalid API key)
- Network timeouts

**User sees**: Lesson card shows "failed" status with error icon

## Status Updates

### Real-Time Updates

Status updates appear in real-time via Supabase realtime:

- No page refresh needed
- Status changes appear automatically
- Instant updates when worker processes lessons

### Polling Fallback

If realtime fails, the frontend polls every 8 seconds:

- Automatic retry
- Graceful degradation
- Still responsive for most use cases

## Monitoring Status

### On the Homepage

The lessons list shows all lessons with their current status:

```
┌─────────────────────────────┐
│ Introduction to React        │
│ ✅ Generated                 │
│ Created: Jan 15, 2025        │
└─────────────────────────────┘
```

### In Lesson Detail

The lesson detail page shows:

- Current status badge
- Generation timestamp
- Time taken (if available)
- Generation traces (for debugging)

## Status Transitions

### API Path Flow (Synchronous)

#### Successful Flow

```
User creates lesson via POST /api/lessons
    ↓
generating (created directly)
    ↓
Generation runs synchronously (~30-60s)
    ↓
generated ✅
    ↓
API returns lesson data
```

#### Failed Flow

```
User creates lesson via POST /api/lessons
    ↓
generating (created directly)
    ↓
Generation runs synchronously (~30-60s)
    ↓
failed ❌
    ↓
API returns error
```

### Worker Path Flow (Asynchronous)

#### Successful Flow

```
Lesson created with status "queued"
    ↓
queued (instant via realtime or <8s via polling)
    ↓
Worker claims lesson
    ↓
generating (~30-60s)
    ↓
generated ✅
```

#### Failed Flow

```
Lesson created with status "queued"
    ↓
queued (instant via realtime or <8s via polling)
    ↓
Worker claims lesson
    ↓
generating (~30-60s)
    ↓
failed ❌
```

### Retry Flow

If a lesson fails:

1. Check traces for error details
2. Create a new lesson (lessons cannot be retried directly)
3. Improve outline based on error insights

## Worker Processing

### How Lessons are Picked Up

The worker process continuously:

1. **Listens for new lessons** via Supabase realtime channels
2. **Polls for queued lessons** every 8 seconds (fallback)
3. **Atomically claims lessons** using Compare-And-Set (CAS)
4. **Processes one lesson at a time** sequentially

### Atomic Claiming

Multiple workers can run simultaneously. To prevent conflicts:

```typescript
// Atomic claim - only one worker gets each lesson
UPDATE lessons 
SET status = 'generating' 
WHERE id = ? AND status = 'queued'
```

This ensures:
- No duplicate processing
- Fair distribution across workers
- Reliable status updates

## Troubleshooting Status Issues

### Lesson Stuck in "queued"

**Symptoms**: Lesson remains queued for more than 10 seconds

**Causes**:
- Worker process not running
- Database connection issues
- Realtime not configured

**Fix**:
1. Check worker is running: `ps aux | grep "tsx src/worker/cli.ts"`
2. Restart worker: `npm run worker`
3. Check Supabase project is active

### Lesson Stuck in "generating"

**Symptoms**: Lesson remains generating for more than 5 minutes

**Causes**:
- Worker crashed during generation
- API timeout
- Compilation loop

**Fix**:
1. Check worker console output (where worker is running)
2. Restart worker: `pkill -f cli.ts && npm run worker`
3. Check traces for errors

### Status Not Updating

**Symptoms**: Status doesn't update in real-time

**Causes**:
- Realtime connection lost
- Frontend not subscribing
- Browser cache

**Fix**:
1. Refresh page
2. Check browser console for errors
3. Verify Supabase realtime is enabled

For more help, see [Troubleshooting](/docs/operations/troubleshooting).

## Status API

### Query Status

```typescript
GET /api/lessons/[id]

Response:
{
  "data": {
    "id": "...",
    "title": "...",
    "status": "generated",
    "outline": "...",
    ...
  }
}
```

### List All Lessons

```typescript
GET /api/lessons

Response:
{
  "data": [
    {
      "id": "...",
      "title": "...",
      "status": "generated",
      ...
    }
  ]
}
```

## Next Steps

- **[Creating Lessons](/docs/user-guide/creating-lessons)** - How to create lessons
- **[Viewing Traces](/docs/user-guide/traces)** - Debug generation issues
- **[Troubleshooting](/docs/operations/troubleshooting)** - Common issues and solutions

