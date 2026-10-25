-- Workshop flow v4
--  * richer employee task states (declined, problem, shipped)
--  * in-app messages between employee <-> workshop manager <-> management
--  * per-person read markers for message threads
-- Everything here is written by server actions through the service role, so
-- RLS is enabled without client policies.

alter type public.order_assignment_status add value if not exists 'declined';
alter type public.order_assignment_status add value if not exists 'problem';
alter type public.order_assignment_status add value if not exists 'shipped';

create table if not exists public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  -- team: an employee and the workshop manager; management: the workshop manager and head office
  channel text not null check (channel in ('team', 'management')),
  employee_id uuid references public.employees (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  author_profile_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_kind text not null check (author_kind in ('admin', 'manager', 'employee')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  constraint staff_messages_team_employee check (channel <> 'team' or employee_id is not null)
);

create index if not exists staff_messages_thread_idx
  on public.staff_messages (workshop_id, channel, employee_id, created_at desc);
create index if not exists staff_messages_order_idx
  on public.staff_messages (order_id) where order_id is not null;

create table if not exists public.staff_message_reads (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  thread_key text not null,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, thread_key)
);

alter table public.staff_messages enable row level security;
alter table public.staff_message_reads enable row level security;
revoke all on public.staff_messages from anon, authenticated;
revoke all on public.staff_message_reads from anon, authenticated;

-- Clearing all orders (settings > data) also removes their notifications; the
-- messages stay but lose the order reference via ON DELETE SET NULL.
