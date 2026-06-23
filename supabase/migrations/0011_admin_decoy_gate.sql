create table if not exists public.admin_decoy_control (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null unique default 'main',
  is_decoy_enabled boolean not null default false,
  gate_enabled boolean not null default false,
  gate_token_hash text,
  token_version integer not null default 1,
  expires_at timestamptz,
  last_rotated_at timestamptz,
  last_used_at timestamptz,
  updated_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.admin_decoy_control (singleton_key)
values ('main')
on conflict (singleton_key) do nothing;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
  ) then
    drop trigger if exists set_admin_decoy_control_updated_at on public.admin_decoy_control;
    create trigger set_admin_decoy_control_updated_at
    before update on public.admin_decoy_control
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.admin_decoy_control enable row level security;

create table if not exists public.admin_decoy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_email text,
  actor_user_id text,
  ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_decoy_audit_logs_created_at_idx
  on public.admin_decoy_audit_logs (created_at desc);

alter table public.admin_decoy_audit_logs enable row level security;

-- Emergency manual control
--
-- To disable fake dashboard and restore real admin:
-- update admin_decoy_control
-- set is_decoy_enabled = false, updated_at = now()
-- where singleton_key = 'main';
--
-- To kill the secret gate link:
-- update admin_decoy_control
-- set gate_enabled = false, updated_at = now()
-- where singleton_key = 'main';
--
-- To kill both:
-- update admin_decoy_control
-- set is_decoy_enabled = false, gate_enabled = false, updated_at = now()
-- where singleton_key = 'main';
