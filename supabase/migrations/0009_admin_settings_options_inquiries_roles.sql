do $$
begin
  alter type public.profile_role add value if not exists 'viewer';
exception
  when duplicate_object then null;
end
$$;

alter table if exists public.site_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'Admins can read site settings'
  ) then
    create policy "Admins can read site settings"
      on public.site_settings
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'Admins can manage site settings'
  ) then
    create policy "Admins can manage site settings"
      on public.site_settings
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      );
  end if;
end
$$;

alter table public.products
  add column if not exists option_group_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_option_group_id_fkey'
  ) then
    alter table public.products
      add constraint products_option_group_id_fkey
      foreign key (option_group_id)
      references public.option_groups (id)
      on delete set null;
  end if;
end
$$;

create index if not exists products_option_group_id_idx
  on public.products (option_group_id);

alter table public.option_groups
  add column if not exists deleted_at timestamptz;

alter table public.options
  add column if not exists deleted_at timestamptz,
  add column if not exists help_text_de text,
  add column if not exists help_text_ar text,
  add column if not exists help_text_en text,
  add column if not exists help_text_fr text,
  add column if not exists help_text_tr text,
  add column if not exists placeholder_de text,
  add column if not exists placeholder_ar text,
  add column if not exists placeholder_en text,
  add column if not exists placeholder_fr text,
  add column if not exists placeholder_tr text;

alter table public.profiles
  add column if not exists employee_id uuid,
  add column if not exists workshop_id uuid,
  add column if not exists deleted_at timestamptz,
  add column if not exists invited_at timestamptz,
  add column if not exists last_login_at timestamptz;

create index if not exists profiles_email_idx
  on public.profiles (email);

create table if not exists public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('contact', 'product', 'order_entry')),
  status text not null default 'new' check (
    status in ('new', 'read', 'in_progress', 'replied', 'archived')
  ),
  customer_name text,
  customer_email text,
  customer_phone text,
  message text,
  product_id uuid references public.products (id) on delete set null,
  product_snapshot jsonb not null default '{}'::jsonb,
  option_values jsonb not null default '{}'::jsonb,
  locale text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customer_inquiries_status_idx
  on public.customer_inquiries (status);

create index if not exists customer_inquiries_created_at_idx
  on public.customer_inquiries (created_at desc);

create index if not exists customer_inquiries_deleted_at_idx
  on public.customer_inquiries (deleted_at);

create index if not exists customer_inquiries_product_id_idx
  on public.customer_inquiries (product_id);

drop trigger if exists set_customer_inquiries_updated_at on public.customer_inquiries;
create trigger set_customer_inquiries_updated_at
before update on public.customer_inquiries
for each row
execute function public.set_updated_at();

alter table public.customer_inquiries enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inquiries'
      and policyname = 'Admins can read customer inquiries'
  ) then
    create policy "Admins can read customer inquiries"
      on public.customer_inquiries
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inquiries'
      and policyname = 'Admins can manage customer inquiries'
  ) then
    create policy "Admins can manage customer inquiries"
      on public.customer_inquiries
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      );
  end if;
end
$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'Admins can read audit logs'
  ) then
    create policy "Admins can read audit logs"
      on public.audit_logs
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'Admins can insert audit logs'
  ) then
    create policy "Admins can insert audit logs"
      on public.audit_logs
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active = true
            and p.role in ('super_admin', 'admin')
        )
      );
  end if;
end
$$;
