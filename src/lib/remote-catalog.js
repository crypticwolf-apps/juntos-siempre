/**
 * Catálogo publicado desde el gestor de contenido.
 *
 * Convierte lo que hay en la base de datos a la MISMA forma que ya usaba la
 * web, para que las tarjetas, la ficha de producto, la cesta y los filtros
 * sigan funcionando sin cambios.
 *
 * Si no hay conexión, o todavía no hay productos publicados, devuelve null y
 * la web sigue mostrando su catálogo original.
 */
import { supabase, isConfigured } from './supabase.js';
import { resolveImage } from './asset-map.js';

const GALLERY_LABELS = ['Frontal', 'Trasera', 'Bordado', 'En modelo'];

/**
 * @returns {Promise<null | { products: [], categories: [], colors: {} }>}
 */
export async function loadRemoteCatalog() {
  if (!isConfigured) return null;

  try {
    const [catsRes, prodsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, slug, image_url, image_alt, position, is_active')
        .eq('is_active', true)
        .order('position', { ascending: true }),
      // Las políticas de seguridad ya impiden que salgan borradores u ocultos.
      supabase
        .from('products')
        .select(
          `id, name, slug, price, compare_at_price, short_description, description,
           composition, care, shipping_note, is_new, is_featured, position,
           requires_size, size_label, stock_status, tags, image_alt,
           seo_title, seo_description, category_id,
           product_variants ( size, color_name, color_slug, color_hex, stock, is_active, position, price ),
           product_images  ( url, alt, color_slug, position, is_primary )`
        )
        .eq('status', 'published')
        .order('position', { ascending: true }),
    ]);

    if (catsRes.error || prodsRes.error) return null;
    if (!prodsRes.data?.length) return null;

    const categories = (catsRes.data || []).map((c) => ({
      id: c.slug,
      label: c.name,
      image: resolveImage(c.image_url),
      alt: c.image_alt || c.name,
    }));
    const catById = Object.fromEntries((catsRes.data || []).map((c) => [c.id, c.slug]));

    const colors = {};
    const products = [];

    for (const row of prodsRes.data) {
      const variants = (row.product_variants || [])
        .filter((v) => v.is_active)
        .sort((a, b) => a.position - b.position);
      const images = (row.product_images || []).sort((a, b) => a.position - b.position);

      // Tallas en el orden en que se guardaron, sin repetir.
      const sizes = [];
      for (const v of variants) if (!sizes.includes(v.size)) sizes.push(v.size);

      // Colores en el orden en que se guardaron, sin repetir.
      const colorOrder = [];
      for (const v of variants) {
        if (colorOrder.some((c) => c.slug === v.color_slug)) continue;
        colorOrder.push({ slug: v.color_slug, name: v.color_name, hex: v.color_hex });
      }
      // Un producto puede tener fotos de un color sin variantes activas.
      for (const img of images) {
        if (img.color_slug && !colorOrder.some((c) => c.slug === img.color_slug)) {
          colorOrder.push({ slug: img.color_slug, name: img.color_slug, hex: '#cccccc' });
        }
      }
      if (!colorOrder.length) continue;

      for (const c of colorOrder) {
        colors[c.slug] = { id: c.slug, name: c.name, hex: c.hex };
      }

      const productColors = colorOrder.map((c) => {
        const own = images.filter((i) => i.color_slug === c.slug);
        const pool = own.length ? own : images;
        // Cada foto conserva su propio texto para que la etiqueta ("Frontal",
        // "Trasera"…) acompañe a la imagen correcta.
        const withUrl = pool
          .map((i) => ({ src: resolveImage(i.url), alt: i.alt }))
          .filter((x) => x.src);
        const main = withUrl[0]?.src || '';
        const hover = withUrl[1]?.src || main;
        // Galería de la ficha: portada + resto, sin repetir la de "al pasar el ratón".
        const galleryPool = withUrl.filter((_, idx) => idx !== 1);
        const gallery = galleryPool.map((x, idx) => ({
          src: x.src,
          label: x.alt && x.alt !== row.name ? x.alt : GALLERY_LABELS[idx] || '',
        }));
        return {
          id: c.slug,
          image: main,
          hover,
          gallery: gallery.length ? gallery : [{ src: main, label: '' }],
        };
      });

      // Sin stock: la web ya sabe leer "color|talla".
      const soldOut = [];
      for (const v of variants) {
        if (v.stock > 0) continue;
        soldOut.push(`${v.color_slug}|${row.requires_size ? v.size : 'U'}`);
      }

      products.push({
        // El identificador público sigue siendo el slug: las direcciones
        // producto.html?id=camiseta-essential no cambian.
        id: row.slug,
        name: row.name,
        category: catById[row.category_id] || '',
        price: Number(row.price),
        compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : null,
        isNew: Boolean(row.is_new),
        isFeatured: Boolean(row.is_featured),
        shortDesc: row.short_description || '',
        description: row.description || '',
        composition: row.composition || '',
        care: row.care || '',
        shipping: row.shipping_note || '',
        sizes: sizes.length ? sizes : ['Única'],
        requiresSize: Boolean(row.requires_size),
        sizeLabel: row.size_label || undefined,
        tags: row.tags || [],
        stockStatus: row.stock_status,
        seoTitle: row.seo_title || '',
        seoDescription: row.seo_description || '',
        colors: productColors,
        soldOut,
      });
    }

    if (!products.length) return null;
    return { products, categories, colors };
  } catch {
    return null;
  }
}
