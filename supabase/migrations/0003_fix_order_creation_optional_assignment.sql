alter table public.orders
  alter column workshop_id drop not null,
  alter column employee_id drop not null;

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
    when public.current_profile_role() = 'admin' then
      target_assigned_admin_id is not distinct from auth.uid()
      or (
        public.current_profile_workshop_id() is not null
        and target_workshop_id is not distinct from public.current_profile_workshop_id()
      )
    when public.current_profile_role() = 'employee' then
      target_employee_id is not distinct from public.current_profile_employee_id()
      or (
        public.current_profile_employee_id() is null
        and target_workshop_id is not distinct from public.current_profile_workshop_id()
      )
    else false
  end
$$;

grant execute on function public.can_access_order_v2(uuid, uuid, uuid) to authenticated;

drop policy if exists "Staff can read scoped orders" on public.orders;
drop policy if exists "Scoped admins can insert orders" on public.orders;
drop policy if exists "Scoped staff can update orders" on public.orders;
drop policy if exists "Scoped admins can delete orders" on public.orders;

create policy "Staff can read scoped orders"
on public.orders
for select
using (public.can_access_order_v2(workshop_id, employee_id, assigned_admin_id));

create policy "Scoped admins can insert orders"
on public.orders
for insert
with check (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and (
      assigned_admin_id is not distinct from auth.uid()
      or (
        public.current_profile_workshop_id() is not null
        and workshop_id is not distinct from public.current_profile_workshop_id()
      )
    )
  )
);

create policy "Scoped staff can update orders"
on public.orders
for update
using (public.can_access_order_v2(workshop_id, employee_id, assigned_admin_id))
with check (public.can_access_order_v2(workshop_id, employee_id, assigned_admin_id));

create policy "Scoped admins can delete orders"
on public.orders
for delete
using (
  public.is_super_admin()
  or (
    public.current_profile_role() = 'admin'
    and public.can_access_order_v2(workshop_id, employee_id, assigned_admin_id)
  )
);

drop policy if exists "Staff can read scoped order items" on public.order_items;
drop policy if exists "Scoped admins can manage order items" on public.order_items;

create policy "Staff can read scoped order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_items.order_id
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
          and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
          and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
        )
      )
  )
);

drop policy if exists "Staff can read scoped tracking events" on public.order_status_events;
drop policy if exists "Staff can insert scoped tracking events" on public.order_status_events;
drop policy if exists "Staff can update scoped tracking events" on public.order_status_events;
drop policy if exists "Scoped admins can delete tracking events" on public.order_status_events;

create policy "Staff can read scoped tracking events"
on public.order_status_events
for select
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
  )
)
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = order_status_events.order_id
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
          and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
        )
      )
  )
);

drop policy if exists "Staff can read scoped support tickets" on public.support_tickets;
drop policy if exists "Staff can update scoped support tickets" on public.support_tickets;
drop policy if exists "Scoped admins can delete support tickets" on public.support_tickets;

create policy "Staff can read scoped support tickets"
on public.support_tickets
for select
using (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
  )
)
with check (
  exists (
    select 1
    from public.orders as o
    where o.id = support_tickets.order_id
      and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
          and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
        )
      )
  )
);

drop policy if exists "Staff can read scoped email logs" on public.email_logs;

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
        and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
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
        and public.can_access_order_v2(o.workshop_id, o.employee_id, o.assigned_admin_id)
    )
  )
);
