-- ============================================================================
-- Juntos Siempre — Esquema de administración de contenido
-- Migración 1 de 4: tipos, tablas, índices, funciones y disparadores.
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TIPOS
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.publish_status as enum ('draft', 'published', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'preorder');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- FUNCIÓN AUXILIAR: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- PERFILES (extiende auth.users con rol)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        public.user_role not null default 'editor',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Alta automática de perfil cuando se crea un usuario en Supabase Auth.
-- El primer usuario debe promocionarse a 'admin' con la consulta de 0004_seed.sql.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- FUNCIONES DE PERMISOS
-- SECURITY DEFINER para poder consultar profiles sin recursión de RLS.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  );
$$;

-- Personal autorizado: admin o editor. Ambos pueden gestionar contenido.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor') and p.is_active
  );
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text from public.profiles p where p.id = auth.uid();
$$;

-- Nadie puede cambiar su propio rol ni auto-promocionarse desde el navegador.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() = old.id then
      raise exception 'No puedes cambiar tu propio rol.';
    end if;
    if not public.is_admin() then
      raise exception 'Solo un administrador puede cambiar roles.';
    end if;
  end if;
  if new.is_active is distinct from old.is_active and auth.uid() = old.id then
    raise exception 'No puedes desactivar tu propia cuenta.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ----------------------------------------------------------------------------
-- AJUSTES GENERALES DEL SITIO (clave / valor)
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- PÁGINAS Y SECCIONES EDITABLES
-- ----------------------------------------------------------------------------
create table if not exists public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  seo_title        text,
  seo_description  text,
  og_image         text,
  is_published     boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null,
  constraint pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

drop trigger if exists pages_touch on public.pages;
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

create table if not exists public.page_sections (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages (id) on delete cascade,
  key         text not null,
  name        text not null,
  kind        text not null default 'generic',
  position    integer not null default 0,
  is_visible  boolean not null default true,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  unique (page_id, key)
);

create index if not exists page_sections_page_idx on public.page_sections (page_id, position);

drop trigger if exists page_sections_touch on public.page_sections;
create trigger page_sections_touch before update on public.page_sections
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- CATEGORÍAS
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  image_url        text,
  image_alt        text,
  is_active        boolean not null default true,
  position         integer not null default 0,
  seo_title        text,
  seo_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  updated_by       uuid references auth.users (id) on delete set null,
  constraint categories_name_len check (char_length(trim(name)) between 1 and 80),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists categories_active_idx on public.categories (is_active, position);

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- PRODUCTOS
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  category_id        uuid references public.categories (id) on delete set null,
  short_description  text,
  description        text,
  composition        text,
  care               text,
  shipping_note      text,
  price              numeric(10, 2) not null default 0,
  compare_at_price   numeric(10, 2),
  status             public.publish_status not null default 'draft',
  is_featured        boolean not null default false,
  is_new             boolean not null default false,
  position           integer not null default 0,
  tags               text[] not null default '{}',
  stock_status       public.stock_status not null default 'in_stock',
  sku                text,
  requires_size      boolean not null default true,
  size_label         text,
  seo_title          text,
  seo_description    text,
  image_alt          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null,
  updated_by         uuid references auth.users (id) on delete set null,
  constraint products_name_len check (char_length(trim(name)) between 1 and 120),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_price_positive check (price >= 0),
  constraint products_compare_price_positive check (compare_at_price is null or compare_at_price >= 0)
);

create index if not exists products_status_idx   on public.products (status, position);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- VARIANTES (talla x color)
-- ----------------------------------------------------------------------------
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  size        text not null default 'Única',
  color_name  text not null default 'Único',
  color_slug  text not null default 'unico',
  color_hex   text not null default '#cccccc',
  sku         text,
  stock       integer not null default 0,
  price       numeric(10, 2),
  is_active   boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, size, color_slug),
  constraint variants_stock_positive check (stock >= 0),
  constraint variants_price_positive check (price is null or price >= 0),
  constraint variants_hex_format check (color_hex ~* '^#[0-9a-f]{6}$')
);

create index if not exists product_variants_product_idx on public.product_variants (product_id, position);

drop trigger if exists product_variants_touch on public.product_variants;
create trigger product_variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- IMÁGENES DE PRODUCTO
-- ----------------------------------------------------------------------------
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  url         text not null,
  storage_path text,
  alt         text,
  color_slug  text,
  position    integer not null default 0,
  is_primary  boolean not null default false,
  width       integer,
  height      integer,
  created_at  timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id, position);
create unique index if not exists product_images_one_primary
  on public.product_images (product_id) where is_primary;

-- ----------------------------------------------------------------------------
-- BIBLIOTECA DE IMÁGENES
-- ----------------------------------------------------------------------------
create table if not exists public.media_library (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique,
  url           text not null,
  folder        text not null default 'general',
  filename      text not null,
  mime_type     text,
  size_bytes    bigint,
  width         integer,
  height        integer,
  checksum      text,
  alt           text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  constraint media_folder_allowed check (
    folder in ('products', 'categories', 'homepage', 'history', 'impact', 'general')
  )
);

create index if not exists media_folder_idx on public.media_library (folder, created_at desc);
create index if not exists media_checksum_idx on public.media_library (checksum);

-- ----------------------------------------------------------------------------
-- INFORMES DE APORTACIONES (estructura preparada, sin datos inventados)
-- ----------------------------------------------------------------------------
create table if not exists public.impact_reports (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  entity       text,
  amount       numeric(12, 2),
  report_date  date,
  purpose      text,
  description  text,
  media_url    text,
  document_url text,
  status       public.publish_status not null default 'draft',
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  updated_by   uuid references auth.users (id) on delete set null,
  constraint impact_amount_positive check (amount is null or amount >= 0)
);

drop trigger if exists impact_reports_touch on public.impact_reports;
create trigger impact_reports_touch before update on public.impact_reports
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- HISTORIAL DE CAMBIOS Y REGISTRO DE ACTIVIDAD
-- ----------------------------------------------------------------------------
create table if not exists public.content_revisions (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    text not null,
  entity_label text,
  old_value    jsonb,
  new_value    jsonb,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);

create index if not exists revisions_entity_idx on public.content_revisions (entity_type, entity_id, created_at desc);

create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  user_email   text,
  action       text not null,
  entity_type  text,
  entity_id    text,
  entity_label text,
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists activity_created_idx on public.activity_log (created_at desc);

-- ----------------------------------------------------------------------------
-- VISTA PÚBLICA DEL CATÁLOGO (solo publicados)
-- security_invoker respeta las políticas RLS de quien consulta.
-- ----------------------------------------------------------------------------
create or replace view public.public_products
with (security_invoker = true)
as
  select p.*, c.slug as category_slug, c.name as category_name
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.status = 'published';
