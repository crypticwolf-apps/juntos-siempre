/**
 * Sistema de modales accesibles + contenidos específicos:
 * vista rápida de producto, guía de tallas, login/registro/recuperar,
 * checkout de demostración, cuenta e informe de impacto.
 *
 * Todos los modales: cierre con Escape, foco atrapado, bloqueo de scroll,
 * cierre al pulsar fuera y devolución del foco al elemento que lo abrió.
 */
import { $, $$, el, emit, refreshIcons, trapFocus, euros, toast } from './utils.js';
import {
  PRODUCTS,
  getProduct,
  getColor,
  productColor,
  isAvailable,
  colorHasStock,
  SIZE_GUIDE,
  SIZE_GUIDE_NOTE,
  EMBROIDERY_LABEL,
  GIFT_MESSAGE_SUGGESTION,
  galleryImage,
} from '../data/products.js';
import { addItem, total, getItems, clearCart, setMeta } from './cart.js';
import * as auth from './auth.js';

let lastFocused = null;
let overlay;
const productHref = (id) => `producto.html?id=${encodeURIComponent(id)}`;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = el('div', { class: 'modal-overlay', 'aria-hidden': 'true' });
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export function openModal(contentNode, { labelledby, size = 'md' } = {}) {
  const ov = ensureOverlay();
  lastFocused = document.activeElement;
  ov.innerHTML = '';
  const dialog = el('div', {
    class: `modal modal--${size}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': labelledby || null,
  });
  const closeBtn = el('button', {
    class: 'modal__close',
    type: 'button',
    'aria-label': 'Cerrar',
    onClick: closeModal,
  }, [el('i', { 'data-lucide': 'x', 'aria-hidden': 'true' })]);
  dialog.append(closeBtn, contentNode);
  ov.appendChild(dialog);
  ov.classList.add('is-open');
  ov.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  refreshIcons();
  // foco inicial
  const focusTarget = $('[autofocus]', dialog) || closeBtn;
  setTimeout(() => focusTarget.focus(), 30);
  ov._keyHandler = (e) => {
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'Tab') trapFocus(dialog, e);
  };
  document.addEventListener('keydown', ov._keyHandler);
  return dialog;
}

export function closeModal() {
  if (!overlay || !overlay.classList.contains('is-open')) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  document.removeEventListener('keydown', overlay._keyHandler);
  setTimeout(() => {
    overlay.innerHTML = '';
  }, 250);
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

// ---------------------------------------------------------------------------
// VISTA RÁPIDA DE PRODUCTO
// ---------------------------------------------------------------------------
export function openQuickView(productId) {
  const product = getProduct(productId);
  if (!product) return;
  const node = renderProductDetail(product, { context: 'modal', titleId: 'qv-title' });
  openModal(node, { labelledby: 'qv-title', size: 'lg' });
}

/** Construye el detalle de producto con galería + variantes. Reutilizable. */
export function renderProductDetail(product, { context = 'modal', titleId = 'qv-title' } = {}) {
  const state = {
    colorId: product.colors[0].id,
    size: product.requiresSize ? null : 'U',
    qty: 1,
    mainIndex: 0,
  };

  const wrap = el('div', { class: 'pd' });

  // --- Galería ---
  const mainImg = el('img', {
    class: 'pd__main-img',
    alt: `${product.name} — ${getColor(state.colorId).name}`,
    src: productColor(product, state.colorId).image,
  });
  const thumbs = el('div', { class: 'pd__thumbs' });
  const gallery = el('div', { class: 'pd__gallery' }, [
    el('div', { class: 'pd__main' }, [mainImg]),
    thumbs,
  ]);

  function renderThumbs() {
    const imgs = productColor(product, state.colorId).gallery.map(galleryImage);
    thumbs.innerHTML = '';
    imgs.forEach((image, i) => {
      const b = el('button', {
        class: 'pd__thumb' + (i === state.mainIndex ? ' is-active' : ''),
        type: 'button',
        'aria-label': `Ver imagen ${i + 1}`,
        'aria-pressed': i === state.mainIndex ? 'true' : 'false',
        onClick: () => {
          state.mainIndex = i;
          mainImg.src = image.src;
          renderThumbs();
        },
      }, [
        el('img', { src: image.src, alt: '', loading: 'lazy' }),
        image.label ? el('span', { text: image.label }) : null,
      ]);
      thumbs.appendChild(b);
    });
  }
  renderThumbs();

  // --- Info ---
  const info = el('div', { class: 'pd__info' });

  const header = el('div', { class: 'pd__header' }, [
    el('div', {}, [
      el('p', { class: 'pd__cat', text: product.category }),
      el('h2', { id: titleId, class: 'pd__title', text: product.name }),
    ]),
  ]);

  const price = el('p', { class: 'pd__price', text: euros(product.price) });
  const desc = el('p', { class: 'pd__desc', text: product.description });
  const embroidery = el('p', { class: 'pd__embroidery' }, [
    el('i', { 'data-lucide': 'heart-handshake', 'aria-hidden': 'true' }),
    el('span', { text: EMBROIDERY_LABEL }),
  ]);

  // --- Color ---
  const colorName = el('span', { class: 'variant__value', text: getColor(state.colorId).name });
  const swatches = el('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Color' });
  function renderSwatches() {
    swatches.innerHTML = '';
    product.colors.forEach((c) => {
      const col = getColor(c.id);
      const disabled = !colorHasStock(product, c.id);
      const b = el('button', {
        class: 'swatch' + (state.colorId === c.id ? ' is-active' : '') + (disabled ? ' is-out' : ''),
        type: 'button',
        role: 'radio',
        'aria-checked': state.colorId === c.id ? 'true' : 'false',
        'aria-label': col.name + (disabled ? ' (agotado)' : ''),
        title: col.name,
        style: `--swatch:${col.hex}`,
        onClick: () => {
          state.colorId = c.id;
          state.mainIndex = 0;
          if (state.size && !isAvailable(product, c.id, state.size)) state.size = null;
          colorName.textContent = col.name;
          mainImg.src = productColor(product, c.id).image;
          mainImg.alt = `${product.name} — ${col.name}`;
          renderSwatches();
          renderSizes();
          renderThumbs();
          updateStock();
        },
      });
      swatches.appendChild(b);
    });
  }
  renderSwatches();

  const colorBlock = el('div', { class: 'variant' }, [
    el('div', { class: 'variant__label' }, [
      el('span', { text: 'Color' }),
      colorName,
    ]),
    swatches,
  ]);

  // --- Tallas ---
  const sizeWrap = el('div', { class: 'sizes' });
  function renderSizes() {
    sizeWrap.innerHTML = '';
    product.sizes.forEach((s) => {
      const out = !isAvailable(product, state.colorId, product.requiresSize ? s : 'U');
      const b = el('button', {
        class: 'size-btn' + (state.size === s ? ' is-active' : '') + (out ? ' is-out' : ''),
        type: 'button',
        disabled: out ? true : null,
        'aria-pressed': state.size === s ? 'true' : 'false',
        text: s,
        onClick: () => {
          state.size = s;
          renderSizes();
          updateStock();
        },
      });
      sizeWrap.appendChild(b);
    });
  }
  let sizeBlock = null;
  if (product.requiresSize) {
    renderSizes();
    const sizeGuideLink = el('button', {
      class: 'link-btn',
      type: 'button',
      onClick: () => openSizeGuide(product.requiresSize && product.category === 'gorras' ? 'cap' : 'apparel'),
    }, [el('i', { 'data-lucide': 'ruler', 'aria-hidden': 'true' }), 'Guía de tallas']);
    sizeBlock = el('div', { class: 'variant' }, [
      el('div', { class: 'variant__label' }, [
        el('span', { text: product.sizeLabel || 'Talla' }),
        sizeGuideLink,
      ]),
      sizeWrap,
      el('p', { class: 'variant__note', text: SIZE_GUIDE_NOTE }),
    ]);
  }

  // --- Stock ---
  const stockLine = el('p', { class: 'pd__stock' });
  function updateStock() {
    const checkSize = product.requiresSize ? state.size : 'U';
    if (product.requiresSize && !state.size) {
      stockLine.className = 'pd__stock';
      stockLine.textContent = 'Selecciona una talla para ver disponibilidad.';
      return;
    }
    const ok = isAvailable(product, state.colorId, checkSize);
    stockLine.className = 'pd__stock ' + (ok ? 'is-ok' : 'is-out');
    stockLine.textContent = ok ? 'En stock · listo para enviar' : 'Agotado en esta combinación';
  }
  updateStock();

  // --- Cantidad + añadir ---
  const qtyVal = el('span', { class: 'qty__val', text: '1', 'aria-live': 'polite' });
  const qty = el('div', { class: 'qty', role: 'group', 'aria-label': 'Cantidad' }, [
    el('button', { class: 'qty__btn', type: 'button', 'aria-label': 'Quitar uno', onClick: () => setQty(state.qty - 1) }, [el('i', { 'data-lucide': 'minus' })]),
    qtyVal,
    el('button', { class: 'qty__btn', type: 'button', 'aria-label': 'Añadir uno', onClick: () => setQty(state.qty + 1) }, [el('i', { 'data-lucide': 'plus' })]),
  ]);
  function setQty(n) {
    state.qty = Math.max(1, Math.min(20, n));
    qtyVal.textContent = state.qty;
  }

  const giftMessage = el('textarea', {
    rows: '3',
    'aria-label': 'Mensaje para la tarjeta de regalo',
    placeholder: 'Escribe unas palabras para la tarjeta…',
  });
  const giftField = el('div', { class: 'pd__gift-field' }, [
    el('span', { class: 'pd__gift-label', text: 'Mensaje para la tarjeta' }),
    giftMessage,
  ]);
  const giftCheck = el('input', {
    type: 'checkbox',
    'aria-controls': 'pd-gift-field',
    onChange: () => {
      giftBlock.classList.toggle('is-on', giftCheck.checked);
      giftCheck.setAttribute('aria-expanded', giftCheck.checked ? 'true' : 'false');
      if (giftCheck.checked) setTimeout(() => giftMessage.focus(), 60);
    },
  });
  giftField.id = 'pd-gift-field';
  const giftBlock = el('div', { class: 'pd__gift' }, [
    el('label', { class: 'checkbox pd__gift-toggle' }, [
      giftCheck,
      el('span', {}, [
        el('span', { class: 'pd__gift-title', text: 'Preparar como regalo' }),
        el('span', { class: 'pd__gift-hint', text: 'Caja y tarjeta personal al finalizar.' }),
      ]),
    ]),
    giftField,
  ]);

  const addBtn = el('button', {
    class: 'btn btn--primary pd__add',
    type: 'button',
    onClick: () => {
      if (product.requiresSize && !state.size) {
        toast('Selecciona una talla', { type: 'error' });
        sizeWrap.classList.add('shake');
        setTimeout(() => sizeWrap.classList.remove('shake'), 500);
        return;
      }
      const checkSize = product.requiresSize ? state.size : 'U';
      if (!isAvailable(product, state.colorId, checkSize)) {
        toast('Esa combinación está agotada', { type: 'error' });
        return;
      }
      addItem({ productId: product.id, colorId: state.colorId, size: checkSize, qty: state.qty });
      if (giftCheck.checked || giftMessage.value.trim()) {
        setMeta({
          isGift: true,
          giftMessage: giftMessage.value.trim() || GIFT_MESSAGE_SUGGESTION,
        });
      }
      toast(`${product.name} añadida a la cesta`, { type: 'success', icon: 'shopping-bag' });
      if (context === 'modal') closeModal();
      emit('ui:openCart');
    },
  }, [el('i', { 'data-lucide': 'shopping-bag', 'aria-hidden': 'true' }), 'Añadir a la cesta']);

  const actions = el('div', { class: 'pd__actions' }, [qty, addBtn]);

  // --- Acordeones de detalle ---
  const details = el('div', { class: 'accordion' }, [
    buildAccordion('Materiales', product.composition),
    buildAccordion('Cuidados', product.care),
    buildAccordion('Compra demo', product.shipping),
  ]);

  info.append(header, price, embroidery, desc, colorBlock);
  if (sizeBlock) info.append(sizeBlock);
  info.append(stockLine, giftBlock, actions, details);

  // --- Relacionados ---
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
  const relatedBlock = related.length
    ? el('div', { class: 'pd__related' }, [
        el('h3', { class: 'pd__related-title', text: 'También para acompañar' }),
        el('div', { class: 'pd__related-grid' }, related.map((p) =>
          context === 'page'
            ? el('a', {
              class: 'pd__related-card',
              href: productHref(p.id),
            }, [
              el('img', { src: p.colors[0].image, alt: p.name, loading: 'lazy' }),
              el('span', { class: 'pd__related-name', text: p.name }),
              el('span', { class: 'pd__related-price', text: euros(p.price) }),
            ])
            : el('button', {
              class: 'pd__related-card',
              type: 'button',
              onClick: () => openQuickView(p.id),
            }, [
            el('img', { src: p.colors[0].image, alt: p.name, loading: 'lazy' }),
            el('span', { class: 'pd__related-name', text: p.name }),
            el('span', { class: 'pd__related-price', text: euros(p.price) }),
          ])
        )),
      ])
    : null;

  wrap.append(gallery, info);
  const container = el('div', { class: 'pd-wrap' }, [wrap]);
  if (relatedBlock) container.append(relatedBlock);
  return container;
}

function buildAccordion(title, content) {
  const body = el('div', { class: 'accordion__body' }, [el('p', { text: content })]);
  const btn = el('button', {
    class: 'accordion__head',
    type: 'button',
    'aria-expanded': 'false',
    onClick: () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      item.classList.toggle('is-open', !open);
    },
  }, [el('span', { text: title }), el('i', { 'data-lucide': 'chevron-down', 'aria-hidden': 'true' })]);
  const item = el('div', { class: 'accordion__item' }, [btn, body]);
  return item;
}

// ---------------------------------------------------------------------------
// GUÍA DE TALLAS
// ---------------------------------------------------------------------------
export function openSizeGuide(type = 'apparel') {
  const guide = SIZE_GUIDE[type] || SIZE_GUIDE.apparel;
  const table = el('table', { class: 'size-table' }, [
    el('thead', {}, [el('tr', {}, guide.headers.map((h) => el('th', { text: h })))]),
    el('tbody', {}, guide.rows.map((r) => el('tr', {}, r.map((c) => el('td', { text: c }))))),
  ]);
  const node = el('div', { class: 'guide' }, [
    el('h2', { id: 'guide-title', class: 'modal__title', text: 'Guía de tallas' }),
    el('p', { class: 'guide__note', text: SIZE_GUIDE_NOTE }),
    table,
    el('p', { class: 'guide__tip', text: 'Medidas orientativas de la prenda en centímetros. Ante la duda entre dos tallas, elige la mayor para un ajuste más holgado.' }),
  ]);
  openModal(node, { labelledby: 'guide-title', size: 'md' });
}

// ---------------------------------------------------------------------------
// AUTENTICACIÓN (login / registro / recuperar)
// ---------------------------------------------------------------------------
export function openAuth(mode = 'login') {
  const node = el('div', { class: 'auth' });
  const demoNote = el('p', { class: 'auth__demo' }, [
    el('i', { 'data-lucide': 'info', 'aria-hidden': 'true' }),
    'Acceso de demostración frontend. No es un sistema de autenticación real; los datos se guardan solo en tu navegador.',
  ]);
  function render(m) {
    node.innerHTML = '';
    node.appendChild(demoNote.cloneNode(true));
    if (m === 'login') node.appendChild(loginForm());
    else if (m === 'register') node.appendChild(registerForm());
    else node.appendChild(recoverForm());
    refreshIcons();
  }
  function field(label, input) {
    const id = input.id;
    return el('label', { class: 'field', for: id }, [el('span', { text: label }), input]);
  }
  function err(form, msg) {
    let box = $('.form-error', form);
    if (!box) {
      box = el('p', { class: 'form-error', role: 'alert' });
      form.prepend(box);
    }
    box.textContent = msg;
  }
  function loginForm() {
    const email = el('input', { id: 'lg-email', type: 'email', required: true, autocomplete: 'email', autofocus: true });
    const pass = el('input', { id: 'lg-pass', type: 'password', required: true, autocomplete: 'current-password' });
    const form = el('form', { class: 'auth__form', novalidate: true }, [
      el('h2', { id: 'auth-title', class: 'modal__title', text: 'Iniciar sesión' }),
      field('Email', email),
      field('Contraseña', pass),
      el('button', { class: 'btn btn--primary btn--full', type: 'submit', text: 'Entrar' }),
      el('div', { class: 'auth__links' }, [
        el('button', { class: 'link-btn', type: 'button', text: 'Crear cuenta', onClick: () => render('register') }),
        el('button', { class: 'link-btn', type: 'button', text: '¿Olvidaste tu contraseña?', onClick: () => render('recover') }),
      ]),
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!email.value || !pass.value) return err(form, 'Completa todos los campos.');
      const res = auth.login({ email: email.value, password: pass.value });
      if (!res.ok) return err(form, res.error);
      toast(`Hola de nuevo, ${res.user.name}`, { type: 'success', icon: 'user' });
      closeModal();
    });
    return form;
  }
  function registerForm() {
    const name = el('input', { id: 'rg-name', type: 'text', required: true, autocomplete: 'name', autofocus: true });
    const email = el('input', { id: 'rg-email', type: 'email', required: true, autocomplete: 'email' });
    const pass = el('input', { id: 'rg-pass', type: 'password', required: true, minlength: 6, autocomplete: 'new-password' });
    const form = el('form', { class: 'auth__form', novalidate: true }, [
      el('h2', { id: 'auth-title', class: 'modal__title', text: 'Crear cuenta' }),
      field('Nombre', name),
      field('Email', email),
      field('Contraseña (mín. 6)', pass),
      el('button', { class: 'btn btn--primary btn--full', type: 'submit', text: 'Crear cuenta' }),
      el('div', { class: 'auth__links' }, [
        el('span', { text: '¿Ya tienes cuenta?' }),
        el('button', { class: 'link-btn', type: 'button', text: 'Inicia sesión', onClick: () => render('login') }),
      ]),
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!name.value.trim()) return err(form, 'Indica tu nombre.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) return err(form, 'Email no válido.');
      if (pass.value.length < 6) return err(form, 'La contraseña debe tener al menos 6 caracteres.');
      const res = auth.register({ name: name.value, email: email.value, password: pass.value });
      if (!res.ok) return err(form, res.error);
      toast(`Bienvenida/o, ${res.user.name}`, { type: 'success', icon: 'user-check' });
      closeModal();
    });
    return form;
  }
  function recoverForm() {
    const email = el('input', { id: 'rc-email', type: 'email', required: true, autocomplete: 'email', autofocus: true });
    const form = el('form', { class: 'auth__form', novalidate: true }, [
      el('h2', { id: 'auth-title', class: 'modal__title', text: 'Recuperar contraseña' }),
      el('p', { class: 'auth__hint', text: 'Te enviaríamos un enlace para restablecerla. (Demostración: no se envía ningún correo real.)' }),
      field('Email', email),
      el('button', { class: 'btn btn--primary btn--full', type: 'submit', text: 'Enviar enlace' }),
      el('div', { class: 'auth__links' }, [
        el('button', { class: 'link-btn', type: 'button', text: 'Volver a iniciar sesión', onClick: () => render('login') }),
      ]),
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) return err(form, 'Email no válido.');
      auth.recover(email.value);
      const done = el('p', { class: 'auth__hint auth__success', text: 'Si ese email tiene cuenta, recibirás instrucciones en breve.' });
      form.replaceWith(done);
    });
    return form;
  }
  render(mode);
  openModal(node, { labelledby: 'auth-title', size: 'sm' });
}

// ---------------------------------------------------------------------------
// CUENTA
// ---------------------------------------------------------------------------
export function openAccount() {
  const user = auth.currentUser();
  if (!user) return openAuth('login');
  const orders = auth.getOrders();
  const node = el('div', { class: 'account' }, [
    el('div', { class: 'account__head' }, [
      el('div', { class: 'account__avatar', text: user.name.charAt(0).toUpperCase() }),
      el('div', {}, [
        el('h2', { id: 'acc-title', class: 'modal__title', text: user.name }),
        el('p', { class: 'account__email', text: user.email }),
      ]),
    ]),
    el('p', { class: 'auth__demo' }, [
      el('i', { 'data-lucide': 'info', 'aria-hidden': 'true' }),
      'Perfil de demostración. Los pedidos mostrados son ejemplos.',
    ]),
    el('h3', { class: 'account__subtitle', text: 'Mis pedidos' }),
    el('div', { class: 'account__orders' }, orders.map((o) =>
      el('div', { class: 'order' }, [
        el('div', { class: 'order__top' }, [
          el('span', { class: 'order__id', text: o.id }),
          el('span', { class: `order__status order__status--${o.status === 'Entregado' ? 'done' : 'transit'}`, text: o.status }),
        ]),
        el('p', { class: 'order__items', text: o.items.join(' · ') }),
        el('div', { class: 'order__bottom' }, [
          el('span', { text: o.date }),
          el('span', { class: 'order__total', text: euros(o.total) }),
        ]),
      ])
    )),
    el('div', { class: 'account__actions' }, [
      el('button', { class: 'btn btn--outline', type: 'button', onClick: () => { auth.logout(); toast('Sesión cerrada', { type: 'info' }); closeModal(); } }, [
        el('i', { 'data-lucide': 'log-out' }), 'Cerrar sesión',
      ]),
    ]),
  ]);
  openModal(node, { labelledby: 'acc-title', size: 'md' });
}

// ---------------------------------------------------------------------------
// CHECKOUT (demostración)
// ---------------------------------------------------------------------------
const CHECKOUT_STEPS = ['Información', 'Envío', 'Pago', 'Confirmación'];

export function openCheckout() {
  const items = getItems();
  if (!items.length) {
    toast('Tu cesta está vacía', { type: 'info' });
    return;
  }

  const data = { name: '', email: '', phone: '', address: '', city: '', zip: '', country: '', ship: 'standard', pay: 'Tarjeta' };
  let step = 0;

  const node = el('div', { class: 'checkout' });

  // --- Resumen de pedido (plegable en móvil) ---
  function summary() {
    const grand = total();
    return el('details', { class: 'checkout__summary', open: true }, [
      el('summary', { class: 'checkout__summary-head' }, [
        el('span', { text: 'Resumen del pedido' }),
        el('span', { class: 'checkout__summary-total', text: euros(grand) }),
      ]),
      el('div', { class: 'checkout__summary-body' }, [
        ...items.map((it) =>
          el('div', { class: 'checkout__line' }, [
            el('span', { text: `${it.product.name} · ${getColor(it.colorId).name} · ${it.size} ×${it.qty}` }),
            el('span', { text: euros(it.lineTotal) }),
          ])
        ),
        el('div', { class: 'checkout__total' }, [el('span', { text: 'Total (demo)' }), el('span', { text: euros(grand) })]),
      ]),
    ]);
  }

  // --- Indicador de progreso ---
  function progress() {
    return el('ol', { class: 'steps', 'aria-label': 'Progreso del pedido' },
      CHECKOUT_STEPS.map((label, i) =>
        el('li', {
          class: 'steps__item' + (i === step ? ' is-current' : '') + (i < step ? ' is-done' : ''),
          'aria-current': i === step ? 'step' : null,
        }, [
          el('span', { class: 'steps__num', text: i < step ? '✓' : String(i + 1) }),
          el('span', { class: 'steps__label', text: label }),
        ])
      )
    );
  }

  // Campo con error inline accesible
  function field(key, label, type = 'text', attrs = {}) {
    const id = 'co-' + key;
    const errId = id + '-err';
    const input = el('input', {
      id, type, value: data[key], 'aria-describedby': errId, autocomplete: attrs.autocomplete || 'on', ...attrs,
      onInput: (e) => { data[key] = e.target.value; clearError(input, err); },
    });
    const err = el('span', { class: 'field-error', id: errId, role: 'alert' });
    input._err = err;
    return el('label', { class: 'field', for: id }, [el('span', { text: label }), input, err]);
  }
  function clearError(input, err) { input.classList.remove('is-invalid'); err.textContent = ''; }
  function setError(input, err, msg) { input.classList.add('is-invalid'); err.textContent = msg; }

  function validateInfo(panel) {
    const checks = [
      ['name', (v) => v.trim().length >= 2, 'Indica tu nombre.'],
      ['email', (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Email no válido.'],
      ['phone', (v) => v.trim().length >= 6, 'Teléfono no válido.'],
      ['address', (v) => v.trim().length >= 4, 'Indica la dirección.'],
      ['city', (v) => v.trim().length >= 2, 'Indica la ciudad.'],
      ['zip', (v) => /^[0-9A-Za-z\- ]{3,10}$/.test(v.trim()), 'Código postal no válido.'],
      ['country', (v) => v.trim().length >= 2, 'Indica el país.'],
    ];
    let firstBad = null;
    for (const [key, ok, msg] of checks) {
      const input = $('#co-' + key, panel);
      if (!ok(data[key] || '')) {
        setError(input, input._err, msg);
        if (!firstBad) firstBad = input;
      } else {
        clearError(input, input._err);
      }
    }
    if (firstBad) { firstBad.focus(); toast('Revisa los campos marcados', { type: 'error' }); return false; }
    return true;
  }

  // --- Paneles por paso ---
  function panelInfo() {
    const p = el('div', { class: 'checkout__panel' }, [
      el('h3', { class: 'checkout__step-title', text: 'Información de contacto y envío' }),
      el('div', { class: 'field-grid' }, [
        field('name', 'Nombre y apellidos', 'text', { autocomplete: 'name', autofocus: true }),
        field('email', 'Email', 'email', { autocomplete: 'email' }),
        field('phone', 'Teléfono', 'tel', { autocomplete: 'tel' }),
        field('address', 'Dirección', 'text', { autocomplete: 'street-address' }),
        field('city', 'Ciudad', 'text', { autocomplete: 'address-level2' }),
        field('zip', 'Código postal', 'text', { autocomplete: 'postal-code' }),
        field('country', 'País', 'text', { autocomplete: 'country-name' }),
      ]),
    ]);
    return p;
  }
  function panelShip() {
    const opt = (val, title, note) => el('label', { class: 'radio-card' + (data.ship === val ? ' is-active' : '') }, [
      el('input', { type: 'radio', name: 'ship', value: val, ...(data.ship === val ? { checked: true } : {}), onChange: () => { data.ship = val; rerender(); } }),
      el('span', { class: 'radio-card__title', text: title }),
      el('span', { class: 'radio-card__note', text: note }),
    ]);
    return el('div', { class: 'checkout__panel' }, [
      el('h3', { class: 'checkout__step-title', text: 'Método de envío' }),
      el('div', { class: 'radio-cards' }, [
        opt('standard', 'Estándar', 'Tiempo y coste de demostración'),
        opt('express', 'Exprés', 'Tiempo y coste de demostración'),
        opt('pickup', 'Recogida en punto', 'Sin coste en esta demo'),
      ]),
      el('p', { class: 'checkout__hint', text: 'Los plazos y costes definitivos se confirmarán antes de una venta real.' }),
    ]);
  }
  function panelPay() {
    const opt = (val, icon) => el('label', { class: 'radio-card' + (data.pay === val ? ' is-active' : '') }, [
      el('input', { type: 'radio', name: 'pay', value: val, ...(data.pay === val ? { checked: true } : {}), onChange: () => { data.pay = val; rerender(); } }),
      el('span', { class: 'radio-card__title' }, [el('i', { 'data-lucide': icon }), val]),
    ]);
    return el('div', { class: 'checkout__panel' }, [
      el('h3', { class: 'checkout__step-title', text: 'Método de pago' }),
      el('p', { class: 'checkout__demo' }, [
        el('i', { 'data-lucide': 'shield-check', 'aria-hidden': 'true' }),
        'Esta es una demostración. No se realizará ningún cobro.',
      ]),
      el('div', { class: 'radio-cards radio-cards--pay' }, [
        opt('Tarjeta', 'credit-card'),
        opt('PayPal', 'wallet'),
        opt('Bizum', 'smartphone'),
      ]),
    ]);
  }
  function panelConfirm() {
    return el('div', { class: 'checkout__panel' }, [
      el('h3', { class: 'checkout__step-title', text: 'Revisa y confirma' }),
      el('dl', { class: 'checkout__review' }, [
        el('div', {}, [el('dt', { text: 'Contacto' }), el('dd', { text: `${data.name} · ${data.email} · ${data.phone}` })]),
        el('div', {}, [el('dt', { text: 'Dirección' }), el('dd', { text: `${data.address}, ${data.zip} ${data.city} (${data.country})` })]),
        el('div', {}, [el('dt', { text: 'Envío' }), el('dd', { text: data.ship })]),
        el('div', {}, [el('dt', { text: 'Pago' }), el('dd', { text: data.pay })]),
      ]),
      el('p', { class: 'checkout__demo' }, [
        el('i', { 'data-lucide': 'shield-check', 'aria-hidden': 'true' }),
        'Pedido de demostración. No se realizará ningún cobro.',
      ]),
    ]);
  }

  function rerender() {
    node.innerHTML = '';
    const panels = [panelInfo, panelShip, panelPay, panelConfirm];
    const panel = panels[step]();

    const back = el('button', { class: 'btn btn--outline', type: 'button', text: 'Atrás', onClick: () => { step = Math.max(0, step - 1); rerender(); } });
    const next = el('button', {
      class: 'btn btn--primary', type: 'button',
      text: step === CHECKOUT_STEPS.length - 1 ? 'Confirmar pedido (demo)' : 'Continuar',
      onClick: () => {
        if (step === 0 && !validateInfo(panel)) return;
        if (step === CHECKOUT_STEPS.length - 1) { showSuccess(); return; }
        step += 1;
        rerender();
      },
    });
    const nav = el('div', { class: 'checkout__nav' }, [step > 0 ? back : el('span'), next]);

    const main = el('div', { class: 'checkout__main' }, [
      el('h2', { id: 'co-title', class: 'modal__title', text: 'Finalizar compra' }),
      progress(),
      panel,
      nav,
    ]);
    node.append(el('div', { class: 'checkout__grid' }, [main, summary()]));
    refreshIcons();
    const focusTarget = $('[autofocus]', panel) || $('input,button', panel);
    if (focusTarget) setTimeout(() => focusTarget.focus(), 20);
  }

  function showSuccess() {
    clearCart();
    emit('ui:cartCleared');
    node.innerHTML = '';
    node.append(
      el('div', { class: 'checkout__success' }, [
        el('div', { class: 'checkout__success-icon' }, [el('i', { 'data-lucide': 'heart-handshake' })]),
        el('h2', { id: 'co-title', class: 'modal__title', text: 'Gracias por luchar JUNTOS.' }),
        el('p', { class: 'checkout__success-msg', text: 'Tu pedido ya está preparado para acompañar una historia.' }),
        el('p', { class: 'checkout__success-sub', text: 'Pedido de demostración completado. No se ha realizado ningún cobro ni se ha registrado un envío real.' }),
        el('button', { class: 'btn btn--primary', type: 'button', text: 'Seguir explorando', onClick: closeModal }),
      ])
    );
    refreshIcons();
  }

  rerender();
  openModal(node, { labelledby: 'co-title', size: 'lg' });
}

// ---------------------------------------------------------------------------
// INFORME DE IMPACTO (demostración)
// ---------------------------------------------------------------------------
export function openImpactReport() {
  const node = el('div', { class: 'impact-report' }, [
    el('span', { class: 'badge-demo', text: 'Transparencia' }),
    el('h2', { id: 'ir-title', class: 'modal__title', text: 'Compromiso solidario' }),
    el('p', { class: 'impact-report__intro', text: 'Una parte fija de los beneficios se destinará a ayudar ante emergencias y catástrofes. Lo comunicaremos con transparencia cuando existan aportaciones reales.' }),
    el('h3', { text: 'Antes de publicar cifras' }),
    el('ul', { class: 'impact-report__list' }, [
      'No mostraremos contadores ficticios.',
      'No usaremos imágenes dramáticas como reclamo comercial.',
      'Las aportaciones reales se comunicarán con contexto y trazabilidad.',
    ].map((t) => el('li', { text: t }))),
  ]);
  openModal(node, { labelledby: 'ir-title', size: 'md' });
}

export { GIFT_MESSAGE_SUGGESTION };
