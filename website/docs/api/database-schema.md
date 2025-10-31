# Database Schema

Complete database schema reference.

## Tables

### lessons

Lesson metadata and status.

```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  outline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'generating', 'generated', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns**:
- `id` - UUID primary key
- `title` - Lesson title (extracted from outline)
- `outline` - User's prompt/outline
- `status` - Current status (queued, generating, generated, failed)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Indexes**:
- `idx_lessons_status` - On `status`
- `idx_lessons_created_at` - On `created_at DESC`

### lesson_contents

Generated content storage.

```sql
CREATE TABLE lesson_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  typescript_source TEXT NOT NULL,
  compiled_js TEXT,
  blocks JSONB,  -- Unused: legacy block-based generation removed
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns**:
- `id` - UUID primary key
- `lesson_id` - Foreign key to lessons
- `typescript_source` - TSX source code (React components)
- `compiled_js` - Compiled JavaScript (often null, compiled in browser)
- `version` - Content version number
- `created_at` - Creation timestamp

**Indexes**:
- `idx_lesson_contents_lesson_id` - On `lesson_id`

### traces

Generation traces for debugging.

```sql
CREATE TABLE traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens JSONB,
  validation JSONB NOT NULL,
  compilation JSONB NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns**:
- `id` - UUID primary key
- `lesson_id` - Foreign key to lessons
- `attempt_number` - Sequential attempt number
- `timestamp` - Attempt timestamp
- `prompt` - Full prompt sent to LLM
- `model` - LLM model used
- `response` - Raw LLM response
- `tokens` - Token usage (JSONB)
- `validation` - Validation results (JSONB)
- `compilation` - Compilation results (JSONB)
- `error` - Error message (if any)
- `created_at` - Creation timestamp

**Indexes**:
- `idx_traces_lesson_id` - On `lesson_id`

### generation_attempts

Generation attempt tracking.

```sql
CREATE TABLE generation_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL 
    CHECK (status IN ('in_progress', 'success', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns**:
- `id` - UUID primary key
- `lesson_id` - Foreign key to lessons
- `attempt_number` - Sequential attempt number
- `started_at` - Start timestamp
- `finished_at` - Finish timestamp (nullable)
- `status` - Attempt status
- `error` - Error message (if any)
- `created_at` - Creation timestamp

**Indexes**:
- `idx_generation_attempts_lesson_id` - On `lesson_id`

## Functions

### claim_next_lesson()

Atomic lesson claiming function.

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

## Realtime

All tables are enabled for Supabase realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE lesson_contents;
ALTER PUBLICATION supabase_realtime ADD TABLE traces;
ALTER PUBLICATION supabase_realtime ADD TABLE generation_attempts;
```

## Relationships

```
lessons (1) ──── (many) lesson_contents
lessons (1) ──── (many) traces
lessons (1) ──── (many) generation_attempts
```

## Next Steps

- **[REST API](/docs/api/rest-api)** - API endpoints
- **[Types](/docs/api/types)** - TypeScript types

