-- Enable Row Level Security on core tables
alter table if exists public.lessons enable row level security;
alter table if exists public.lesson_contents enable row level security;
alter table if exists public.traces enable row level security;
alter table if exists public.multi_agent_traces enable row level security;

-- Basic read policy for lessons (public listing). Adjust to 'authenticated' if needed.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lessons' and policyname = 'public_lessons_read'
  ) then
    create policy public_lessons_read on public.lessons for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Writes to lessons only via service_role (status updates, etc.)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lessons' and policyname = 'service_lessons_write'
  ) then
    create policy service_lessons_write on public.lessons for update
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- Insert/read lesson_contents
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lesson_contents' and policyname = 'public_lesson_contents_read'
  ) then
    create policy public_lesson_contents_read on public.lesson_contents for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lesson_contents' and policyname = 'service_lesson_contents_write'
  ) then
    create policy service_lesson_contents_write on public.lesson_contents for insert
      to service_role
      with check (true);
  end if;
end $$;

-- Traces readable only by service_role; writes restricted to service_role
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'traces' and policyname = 'service_traces_read'
  ) then
    create policy service_traces_read on public.traces for select
      to service_role
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'traces' and policyname = 'service_traces_write'
  ) then
    create policy service_traces_write on public.traces for insert
      to service_role
      with check (true);
  end if;
end $$;

-- Multi agent traces: restrict to service_role
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'multi_agent_traces' and policyname = 'service_multi_traces_read'
  ) then
    create policy service_multi_traces_read on public.multi_agent_traces for select
      to service_role
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'multi_agent_traces' and policyname = 'service_multi_traces_write'
  ) then
    create policy service_multi_traces_write on public.multi_agent_traces for insert
      to service_role
      with check (true);
  end if;
end $$;

-- Tighten RPC permissions: claim_next_lesson only executable by service_role
revoke execute on function public.claim_next_lesson() from anon;
revoke execute on function public.claim_next_lesson() from authenticated;
grant execute on function public.claim_next_lesson() to service_role;

-- Indexes for hot paths
create index if not exists idx_lessons_status_created_at on public.lessons (status, created_at desc);
create index if not exists idx_lesson_contents_lesson_created_at on public.lesson_contents (lesson_id, created_at desc);
create index if not exists idx_traces_lesson_created_at on public.traces (lesson_id, created_at asc);

