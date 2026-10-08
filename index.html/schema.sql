-- ==========================================================================
--  Oops! Life Cooked Again  -  Supabase schema
--  Run this ONCE in:  Supabase Dashboard -> SQL Editor -> New query -> Run
--  Safe to re-run: it uses "if not exists" / "or replace" / "on conflict".
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. PROFILES  (one row per signed-up user; first user becomes ADMIN)
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null,
  role        text not null default 'user' check (role in ('admin', 'user')),
  created_at  timestamptz not null default now()
);

-- Is the current logged-in user an admin?  (security definer => no RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Does any account exist yet?  (login page uses it for the "first user = admin" note)
create or replace function public.has_any_users()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles);
$$;

-- Auto-create a profile when someone signs up. The very FIRST profile is admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(7010847);  -- two simultaneous first sign-ups can't both be admin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case when exists (select 1 from public.profiles) then 'user' else 'admin' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());
-- No insert/update/delete policies on purpose: browsers can never change a role.
-- (Promote/demote users from the SQL editor - see SETUP.md.)

-- --------------------------------------------------------------------------
-- 2. MENU  (categories + dishes, editable from admin.html)
-- --------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id          text primary key,
  title       text not null check (length(trim(title)) > 0),
  subtitle    text not null default '',
  note        text not null default '',
  sort_order  integer not null default 0
);

create table if not exists public.menu_items (
  id           bigint generated always as identity primary key,
  category_id  text not null references public.menu_categories (id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  price        integer not null check (price >= 0),
  sort_order   integer not null default 0
);
create index if not exists menu_items_category_idx on public.menu_items (category_id, sort_order);

alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;

drop policy if exists "menu_categories: public read" on public.menu_categories;
create policy "menu_categories: public read" on public.menu_categories for select to anon, authenticated using (true);
drop policy if exists "menu_categories: admin write" on public.menu_categories;
create policy "menu_categories: admin write" on public.menu_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu_items: public read" on public.menu_items;
create policy "menu_items: public read" on public.menu_items for select to anon, authenticated using (true);
drop policy if exists "menu_items: admin write" on public.menu_items;
create policy "menu_items: admin write" on public.menu_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Atomically replace the whole menu (called by the admin panel's "Save Changes").
create or replace function public.save_menu(payload jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  cat jsonb;
  item jsonb;
  ci integer := 0;
  ii integer;
begin
  if not public.is_admin() then
    raise exception 'Only the admin can save the menu' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) = 0 then
    raise exception 'Menu payload must be a non-empty array';
  end if;

  delete from public.menu_items where true;
  delete from public.menu_categories where true;

  for cat in select * from jsonb_array_elements(payload) loop
    insert into public.menu_categories (id, title, subtitle, note, sort_order)
    values (cat ->> 'id', cat ->> 'title', coalesce(cat ->> 'subtitle', ''), coalesce(cat ->> 'note', ''), ci);

    ii := 0;
    for item in select * from jsonb_array_elements(coalesce(cat -> 'items', '[]'::jsonb)) loop
      insert into public.menu_items (category_id, name, price, sort_order)
      values (cat ->> 'id', item ->> 'name', (item ->> 'price')::integer, ii);
      ii := ii + 1;
    end loop;
    ci := ci + 1;
  end loop;
end;
$$;

revoke all on function public.save_menu(jsonb) from public, anon;
grant execute on function public.save_menu(jsonb) to authenticated;

-- --------------------------------------------------------------------------
-- 3. GALLERY  (photos shown on the site, editable from admin.html)
-- --------------------------------------------------------------------------
create table if not exists public.gallery_photos (
  id          bigint generated always as identity primary key,
  src         text not null check (length(trim(src)) > 0),
  alt         text not null default '',
  caption     text not null default '',
  sort_order  integer not null default 0
);

alter table public.gallery_photos enable row level security;

drop policy if exists "gallery: public read" on public.gallery_photos;
create policy "gallery: public read" on public.gallery_photos for select to anon, authenticated using (true);
drop policy if exists "gallery: admin write" on public.gallery_photos;
create policy "gallery: admin write" on public.gallery_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.save_gallery(payload jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  photo jsonb;
  i integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only the admin can save the gallery' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) = 0 then
    raise exception 'Gallery payload must be a non-empty array';
  end if;
  if jsonb_array_length(payload) > 30 then
    raise exception 'The gallery can hold at most 30 photos';
  end if;

  delete from public.gallery_photos where true;

  for photo in select * from jsonb_array_elements(payload) loop
    insert into public.gallery_photos (src, alt, caption, sort_order)
    values (photo ->> 'src', coalesce(photo ->> 'alt', ''), coalesce(photo ->> 'caption', ''), i);
    i := i + 1;
  end loop;
end;
$$;

revoke all on function public.save_gallery(jsonb) from public, anon;
grant execute on function public.save_gallery(jsonb) to authenticated;

-- Storage bucket for photos the admin uploads (public read, admin-only write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gallery files: public read" on storage.objects;
create policy "gallery files: public read" on storage.objects for select
  using (bucket_id = 'gallery');

drop policy if exists "gallery files: admin insert" on storage.objects;
create policy "gallery files: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "gallery files: admin update" on storage.objects;
create policy "gallery files: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "gallery files: admin delete" on storage.objects;
create policy "gallery files: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- --------------------------------------------------------------------------
-- 4. ORDERS  (dine-in orders from the cart; anyone can place, only admin reads all)
-- --------------------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_code     text not null,           -- shown to the customer, e.g. ORD-261008-4821
  table_no       text not null check (length(trim(table_no)) between 1 and 10),
  customer_name  text not null check (length(trim(customer_name)) between 2 and 80),
  phone          text not null check (phone ~ '^[+]?[0-9][0-9[:space:]-]{7,14}$'),
  notes          text check (notes is null or length(notes) <= 500),
  items          jsonb not null,            -- [{name, price, quantity, notes}]
  total          integer not null default 0 check (total >= 0),
  status         text not null default 'new' check (status in ('new', 'preparing', 'served', 'cancelled')),
  user_id        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_code_idx    on public.orders (order_code);

-- Never trust prices sent by the browser: re-price every line from menu_items.
create or replace function public.orders_validate()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  line jsonb;
  qty integer;
  unit integer;
  sum_total integer := 0;
  fixed jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) not between 1 and 60 then
    raise exception 'An order needs between 1 and 60 items';
  end if;

  for line in select * from jsonb_array_elements(new.items) loop
    qty := (line ->> 'quantity')::integer;
    if qty is null or qty < 1 or qty > 30 then
      raise exception 'Invalid quantity for %', line ->> 'name';
    end if;
    select price into unit from public.menu_items where name = line ->> 'name' limit 1;
    if unit is null then
      raise exception 'Dish "%" is no longer on the menu', line ->> 'name';
    end if;
    sum_total := sum_total + unit * qty;
    fixed := fixed || jsonb_build_array(jsonb_build_object(
      'name', line ->> 'name',
      'price', unit,
      'quantity', qty,
      'notes', left(coalesce(line ->> 'notes', ''), 200)
    ));
  end loop;

  new.items  := fixed;
  new.total  := sum_total;
  new.status := 'new';
  return new;
end;
$$;

drop trigger if exists orders_validate_trg on public.orders;
create trigger orders_validate_trg
  before insert on public.orders
  for each row execute function public.orders_validate();

alter table public.orders enable row level security;

drop policy if exists "orders: anyone can place" on public.orders;
create policy "orders: anyone can place" on public.orders for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders: admin delete" on public.orders;
create policy "orders: admin delete" on public.orders for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------------------
-- 5. RESERVATIONS
-- --------------------------------------------------------------------------
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 80),
  email       text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  phone       text not null check (phone ~ '^[+]?[0-9][0-9[:space:]-]{7,14}$'),
  guests      integer not null check (guests between 1 and 20),
  res_date    date not null,
  res_time    time not null check (res_time between time '06:00' and time '22:00'),
  seating     text not null default 'no_preference' check (seating in ('indoor', 'outdoor', 'no_preference')),
  notes       text check (notes is null or length(notes) <= 500),
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists reservations_date_idx on public.reservations (res_date, res_time);

alter table public.reservations enable row level security;

drop policy if exists "reservations: anyone can book" on public.reservations;
create policy "reservations: anyone can book" on public.reservations for insert to anon, authenticated
  with check (status = 'pending' and (user_id is null or user_id = auth.uid()));

drop policy if exists "reservations: read own or admin" on public.reservations;
create policy "reservations: read own or admin" on public.reservations for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "reservations: admin update" on public.reservations;
create policy "reservations: admin update" on public.reservations for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reservations: admin delete" on public.reservations;
create policy "reservations: admin delete" on public.reservations for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------------------
-- 6. FEEDBACK
-- --------------------------------------------------------------------------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 80),
  email       text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  message     text not null check (length(trim(message)) between 5 and 2000),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback: anyone can send" on public.feedback;
create policy "feedback: anyone can send" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "feedback: admin read" on public.feedback;
create policy "feedback: admin read" on public.feedback for select to authenticated
  using (public.is_admin());

drop policy if exists "feedback: admin delete" on public.feedback;
create policy "feedback: admin delete" on public.feedback for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------------------
-- 7. TABLE PRIVILEGES  (RLS above decides which rows; this decides which verbs)
-- --------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.menu_categories, public.menu_items, public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.menu_categories, public.menu_items, public.gallery_photos to authenticated;

grant insert on public.orders, public.reservations, public.feedback to anon, authenticated;
grant select, update, delete on public.orders, public.reservations to authenticated;
grant select, delete on public.feedback to authenticated;

grant select on public.profiles to authenticated;

grant execute on function public.is_admin()       to anon, authenticated;
grant execute on function public.has_any_users()  to anon, authenticated;

-- --------------------------------------------------------------------------
-- 8. SEED DATA  (the default menu + gallery that shipped with the website)
--    Only inserted when the tables are empty, so re-running never overwrites
--    edits made in the admin panel.
-- --------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.menu_categories) then
    insert into public.menu_categories (id, title, subtitle, note, sort_order) values
      ('breakfast', 'Breakfast Specials',   'Dawn delights, steamed, crisp & golden',        'Served fresh every morning from 06:00 AM', 0),
      ('lunch',     'Lunch Combos',         E'Hearty plates that heal the day\u2019s damage', 'Generous meals, served with love',         1),
      ('dinner',    'Dinner Delights',      'Evening feasts worth staying up for',           'Served until 10:00 PM',                    2),
      ('desserts',  'Desserts & Beverages', 'Sweet endings & sips of joy',                   E'Life is short \u2014 dessert first',       3);

    insert into public.menu_items (category_id, name, price, sort_order) values
      ('breakfast', 'Idli with Sambar & Chutney', 40, 0),
      ('breakfast', 'Medu Vada', 12, 1),
      ('breakfast', 'Idiyappam with Coconut Milk', 30, 2),
      ('breakfast', 'Upma', 35, 3),
      ('breakfast', 'Poori Masala', 45, 4),
      ('breakfast', 'Dosa', 55, 5),
      ('breakfast', 'Poori Masala (Royal Portion)', 55, 6),
      ('breakfast', 'Masala Dosa', 80, 7),

      ('lunch', 'Curd Rice', 50, 0),
      ('lunch', 'South Indian Veg-Meals', 90, 1),
      ('lunch', 'North Indian Veg-Meals', 90, 2),
      ('lunch', 'Non-veg Meals', 150, 3),
      ('lunch', 'Fish Meals (2 pcs of fish)', 150, 4),
      ('lunch', 'Chicken Biriyani & Chicken 65', 180, 5),
      ('lunch', 'Mutton Biriyani & Mutton gravy', 300, 6),

      ('dinner', 'Chapati (3pcs) with Vegetable Curry', 40, 0),
      ('dinner', 'Idli with Sambar & Chutney', 40, 1),
      ('dinner', 'Ghee Roast', 90, 2),
      ('dinner', 'Veg Fried Rice', 90, 3),
      ('dinner', 'Veg Noodles', 90, 4),
      ('dinner', 'Parotta with Beef Curry', 110, 5),
      ('dinner', 'Combo (Chicken 65, Mutton Soup, Half-Boil Egg)', 120, 6),
      ('dinner', 'Chicken Noodles', 120, 7),
      ('dinner', 'Chicken Fried Rice', 120, 8),

      ('desserts', 'Tea', 15, 0),
      ('desserts', 'Coffee', 25, 1),
      ('desserts', 'Lemon Juice', 20, 2),
      ('desserts', 'Rose Milk', 35, 3),
      ('desserts', 'Badam Milk', 35, 4),
      ('desserts', 'Oreo Milkshake', 55, 5),
      ('desserts', 'Falooda', 80, 6),
      ('desserts', 'Sweet Bun', 20, 7),
      ('desserts', 'Carrot Halwa', 35, 8),
      ('desserts', 'Chocolate Cake', 35, 9),
      ('desserts', 'Black Forest Cake', 60, 10),
      ('desserts', 'White Forest Cake', 60, 11),
      ('desserts', 'Red Velvet Cake', 80, 12);
  end if;

  if not exists (select 1 from public.gallery_photos) then
    insert into public.gallery_photos (src, alt, caption, sort_order) values
      ('images/KLing_7a236c0f-db77-48eb-ad78-154dbf886851.jpg', 'Crispy golden ghee roast dosa served on a dark plate', 'Ghee Roast', 0),
      ('images/KLing_070e64ba-2780-40da-b119-bef8e17d16ce.jpg', 'Kerala parotta served with rich beef curry', 'Parotta with Beef Curry', 1),
      ('images/KLing_f8937a31-3488-450e-8e92-c397d47900fa.jpg', 'Idli and medu vada served with sambar and chutney on a banana leaf', 'Idli & Medu Vada', 2),
      ('images/KLing_702440d6-338d-42b7-99ca-cb9f6e5d3f65.jpg', 'Traditional South Indian filter coffee in a steel tumbler and davara', 'Filter Coffee', 3),
      ('images/KLing_d8d2e687-f1b1-4411-8406-9d513b915ced.jpg', 'Overhead view of a South Indian veg meal spread on a banana leaf', 'Royal Veg Meals', 4),
      ('images/KLing_a617852c-cbcc-4a44-9e4f-11b4fe3b58ee.jpg', 'Chicken biryani garnished with fried onions alongside Chicken 65', 'Chicken Biriyani & Chicken 65', 5),
      ('images/KLing_7648361b-017c-4dc1-8250-32d13afcde47.jpg', 'Royal falooda with ice cream and rose syrup in an elegant glass', 'Falooda', 6),
      ('images/KLing_efa77587-efd6-4407-8202-4a7a1b1c54e6.jpg', 'A slice of red velvet cake with elegant plating', 'Red Velvet Cake', 7),
      ('images/KLing_f8f4d8cf-505d-45aa-bf80-f836450911bc.jpg', 'Indo-Chinese chicken noodles garnished with spring onions', 'Chicken Noodles', 8),
      ('images/KLing_c0c6e19b-a96e-4c8b-b403-a9ee7a4f7ae3.jpg', 'Golden crispy masala dosa with sambar and chutney', 'Masala Dosa', 9);
  end if;
end $$;
