-- Workshop hierarchy is deliberately separate from the global profile role.
-- This migration is additive: deactivating or moving a workshop member never
-- deletes an employee, order, profile, or historical assignment.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'workshop_member_role'
  ) then
    create type public.workshop_member_role as enum (
      'workshop_manager',
      'workshop_employee'
    );
  end if;
end
$$;

alter table public.workshops
  add column if not exists description text,
  add column if not exists manager_employee_id uuid;

alter table public.employees
  add column if not exists workshop_role public.workshop_member_role not null default 'workshop_employee';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workshops_manager_employee_id_fkey'
  ) then
    alter table public.workshops
      add constraint workshops_manager_employee_id_fkey
      foreign key (manager_employee_id) references public.employees (id) on delete set null;
  end if;
end
$$;

create index if not exists employees_workshop_role_idx
  on public.employees (workshop_id, workshop_role)
  where is_active is true;
create index if not exists workshops_manager_employee_id_idx
  on public.workshops (manager_employee_id);

-- Keep the manager pointer and membership consistent, including changes made
-- outside the application.  A manager must be an active member of that exact
-- workshop and must have an authenticated profile linked to the employee row.
create or replace function public.validate_workshop_manager()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.manager_employee_id is not null and not exists (
    select 1
    from public.employees e
    where e.id = new.manager_employee_id
      and e.workshop_id = new.id
      and e.workshop_role = 'workshop_manager'
      and e.is_active is true
      and e.profile_id is not null
  ) then
    raise exception 'Workshop manager must be an active linked workshop manager';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_workshop_manager on public.workshops;
create trigger validate_workshop_manager
before insert or update of manager_employee_id on public.workshops
for each row execute function public.validate_workshop_manager();

-- Employee changes made after appointment cannot invalidate a workshop's
-- manager pointer. Moving a current manager is deliberately rejected rather
-- than silently leaving their former workshop without a valid manager.
create or replace function public.protect_current_workshop_manager()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if exists (select 1 from public.workshops w where w.manager_employee_id = old.id) then
    if new.workshop_id is distinct from old.workshop_id then
      raise exception 'CURRENT_WORKSHOP_MANAGER_MOVE_FORBIDDEN';
    end if;
    if new.workshop_role <> 'workshop_manager'::public.workshop_member_role
      or new.is_active is not true
      or new.profile_id is null then
      raise exception 'CURRENT_WORKSHOP_MANAGER_INVARIANT_VIOLATION';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_current_workshop_manager on public.employees;
create trigger protect_current_workshop_manager
before update of workshop_id, workshop_role, is_active, profile_id on public.employees
for each row execute function public.protect_current_workshop_manager();

-- Updating the pointer is the authoritative manager replacement operation.
-- The new manager was validated above; demote the old one only when no other
-- workshop still points at them.
create or replace function public.sync_previous_workshop_manager_role()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.manager_employee_id is not null
    and old.manager_employee_id is distinct from new.manager_employee_id
    and not exists (select 1 from public.workshops w where w.manager_employee_id = old.manager_employee_id) then
    update public.employees
    set workshop_role = 'workshop_employee'::public.workshop_member_role
    where id = old.manager_employee_id
      and workshop_role = 'workshop_manager'::public.workshop_member_role;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_previous_workshop_manager_role on public.workshops;
create trigger sync_previous_workshop_manager_role
after update of manager_employee_id on public.workshops
for each row execute function public.sync_previous_workshop_manager_role();

-- A workshop change always clears an employee assignment from the old
-- workshop.  The employee must then be assigned by the new workshop manager.
create or replace function public.clear_incompatible_order_employee()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.workshop_id is distinct from old.workshop_id then
    new.employee_id := null;
    new.assigned_worker_email := null;
    new.assignment_status := 'returned'::public.order_assignment_status;
    new.assigned_at := null;
  elsif new.employee_id is not null and not exists (
    select 1 from public.employees e
    where e.id = new.employee_id
      and e.workshop_id is not distinct from new.workshop_id
      and e.is_active is true
  ) then
    raise exception 'Order employee must be active and belong to the assigned workshop';
  end if;
  return new;
end;
$$;

drop trigger if exists clear_incompatible_order_employee on public.orders;
create trigger clear_incompatible_order_employee
before insert or update of workshop_id, employee_id on public.orders
for each row execute function public.clear_incompatible_order_employee();

create or replace function public.current_workshop_employee_id()
returns uuid
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select e.id from public.employees e where e.profile_id = auth.uid() limit 1
$$;

create or replace function public.is_workshop_manager(target_workshop_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.workshops w
    join public.employees e on e.id = w.manager_employee_id
    where w.id = target_workshop_id
      and e.workshop_id = w.id
      and e.profile_id = auth.uid()
      and e.workshop_role = 'workshop_manager'
      and e.is_active is true
  )
$$;

create or replace function public.can_access_workshop(target_workshop_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and (
    public.is_super_admin()
    or public.current_profile_role() = 'admin'
    or public.is_workshop_manager(target_workshop_id)
  )
$$;

create or replace function public.can_access_employee(target_employee_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.employees target
    where target.id = target_employee_id and (
      public.is_super_admin()
      or public.current_profile_role() = 'admin'
      or target.id = public.current_workshop_employee_id()
      or public.is_workshop_manager(target.workshop_id)
    )
  )
$$;

create or replace function public.can_access_order_v2(
  target_workshop_id uuid,
  target_employee_id uuid,
  target_assigned_admin_id uuid default null
)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and (
    public.is_super_admin()
    or public.current_profile_role() = 'admin'
    or public.is_workshop_manager(target_workshop_id)
    or target_employee_id is not distinct from public.current_workshop_employee_id()
  )
$$;

drop policy if exists "Staff can read workshops" on public.workshops;
drop policy if exists "Staff can read scoped workshops" on public.workshops;
create policy "Staff can read scoped workshops"
on public.workshops for select
using (public.can_access_workshop(id));

drop policy if exists "Staff can read scoped employees" on public.employees;
create policy "Staff can read scoped employees"
on public.employees for select
using (public.can_access_employee(id));

-- 0003 created this exact SELECT policy. Replace it rather than adding a
-- second permissive policy, because PostgreSQL ORs SELECT policies together.
drop policy if exists "Staff can read scoped orders" on public.orders;
create policy "Staff can read scoped orders"
on public.orders for select
using (public.can_access_order_v2(workshop_id, employee_id, assigned_admin_id));

-- RPCs are the mutation boundary. They validate caller, target workshop, and
-- membership again in the database; browser-supplied IDs are never trusted.
create or replace function public.assign_order_to_workshop(p_order_id uuid, p_workshop_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_actor uuid := auth.uid(); v_manager_profile uuid; v_manager_email text;
begin
  if v_actor is null or not (public.is_super_admin() or public.current_profile_role() = 'admin') then
    raise exception 'not authorized';
  end if;
  select e.profile_id, coalesce(e.email, p.email) into v_manager_profile, v_manager_email
  from public.workshops w left join public.employees e on e.id = w.manager_employee_id
  left join public.profiles p on p.id = e.profile_id
  where w.id = p_workshop_id and w.is_active is true;
  if not found then raise exception 'invalid workshop'; end if;
  update public.orders set workshop_id = p_workshop_id where id = p_order_id;
  if not found then raise exception 'order not found'; end if;
  insert into public.audit_logs(actor_email, action, metadata_json)
  select p.email, 'order_assigned_to_workshop', jsonb_build_object('orderId', p_order_id, 'workshopId', p_workshop_id)
  from public.profiles p where p.id = v_actor;
  if v_manager_profile is not null then
    insert into public.admin_notifications(profile_id, workshop_id, entity_type, entity_id, link_path, title, message, type)
    values (v_manager_profile, p_workshop_id, 'order', p_order_id, '/admin/workshop-orders', 'Neuer Werkstattauftrag', 'Ein neuer Auftrag wurde Ihrer Werkstatt zugewiesen.', 'order_updated');
  end if;
end;
$$;

create or replace function public.assign_workshop_order_to_employee(p_order_id uuid, p_employee_id uuid, p_assignment_note text default null)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_actor uuid := auth.uid(); v_workshop uuid; v_previous uuid; v_email text; v_name text; v_changed boolean;
begin
  if v_actor is null then raise exception 'not authorized'; end if;
  select workshop_id, employee_id into v_workshop, v_previous from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_workshop is null or not exists (select 1 from public.workshops where id = v_workshop and is_active is true) then
    raise exception 'invalid active workshop';
  end if;
  if not public.is_workshop_manager(v_workshop) and not public.is_super_admin() and public.current_profile_role() <> 'admin' then raise exception 'not authorized'; end if;
  select email, full_name into v_email, v_name from public.employees
  where id = p_employee_id and workshop_id = v_workshop and is_active is true and profile_id is not null;
  if not found then raise exception 'invalid employee selection'; end if;
  v_changed := v_previous is distinct from p_employee_id;
  update public.orders set employee_id = p_employee_id, assigned_worker_email = nullif(trim(v_email), ''), assignment_note = nullif(trim(coalesce(p_assignment_note, '')), ''), assignment_status = case when v_changed then 'assigned'::public.order_assignment_status else assignment_status end, assigned_at = case when v_changed then timezone('utc', now()) else assigned_at end where id = p_order_id;
  insert into public.audit_logs(actor_email, action, metadata_json)
  select p.email, case when v_previous is null then 'order_assigned_to_employee' else 'order_reassigned_to_employee' end, jsonb_build_object('orderId', p_order_id, 'employeeId', p_employee_id, 'workshopId', v_workshop)
  from public.profiles p where p.id = v_actor;
  if v_changed then
    insert into public.admin_notifications(employee_id, workshop_id, entity_type, entity_id, link_path, title, message, type)
    values (p_employee_id, v_workshop, 'order', p_order_id, '/admin/my-tasks', 'Neue Aufgabe zugewiesen', 'Ihnen wurde ein Werkstattauftrag zugewiesen.', 'order_updated');
  end if;
  return v_changed;
end;
$$;

revoke all on function public.assign_order_to_workshop(uuid, uuid) from public;
revoke all on function public.assign_workshop_order_to_employee(uuid, uuid, text) from public;
grant execute on function public.assign_order_to_workshop(uuid, uuid) to authenticated;
grant execute on function public.assign_workshop_order_to_employee(uuid, uuid, text) to authenticated;
