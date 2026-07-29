/**
 * Acceso a datos del panel de administración.
 *
 * Todas las operaciones pasan por Supabase con la clave pública. Quién puede
 * hacer qué lo decide la propia base de datos con sus políticas de seguridad,
 * no este archivo: aunque alguien manipulase la web, no podría escribir nada
 * sin una sesión válida y el rol adecuado.
 */
import { supabase, BUCKET, isConfigured } from '../lib/supabase.js';

export { supabase, BUCKET, isConfigured };

// ---------------------------------------------------------------------------
// SESIÓN Y PERFIL
// ---------------------------------------------------------------------------
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getProfile() {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, email: data.email || user.email };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendResetEmail(email) {
  const redirectTo = `${location.origin}${location.pathname}#/nueva-contrasena`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// REGISTRO DE ACTIVIDAD E HISTORIAL
// ---------------------------------------------------------------------------
let currentUser = null;
export function setCurrentUser(profile) {
  currentUser = profile;
}
export function getCurrentUser() {
  return currentUser;
}
export function isAdmin() {
  return currentUser?.role === 'admin';
}

/** Deja constancia de una acción. Nunca interrumpe la operación principal. */
export async function logActivity(action, { type, id, label, details } = {}) {
  if (!currentUser) return;
  try {
    await supabase.from('activity_log').insert({
      user_id: currentUser.id,
      user_email: currentUser.email,
      action,
      entity_type: type || null,
      entity_id: id != null ? String(id) : null,
      entity_label: label || null,
      details: details || null,
    });
  } catch {
    /* el registro es informativo: si falla no se bloquea el guardado */
  }
}

/** Guarda el antes y el después para poder deshacer un cambio. */
export async function saveRevision({ type, id, label, before, after }) {
  if (!currentUser) return;
  try {
    await supabase.from('content_revisions').insert({
      entity_type: type,
      entity_id: String(id),
      entity_label: label || null,
      old_value: before ?? null,
      new_value: after ?? null,
      created_by: currentUser.id,
    });
  } catch {
    /* idem */
  }
}

export async function listActivity(limit = 50) {
  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function listRevisions({ type, id } = {}, limit = 50) {
  let q = supabase.from('content_revisions').select('*').order('created_at', { ascending: false }).limit(limit);
  if (type) q = q.eq('entity_type', type);
  if (id) q = q.eq('entity_id', String(id));
  const { data } = await q;
  return data || [];
}

// ---------------------------------------------------------------------------
// CATEGORÍAS
// ---------------------------------------------------------------------------
export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCategory(values) {
  const { data, error } = await supabase.from('categories').insert(values).select().single();
  if (error) throw error;
  await logActivity('crear', { type: 'categoria', id: data.id, label: data.name });
  return data;
}

export async function updateCategory(id, values, before) {
  const { data, error } = await supabase.from('categories').update(values).eq('id', id).select().single();
  if (error) throw error;
  await saveRevision({ type: 'categoria', id, label: data.name, before, after: data });
  await logActivity('editar', { type: 'categoria', id, label: data.name });
  return data;
}

export async function deleteCategory(id, label) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
  await logActivity('eliminar', { type: 'categoria', id, label });
}

/** Mueve los productos de una categoría a otra (o los deja sin categoría). */
export async function reassignProducts(fromId, toId) {
  const { error } = await supabase
    .from('products')
    .update({ category_id: toId || null })
    .eq('category_id', fromId);
  if (error) throw error;
}

export async function reorderCategories(orderedIds) {
  await Promise.all(
    orderedIds.map((id, index) => supabase.from('categories').update({ position: index + 1 }).eq('id', id))
  );
  await logActivity('ordenar', { type: 'categoria', label: 'Nuevo orden de categorías' });
}

// ---------------------------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------------------------
const PRODUCT_FIELDS = `
  id, name, slug, category_id, short_description, description, composition, care,
  shipping_note, price, compare_at_price, status, is_featured, is_new, position,
  tags, stock_status, sku, requires_size, size_label, seo_title, seo_description,
  image_alt, created_at, updated_at
`;

export async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`${PRODUCT_FIELDS}, product_images ( url, is_primary, position )`)
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select(
      `${PRODUCT_FIELDS},
       product_variants ( id, size, color_name, color_slug, color_hex, sku, stock, price, is_active, position ),
       product_images ( id, url, storage_path, alt, color_slug, position, is_primary )`
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(values) {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...values, created_by: currentUser?.id, updated_by: currentUser?.id })
    .select()
    .single();
  if (error) throw error;
  await logActivity('crear', { type: 'producto', id: data.id, label: data.name });
  return data;
}

export async function updateProduct(id, values, before) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...values, updated_by: currentUser?.id })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await saveRevision({ type: 'producto', id, label: data.name, before, after: data });
  await logActivity('editar', { type: 'producto', id, label: data.name });
  return data;
}

export async function deleteProduct(id, label) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  await logActivity('eliminar', { type: 'producto', id, label });
}

export async function reorderProducts(orderedIds) {
  await Promise.all(
    orderedIds.map((id, index) => supabase.from('products').update({ position: index + 1 }).eq('id', id))
  );
  await logActivity('ordenar', { type: 'producto', label: 'Nuevo orden de productos' });
}

/** Copia un producto con todas sus variantes y fotografías. */
export async function duplicateProduct(id) {
  const original = await getProduct(id);
  const { id: _omit, product_variants: variants, product_images: images, created_at, updated_at, ...rest } = original;

  const base = `${rest.slug}-copia`;
  const slug = await uniqueSlug(base);

  const copy = await createProduct({
    ...rest,
    name: `${rest.name} (copia)`,
    slug,
    status: 'draft',
    is_featured: false,
  });

  if (variants?.length) {
    await supabase.from('product_variants').insert(
      variants.map(({ id: _v, ...v }) => ({ ...v, product_id: copy.id }))
    );
  }
  if (images?.length) {
    await supabase.from('product_images').insert(
      images.map(({ id: _i, ...img }) => ({ ...img, product_id: copy.id }))
    );
  }
  await logActivity('duplicar', { type: 'producto', id: copy.id, label: copy.name });
  return copy;
}

/** Devuelve un identificador de dirección libre añadiendo -2, -3… si hace falta. */
export async function uniqueSlug(base, table = 'products', ignoreId = null) {
  let candidate = base;
  let n = 1;
  // Máximo 50 intentos: suficiente y evita cualquier bucle infinito.
  while (n < 50) {
    let q = supabase.from(table).select('id').eq('slug', candidate);
    if (ignoreId) q = q.neq('id', ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// VARIANTES (tallas y colores)
// ---------------------------------------------------------------------------
/** Sustituye todas las variantes de un producto por la lista indicada. */
export async function saveVariants(productId, variants) {
  const { error: delError } = await supabase.from('product_variants').delete().eq('product_id', productId);
  if (delError) throw delError;
  if (!variants.length) return [];
  const rows = variants.map((v, index) => ({
    product_id: productId,
    size: v.size,
    color_name: v.color_name,
    color_slug: v.color_slug,
    color_hex: v.color_hex,
    sku: v.sku || null,
    stock: Number(v.stock) || 0,
    price: v.price === '' || v.price == null ? null : Number(v.price),
    is_active: v.is_active !== false,
    position: index,
  }));
  const { data, error } = await supabase.from('product_variants').insert(rows).select();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// IMÁGENES DE PRODUCTO
// ---------------------------------------------------------------------------
export async function saveProductImages(productId, images) {
  const { error: delError } = await supabase.from('product_images').delete().eq('product_id', productId);
  if (delError) throw delError;
  if (!images.length) return [];
  const rows = images.map((img, index) => ({
    product_id: productId,
    url: img.url,
    storage_path: img.storage_path || null,
    alt: img.alt || null,
    color_slug: img.color_slug || null,
    position: index,
    is_primary: index === 0,
  }));
  const { data, error } = await supabase.from('product_images').insert(rows).select();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// PÁGINAS Y SECCIONES
// ---------------------------------------------------------------------------
export async function listPages() {
  const { data, error } = await supabase.from('pages').select('*').order('position');
  if (error) throw error;
  return data || [];
}

export async function listSections(pageId) {
  const { data, error } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page_id', pageId)
    .order('position');
  if (error) throw error;
  return data || [];
}

export async function listAllSections() {
  const { data, error } = await supabase
    .from('page_sections')
    .select('*, pages ( slug, name )')
    .order('position');
  if (error) throw error;
  return data || [];
}

export async function updateSection(id, values, before) {
  const { data, error } = await supabase
    .from('page_sections')
    .update({ ...values, updated_by: currentUser?.id })
    .eq('id', id)
    .select('*, pages ( slug, name )')
    .single();
  if (error) throw error;
  await saveRevision({
    type: 'seccion',
    id,
    label: `${data.pages?.name || ''} · ${data.name}`,
    before,
    after: data.data,
  });
  await logActivity('editar', { type: 'seccion', id, label: `${data.pages?.name || ''} · ${data.name}` });
  return data;
}

export async function updatePage(id, values) {
  const { data, error } = await supabase
    .from('pages')
    .update({ ...values, updated_by: currentUser?.id })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logActivity('editar', { type: 'pagina', id, label: data.name });
  return data;
}

// ---------------------------------------------------------------------------
// AJUSTES GENERALES
// ---------------------------------------------------------------------------
export async function listSettings() {
  const { data, error } = await supabase.from('site_settings').select('*');
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.key, r.value || {}]));
}

export async function saveSetting(key, value, before) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_by: currentUser?.id }, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;
  await saveRevision({ type: 'ajuste', id: key, label: key, before, after: value });
  await logActivity('editar', { type: 'ajuste', id: key, label: key });
  return data;
}

// ---------------------------------------------------------------------------
// BIBLIOTECA DE IMÁGENES
// ---------------------------------------------------------------------------
export async function listMedia(folder = null) {
  let q = supabase.from('media_library').select('*').order('created_at', { ascending: false });
  if (folder) q = q.eq('folder', folder);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function registerMedia(row) {
  const { data, error } = await supabase.from('media_library').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function findMediaByChecksum(checksum) {
  const { data } = await supabase.from('media_library').select('*').eq('checksum', checksum).maybeSingle();
  return data || null;
}

export async function deleteMedia(item) {
  if (item.storage_path) {
    await supabase.storage.from(BUCKET).remove([item.storage_path]);
  }
  const { error } = await supabase.from('media_library').delete().eq('id', item.id);
  if (error) throw error;
  await logActivity('eliminar', { type: 'imagen', id: item.id, label: item.filename });
}

// ---------------------------------------------------------------------------
// INFORMES DE APORTACIONES
// ---------------------------------------------------------------------------
export async function listImpactReports() {
  const { data, error } = await supabase
    .from('impact_reports')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveImpactReport(id, values) {
  const payload = { ...values, updated_by: currentUser?.id };
  const query = id
    ? supabase.from('impact_reports').update(payload).eq('id', id)
    : supabase.from('impact_reports').insert({ ...payload, created_by: currentUser?.id });
  const { data, error } = await query.select().single();
  if (error) throw error;
  await logActivity(id ? 'editar' : 'crear', { type: 'informe', id: data.id, label: data.title });
  return data;
}

export async function deleteImpactReport(id, label) {
  const { error } = await supabase.from('impact_reports').delete().eq('id', id);
  if (error) throw error;
  await logActivity('eliminar', { type: 'informe', id, label });
}

// ---------------------------------------------------------------------------
// PERSONAS CON ACCESO (solo administración)
// ---------------------------------------------------------------------------
export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateProfile(id, values) {
  const { data, error } = await supabase.from('profiles').update(values).eq('id', id).select().single();
  if (error) throw error;
  await logActivity('editar', { type: 'usuario', id, label: data.email });
  return data;
}
