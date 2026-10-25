-- Marketing & social media: products, categories, order questions, website images and the promo pop-up.
-- Customer service: customer inquiries and orders.
create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active is true
    and p.role in ('super_admin', 'admin', 'employee', 'marketing', 'customer_service'))
$$;

create or replace function public.can_manage_catalog()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active is true
    and p.role in ('super_admin', 'admin', 'marketing'))
$$;

create or replace function public.can_handle_customers()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active is true
    and p.role in ('super_admin', 'admin', 'customer_service'))
$$;

revoke all on function public.can_manage_catalog() from public;
revoke all on function public.can_handle_customers() from public;
grant execute on function public.can_manage_catalog() to authenticated;
grant execute on function public.can_handle_customers() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['categories','products','product_images','option_groups','options','product_options'] loop
    execute format('drop policy if exists "Catalog team can manage %1$s" on public.%1$I', t);
    execute format('create policy "Catalog team can manage %1$s" on public.%1$I for all using (public.can_manage_catalog()) with check (public.can_manage_catalog())', t);
  end loop;
end $$;

drop policy if exists "Marketing can read site settings" on public.site_settings;
create policy "Marketing can read site settings" on public.site_settings for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'marketing'));
drop policy if exists "Marketing can manage site settings" on public.site_settings;
create policy "Marketing can manage site settings" on public.site_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'marketing'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'marketing'));

drop policy if exists "Customer service can manage inquiries" on public.customer_inquiries;
create policy "Customer service can manage inquiries" on public.customer_inquiries for all
  using (public.can_handle_customers()) with check (public.can_handle_customers());

create or replace function public.can_access_order_v2(target_workshop_id uuid, target_employee_id uuid, target_assigned_admin_id uuid default null)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and (
    public.is_super_admin()
    or public.current_profile_role() in ('admin', 'customer_service')
    or public.is_workshop_manager(target_workshop_id)
    or target_employee_id is not distinct from public.current_workshop_employee_id()
  )
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
