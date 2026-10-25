-- Customer service sees workshops and their staff (to send orders on).
create or replace function public.can_access_workshop(target_workshop_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and (
    public.is_super_admin()
    or public.current_profile_role() in ('admin', 'customer_service')
    or public.is_workshop_manager(target_workshop_id)
  )
$$;
create or replace function public.can_access_employee(target_employee_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and exists (
    select 1 from public.employees target
    where target.id = target_employee_id and (
      public.is_super_admin()
      or public.current_profile_role() in ('admin', 'customer_service')
      or target.id = public.current_workshop_employee_id()
      or public.is_workshop_manager(target.workshop_id)
    )
  )
$$;
