# Database Setup

Set up Supabase database for production.

## Prerequisites

- Supabase account
- Project created
- Database URL and keys

## Initial Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for provisioning
4. Save database password

### 2. Run Migrations

```bash
# Link project
supabase link --project-ref <your-project-ref>

# Run migrations
npx supabase db push

# Verify
npx supabase db diff
```

### 3. Enable Realtime

Realtime is enabled by default. Verify in Supabase Dashboard:

**Database** → **Replication** → All tables should be enabled

### 4. Configure RLS

Row Level Security policies are in migration `005_rls_policies.sql`.

Verify policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'lessons';
```

## Production Checklist

- ✅ Migrations run successfully
- ✅ Realtime enabled
- ✅ RLS policies configured
- ✅ Backups enabled
- ✅ Connection pooling configured (if needed)

## Monitoring

### Supabase Dashboard

- **Database** → **Table Editor** - View data
- **Database** → **Logs** - View query logs
- **Settings** → **API** - Manage keys

### Performance

Monitor:
- Query performance
- Connection usage
- Storage usage
- Realtime connections

## Next Steps

- **[Environment Variables](/docs/deployment/environment-variables)** - Configuration
- **[Operations](/docs/operations/monitoring)** - Monitoring

