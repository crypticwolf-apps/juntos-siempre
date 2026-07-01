import { $, el, refreshIcons } from './utils.js';
import {
  CATEGORIES,
  PRODUCTS,
  getProduct,
  productColor,
  galleryImage,
} from '../data/products.js';
import { renderProductDetail } from './modals.js';

const productHref = (id) => `producto.html?id=${encodeURIComponent(id)}`;

function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || id;
}

function updateMeta(product) {
  document.title = `${product.name} — Juntos Siempre`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', `${product.name}: ${product.shortDesc}`);
}

function renderNotFound(host) {
  host.innerHTML = '';
  host.appendChild(el('section', { class: 'product-empty' }, [
    el('p', { class: 'eyebrow', text: 'Producto' }),
    el('h1', { class: 'section__title', text: 'No hemos encontrado esta prenda.' }),
    el('p', { class: 'section__lead', text: 'Puede que el enlace haya cambiado o que el producto ya no esté disponible en esta demo.' }),
    el('a', { class: 'btn btn--primary', href: 'tienda.html', text: 'Volver a la colección' }),
  ]));
}

function renderProof(product) {
  const firstColor = productColor(product, product.colors[0].id);
  const gallery = firstColor.gallery.map(galleryImage);
  const detail = gallery.find((img) => /bordado/i.test(img.label || '')) || gallery[2] || gallery[0];
  const fabric = gallery[0];
  const packaging = gallery.find((img) => /pack|etiqueta|trasera/i.test(img.label || '')) || gallery[1] || gallery[0];

  const items = [
    { label: 'Bordado', image: detail, text: 'Logo discreto, colocado cerca del corazón.' },
    { label: 'Tejido', image: fabric, text: 'Tacto limpio y estructura pensada para durar.' },
    { label: 'Presentación', image: packaging, text: 'Lista para regalar con un mensaje personal.' },
  ];

  return el('section', { class: 'product-proof', 'data-anim': '' }, [
    el('div', { class: 'product-proof__copy' }, [
      el('p', { class: 'eyebrow', text: 'Detalle' }),
      el('h2', { class: 'section__title', text: 'El producto, de cerca.' }),
      el('p', { class: 'section__lead', text: 'Algodón de calidad. Bordado sobre el corazón. Hecho para durar.' }),
    ]),
    el('div', { class: 'product-proof__grid' }, items.map((item) =>
      el('figure', { class: 'product-proof__item' }, [
        el('img', { src: item.image.src, alt: item.label, loading: 'lazy', decoding: 'async' }),
        el('figcaption', {}, [
          el('span', { text: item.label }),
          el('p', { text: item.text }),
        ]),
      ])
    )),
  ]);
}

export function mountProductPage() {
  const host = $('[data-product-page]');
  if (!host) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || PRODUCTS[0]?.id;
  const product = getProduct(id);
  if (!product) {
    renderNotFound(host);
    refreshIcons();
    return;
  }

  updateMeta(product);
  host.innerHTML = '';

  const nextProduct = PRODUCTS.find((p) => p.category === product.category && p.id !== product.id)
    || PRODUCTS.find((p) => p.id !== product.id);
  const detail = renderProductDetail(product, { context: 'page', titleId: 'product-title' });
  detail.classList.add('pd-wrap--page');

  host.append(
    el('nav', { class: 'product-crumb', 'aria-label': 'Ruta de producto' }, [
      el('a', { href: 'tienda.html', text: 'Colección' }),
      el('span', { 'aria-hidden': 'true', text: '/' }),
      el('a', { href: `tienda.html?categoria=${product.category}`, text: categoryLabel(product.category) }),
      el('span', { 'aria-hidden': 'true', text: '/' }),
      el('span', { text: product.name }),
    ]),
    detail,
    renderProof(product),
    el('section', { class: 'product-more', 'data-anim': '' }, [
      el('p', { text: 'Luchar JUNTOS. Ayudarnos SIEMPRE.' }),
      el('a', {
        class: 'btn btn--outline',
        href: nextProduct ? productHref(nextProduct.id) : 'tienda.html',
        text: nextProduct ? 'Ver otra prenda' : 'Volver a la colección',
      }),
    ])
  );
  refreshIcons();
}
