/**
 * Catálogo: tarjetas de producto, colección destacada, categorías y la página
 * de tienda (filtros + orden + grid). Reutilizable entre index y tienda.
 */
import {
  PRODUCTS,
  CATEGORIES,
  getColor,
  productColor,
  colorHasStock,
  countByCategory,
  EMBROIDERY_LABEL,
} from '../data/products.js';
import { $, $$, el, euros, refreshIcons } from './utils.js';
import { applyFilters, facets, SORTS, defaultFilters } from './filters.js';
import { animateIn, refreshScroll } from './animations.js';

// Las categorías y los productos se leen en el momento de dibujar, porque el
// catálogo puede venir del gestor de contenido (ver setCatalog en products.js).
const shopCategoryIds = () => CATEGORIES.map((c) => c.id);
export const shopCategories = () => CATEGORIES;
export const shopProducts = () => PRODUCTS.filter((p) => shopCategoryIds().includes(p.category));

// Productos destacados para la home: los marcados desde el panel y, si no hay
// ninguno marcado, los cuatro primeros del catálogo.
const FALLBACK_FEATURED_IDS = ['camiseta-essential', 'sudadera-crew', 'gorra', 'tote-bag'];
function featuredProducts() {
  const marked = PRODUCTS.filter((p) => p.isFeatured);
  if (marked.length) return marked;
  const byId = FALLBACK_FEATURED_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  return byId.length ? byId : PRODUCTS.slice(0, 4);
}
const productHref = (id) => `producto.html?id=${encodeURIComponent(id)}`;
export const categoryHref = (id) => `tienda.html?categoria=${id}`;

// ---------------------------------------------------------------------------
// TARJETA DE PRODUCTO
// ---------------------------------------------------------------------------
export function renderProductCard(product, { featured = false } = {}) {
  const selected = { colorId: product.colors[0].id };
  const mainSrc = productColor(product, selected.colorId).image;
  const hoverSrc = productColor(product, selected.colorId).hover;

  const img = el('img', { class: 'card__img', src: mainSrc, alt: product.name, loading: 'lazy', decoding: 'async', width: '600', height: '750' });
  const imgHover = el('img', { class: 'card__img card__img--hover', src: hoverSrc, alt: '', loading: 'lazy', decoding: 'async', 'aria-hidden': 'true' });

  const imageLink = el('a', {
    class: 'card__image-link',
    href: productHref(product.id),
    'aria-label': `Ver ${product.name}`,
  }, [img, imgHover]);

  const quickBtn = el('a', {
    class: 'card__quick btn btn--light btn--sm',
    href: productHref(product.id),
  }, [el('i', { 'data-lucide': 'eye' }), 'Ver producto']);

  const media = el('div', { class: 'card__media' }, [imageLink, quickBtn]);
  if (product.isNew) media.prepend(el('span', { class: 'card__badge', text: 'Novedad' }));

  // Mini swatches (cambian la imagen de la tarjeta)
  const swatches = el('div', { class: 'card__swatches', role: 'group', 'aria-label': `Colores de ${product.name}` }, product.colors.map((c) => {
    const col = getColor(c.id);
    const out = !colorHasStock(product, c.id);
    return el('button', {
      class: 'swatch swatch--sm' + (selected.colorId === c.id ? ' is-active' : '') + (out ? ' is-out' : ''),
      type: 'button',
      style: `--swatch:${col.hex}`,
      'aria-label': col.name,
      title: col.name,
      onClick: (e) => {
        e.preventDefault();
        selected.colorId = c.id;
        img.src = productColor(product, c.id).image;
        imgHover.src = productColor(product, c.id).hover;
        $$('.swatch', swatches).forEach((s) => s.classList.remove('is-active'));
        e.currentTarget.classList.add('is-active');
      },
    });
  }));

  const body = el('div', { class: 'card__body' }, [
    el('p', { class: 'card__cat', text: CATEGORIES.find((c) => c.id === product.category)?.label || product.category }),
    el('h3', { class: 'card__name' }, [
      el('a', { class: 'card__name-btn', href: productHref(product.id), text: product.name }),
    ]),
    el('p', { class: 'card__embroidery', text: EMBROIDERY_LABEL }),
    swatches,
    el('div', { class: 'card__bottom' }, [
      el('span', { class: 'card__price', text: euros(product.price) }),
    ]),
  ]);

  return el('article', { class: 'card' + (featured ? ' card--featured' : ''), 'data-product-id': product.id }, [media, body]);
}

// ---------------------------------------------------------------------------
// HOME: categorías + destacados
// ---------------------------------------------------------------------------
export function mountHomeCollections() {
  const host = $('[data-categories]');
  if (!host) return;
  const cats = shopCategories();
  host.innerHTML = '';
  cats.forEach((c) => {
    const n = countByCategory(c.id);
    host.appendChild(el('a', { class: 'cat-card', href: categoryHref(c.id) }, [
      el('div', { class: 'cat-card__media' }, [
        el('img', { src: c.image, alt: c.label, loading: 'lazy', decoding: 'async' }),
      ]),
      el('div', { class: 'cat-card__body' }, [
        el('h3', { class: 'cat-card__title', text: c.label }),
        el('span', { class: 'cat-card__count', text: `${n} ${n === 1 ? 'modelo' : 'modelos'}` }),
        el('span', { class: 'cat-card__cta' }, [el('span', { text: 'Ver colección' }), el('i', { 'data-lucide': 'arrow-right' })]),
      ]),
    ]));
  });
  refreshIcons();
}

export function mountFeatured() {
  const host = $('[data-featured]');
  if (!host) return;
  const list = featuredProducts();
  host.innerHTML = '';
  list.forEach((p) => host.appendChild(renderProductCard(p, { featured: true })));
  refreshIcons();
}

// ---------------------------------------------------------------------------
// TIENDA: filtros + orden + grid
// ---------------------------------------------------------------------------
export function mountShop() {
  const gridHost = $('[data-product-grid]');
  if (!gridHost) return;

  const countHost = $('[data-shop-count]');
  const emptyHost = $('[data-shop-empty]');
  const titleHost = $('[data-shop-title]');
  const state = { ...defaultFilters };

  // Categoría inicial desde la URL (?categoria=camisetas, con fallback ?cat=)
  const params = new URLSearchParams(location.search);
  let cat = params.get('categoria') || params.get('cat');
  // Hoodies ya no existe: redirigir a la tienda completa.
  if (cat === 'hoodies' || cat === 'hoodie') {
    history.replaceState({}, '', 'tienda.html');
    cat = null;
  }
  if (cat && shopCategoryIds().includes(cat)) state.category = cat;
  // ?sort=new desde "Novedades"
  const sortParam = params.get('sort');
  if (sortParam && SORTS[sortParam]) state.sort = sortParam;

  function updateHeading() {
    if (!titleHost) return;
    const c = shopCategories().find((x) => x.id === state.category);
    titleHost.textContent = c ? c.label : 'Colección';
  }

  // Refleja la categoría en la URL sin recargar.
  function pushCategoryUrl() {
    const url = state.category === 'all' ? 'tienda.html' : `tienda.html?categoria=${state.category}`;
    history.pushState({ category: state.category }, '', url);
  }

  function setCategory(catId, { push = true } = {}) {
    state.category = catId;
    syncCatChips();
    updateHeading();
    if (push) pushCategoryUrl();
    renderGrid();
    const top = document.querySelector('.shop');
    if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderGrid() {
    const list = applyFilters(shopProducts(), state);
    gridHost.innerHTML = '';
    list.forEach((p) => gridHost.appendChild(renderProductCard(p)));
    if (countHost) countHost.textContent = `${list.length} ${list.length === 1 ? 'prenda' : 'prendas'}`;
    if (emptyHost) emptyHost.hidden = list.length > 0;
    const applyBtn = $('[data-filters-apply]');
    if (applyBtn) applyBtn.textContent = `Ver ${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;
    refreshIcons();
    animateIn(Array.from(gridHost.children));
    refreshScroll();
  }

  function syncCatChips() {
    $$('[data-cat]').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === state.category));
  }

  function renderFilters() {
    const host = $('[data-filter-groups]') || $('[data-filters]');
    if (!host) return;
    const fac = facets(shopProducts());

    const catGroup = el('div', { class: 'filter-group' }, [
      el('h3', { class: 'filter-group__title', text: 'Categoría' }),
      el('div', { class: 'filter-cats' },
        [{ id: 'all', label: 'Todo' }, ...shopCategories()].map((c) =>
          el('button', {
            class: 'filter-chip' + (state.category === c.id ? ' is-active' : ''),
            type: 'button', 'data-cat': c.id, text: c.label,
            'aria-pressed': state.category === c.id ? 'true' : 'false',
            onClick: () => setCategory(c.id),
          })
        )
      ),
    ]);

    const colorGroup = el('div', { class: 'filter-group' }, [
      el('h3', { class: 'filter-group__title', text: 'Color' }),
      el('div', { class: 'filter-colors' }, fac.colors.map((cid) => {
        const col = getColor(cid);
        return el('button', {
          class: 'swatch swatch--sm', type: 'button', style: `--swatch:${col.hex}`,
          'aria-pressed': 'false', 'aria-label': col.name, title: col.name,
          onClick: (e) => {
            const active = e.currentTarget.classList.toggle('is-active');
            e.currentTarget.setAttribute('aria-pressed', active ? 'true' : 'false');
            state.colors = active ? [...state.colors, cid] : state.colors.filter((x) => x !== cid);
            renderGrid();
          },
        });
      })),
    ]);

    const sizeGroup = el('div', { class: 'filter-group' }, [
      el('h3', { class: 'filter-group__title', text: 'Talla' }),
      el('div', { class: 'filter-sizes' }, fac.sizes.map((s) =>
        el('button', {
          class: 'size-btn size-btn--sm', type: 'button', text: s, 'aria-pressed': 'false',
          onClick: (e) => {
            const active = e.currentTarget.classList.toggle('is-active');
            e.currentTarget.setAttribute('aria-pressed', active ? 'true' : 'false');
            state.sizes = active ? [...state.sizes, s] : state.sizes.filter((x) => x !== s);
            renderGrid();
          },
        })
      )),
    ]);

    const priceVal = el('span', { class: 'filter-price__val', text: 'Cualquiera' });
    const priceInput = el('input', {
      type: 'range', min: '19', max: '79', step: '10', value: '79',
      'aria-label': 'Precio máximo',
      onInput: (e) => {
        const v = Number(e.target.value);
        state.maxPrice = v >= 79 ? null : v;
        priceVal.textContent = state.maxPrice ? `Hasta ${euros(v)}` : 'Cualquiera';
        renderGrid();
      },
    });
    const priceGroup = el('div', { class: 'filter-group' }, [
      el('h3', { class: 'filter-group__title', text: 'Precio máximo' }),
      el('div', { class: 'filter-price' }, [priceInput, priceVal]),
    ]);

    const stockGroup = el('div', { class: 'filter-group' }, [
      el('label', { class: 'checkbox' }, [
        el('input', { type: 'checkbox', onChange: (e) => { state.inStockOnly = e.target.checked; renderGrid(); } }),
        el('span', { text: 'Solo disponibles' }),
      ]),
    ]);

    const clearBtn = el('button', {
      class: 'btn btn--ghost btn--sm filter-clear', type: 'button', text: 'Limpiar',
      onClick: clearFilters,
    });

    host.innerHTML = '';
    host.append(catGroup, colorGroup, sizeGroup, priceGroup, stockGroup, clearBtn);
    refreshIcons();
  }

  function clearFilters() {
    Object.assign(state, { ...defaultFilters, sort: state.sort });
    renderFilters();
    const sort = $('[data-sort]');
    if (sort) sort.value = state.sort;
    renderGrid();
  }

  function renderSort() {
    const sel = $('[data-sort]');
    if (!sel) return;
    sel.innerHTML = '';
    Object.entries(SORTS).forEach(([k, label]) => sel.appendChild(el('option', { value: k, text: label })));
    sel.value = state.sort;
    sel.addEventListener('change', () => { state.sort = sel.value; renderGrid(); });
  }

  // Drawer de filtros en móvil
  function wireFilterDrawer() {
    const panel = $('[data-filters]');
    const toggle = $('[data-filter-toggle]');
    const overlay = $('[data-filters-overlay]');
    if (!panel || !toggle) return;
    const open = () => {
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (overlay) overlay.hidden = false;
      document.body.classList.add('no-scroll');
      const close = $('[data-filters-close]', panel);
      if (close) close.focus();
    };
    const close = () => {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (overlay) overlay.hidden = true;
      document.body.classList.remove('no-scroll');
    };
    toggle.addEventListener('click', open);
    if (overlay) overlay.addEventListener('click', close);
    const closeBtn = $('[data-filters-close]');
    if (closeBtn) closeBtn.addEventListener('click', close);
    const applyBtn = $('[data-filters-apply]');
    if (applyBtn) applyBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    panel._closeFilters = close;
  }

  renderSort();
  renderFilters();
  wireFilterDrawer();
  updateHeading();
  renderGrid();

  // Atrás/adelante del navegador re-aplica la categoría de la URL.
  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(location.search);
    const c = p.get('categoria') || 'all';
    setCategory(shopCategoryIds().includes(c) ? c : 'all', { push: false });
  });

  const clearEmpty = $('[data-clear-filters]');
  if (clearEmpty) clearEmpty.addEventListener('click', clearFilters);
}

// ---------------------------------------------------------------------------
// BÚSQUEDA (datos)
// ---------------------------------------------------------------------------
export function searchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return shopProducts().filter((p) => `${p.name} ${p.shortDesc} ${p.category}`.toLowerCase().includes(q));
}
