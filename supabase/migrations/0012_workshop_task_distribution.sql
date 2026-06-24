do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'order_assignment_status'
  ) then
    create type public.order_assignment_status as enum (
      'assigned',
      'accepted',
      'in_progress',
      'waiting',
      'completed',
      'returned'
    );
  end if;
end
$$;

alter table public.orders
  add column if not exists assignment_status public.order_assignment_status not null default 'assigned',
  add column if not exists assignment_note text,
  add column if not exists employee_note text;

create index if not exists orders_assignment_status_idx
  on public.orders (assignment_status);

update public.orders
set assignment_status = case
  when employee_id is null then 'returned'::public.order_assignment_status
  when tracking_status in ('completed', 'picked_up', 'delivered_to_store') then 'completed'::public.order_assignment_status
  when tracking_status = 'quality_check' then 'waiting'::public.order_assignment_status
  when tracking_status = 'in_production' then 'in_progress'::public.order_assignment_status
  when tracking_status = 'accepted_by_workshop' then 'accepted'::public.order_assignment_status
  else 'assigned'::public.order_assignment_status
end;

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
    when public.current_profile_role() = 'admin' then true
    when public.current_profile_role() = 'employee' then
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
    when public.current_profile_role() = 'admin' then true
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
        or public.current_profile_role() = 'admin'
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
    when public.current_profile_role() = 'admin' then true
    when public.current_profile_role() = 'employee' then
      target_employee_id is not distinct from public.current_profile_employee_id()
      or (
        public.current_profile_employee_id() is null
        and target_workshop_id is not distinct from public.current_profile_workshop_id()
      )
    else false
  end
$$;

create or replace function public.can_access_order_v2(
  target_workshop_id uuid,
  target_employee_id uuid,
  target_assigned_admin_id uuid default null
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
    when public.current_profile_role() = 'admin' then true
    when public.current_profile_role() = 'employee' then
      target_employee_id is not distinct from public.current_profile_employee_id()
      or (
        public.current_profile_employee_id() is null
        and target_workshop_id is not distinct from public.current_profile_workshop_id()
      )
    else false
  end
$$;

drop policy if exists "Staff can read scoped employees" on public.employees;
drop policy if exists "Scoped admins can insert employees" on public.employees;
drop policy if exists "Scoped admins can update employees" on public.employees;
drop policy if exists "Scoped admins can delete employees" on public.employees;

create policy "Staff can read scoped employees"
on public.employees
for select
using (
  public.is_super_admin()
  or public.current_profile_role() = 'admin'
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
  or public.current_profile_role() = 'admin'
);

create policy "Scoped admins can update employees"
on public.employees
for update
using (
  public.is_super_admin()
  or public.current_profile_role() = 'admin'
)
with check (
  public.is_super_admin()
  or public.current_profile_role() = 'admin'
);

create policy "Scoped admins can delete employees"
on public.employees
for delete
using (
  public.is_super_admin()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "Scoped admins can insert orders" on public.orders;

create policy "Scoped admins can insert orders"
on public.orders
for insert
with check (
  public.is_super_admin()
  or public.current_profile_role() = 'admin'
);
