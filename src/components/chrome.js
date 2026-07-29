/**
 * Chrome compartido por todas las páginas: header con mega menú accesible
 * (patrón disclosure), footer, cesta, búsqueda, banner de cookies,
 * progreso de scroll y botón "volver arriba".
 *
 * Se inyecta por JS para mantener una sola fuente de verdad del marcado.
 */
import { $, $$, el, euros, on, toast, refreshIcons } from '../modules/utils.js';
import * as cart from '../modules/cart.js';
import * as auth from '../modules/auth.js';
import {
  PRODUCTS,
  GIFT_BOX_ID,
  GIFT_MESSAGE_SUGGESTION,
  BRAND_SLOGAN,
  getColor,
} from '../data/products.js';
import { shopCategories, searchProducts, categoryHref } from '../modules/catalog.js';
import { settings, resolveImage } from '../lib/content.js';
import {
  openCheckout, openAuth, openAccount, openSizeGuide,
} from '../modules/modals.js';

import logoBlanco from '../assets/logo/logo-blanco.png';

// Enlaces del menú por defecto. Se pueden cambiar, ordenar y ocultar desde
// "Configuración" del panel; entonces llegan por settings('nav', 'links').
const DEFAULT_NAV_LINKS = [
  { label: 'Historia', href: 'historia.html', visible: true, mega: false },
  { label: 'Contacto', href: 'contacto.html', visible: true, mega: false },
];
const productHref = (id) => `producto.html?id=${encodeURIComponent(id)}`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

/** Enlaces del menú principal, sin el de Tienda (que lleva el mega menú). */
function navLinks() {
  const stored = settings('nav', 'links', null);
  if (!Array.isArray(stored) || !stored.length) return DEFAULT_NAV_LINKS;
  return stored.filter((l) => l && l.visible !== false && !l.mega);
}

/** El enlace de Tienda, que abre el mega menú. */
function shopLink() {
  const stored = settings('nav', 'links', null);
  const found = Array.isArray(stored) ? stored.find((l) => l && l.mega) : null;
  return found || { label: 'Tienda', href: 'tienda.html' };
}

// ---------------------------------------------------------------------------
// MARKUP
// ---------------------------------------------------------------------------
function headerHTML() {
  const megaCats = shopCategories().map((c) =>
    `<a class="mega__item" href="${categoryHref(c.id)}">
       <img src="${esc(c.image)}" alt="" loading="lazy" decoding="async" />
       <span>${esc(c.label)}</span>
     </a>`
  ).join('');

  const navLinksHTML = navLinks()
    .map((l) => `<li><a class="site-nav__link" href="${esc(l.href)}">${esc(l.label)}</a></li>`)
    .join('');

  const shop = shopLink();
  const brandName = settings('brand', 'name', 'Juntos Siempre');
  const logo = resolveImage(settings('brand', 'logo', '')) || logoBlanco;

  const megaExtra = (settings('nav', 'mega_links', null) || [
    { label: 'Novedades', href: 'tienda.html?sort=new' },
    { label: 'Ver todo', href: 'tienda.html' },
  ]).map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('');

  return `
  <div class="site-header__inner">
    <button class="site-header__burger" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Abrir menú">
      <i data-lucide="menu"></i>
    </button>

    <a class="site-header__logo" href="index.html" aria-label="${esc(brandName)} — inicio">
      <img src="${esc(logo)}" alt="${esc(brandName)}" width="1570" height="664" />
    </a>

    <nav class="site-nav" id="site-nav" data-nav aria-label="Navegación principal">
      <div class="site-nav__head">
        <span class="site-nav__brand">${esc(brandName)}</span>
        <button class="site-nav__close icon-btn" type="button" data-nav-close aria-label="Cerrar menú"><i data-lucide="x"></i></button>
      </div>
      <ul class="site-nav__list">
        <li class="has-mega" data-mega-wrap>
          <span class="site-nav__mega-trigger">
            <a class="site-nav__link" href="${esc(shop.href)}">${esc(shop.label)}</a>
            <button class="site-nav__chevron" type="button" data-mega-toggle aria-expanded="false" aria-controls="mega-tienda" aria-label="Abrir menú de ${esc(shop.label)}">
              <i data-lucide="chevron-down" aria-hidden="true"></i>
            </button>
          </span>
          <div class="mega" id="mega-tienda" data-mega hidden>
            <div class="mega__grid">${megaCats}</div>
            <div class="mega__links">${megaExtra}</div>
          </div>
        </li>
        ${navLinksHTML}
      </ul>
    </nav>

    <div class="site-header__actions">
      <button class="icon-btn" type="button" aria-label="Buscar" data-open-search><i data-lucide="search"></i></button>
      <button class="icon-btn" type="button" aria-label="Cuenta" data-open-account>
        <i data-lucide="user"></i><span class="header__account-name" data-account-name hidden></span>
      </button>
      <button class="icon-btn" type="button" aria-label="Cesta" data-open-cart>
        <i data-lucide="shopping-bag"></i><span class="badge" data-cart-count hidden>0</span>
      </button>
    </div>
  </div>`;
}

const DEFAULT_BRAND_LINKS = [
  { label: 'Historia', href: 'historia.html' },
  { label: 'Compromiso', href: 'impacto.html' },
  { label: 'Contacto', href: 'contacto.html' },
  { label: 'Regalar', href: 'index.html#regalo' },
];
const DEFAULT_HELP_LINKS = [
  { label: 'Guía de tallas', href: 'guia-tallas.html' },
  { label: 'Envíos y devoluciones', href: 'envios-devoluciones.html' },
  { label: 'Privacidad', href: 'politica-privacidad.html' },
  { label: 'Términos', href: 'terminos-condiciones.html' },
  { label: 'Cookies', href: 'cookies.html' },
];

const linkList = (items) =>
  items.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('');

function footerHTML() {
  const shopLinks = shopCategories()
    .map((c) => `<li><a href="${categoryHref(c.id)}">${esc(c.label)}</a></li>`)
    .join('');

  const brandName = settings('brand', 'name', 'Juntos Siempre');
  const logo = resolveImage(settings('brand', 'logo', '')) || logoBlanco;
  const slogan = settings('footer', 'slogan', BRAND_SLOGAN);
  const note = settings('footer', 'note', 'Web de demostración · sin pagos reales');
  const copyright = settings('footer', 'copyright', brandName);
  const brandLinks = settings('footer', 'brand_links', null) || DEFAULT_BRAND_LINKS;
  const helpLinks = settings('footer', 'help_links', null) || DEFAULT_HELP_LINKS;

  const social = settings('social', null, {}) || {};
  const socialItems = [
    ['instagram', 'Instagram', social.instagram],
    ['tiktok', 'TikTok', social.tiktok],
    ['facebook', 'Facebook', social.facebook],
  ].filter(([, , href]) => href);
  const socialHTML = socialItems.length
    ? `<div class="footer__social">${socialItems
        .map(
          ([key, label, href]) =>
            `<a href="${esc(href)}" aria-label="${esc(label)}" rel="noopener noreferrer" target="_blank" data-social="${key}">${esc(label)}</a>`
        )
        .join('')}</div>`
    : '';
  const emailHTML = social.email
    ? `<p class="footer__email"><a href="mailto:${esc(social.email)}">${esc(social.email)}</a></p>`
    : '';

  return `
  <div class="footer__inner">
    <div class="footer__brand">
      <img src="${esc(logo)}" alt="${esc(brandName)}" class="footer__logo" width="1570" height="664" />
      <p class="footer__slogan">${esc(slogan)}</p>
      ${emailHTML}
      ${socialHTML}
    </div>
    <nav class="footer__col" aria-label="${esc(settings('footer', 'col_shop_title', 'Tienda'))}">
      <h2>${esc(settings('footer', 'col_shop_title', 'Tienda'))}</h2>
      <ul><li><a href="tienda.html">Ver todo</a></li>${shopLinks}</ul>
    </nav>
    <nav class="footer__col" aria-label="${esc(settings('footer', 'col_brand_title', 'Marca'))}">
      <h2>${esc(settings('footer', 'col_brand_title', 'Marca'))}</h2>
      <ul>${linkList(brandLinks)}</ul>
    </nav>
    <nav class="footer__col" aria-label="${esc(settings('footer', 'col_help_title', 'Ayuda'))}">
      <h2>${esc(settings('footer', 'col_help_title', 'Ayuda'))}</h2>
      <ul>${linkList(helpLinks)}</ul>
    </nav>
  </div>
  <div class="footer__bottom">
    <p>© <span data-year></span> ${esc(copyright)}</p>
    <p class="footer__demo">${esc(note)}</p>
  </div>`;
}

function overlaysHTML() {
  return `
  <div class="scroll-progress" aria-hidden="true"><span data-scroll-bar></span></div>

  <div class="drawer-overlay" data-cart-overlay hidden></div>
  <aside class="drawer drawer--cart" data-cart-drawer aria-hidden="true" aria-label="Cesta" role="dialog" aria-modal="true">
    <div class="drawer__head">
      <h2 class="drawer__title">Cesta</h2>
      <button class="icon-btn" type="button" aria-label="Cerrar cesta" data-close-cart><i data-lucide="x"></i></button>
    </div>
    <div class="drawer__body" data-cart-body></div>
    <div class="drawer__foot" data-cart-foot></div>
  </aside>

  <div class="search-overlay" data-search-overlay aria-hidden="true" role="dialog" aria-modal="true" aria-label="Buscar">
    <div class="search-overlay__inner">
      <div class="search-overlay__bar">
        <i data-lucide="search"></i>
        <input type="search" placeholder="Buscar prendas…" data-search-input aria-label="Buscar prendas" />
        <button class="icon-btn" type="button" aria-label="Cerrar búsqueda" data-close-search><i data-lucide="x"></i></button>
      </div>
      <div class="search-overlay__results" data-search-results aria-live="polite"></div>
    </div>
  </div>

  <button class="back-to-top" type="button" aria-label="Volver arriba" data-back-to-top><i data-lucide="arrow-up"></i></button>`;
}

// ---------------------------------------------------------------------------
// MOUNT
// ---------------------------------------------------------------------------
export function mountChrome() {
  const headerHost = $('[data-site-header]');
  if (headerHost) {
    headerHost.classList.add('site-header');
    headerHost.setAttribute('data-header', '');
    headerHost.innerHTML = headerHTML();
  }
  const footerHost = $('[data-site-footer]');
  if (footerHost) {
    footerHost.classList.add('footer');
    footerHost.innerHTML = footerHTML();
  }
  const overlays = document.createElement('div');
  overlays.innerHTML = overlaysHTML();
  while (overlays.firstChild) document.body.appendChild(overlays.firstChild);

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  refreshIcons();
}

// ---------------------------------------------------------------------------
// NAV + MEGA MENÚ
// ---------------------------------------------------------------------------
function initNav() {
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const close = $('[data-nav-close]');
  const openNav = () => { nav.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); document.body.classList.add('no-scroll', 'menu-open'); close?.focus(); };
  const closeNav = () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('no-scroll', 'menu-open'); };
  toggle?.addEventListener('click', openNav);
  close?.addEventListener('click', () => { closeNav(); toggle?.focus(); });
  $$('.site-nav__list a').forEach((a) => a.addEventListener('click', closeNav));

  // Mega menú (disclosure)
  const megaWrap = $('[data-mega-wrap]');
  const megaToggle = $('[data-mega-toggle]');
  const mega = $('[data-mega]');
  if (megaToggle && mega) {
    let megaTimer;
    const openMega = () => { clearTimeout(megaTimer); mega.hidden = false; megaToggle.setAttribute('aria-expanded', 'true'); megaWrap.classList.add('is-open'); };
    const closeMega = () => { clearTimeout(megaTimer); mega.hidden = true; megaToggle.setAttribute('aria-expanded', 'false'); megaWrap.classList.remove('is-open'); };
    // Cierre con retardo: tolera el hueco entre el botón y el panel al desplazar el ratón
    const scheduleClose = () => { clearTimeout(megaTimer); megaTimer = setTimeout(closeMega, 220); };
    megaToggle.addEventListener('click', () => (mega.hidden ? openMega() : closeMega()));
    // Hover en escritorio (sobre el grupo y sobre el propio panel)
    if (window.matchMedia('(pointer:fine)').matches) {
      megaWrap.addEventListener('mouseenter', openMega);
      megaWrap.addEventListener('mouseleave', scheduleClose);
      mega.addEventListener('mouseenter', openMega);
      mega.addEventListener('mouseleave', scheduleClose);
    }
    // Cerrar al pulsar fuera o con Escape
    document.addEventListener('click', (e) => { if (!megaWrap.contains(e.target)) closeMega(); });
    megaToggle.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMega(); } });
    mega.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMega(); megaToggle.focus(); } });
  }

  return { closeNav };
}

// ---------------------------------------------------------------------------
// SCROLL (header sólido + progreso + back-to-top)
// ---------------------------------------------------------------------------
function initScroll() {
  const header = $('[data-header]');
  const hasHero = document.body.hasAttribute('data-hero');
  const bar = $('[data-scroll-bar]');
  const backTop = $('[data-back-to-top]');
  const onScroll = () => {
    const solid = !hasHero || window.scrollY > Math.min(window.innerHeight * 0.7, 480);
    header?.classList.toggle('is-solid', solid);
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    backTop?.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  onScroll();
}

// ---------------------------------------------------------------------------
// CESTA
// ---------------------------------------------------------------------------
function openCartDrawer() {
  renderCart();
  const d = $('[data-cart-drawer]');
  d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
  $('[data-cart-overlay]').hidden = false;
  document.body.classList.add('no-scroll');
  $('[data-close-cart]')?.focus();
}
function closeCartDrawer() {
  const d = $('[data-cart-drawer]');
  d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true');
  $('[data-cart-overlay]').hidden = true;
  document.body.classList.remove('no-scroll');
}

function renderCart() {
  const body = $('[data-cart-body]');
  const foot = $('[data-cart-foot]');
  const items = cart.getItems();
  body.innerHTML = '';

  if (!items.length) {
    body.appendChild(el('div', { class: 'empty-state' }, [
      el('i', { 'data-lucide': 'shopping-bag' }),
      el('p', { text: 'Tu cesta está vacía.' }),
      el('a', { class: 'btn btn--primary', href: 'tienda.html', text: 'Ver la colección' }),
    ]));
    foot.innerHTML = '';
    refreshIcons();
    return;
  }

  items.forEach((it) => body.appendChild(renderCartLine(it)));

  const meta = cart.getMeta();
  const giftBlock = el('div', { class: 'cart-gift' }, [
    el('label', { class: 'checkbox' }, [
      el('input', { type: 'checkbox', ...(meta.isGift ? { checked: true } : {}), onChange: (e) => { cart.setMeta({ isGift: e.target.checked }); renderCart(); } }),
      el('span', { text: 'Es para regalo' }),
    ]),
  ]);
  if (meta.isGift) {
    const ta = el('textarea', { rows: '2', placeholder: GIFT_MESSAGE_SUGGESTION, onChange: (e) => cart.setMeta({ giftMessage: e.target.value }) }, [meta.giftMessage || '']);
    giftBlock.append(
      el('label', { class: 'checkbox' }, [
        el('input', { type: 'checkbox', ...(meta.giftBox ? { checked: true } : {}), onChange: (e) => { cart.setMeta({ giftBox: e.target.checked }); renderCart(); } }),
        el('span', { html: 'Añadir caja regalo <strong>(+9 € demo)</strong>' }),
      ]),
      el('label', { class: 'field field--sm' }, [el('span', { text: 'Mensaje en la tarjeta' }), ta]),
      el('button', { class: 'link-btn', type: 'button', text: 'Usar mensaje sugerido', onClick: () => { ta.value = GIFT_MESSAGE_SUGGESTION; cart.setMeta({ giftMessage: GIFT_MESSAGE_SUGGESTION }); } })
    );
  }
  body.appendChild(giftBlock);

  const promoState = cart.getMeta().promo;
  const promoInput = el('input', { type: 'text', placeholder: 'Código promocional', value: promoState || '', 'aria-label': 'Código promocional' });
  const promoMsg = el('p', { class: 'cart-promo__msg' });
  if (promoState) { promoMsg.textContent = `Código ${promoState} aplicado`; promoMsg.classList.add('is-ok'); }
  body.appendChild(el('div', { class: 'cart-promo' }, [
    el('div', { class: 'cart-promo__row' }, [
      promoInput,
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Aplicar', onClick: () => {
        const res = cart.applyPromo(promoInput.value);
        toast(res.ok ? `Código ${res.promo.code} aplicado` : 'Código no válido', { type: res.ok ? 'success' : 'error', icon: 'tag' });
        renderCart();
      } }),
    ]),
    promoMsg,
    el('p', { class: 'cart-promo__hint', text: 'Demostración: prueba JUNTOS10, SIEMPRE o ABRAZO5.' }),
  ]));

  foot.innerHTML = '';
  const rows = [['Subtotal', euros(cart.subtotal())]];
  if (cart.discount() > 0) rows.push(['Descuento', '−' + euros(cart.discount())]);
  if (cart.giftBoxCost() > 0) rows.push(['Caja regalo', euros(cart.giftBoxCost())]);
  foot.append(
    ...rows.map(([k, v]) => el('div', { class: 'cart-total__row' }, [el('span', { text: k }), el('span', { text: v })])),
    el('div', { class: 'cart-total__row cart-total__row--grand' }, [el('span', { text: 'Total (demo)' }), el('span', { text: euros(cart.total()) })]),
    el('button', { class: 'btn btn--primary btn--full', type: 'button', text: 'Finalizar compra', onClick: () => { closeCartDrawer(); openCheckout(); } }),
    el('button', { class: 'link-btn cart-clear', type: 'button', text: 'Vaciar cesta', onClick: () => { cart.clearCart(); renderCart(); toast('Cesta vaciada', { type: 'info' }); } })
  );
  refreshIcons();
}

function renderCartLine(it) {
  const product = it.product;
  const colorSelect = product.colors.length > 1
    ? el('select', { class: 'cart-line__select', 'aria-label': 'Color', onChange: (e) => { cart.updateVariant(it.key, { colorId: e.target.value }); renderCart(); } },
        product.colors.map((c) => el('option', { value: c.id, text: getColor(c.id).name, ...(c.id === it.colorId ? { selected: true } : {}) })))
    : el('span', { class: 'cart-line__meta', text: getColor(it.colorId).name });
  const sizeSelect = product.requiresSize
    ? el('select', { class: 'cart-line__select', 'aria-label': 'Talla', onChange: (e) => { cart.updateVariant(it.key, { size: e.target.value }); renderCart(); } },
        product.sizes.map((s) => el('option', { value: s, text: s, ...(s === it.size ? { selected: true } : {}) })))
    : el('span', { class: 'cart-line__meta', text: it.size === 'U' ? 'Única' : it.size });

  return el('div', { class: 'cart-line' }, [
    el('img', { class: 'cart-line__img', src: it.image, alt: product.name, loading: 'lazy' }),
    el('div', { class: 'cart-line__info' }, [
      el('div', { class: 'cart-line__top' }, [
        el('h3', { class: 'cart-line__name', text: product.name }),
        el('button', { class: 'icon-btn cart-line__remove', type: 'button', 'aria-label': `Eliminar ${product.name}`, onClick: () => { cart.removeItem(it.key); renderCart(); } }, [el('i', { 'data-lucide': 'trash-2' })]),
      ]),
      el('div', { class: 'cart-line__variants' }, [colorSelect, sizeSelect]),
      el('div', { class: 'cart-line__bottom' }, [
        el('div', { class: 'qty qty--sm', role: 'group', 'aria-label': 'Cantidad' }, [
          el('button', { class: 'qty__btn', type: 'button', 'aria-label': 'Quitar uno', onClick: () => { cart.updateQty(it.key, it.qty - 1); renderCart(); } }, [el('i', { 'data-lucide': 'minus' })]),
          el('span', { class: 'qty__val', text: String(it.qty) }),
          el('button', { class: 'qty__btn', type: 'button', 'aria-label': 'Añadir uno', onClick: () => { cart.updateQty(it.key, it.qty + 1); renderCart(); } }, [el('i', { 'data-lucide': 'plus' })]),
        ]),
        el('span', { class: 'cart-line__price', text: euros(it.lineTotal) }),
      ]),
    ]),
  ]);
}

// ---------------------------------------------------------------------------
// BÚSQUEDA (con debounce)
// ---------------------------------------------------------------------------
let searchTimer;
function openSearch() {
  const ov = $('[data-search-overlay]');
  ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  setTimeout(() => $('[data-search-input]')?.focus(), 50);
}
function closeSearch() {
  const ov = $('[data-search-overlay]');
  ov.classList.remove('is-open'); ov.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}
function renderSearch(q) {
  const host = $('[data-search-results]');
  host.innerHTML = '';
  if (!q.trim()) return;
  const results = searchProducts(q);
  if (!results.length) {
    host.appendChild(el('p', { class: 'search-overlay__empty', text: `Sin resultados para “${q}”.` }));
    return;
  }
  results.forEach((p) => host.appendChild(el('a', {
    class: 'search-result',
    href: productHref(p.id),
    onClick: closeSearch,
  }, [
    el('img', { src: p.colors[0].image, alt: '', loading: 'lazy' }),
    el('span', { class: 'search-result__name', text: p.name }),
    el('span', { class: 'search-result__cat', text: p.category }),
    el('span', { class: 'search-result__price', text: euros(p.price) }),
  ])));
}

// ---------------------------------------------------------------------------
// BADGES + CUENTA
// ---------------------------------------------------------------------------
function updateBadges() {
  const cc = cart.count();
  const cb = $('[data-cart-count]');
  if (cb) { cb.textContent = cc; cb.hidden = cc === 0; }
}
function updateAccount() {
  const user = auth.currentUser();
  const nameEl = $('[data-account-name]');
  if (!nameEl) return;
  if (user) { nameEl.textContent = user.name.split(' ')[0]; nameEl.hidden = false; }
  else { nameEl.hidden = true; }
}

// ---------------------------------------------------------------------------
// REGALO (flujo guiado desde la home)
// ---------------------------------------------------------------------------
function wireGift() {
  const btn = $('[data-create-gift]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const giftBox = PRODUCTS.find((p) => p.id === GIFT_BOX_ID);
    const message = ($('[data-gift-message]')?.value || GIFT_MESSAGE_SUGGESTION).trim() || GIFT_MESSAGE_SUGGESTION;
    if (giftBox) cart.addItem({ productId: giftBox.id, colorId: giftBox.colors[0].id, size: 'U', qty: 1 });
    cart.setMeta({ isGift: true, giftMessage: message });
    toast('Regalo iniciado: elige tu prenda y personalízalo.', { type: 'success', icon: 'gift' });
    openCartDrawer();
  });
}

// ---------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------
export function initChrome() {
  const { closeNav } = initNav();
  initScroll();
  wireGift();

  const bind = (sel, ev, fn) => { const n = $(sel); if (n) n.addEventListener(ev, fn); };
  bind('[data-open-search]', 'click', openSearch);
  bind('[data-close-search]', 'click', closeSearch);
  bind('[data-search-input]', 'input', (e) => { clearTimeout(searchTimer); const v = e.target.value; searchTimer = setTimeout(() => renderSearch(v), 180); });
  bind('[data-open-cart]', 'click', openCartDrawer);
  bind('[data-close-cart]', 'click', closeCartDrawer);
  bind('[data-cart-overlay]', 'click', closeCartDrawer);
  bind('[data-open-account]', 'click', () => { if (auth.isLoggedIn()) openAccount(); else openAuth('login'); });
  bind('[data-open-size-guide]', 'click', () => openSizeGuide('apparel'));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeCartDrawer(); closeSearch(); closeNav();
  });

  on('ui:openCart', openCartDrawer);
  on('ui:cartCleared', () => { renderCart(); updateBadges(); });
  cart.onCartChange(updateBadges);
  auth.onAuthChange(updateAccount);

  updateBadges();
  updateAccount();
  refreshIcons();
}
