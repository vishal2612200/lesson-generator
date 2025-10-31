# Debugging

Common issues and debugging tips.

## Debugging Tools

### Browser DevTools

- **Console**: Check for errors
- **Network**: Check API requests
- **React DevTools**: Inspect components

### Worker Logs

Worker logs are output to console. View logs in the terminal where the worker process is running.

### Database

```bash
# Connect to Supabase
npx supabase db shell

# Query lessons
SELECT * FROM lessons WHERE status = 'failed';
```

## Common Issues

### Lesson Stuck in "queued"

**Symptoms**: Lesson remains queued

**Debug**:
1. Check worker is running: `ps aux | grep "tsx src/worker/cli.ts"`
2. Check worker console output (terminal where worker is running)
3. Verify database connection

**Fix**: Restart worker

```bash
pkill -f cli.ts
npm run worker
```

### Generation Fails

**Symptoms**: Status changes to "failed"

**Debug**:
1. Check traces in lesson detail page
2. Review compilation errors
3. Check validation issues

**Fix**: Improve outline or check API key

### Component Not Rendering

**Symptoms**: White screen or error

**Debug**:
1. Browser console errors
2. Check compilation
3. Verify code structure

**Fix**: Check traces for compilation errors

## Debugging Techniques

### Logging

```typescript
console.log('Debug info:', { lessonId, status })
logger.debug('Detailed debug', { data })
```

### Breakpoints

Use debugger in VS Code:

```typescript
debugger // Breakpoint
```

### Trace Inspection

Check traces for detailed information:

```typescript
GET /api/lessons/[id]
// Check traces array
```

## Next Steps

- **[Testing](/docs/development/testing)** - Test strategy
- **[Troubleshooting](/docs/operations/troubleshooting)** - Common issues

