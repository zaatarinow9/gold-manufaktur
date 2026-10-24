-- Security hardening (2026-10).
--
-- 1. Privilege escalation: the "Profiles updateable by owner" / "insertable by
--    owner" policies let any signed-in staff member (e.g. an employee) PATCH
--    their own profile row through the public REST API and set
--    role = 'super_admin'. All legitimate profile writes in the application go
--    through the service-role client, so we lock the privileged columns down
--    for every API role and only allow super admins to touch them.
-- 2. Mutating SECURITY DEFINER RPCs were executable by the anon role. They
--    already check auth.uid() internally; revoking EXECUTE is defence in depth.
-- 3. set_updated_at() had a mutable search_path.
-- 4. Missing covering indexes on foreign keys.

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_api_role text := coalesce(auth.role(), '');
begin
  -- Service role, postgres, migrations and other internal callers are trusted.
  if v_api_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_super_admin() then
      raise exception 'not authorized to create staff profiles'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if (
    new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
    or new.workshop_id is distinct from old.workshop_id
    or new.employee_id is distinct from old.employee_id
    or new.email is distinct from old.email
    or new.deleted_at is distinct from old.deleted_at
    or new.id is distinct from old.id
  ) and not public.is_super_admin() then
    raise exception 'not authorized to change privileged profile fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_profile_privileged_columns() from public, anon, authenticated;

drop trigger if exists guard_profile_privileged_columns on public.profiles;
create trigger guard_profile_privileged_columns
before insert or update on public.profiles
for each row execute function public.guard_profile_privileged_columns();

-- Only managers may insert profile rows via the API (the trigger above further
-- restricts this to super admins).
drop policy if exists "Profiles insertable by owner or admins" on public.profiles;
create policy "Profiles insertable by admins"
on public.profiles
for insert
to authenticated
with check ((select public.is_admin_manager()));

drop policy if exists "Profiles readable by owner or staff" on public.profiles;
create policy "Profiles readable by owner or staff"
on public.profiles
for select
to authenticated
using (((select auth.uid()) = id) or (select public.is_active_staff()));

drop policy if exists "Profiles updateable by owner or admins" on public.profiles;
create policy "Profiles updateable by owner or admins"
on public.profiles
for update
to authenticated
using (((select auth.uid()) = id) or (select public.is_admin_manager()))
with check (((select auth.uid()) = id) or (select public.is_admin_manager()));

drop policy if exists "Profiles deletable by admins" on public.profiles;
create policy "Profiles deletable by super admins"
on public.profiles
for delete
to authenticated
using ((select public.is_super_admin()));

-- Mutating RPCs: signed-in staff only.
revoke execute on function public.archive_and_reset_orders() from public, anon;
revoke execute on function public.assign_order_to_workshop(uuid, uuid) from public, anon;
revoke execute on function public.assign_workshop_order_to_employee(uuid, uuid, text) from public, anon;
grant execute on function public.archive_and_reset_orders() to authenticated;
grant execute on function public.assign_order_to_workshop(uuid, uuid) to authenticated;
grant execute on function public.assign_workshop_order_to_employee(uuid, uuid, text) to authenticated;

-- Trigger functions are never meant to be called through the REST API.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_workshop_manager() from public, anon, authenticated;
revoke execute on function public.protect_current_workshop_manager() from public, anon, authenticated;
revoke execute on function public.sync_previous_workshop_manager_role() from public, anon, authenticated;
revoke execute on function public.clear_incompatible_order_employee() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = pg_catalog, public;

-- Covering indexes for foreign keys.
create index if not exists email_logs_notification_id_idx on public.email_logs (notification_id);
create index if not exists order_archive_snapshots_archived_by_idx on public.order_archive_snapshots (archived_by);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists order_status_events_created_by_idx on public.order_status_events (created_by);
create index if not exists order_status_events_order_id_idx on public.order_status_events (order_id);
create index if not exists support_tickets_created_by_profile_id_idx on public.support_tickets (created_by_profile_id);
create index if not exists support_tickets_resolved_by_idx on public.support_tickets (resolved_by);
