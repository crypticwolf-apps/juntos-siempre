/**
 * Datos centrales de catálogo.
 * Mantiene precios, variantes, stock simulado e imágenes sin convertir la demo
 * en una promesa comercial definitiva.
 */

import camNegraFrontal from '../assets/products/camiseta-negra-frontal.jpg';
import camNegraUrbano from '../assets/products/camiseta-negra-urbano.jpg';
import camBlancaFrontal from '../assets/products/camiseta-blanca-frontal.jpg';
import camBlancaEspalda from '../assets/products/camiseta-blanca-espalda.jpg';
import packCamisetas from '../assets/products/pack-camisetas-neutras.jpg';
import sudNegraExterior from '../assets/products/sudadera-negra-exterior.jpg';
import capsulaNeutros from '../assets/products/capsula-negro-neutros.jpg';
import sudBeigeFamilia from '../assets/products/sudadera-beige-familia.jpg';
import sudBeigeColgada from '../assets/products/sudadera-beige-colgada.jpg';
import gorraNegra from '../assets/products/gorra-negra.jpg';
import detalleBordado from '../assets/packaging/detalle-bordado.jpg';
import detalleCuello from '../assets/packaging/detalle-cuello.jpg';
import etiquetaRegalo from '../assets/packaging/etiqueta-regalo.jpg';
import etiquetaCuello from '../assets/packaging/etiqueta-cuello.jpg';
import sudaderaPackaging from '../assets/packaging/sudadera-packaging.jpg';

// Estos datos son la versión original de la web y siguen siendo los que se
// muestran si todavía no hay catálogo publicado en el gestor de contenido.
// `setCatalog()` los sustituye cuando sí lo hay.
export let COLORS = {
  negro: { id: 'negro', name: 'Negro', hex: '#1c1c1c' },
  'blanco-roto': { id: 'blanco-roto', name: 'Blanco roto', hex: '#f3efe6' },
  arena: { id: 'arena', name: 'Arena', hex: '#d8c5a4' },
  'gris-piedra': { id: 'gris-piedra', name: 'Gris piedra', hex: '#9c968c' },
  'azul-marino': { id: 'azul-marino', name: 'Azul marino', hex: '#212f40' },
  beige: { id: 'beige', name: 'Beige', hex: '#cdbb9c' },
  natural: { id: 'natural', name: 'Natural', hex: '#e4dccb' },
  craft: { id: 'craft', name: 'Kraft', hex: '#c4a373' },
};

export let CATEGORIES = [
  { id: 'camisetas', label: 'Camisetas', image: camNegraUrbano },
  { id: 'sudaderas', label: 'Sudaderas', image: sudBeigeFamilia },
  { id: 'gorras', label: 'Gorras', image: gorraNegra },
  { id: 'accesorios', label: 'Accesorios', image: etiquetaRegalo },
];

export const EMBROIDERY_LABEL = 'Logo bordado sobre el corazón';
export const SIZE_GUIDE_NOTE =
  'Guía orientativa de demostración. La tabla final se ajustará a la producción real.';

export const SIZE_GUIDE = {
  apparel: {
    headers: ['Talla', 'Pecho (cm)', 'Largo (cm)', 'Equivale a'],
    rows: [
      ['XS', '88-92', '66', 'EU 42'],
      ['S', '92-98', '68', 'EU 44-46'],
      ['M', '98-104', '70', 'EU 48'],
      ['L', '104-112', '72', 'EU 50-52'],
      ['XL', '112-120', '74', 'EU 54'],
      ['XXL', '120-128', '76', 'EU 56-58'],
    ],
  },
  cap: {
    headers: ['Talla', 'Contorno (cm)', 'Cierre'],
    rows: [['Única', '54-62', 'Ajuste regulable']],
  },
};

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SWEAT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const gallery = (front, back, detail, model) => [
  { src: front, label: 'Frontal' },
  { src: back, label: 'Trasera' },
  { src: detail, label: 'Bordado' },
  { src: model, label: 'En modelo' },
];

const PRODUCT_NOTE =
  'Logo bordado sobre el corazón. Silueta limpia, colores sobrios y una presencia discreta.';

const MATERIAL_NOTE =
  'Algodón de calidad y acabados cuidados. La composición final se confirmará cuando exista ficha técnica de producción.';

const CARE_NOTE =
  'Cuidados orientativos: lavar del revés, ciclo suave y evitar calor alto sobre el bordado. La etiqueta final tendrá la indicación definitiva.';

const SHIPPING_NOTE =
  'Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.';

export let PRODUCTS = [
  {
    id: 'camiseta-essential',
    name: 'Camiseta Essential',
    category: 'camisetas',
    price: 15,
    isNew: true,
    shortDesc: 'Camiseta minimalista con logo bordado sobre el corazón.',
    description: PRODUCT_NOTE,
    composition: MATERIAL_NOTE,
    care: CARE_NOTE,
    shipping: SHIPPING_NOTE,
    sizes: APPAREL_SIZES,
    requiresSize: true,
    colors: [
      {
        id: 'negro',
        image: camNegraFrontal,
        hover: camNegraUrbano,
        gallery: gallery(camNegraFrontal, camBlancaEspalda, detalleBordado, camNegraUrbano),
      },
      {
        id: 'blanco-roto',
        image: camBlancaFrontal,
        hover: camBlancaEspalda,
        gallery: gallery(camBlancaFrontal, camBlancaEspalda, detalleBordado, camBlancaFrontal),
      },
      {
        id: 'arena',
        image: packCamisetas,
        hover: camBlancaFrontal,
        gallery: gallery(packCamisetas, camBlancaEspalda, detalleBordado, camBlancaFrontal),
      },
      {
        id: 'gris-piedra',
        image: packCamisetas,
        hover: camBlancaEspalda,
        gallery: gallery(packCamisetas, camBlancaEspalda, detalleBordado, camNegraUrbano),
      },
      {
        id: 'azul-marino',
        image: camNegraUrbano,
        hover: camNegraFrontal,
        gallery: gallery(camNegraUrbano, camBlancaEspalda, detalleBordado, camNegraUrbano),
      },
    ],
    soldOut: ['arena|XS', 'azul-marino|XXL', 'gris-piedra|XS'],
  },
  {
    id: 'sudadera-crew',
    name: 'Sudadera Crew',
    category: 'sudaderas',
    price: 25,
    isNew: true,
    shortDesc: 'Sudadera de cuello redondo con bordado discreto.',
    description: PRODUCT_NOTE,
    composition: MATERIAL_NOTE,
    care: CARE_NOTE,
    shipping: SHIPPING_NOTE,
    sizes: SWEAT_SIZES,
    requiresSize: true,
    colors: [
      {
        id: 'negro',
        image: sudNegraExterior,
        hover: sudBeigeFamilia,
        gallery: gallery(sudNegraExterior, detalleCuello, detalleBordado, sudBeigeFamilia),
      },
      {
        id: 'beige',
        image: sudBeigeFamilia,
        hover: sudBeigeColgada,
        gallery: gallery(sudBeigeFamilia, sudBeigeColgada, detalleBordado, sudBeigeFamilia),
      },
      {
        id: 'gris-piedra',
        image: sudBeigeColgada,
        hover: capsulaNeutros,
        gallery: gallery(sudBeigeColgada, capsulaNeutros, detalleBordado, sudBeigeFamilia),
      },
      {
        id: 'azul-marino',
        image: sudNegraExterior,
        hover: capsulaNeutros,
        gallery: gallery(sudNegraExterior, capsulaNeutros, detalleBordado, sudNegraExterior),
      },
    ],
    soldOut: ['beige|XXL', 'azul-marino|S'],
  },
  {
    id: 'gorra',
    name: 'Gorra',
    category: 'gorras',
    price: 12,
    isNew: false,
    shortDesc: 'Gorra sobria con bordado frontal.',
    description: 'Logo bordado en una pieza limpia y fácil de llevar a diario.',
    composition: MATERIAL_NOTE,
    care: CARE_NOTE,
    shipping: SHIPPING_NOTE,
    sizes: ['Única'],
    requiresSize: false,
    colors: [
      {
        id: 'negro',
        image: gorraNegra,
        hover: detalleBordado,
        gallery: gallery(gorraNegra, gorraNegra, detalleBordado, gorraNegra),
      },
      {
        id: 'beige',
        image: gorraNegra,
        hover: detalleBordado,
        gallery: gallery(gorraNegra, gorraNegra, detalleBordado, gorraNegra),
      },
      {
        id: 'azul-marino',
        image: gorraNegra,
        hover: detalleBordado,
        gallery: gallery(gorraNegra, gorraNegra, detalleBordado, gorraNegra),
      },
    ],
    soldOut: ['beige|U'],
  },
  {
    id: 'tote-bag',
    name: 'Tote bag',
    category: 'accesorios',
    price: 19,
    isNew: false,
    shortDesc: 'Bolsa de tela con presencia mínima.',
    description: 'Accesorio de demostración para completar el pedido.',
    composition: 'Material y producción pendientes de confirmar.',
    care: 'Cuidados pendientes de confirmar.',
    shipping: SHIPPING_NOTE,
    sizes: ['Única'],
    requiresSize: false,
    colors: [
      {
        id: 'natural',
        image: etiquetaRegalo,
        hover: sudaderaPackaging,
        gallery: gallery(etiquetaRegalo, sudaderaPackaging, detalleBordado, etiquetaRegalo),
      },
    ],
    soldOut: [],
  },
  {
    id: 'tarjeta-regalo',
    name: 'Tarjeta regalo',
    category: 'accesorios',
    price: 25,
    isNew: false,
    isGiftCard: true,
    shortDesc: 'Una tarjeta para elegir la prenda después.',
    description: 'Tarjeta de demostración para regalar una elección pendiente.',
    composition: 'Formato y condiciones pendientes de confirmar.',
    care: 'No aplica.',
    shipping: SHIPPING_NOTE,
    sizes: ['25 €', '50 €', '75 €', '100 €'],
    requiresSize: true,
    sizeLabel: 'Importe',
    colors: [
      {
        id: 'craft',
        image: etiquetaCuello,
        hover: etiquetaRegalo,
        gallery: gallery(etiquetaCuello, etiquetaRegalo, detalleCuello, etiquetaRegalo),
      },
    ],
    soldOut: [],
  },
  {
    id: 'caja-regalo',
    name: 'Caja regalo',
    category: 'accesorios',
    price: 9,
    isNew: false,
    shortDesc: 'Caja regalo y tarjeta personalizable.',
    description: 'Packaging de regalo para acompañar la prenda con un mensaje personal.',
    composition: 'Caja, envoltorio y tarjeta de presentación. Materiales finales pendientes de confirmar.',
    care: 'No aplica.',
    shipping: SHIPPING_NOTE,
    sizes: ['Única'],
    requiresSize: false,
    colors: [
      {
        id: 'craft',
        image: sudaderaPackaging,
        hover: etiquetaRegalo,
        gallery: gallery(sudaderaPackaging, etiquetaRegalo, detalleCuello, sudaderaPackaging),
      },
    ],
    soldOut: [],
  },
];

export const GIFT_BOX_ID = 'caja-regalo';
export const BRAND_SLOGAN = 'Luchar JUNTOS. Ayudarnos SIEMPRE.';
export const GIFT_MESSAGE_SUGGESTION = BRAND_SLOGAN;

/**
 * Sustituye el catálogo original por el publicado desde el panel.
 * Se llama una sola vez al arrancar, antes de dibujar nada.
 */
export function setCatalog({ products, categories, colors }) {
  if (Array.isArray(products) && products.length) PRODUCTS = products;
  if (Array.isArray(categories) && categories.length) CATEGORIES = categories;
  if (colors && Object.keys(colors).length) COLORS = colors;
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

export function getColor(id) {
  return COLORS[id] || { id, name: id, hex: '#cccccc' };
}

export function productColor(product, colorId) {
  return product.colors.find((c) => c.id === colorId) || product.colors[0];
}

export function galleryImage(item) {
  return typeof item === 'string' ? { src: item, label: '' } : item;
}

export function isAvailable(product, colorId, size) {
  const sizeKey = product.requiresSize ? size : 'U';
  if (!sizeKey) return true;
  return !product.soldOut.includes(`${colorId}|${sizeKey}`);
}

export function colorHasStock(product, colorId) {
  if (!product.requiresSize) return isAvailable(product, colorId, 'U');
  return product.sizes.some((s) => isAvailable(product, colorId, s));
}

export function formatPrice(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function countByCategory(catId) {
  return PRODUCTS.filter((p) => p.category === catId).length;
}
