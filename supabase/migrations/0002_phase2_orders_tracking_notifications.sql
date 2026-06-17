create extension if not exists pgcrypto;

do $$
begin
  create type public.employee_role as enum ('admin', 'employee');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.attendance_status as enum (
    'present',
    'absent',
    'vacation',
    'sick',
    'late'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.order_priority as enum ('normal', 'urgent', 'express');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.workshop_order_status as enum (
    'draft',
    'sent_to_workshop',
    'accepted',
    'assigned',
    'in_production',
    'quality_check',
    'ready',
    'delivered',
    'cancelled',
    'archived'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tracking_status as enum (
    'created',
    'sent_to_workshop',
    'accepted_by_workshop',
    'in_production',
    'quality_check',
    'ready_for_pickup',
    'on_the_way',
    'delivered_to_store',
    'picked_up',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.support_ticket_status as enum (
    'open',
    'in_progress',
    'resolved',
    'closed'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.admin_notification_type as enum (
    'order_created',
    'order_updated',
    'ticket_created',
    'ticket_updated',
    'employee_created',
    'employee_updated',
    'workshop_created',
    'workshop_updated',
    'system'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.email_log_status as enum (
    'pending',
    'sent',
    'failed',
    'skipped'
  );
exception
  when duplicate_object then null;
end
$$;

alter table public.profiles
  add column if not exists workshop_id uuid,
  add column if not exists employee_id uuid;

alter table public.workshops
  add column if not exists code text,
  add column if not exists location text,
  add column if not exists notes text;

alter table public.employees
  add column if not exists workshop_id uuid,
  add column if not exists profile_id uuid,
  add column if not exists attendance_status public.attendance_status not null default 'present',
  add column if not exists shift_label text,
  add column if not exists notes text;

do $$
begin
  alter table public.employees
    alter column role type public.employee_role
    using (
      case
        when lower(coalesce(role, '')) = 'admin' then 'admin'::public.employee_role
        else 'employee'::public.employee_role
      end
    );
exception
  when undefined_column then null;
end
$$;

alter table public.employees
  alter column role set default 'employee';

update public.employees
set role = coalesce(role, 'employee'::public.employee_role);

alter table public.employees
  alter column role set not null;

alter table public.orders
  add column if not exists internal_order_number text,
  add column if not exists priority public.order_priority not null default 'normal',
  add column if not exists customer_email text,
  add column if not exists customer_reference text,
  add column if not exists email_updates_enabled boolean not null default false,
  add column if not exists tracking_status public.tracking_status not null default 'created',
  add column if not exists assigned_admin_id uuid,
  add column if not exists gold_details_json jsonb not null default '{}'::jsonb,
  add column if not exists measurements_json jsonb not null default '{}'::jsonb,
  add column if not exists personalization_json jsonb not null default '{}'::jsonb,
  add column if not exists stones_json jsonb not null default '{}'::jsonb,
  add column if not exists notes_json jsonb not null default '{}'::jsonb,
  add column if not exists attachments_json jsonb not null default '[]'::jsonb,
  add column if not exists archived_at timestamptz;

do $$
begin
  alter table public.orders
    alter column status type public.workshop_order_status
    using (
      case
        when status in (
          'draft',
          'sent_to_workshop',
          'accepted',
          'assigned',
          'in_production',
          'quality_check',
          'ready',
          'delivered',
          'cancelled',
          'archived'
        ) then status::public.workshop_order_status
        else 'draft'::public.workshop_order_status
      end
    );
exception
  when undefined_column then null;
end
$$;

alter table public.orders
  alter column status set default 'draft';

update public.orders
set
  internal_order_number = coalesce(
    internal_order_number,
    concat(
      'ORD-',
      to_char(created_at, 'YYYYMMDD'),
      '-',
      upper(substring(replace(id::text, '-', '') from 1 for 6))
    )
  ),
  tracking_status = case
    when status = 'sent_to_workshop' then 'sent_to_workshop'::public.tracking_status
    when status = 'accepted' then 'accepted_by_workshop'::public.tracking_status
    when status = 'assigned' then 'in_production'::public.tracking_status
    when status = 'in_production' then 'in_production'::public.tracking_status
    when status = 'quality_check' then 'quality_check'::public.tracking_status
    when status = 'ready' then 'ready_for_pickup'::public.tracking_status
    when status = 'delivered' then 'delivered_to_store'::public.tracking_status
    when status = 'archived' then 'completed'::public.tracking_status
    when status = 'cancelled' then 'cancelled'::public.tracking_status
    else coalesce(tracking_status, 'created'::public.tracking_status)
  end;

alter table public.order_items
  add column if not exists product_sku_snapshot text,
  add column if not exists product_slug_snapshot text,
  add column if not exists product_image_snapshot text,
  add column if not exists category_name_snapshot text,
  add column if not exists category_slug_snapshot text,
  add column if not exists selected_options_json jsonb not null default '[]'::jsonb,
  add column if not exists reference_images_json jsonb not null default '[]'::jsonb;

alter table public.order_status_events
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists actor_name text,
  add column if not exists is_public boolean not null default false,
  add column if not exists notify_customer boolean not null default false;

do $$
begin
  alter table public.order_status_events
    alter column status type public.tracking_status
    using (
      case
        when status = 'draft' then 'created'::public.tracking_status
        when status = 'sent_to_workshop' then 'sent_to_workshop'::public.tracking_status
        when status = 'accepted' then 'accepted_by_workshop'::public.tracking_status
        when status = 'assigned' then 'in_production'::public.tracking_status
        when status = 'in_production' then 'in_production'::public.tracking_status
        when status = 'quality_check' then 'quality_check'::public.tracking_status
        when status = 'ready' then 'ready_for_pickup'::public.tracking_status
        when status = 'delivered' then 'delivered_to_store'::public.tracking_status
        when status = 'archived' then 'completed'::public.tracking_status
        when status = 'cancelled' then 'cancelled'::public.tracking_status
        when status in (
          'created',
          'accepted_by_workshop',
          'ready_for_pickup',
          'on_the_way',
          'delivered_to_store',
          'picked_up',
          'completed'
        ) then status::public.tracking_status
        else 'created'::public.tracking_status
      end
    );
exception
  when undefined_column then null;
end
$$;

update public.order_status_events
set
  description = coalesce(description, note),
  title = coalesce(title, initcap(replace(status::text, '_', ' ')));

alter table public.profiles
  add constraint profiles_workshop_id_fkey
    foreign key (workshop_id) references public.workshops (id) on delete set null,
  add constraint profiles_employee_id_fkey
    foreign key (employee_id) references public.employees (id) on delete set null;

alter table public.employees
  add constraint employees_workshop_id_fkey
    foreign key (workshop_id) references public.workshops (id) on delete set null,
  add constraint employees_profile_id_fkey
    foreign key (profile_id) references auth.users (id) on delete set null;

alter table public.orders
  add constraint orders_assigned_admin_id_fkey
    foreign key (assigned_admin_id) references auth.users (id) on delete set null;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  tracking_number text not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  subject text not null,
  message text not null,
  status public.support_ticket_status not null default 'open',
  source text not null default 'tracking_page',
  admin_notes text,
  created_by_profile_id uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  workshop_id uuid references public.workshops (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete cascade,
  type public.admin_notification_type not null default 'system',
  title text not null,
  message text not null,
  link_path text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  support_ticket_id uuid references public.support_tickets (id) on delete set null,
  notification_id uuid references public.admin_notifications (id) on delete set null,
  provider text not null default 'log_only',
  direction text not null default 'outbound',
  status public.email_log_status not null default 'pending',
  recipient_email text not null,
  subject text not null,
  body_text text,
  body_html text,
  error_message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create unique index if not exists employees_profile_id_key on public.employees (profile_id)
where profile_id is not null;

create unique index if not exists workshops_code_key on public.workshops (code)
where code is not null;

create unique index if not exists orders_internal_order_number_key
on public.orders (internal_order_number)
where internal_order_number is not null;

create index if not exists profiles_workshop_id_idx on public.profiles (workshop_id);
create index if not exists profiles_employee_id_idx on public.profiles (employee_id);
create index if not exists employees_workshop_id_idx on public.employees (workshop_id);
create index if not exists orders_assigned_admin_id_idx on public.orders (assigned_admin_id);
create index if not exists orders_tracking_status_idx on public.orders (tracking_status);
create index if not exists support_tickets_order_id_idx on public.support_tickets (order_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists admin_notifications_profile_id_idx on public.admin_notifications (profile_id);
create index if not exists admin_notifications_workshop_id_idx on public.admin_notifications (workshop_id);
create index if not exists admin_notifications_employee_id_idx on public.admin_notifications (employee_id);
create index if not exists admin_notifications_unread_idx
on public.admin_notifications (created_at desc)
where is_read is false;
create index if not exists email_logs_order_id_idx on public.email_logs (order_id);
create index if not exists email_logs_support_ticket_id_idx on public.email_logs (support_ticket_id);
create index if not exists email_logs_status_idx on public.email_logs (status);

create or replace function public.current_profile_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.workshop_id
  from public.profiles as p
  where p.id = auth.uid()
    and p.is_active is true
  limit 1
$$;

create or replace function public.current_profile_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.employee_id
  from public.profiles as p
  where p.id = auth.uid()
    and p.is_active is true
  limit 1
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role = 'super_admin'
  )
$$;

create or replace function public.can_access_workshop(target_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.is_super_admin() then true
    when public.current_profile_role() in ('admin', 'employee') then
      target_workshop_id is not distinct from public.current_profile_workshop_id()
    else false
  end
$$;

create or replace function public.can_manage_workshop(target_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.is_super_admin() then true
    when public.current_profile_role() = 'admin' then
      target_workshop_id is not distinct from public.current_profile_workshop_id()
    else false
  end
$$;

create or replace function public.can_access_employee(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees as e
    where e.id = target_employee_id
      and (
        public.is_super_admin()
        or (
          public.current_profile_role() = 'admin'
          and e.workshop_id is not distinct from public.current_profile_workshop_id()
        )
        or (
          public.current_profile_role() = 'employee'
          and e.id is not distinct from public.current_profile_employee_id()
        )
      )
  )
$$;

create or replace function public.can_access_order(
  target_workshop_id uuid,
  target_employee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.is_super_admin() then true
    when public.current_profile_role() = 'admin' then
      target_workshop_id is not distinct from public.current_profile_workshop_id()
    when public.current_profile_role() = 'employee' then
      target_employee_id is not distinct from public.current_profile_employee_id()
      or (
        public.current_profile_employee_id() is null
        and target_workshop_id is not distinct from public.current_profile_workshop_id()
      )
    else false
  end
$$;

grant execute on function public.current_profile_workshop_id() to authenticated;
grant execute on function public.current_profile_employee_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.can_access_workshop(uuid) to authenticated;
grant execute on function public.can_manage_workshop(uuid) to authenticated;
grant execute on function public.can_access_employee(uuid) to authenticated;
grant execute on function public.can_access_order(uuid, uuid) to authenticated;

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.set_updated_at();

alter table public.support_tickets enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "Staff can read workshops" on public.workshops;
drop policy if exists "Admins can manage workshops" on public.workshops;

create policy "Staff can read scoped workshops"
on public.workshops
for select
using (public.can_access_workshop(id));

create policy "Super admins can insert workshops"
on public.workshops
for insert
with check (public.is_super_admin());

create policy "Scoped admins can update workshops"
on public.workshops
for update
using (public.can_manage_workshop(id))
with check (public.can_manage_workshop(id));

create policy "Super admins can delete workshops"
on public.workshops
for delete
using (public.is_super_admin());

drop policy if exists "Staff can read employees" on public.employees;
drop policy if exists "Admins can manage employees" on public.employees;

create policy "Staff can read scoped employees"
on public.employees
for select
using (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
  or (
    public.current_profile_role() = 'employee'
    and id is not distinct from public.current_profile_employee_id()
  )
);

create policy "Scoped admins can insert employees"
on public.employees
for insert
with check (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
);

create policy "Scoped admins can update employees"
on public.employees
for update
using (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
)
with check (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
);

create policy "Scoped admins can delete employees"
on public.employees
for delete
using (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
);

drop policy if exists "Staff can read orders" on public.orders;
drop policy if exists "Staff can create orders" on public.orders;
drop policy if exists "Staff can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;

create policy "Staff can read scoped orders"
on public.orders
for select
using (public.can_access_order(workshop_id, employee_id));

create policy "Scoped admins can insert orders"
on public.orders
for insert
with check (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
);

create policy "Scoped staff can update orders"
on public.orders
for update
using (public.can_access_order(workshop_id, employee_id))
with check (public.can_access_order(workshop_id, employee_id));

create policy "Scoped admins can delete orders"
on public.orders
for delete
using (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and workshop_id is not distinct from public.current_profile_workshop_id()
  )
);

drop policy if exists "Staff can read order items" on public.order_items;
drop policy if exists "Staff can create order items" on public.order_items;
drop policy if exists "Staff can update order items" on public.order_items;
drop policy if exists "Admins can delete order items" on public.order_items;

create policy "Staff can read scoped order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_items.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
);

create policy "Scoped admins can manage order items"
on public.order_items
for all
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_items.order_id
      and (
        public.is_super_admin()
        or (
          public.current_profile_role() = 'admin'
          and o.workshop_id is not distinct from public.current_profile_workshop_id()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = order_items.order_id
      and (
        public.is_super_admin()
        or (
          public.current_profile_role() = 'admin'
          and o.workshop_id is not distinct from public.current_profile_workshop_id()
        )
      )
  )
);

drop policy if exists "Staff can read order status events" on public.order_status_events;
drop policy if exists "Staff can create order status events" on public.order_status_events;
drop policy if exists "Staff can update order status events" on public.order_status_events;
drop policy if exists "Admins can delete order status events" on public.order_status_events;

create policy "Staff can read scoped tracking events"
on public.order_status_events
for select
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
);

create policy "Staff can insert scoped tracking events"
on public.order_status_events
for insert
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
);

create policy "Staff can update scoped tracking events"
on public.order_status_events
for update
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
)
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
);

create policy "Scoped admins can delete tracking events"
on public.order_status_events
for delete
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and (
        public.is_super_admin()
        or (
          public.current_profile_role() = 'admin'
          and o.workshop_id is not distinct from public.current_profile_workshop_id()
        )
      )
  )
);

create policy "Staff can read scoped support tickets"
on public.support_tickets
for select
using (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
);

create policy "Staff can insert scoped support tickets"
on public.support_tickets
for insert
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and (
        public.is_super_admin()
        or public.current_profile_role() in ('admin', 'employee')
      )
  )
);

create policy "Staff can update scoped support tickets"
on public.support_tickets
for update
using (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
)
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and public.can_access_order(o.workshop_id, o.employee_id)
  )
);

create policy "Scoped admins can delete support tickets"
on public.support_tickets
for delete
using (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and (
        public.is_super_admin()
        or (
          public.current_profile_role() = 'admin'
          and o.workshop_id is not distinct from public.current_profile_workshop_id()
        )
      )
  )
);

create policy "Staff can read scoped admin notifications"
on public.admin_notifications
for select
using (
  profile_id = auth.uid()
  or (
    profile_id is null
    and (
      public.is_super_admin()
      or (workshop_id is not null and public.can_access_workshop(workshop_id))
      or (employee_id is not null and public.can_access_employee(employee_id))
      or (
        workshop_id is null
        and employee_id is null
        and public.current_profile_role() in ('super_admin', 'admin')
      )
    )
  )
);

create policy "Staff can insert admin notifications"
on public.admin_notifications
for insert
with check (public.is_active_staff());

create policy "Staff can update scoped admin notifications"
on public.admin_notifications
for update
using (
  profile_id = auth.uid()
  or public.is_super_admin()
  or (workshop_id is not null and public.can_manage_workshop(workshop_id))
  or (
    employee_id is not null
    and public.current_profile_role() = 'employee'
    and employee_id is not distinct from public.current_profile_employee_id()
  )
)
with check (
  profile_id = auth.uid()
  or public.is_super_admin()
  or (workshop_id is not null and public.can_manage_workshop(workshop_id))
  or (
    employee_id is not null
    and public.current_profile_role() = 'employee'
    and employee_id is not distinct from public.current_profile_employee_id()
  )
);

create policy "Scoped admins can delete admin notifications"
on public.admin_notifications
for delete
using (
  public.is_super_admin()
  or (workshop_id is not null and public.can_manage_workshop(workshop_id))
);

create policy "Staff can read scoped email logs"
on public.email_logs
for select
using (
  public.is_super_admin()
  or (
    order_id is not null
    and exists (
      select 1
      from public.orders as o
      where o.id = email_logs.order_id
        and public.can_access_order(o.workshop_id, o.employee_id)
    )
  )
  or (
    support_ticket_id is not null
    and exists (
      select 1
      from public.support_tickets as st
      join public.orders as o
        on o.id = st.order_id
      where st.id = email_logs.support_ticket_id
        and public.can_access_order(o.workshop_id, o.employee_id)
    )
  )
);

create policy "Staff can insert email logs"
on public.email_logs
for insert
with check (public.is_active_staff());

create policy "Staff can update email logs"
on public.email_logs
for update
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Super admins can delete email logs"
on public.email_logs
for delete
using (public.is_super_admin());
