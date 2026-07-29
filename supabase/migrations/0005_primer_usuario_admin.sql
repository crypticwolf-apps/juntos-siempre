-- ============================================================================
-- Juntos Siempre — La primera cuenta que se cree será la administradora
--
-- Evita tener que ejecutar una consulta a mano después de crear tu usuario:
-- la primera persona que entre en el sistema queda como administradora, y
-- todas las siguientes entran como editoras (un administrador puede cambiar
-- su permiso después desde Configuración).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  es_primer_usuario boolean;
begin
  select not exists (select 1 from public.profiles) into es_primer_usuario;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when es_primer_usuario then 'admin'::public.user_role
         else 'editor'::public.user_role end,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$fn$;
