-- New dashboard roles and profile pictures.
alter type public.profile_role add value if not exists 'marketing';
alter type public.profile_role add value if not exists 'customer_service';
alter table public.profiles add column if not exists avatar_url text;
