# Troubleshooting

Common issues and solutions.

## Worker Not Processing

**Symptoms**: Lessons stuck in "queued"

**Debug**:
```bash
# Check worker
ps aux | grep "tsx src/worker/cli.ts"

# Check logs (console output where worker is running)
# In production, check hosting platform logs

# Verify database
npx supabase db ping
```

**Fix**: Restart worker or check credentials

## Generation Fails

**Symptoms**: Status changes to "failed"

**Debug**:
- Check traces in lesson detail
- Review compilation errors
- Check validation issues

**Fix**: Improve outline or check API key

## Component Not Rendering

**Symptoms**: White screen

**Debug**:
- Browser console errors
- Check compilation
- Verify code structure

**Fix**: Check traces for errors

## Rate Limiting

**Symptoms**: 429 errors

**Fix**: Built-in retry logic handles this automatically

## Database Connection

**Symptoms**: Connection errors

**Fix**: Verify credentials and project status

## Next Steps

- **[Scaling](/docs/operations/scaling)** - Performance optimization
- **[Costs](/docs/operations/costs)** - Cost management

