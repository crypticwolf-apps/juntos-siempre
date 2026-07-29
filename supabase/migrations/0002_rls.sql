-- ============================================================================
-- Juntos Siempre — Seguridad a nivel de fila (RLS)
-- Migración 2 de 4. Ejecutar después de 0001_schema.sql
--
-- Reglas:
--   · Las visitas solo LEEN contenido publicado.
--   · Las visitas nunca pueden crear, modificar ni eliminar nada.
--   · Los editores gestionan productos, categorías, páginas e imágenes.
--   · Los administradores gestionan además usuarios y ajustes sensibles.
--   · Los borradores no son accesibles públicamente ni consultando la API.
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.site_settings     enable row level security;
alter table public.pages             enable row level security;
alter table public.page_sections     enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.product_images    enable row level security;
alter table public.media_library     enable row level security;
alter table public.impact_reports    enable row level security;
alter table public.content_revisions enable row level security;
alter table public.activity_log      enable row level security;

-- ----------------------------------------------------------------------------
-- PERFILES
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_own_name on public.profiles;
create policy profiles_update_own_name on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());
-- El cambio de rol lo bloquea además el disparador profiles_guard_role.

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert with check (public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin() and auth.uid() <> id);

-- ----------------------------------------------------------------------------
-- AJUSTES DEL SITIO — lectura pública, escritura del personal
-- ----------------------------------------------------------------------------
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select using (true);

drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- PÁGINAS Y SECCIONES
-- ----------------------------------------------------------------------------
drop policy if exists pages_read_published on public.pages;
create policy pages_read_published on public.pages
  for select using (is_published or public.is_staff());

drop policy if exists pages_write_staff on public.pages;
create policy pages_write_staff on public.pages
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists sections_read on public.page_sections;
create policy sections_read on public.page_sections
  for select using (
    public.is_staff()
    or exists (select 1 from public.pages pg where pg.id = page_id and pg.is_published)
  );

drop policy if exists sections_write_staff on public.page_sections;
create policy sections_write_staff on public.page_sections
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- CATEGORÍAS
-- ----------------------------------------------------------------------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (is_active or public.is_staff());

drop policy if exists categories_write_staff on public.categories;
create policy categories_write_staff on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- PRODUCTOS — los borradores y ocultos no salen nunca por la API pública
-- ----------------------------------------------------------------------------
drop policy if exists products_read_published on public.products;
create policy products_read_published on public.products
  for select using (status = 'published' or public.is_staff());

drop policy if exists products_write_staff on public.products;
create policy products_write_staff on public.products
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- VARIANTES E IMÁGENES — visibles solo si su producto está publicado
-- ----------------------------------------------------------------------------
drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

drop policy if exists variants_write_staff on public.product_variants;
create policy variants_write_staff on public.product_variants
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists images_read on public.product_images;
create policy images_read on public.product_images
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

drop policy if exists images_write_staff on public.product_images;
create policy images_write_staff on public.product_images
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- BIBLIOTECA DE IMÁGENES — lectura pública (las fotos se muestran en la web),
-- alta y borrado solo para personal autorizado.
-- ----------------------------------------------------------------------------
drop policy if exists media_read on public.media_library;
create policy media_read on public.media_library
  for select using (true);

drop policy if exists media_write_staff on public.media_library;
create policy media_write_staff on public.media_library
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- INFORMES DE APORTACIONES
-- ----------------------------------------------------------------------------
drop policy if exists impact_read_published on public.impact_reports;
create policy impact_read_published on public.impact_reports
  for select using (status = 'published' or public.is_staff());

drop policy if exists impact_write_staff on public.impact_reports;
create policy impact_write_staff on public.impact_reports
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- HISTORIAL — el personal puede consultarlo y crear entradas para poder
-- deshacer cambios. El registro de actividad completo es solo de administración.
-- ----------------------------------------------------------------------------
drop policy if exists revisions_read_staff on public.content_revisions;
create policy revisions_read_staff on public.content_revisions
  for select using (public.is_staff());

drop policy if exists revisions_insert_staff on public.content_revisions;
create policy revisions_insert_staff on public.content_revisions
  for insert with check (public.is_staff() and created_by = auth.uid());

drop policy if exists revisions_delete_admin on public.content_revisions;
create policy revisions_delete_admin on public.content_revisions
  for delete using (public.is_admin());

drop policy if exists activity_read_admin on public.activity_log;
create policy activity_read_admin on public.activity_log
  for select using (public.is_admin());

drop policy if exists activity_insert_staff on public.activity_log;
create policy activity_insert_staff on public.activity_log
  for insert with check (public.is_staff() and user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- PERMISOS DE ESQUEMA
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.public_products to anon, authenticated;
