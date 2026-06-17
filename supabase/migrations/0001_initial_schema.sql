create extension if not exists pgcrypto;

do $$
begin
  create type public.profile_role as enum ('super_admin', 'admin', 'employee');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.option_type as enum (
    'text',
    'textarea',
    'number',
    'select',
    'multi_select',
    'boolean',
    'date',
    'image',
    'file'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role public.profile_role,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  accent text,
  name_de text not null,
  name_ar text not null,
  name_en text,
  name_fr text,
  name_tr text,
  description_de text,
  description_ar text,
  description_en text,
  description_fr text,
  description_tr text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  category_id uuid references public.categories (id) on delete set null,
  name_de text not null,
  name_ar text not null,
  name_en text,
  name_fr text,
  name_tr text,
  description_de text,
  description_ar text,
  description_en text,
  description_fr text,
  description_tr text,
  cover_image_url text,
  tags text[] not null default '{}'::text[],
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, sort_order)
);

create table if not exists public.option_groups (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_de text not null,
  name_ar text not null,
  name_en text,
  name_fr text,
  name_tr text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  key text not null unique,
  type public.option_type not null default 'text',
  label_de text not null,
  label_ar text not null,
  label_en text,
  label_fr text,
  label_tr text,
  values_json jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_options (
  product_id uuid not null references public.products (id) on delete cascade,
  option_id uuid not null references public.options (id) on delete cascade,
  is_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (product_id, option_id)
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  customer_name text,
  customer_phone text,
  workshop_id uuid references public.workshops (id),
  employee_id uuid references public.employees (id),
  status text not null,
  notes text,
  due_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  product_name_snapshot text,
  quantity integer not null default 1,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists categories_sort_order_idx on public.categories (sort_order);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_sort_order_idx on public.products (sort_order);
create index if not exists products_active_idx on public.products (is_active);
create index if not exists product_images_product_id_idx on public.product_images (product_id);
create index if not exists option_groups_sort_order_idx on public.option_groups (sort_order);
create index if not exists options_group_id_idx on public.options (group_id);
create index if not exists options_sort_order_idx on public.options (sort_order);
create index if not exists product_options_option_id_idx on public.product_options (option_id);
create index if not exists orders_workshop_id_idx on public.orders (workshop_id);
create index if not exists orders_employee_id_idx on public.orders (employee_id);
create index if not exists orders_status_idx on public.orders (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
    and p.is_active is true
  limit 1
$$;

create or replace function public.is_active_staff()
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
      and p.role in ('super_admin', 'admin', 'employee')
  )
$$;

create or replace function public.is_admin_manager()
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
      and p.role in ('super_admin', 'admin')
  )
$$;

grant execute on function public.current_profile_role() to anon, authenticated;
grant execute on function public.is_active_staff() to anon, authenticated;
grant execute on function public.is_admin_manager() to anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_option_groups_updated_at on public.option_groups;
create trigger set_option_groups_updated_at
before update on public.option_groups
for each row
execute function public.set_updated_at();

drop trigger if exists set_options_updated_at on public.options;
create trigger set_options_updated_at
before update on public.options
for each row
execute function public.set_updated_at();

drop trigger if exists set_workshops_updated_at on public.workshops;
create trigger set_workshops_updated_at
before update on public.workshops
for each row
execute function public.set_updated_at();

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.product_options enable row level security;
alter table public.workshops enable row level security;
alter table public.employees enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.contact_messages enable row level security;

create policy "Profiles readable by owner or staff"
on public.profiles
for select
using (auth.uid() = id or public.is_active_staff());

create policy "Profiles insertable by owner or admins"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin_manager());

create policy "Profiles updateable by owner or admins"
on public.profiles
for update
using (auth.uid() = id or public.is_admin_manager())
with check (auth.uid() = id or public.is_admin_manager());

create policy "Profiles deletable by admins"
on public.profiles
for delete
using (public.is_admin_manager());

create policy "Public can read active categories"
on public.categories
for select
using (is_active);

create policy "Staff can read all categories"
on public.categories
for select
using (public.is_active_staff());

create policy "Admins can manage categories"
on public.categories
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Public can read active products"
on public.products
for select
using (is_active);

create policy "Staff can read all products"
on public.products
for select
using (public.is_active_staff());

create policy "Admins can manage products"
on public.products
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Public can read images for active products"
on public.product_images
for select
using (
  exists (
    select 1
    from public.products as p
    where p.id = product_images.product_id
      and p.is_active is true
  )
);

create policy "Staff can read all product images"
on public.product_images
for select
using (public.is_active_staff());

create policy "Admins can manage product images"
on public.product_images
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Public can read active option groups"
on public.option_groups
for select
using (is_active);

create policy "Staff can read all option groups"
on public.option_groups
for select
using (public.is_active_staff());

create policy "Admins can manage option groups"
on public.option_groups
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Public can read active options"
on public.options
for select
using (is_active);

create policy "Staff can read all options"
on public.options
for select
using (public.is_active_staff());

create policy "Admins can manage options"
on public.options
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Public can read active product option assignments"
on public.product_options
for select
using (
  exists (
    select 1
    from public.products as p
    join public.options as o
      on o.id = product_options.option_id
    where p.id = product_options.product_id
      and p.is_active is true
      and o.is_active is true
  )
);

create policy "Staff can read all product option assignments"
on public.product_options
for select
using (public.is_active_staff());

create policy "Admins can manage product option assignments"
on public.product_options
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Staff can read workshops"
on public.workshops
for select
using (public.is_active_staff());

create policy "Admins can manage workshops"
on public.workshops
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Staff can read employees"
on public.employees
for select
using (public.is_active_staff());

create policy "Admins can manage employees"
on public.employees
for all
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Staff can read orders"
on public.orders
for select
using (public.is_active_staff());

create policy "Staff can create orders"
on public.orders
for insert
with check (public.is_active_staff());

create policy "Staff can update orders"
on public.orders
for update
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Admins can delete orders"
on public.orders
for delete
using (public.is_admin_manager());

create policy "Staff can read order items"
on public.order_items
for select
using (public.is_active_staff());

create policy "Staff can create order items"
on public.order_items
for insert
with check (public.is_active_staff());

create policy "Staff can update order items"
on public.order_items
for update
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Admins can delete order items"
on public.order_items
for delete
using (public.is_admin_manager());

create policy "Staff can read order status events"
on public.order_status_events
for select
using (public.is_active_staff());

create policy "Staff can create order status events"
on public.order_status_events
for insert
with check (public.is_active_staff());

create policy "Staff can update order status events"
on public.order_status_events
for update
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Admins can delete order status events"
on public.order_status_events
for delete
using (public.is_admin_manager());

create policy "Anyone can submit contact messages"
on public.contact_messages
for insert
with check (true);

create policy "Admins can read contact messages"
on public.contact_messages
for select
using (public.is_admin_manager());

create policy "Admins can update contact messages"
on public.contact_messages
for update
using (public.is_admin_manager())
with check (public.is_admin_manager());

create policy "Admins can delete contact messages"
on public.contact_messages
for delete
using (public.is_admin_manager());
