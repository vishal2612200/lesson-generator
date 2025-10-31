# Scaling

Performance and scaling considerations.

## Current Architecture

- **Single worker**: Sequential processing
- **Throughput**: ~30-60 lessons/hour
- **Suitable for**: &lt;1000 lessons/day

## Scaling Strategies

### Multiple Workers

- Add more worker instances
- Use distributed locking (Redis)
- Job queue system (BullMQ)

### Database Optimization

- Connection pooling
- Index optimization
- Query optimization

### Caching

- Cache similar prompts
- Cache compiled components
- Redis caching layer

## Performance Tuning

- Optimize generation prompts
- Reduce compilation time
- Batch processing
- Parallel generation

## Next Steps

- **[Costs](/docs/operations/costs)** - Cost management
- **[Monitoring](/docs/operations/monitoring)** - System monitoring

