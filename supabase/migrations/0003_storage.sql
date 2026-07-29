-- ============================================================================
-- Juntos Siempre — Almacenamiento de fotografías
-- Migración 3 de 4. Ejecutar después de 0002_rls.sql
--
-- Crea el contenedor de imágenes "site-media" y sus permisos:
--   · Cualquiera puede VER las fotos (la web las muestra al público).
--   · Solo el personal autorizado puede SUBIR, REEMPLAZAR o BORRAR.
-- ============================================================================

-- Contenedor público de lectura, con límite de 10 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- POLÍTICAS
-- ----------------------------------------------------------------------------
drop policy if exists site_media_public_read on storage.objects;
create policy site_media_public_read on storage.objects
  for select using (bucket_id = 'site-media');

drop policy if exists site_media_staff_insert on storage.objects;
create policy site_media_staff_insert on storage.objects
  for insert with check (bucket_id = 'site-media' and public.is_staff());

drop policy if exists site_media_staff_update on storage.objects;
create policy site_media_staff_update on storage.objects
  for update using (bucket_id = 'site-media' and public.is_staff())
  with check (bucket_id = 'site-media' and public.is_staff());

drop policy if exists site_media_staff_delete on storage.objects;
create policy site_media_staff_delete on storage.objects
  for delete using (bucket_id = 'site-media' and public.is_staff());
