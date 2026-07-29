/**
 * Contenido editable de la web.
 *
 * Cómo funciona:
 *   · El HTML mantiene su texto original. Ese texto es la versión por defecto.
 *   · Cada trozo editable lleva un atributo data-cms-* con su identificador.
 *   · Al cargar la página se piden los cambios guardados y se aplican encima.
 *
 * Si no hay conexión con el gestor, no se aplica nada y la web se ve
 * exactamente igual que siempre.
 *
 * Identificadores: "pagina.seccion.campo"  ->  "home.hero.title_line1"
 */
import { supabase, isConfigured } from './supabase.js';
import { resolveImage } from './asset-map.js';

const CACHE_KEY = 'js_cms_cache_v1';
const CACHE_TTL = 60 * 1000; // 1 minuto: los cambios publicados se ven enseguida

let state = { settings: {}, pages: {}, loaded: false };

// ---------------------------------------------------------------------------
// CARGA
// ---------------------------------------------------------------------------
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Borra la copia temporal para que el siguiente cargue vea los cambios. */
export function invalidateCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignorar */
  }
}

/**
 * Descarga ajustes, páginas y secciones. Nunca lanza error: si algo falla,
 * devuelve el contenido vacío y la web usa su texto original.
 */
export async function loadContent({ force = false } = {}) {
  if (state.loaded && !force) return state;
  if (!isConfigured) {
    state = { settings: {}, pages: {}, loaded: true };
    return state;
  }

  if (!force) {
    const cached = readCache();
    if (cached) {
      state = { ...cached, loaded: true };
      return state;
    }
  }

  try {
    const [settingsRes, pagesRes, sectionsRes] = await Promise.all([
      supabase.from('site_settings').select('key, value'),
      supabase.from('pages').select('id, slug, seo_title, seo_description, og_image, is_published'),
      supabase
        .from('page_sections')
        .select('page_id, key, position, is_visible, data')
        .order('position', { ascending: true }),
    ]);

    if (settingsRes.error || pagesRes.error || sectionsRes.error) throw new Error('lectura');

    const settings = {};
    for (const row of settingsRes.data || []) settings[row.key] = row.value || {};

    const byId = {};
    const pages = {};
    for (const pg of pagesRes.data || []) {
      byId[pg.id] = pg.slug;
      pages[pg.slug] = {
        seo_title: pg.seo_title,
        seo_description: pg.seo_description,
        og_image: pg.og_image,
        is_published: pg.is_published,
        sections: {},
      };
    }
    for (const sec of sectionsRes.data || []) {
      const slug = byId[sec.page_id];
      if (!slug || !pages[slug]) continue;
      pages[slug].sections[sec.key] = {
        position: sec.position,
        visible: sec.is_visible,
        data: sec.data || {},
      };
    }

    const data = { settings, pages };
    writeCache(data);
    state = { ...data, loaded: true };
  } catch {
    // Sin contenido remoto: la web mantiene su versión original.
    state = { settings: {}, pages: {}, loaded: true };
  }
  return state;
}

// ---------------------------------------------------------------------------
// LECTURA
// ---------------------------------------------------------------------------
/** Ajuste general: settings('footer', 'copyright', 'Juntos Siempre') */
export function settings(group, field, fallback = '') {
  const value = state.settings?.[group];
  if (!value) return fallback;
  if (field == null) return value;
  const found = value[field];
  return found == null || found === '' ? fallback : found;
}

/** Sección completa: section('story', 'chapters') -> { visible, data } | null */
export function section(pageSlug, key) {
  return state.pages?.[pageSlug]?.sections?.[key] || null;
}

/** Valor de un campo por identificador plano: value('home.hero.text') */
export function value(id, fallback = '') {
  const [page, sec, ...rest] = String(id).split('.');
  const field = rest.join('.');
  const found = state.pages?.[page]?.sections?.[sec]?.data?.[field];
  return found == null || found === '' ? fallback : found;
}

export function pageMeta(slug) {
  return state.pages?.[slug] || null;
}

export { resolveImage };

// ---------------------------------------------------------------------------
// APLICACIÓN AL DOM
// ---------------------------------------------------------------------------
/**
 * Recorre el documento y sustituye lo que tenga contenido guardado.
 *
 *   data-cms-text="home.hero.text"        -> cambia el texto
 *   data-cms-html="impact.hero.lead"      -> cambia el texto permitiendo <strong>
 *   data-cms-img="home.hero.image"        -> cambia la fotografía
 *   data-cms-alt="home.hero.image_alt"    -> cambia la descripción de la foto
 *   data-cms-attr="href:home.hero.cta1_href"
 *   data-cms-section="home.hero"          -> permite ocultar la sección entera
 */
export function applyContent(root = document) {
  if (!state.loaded) return;

  root.querySelectorAll('[data-cms-text]').forEach((node) => {
    const v = value(node.dataset.cmsText, null);
    if (v != null && v !== '') node.textContent = v;
  });

  root.querySelectorAll('[data-cms-html]').forEach((node) => {
    const v = value(node.dataset.cmsHtml, null);
    if (v != null && v !== '') node.innerHTML = sanitize(v);
  });

  root.querySelectorAll('[data-cms-img]').forEach((node) => {
    const v = resolveImage(value(node.dataset.cmsImg, ''));
    if (v) {
      node.src = v;
      node.removeAttribute('srcset');
    }
  });

  root.querySelectorAll('[data-cms-alt]').forEach((node) => {
    const v = value(node.dataset.cmsAlt, null);
    if (v != null && v !== '') node.alt = v;
  });

  root.querySelectorAll('[data-cms-attr]').forEach((node) => {
    node.dataset.cmsAttr.split(',').forEach((pair) => {
      const idx = pair.indexOf(':');
      if (idx < 0) return;
      const attr = pair.slice(0, idx).trim();
      const id = pair.slice(idx + 1).trim();
      const v = value(id, null);
      if (v != null && v !== '') node.setAttribute(attr, v);
    });
  });

  // Visibilidad y orden de las secciones
  root.querySelectorAll('[data-cms-section]').forEach((node) => {
    const [page, key] = node.dataset.cmsSection.split('.');
    const sec = section(page, key);
    if (!sec) return;
    node.hidden = sec.visible === false;
    if (sec.visible === false) node.setAttribute('data-cms-hidden', '');
    else node.removeAttribute('data-cms-hidden');
    node.style.order = String(sec.position ?? 0);
  });
}

/** Limpia el HTML editable: solo se permite dar énfasis, nunca scripts. */
function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const allowed = new Set(['STRONG', 'EM', 'B', 'I', 'BR', 'SPAN']);
  tpl.content.querySelectorAll('*').forEach((node) => {
    if (!allowed.has(node.tagName)) node.replaceWith(...node.childNodes);
    else [...node.attributes].forEach((a) => node.removeAttribute(a.name));
  });
  return tpl.innerHTML;
}
