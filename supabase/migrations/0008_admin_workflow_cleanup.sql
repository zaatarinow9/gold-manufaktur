create table if not exists public.site_settings (
  key text primary key,
  value_text text,
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders
  add column if not exists assigned_worker_email text,
  add column if not exists assigned_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists orders_assigned_worker_email_idx
  on public.orders (assigned_worker_email);

create index if not exists orders_deleted_at_idx
  on public.orders (deleted_at);

create index if not exists orders_archived_at_idx
  on public.orders (archived_at);
