# Monitoring

Monitor system health and performance.

## Metrics

### Generation Success Rate

```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM lessons
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Average Generation Time

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM lessons
WHERE status = 'generated'
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Error Rates by Stage

```sql
SELECT 
  stage,
  COUNT(*) as error_count
FROM traces
WHERE metadata->>'error' IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage
ORDER BY error_count DESC;
```

## Logging

### Worker Logs

Worker logs are output to console (stdout/stderr). View logs in:
- **Development**: Terminal where worker is running
- **Production**: Hosting platform logs (Railway, Render, Heroku, etc.)

### Filter Logs

```bash
# In production, use hosting platform log filtering
# Example: Railway
railway logs --filter "ERROR"

# Example: Render
# Use Render dashboard log filters
```

## Alerts

Set up alerts for:
- High failure rate (>10% in 1 hour)
- Slow generation (>120s average)
- Worker down (no activity in 10 minutes)
- Rate limiting (429 errors)

## Next Steps

- **[Troubleshooting](/docs/operations/troubleshooting)** - Common issues
- **[Scaling](/docs/operations/scaling)** - Performance optimization

