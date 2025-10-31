-- Atomic claim function: picks oldest queued lesson and sets status to generating
-- Returns the full lesson row
create or replace function public.claim_next_lesson()
returns public.lessons
language sql
security definer
as $$
  with cte as (
    select id
    from public.lessons
    where status = 'queued'
    order by created_at asc
    limit 1
    for update skip locked
  )
  update public.lessons l
  set status = 'generating'
  from cte
  where l.id = cte.id
  returning l.*;
$$;

grant execute on function public.claim_next_lesson() to anon, authenticated, service_role;

