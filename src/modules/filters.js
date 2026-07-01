/**
 * Filtros y ordenación del catálogo. Estado puro: recibe productos y criterios,
 * devuelve la lista filtrada y ordenada. No toca el DOM.
 */
import { colorHasStock } from '../data/products.js';

export const SORTS = {
  recommended: 'Recomendados',
  new: 'Novedades',
  'price-asc': 'Precio: más bajo',
  'price-desc': 'Precio: más alto',
};

export const defaultFilters = {
  category: 'all',
  colors: [],
  sizes: [],
  maxPrice: null,
  inStockOnly: false,
  search: '',
  sort: 'recommended',
};

export function applyFilters(products, filters) {
  const f = { ...defaultFilters, ...filters };
  let list = products.filter((p) => {
    if (f.category !== 'all' && p.category !== f.category) return false;
    if (f.colors.length && !p.colors.some((c) => f.colors.includes(c.id))) return false;
    if (f.sizes.length && !p.sizes.some((s) => f.sizes.includes(s))) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.inStockOnly && !p.colors.some((c) => colorHasStock(p, c.id))) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = `${p.name} ${p.shortDesc} ${p.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  switch (f.sort) {
    case 'price-asc':
      list = list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list = list.sort((a, b) => b.price - a.price);
      break;
    case 'new':
      list = list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
      break;
    default:
      break; // recomendados = orden original del catálogo
  }
  return list;
}

/** Devuelve los colores y tallas únicos presentes en el catálogo. */
export function facets(products) {
  const colors = new Map();
  const sizes = new Set();
  for (const p of products) {
    p.colors.forEach((c) => colors.set(c.id, true));
    p.sizes.forEach((s) => sizes.add(s));
  }
  return { colors: [...colors.keys()], sizes: [...sizes] };
}
