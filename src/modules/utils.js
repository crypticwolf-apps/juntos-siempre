/**
 * Utilidades compartidas: almacenamiento local, eventos y toasts.
 */

// --- localStorage seguro ----------------------------------------------------
const PREFIX = 'js_'; // "juntos-siempre"

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* almacenamiento no disponible */
  }
}

// --- Bus de eventos muy ligero ---------------------------------------------
const bus = new EventTarget();
export function on(event, handler) {
  bus.addEventListener(event, handler);
}
export function emit(event, detail) {
  bus.dispatchEvent(new CustomEvent(event, { detail }));
}

// --- DOM helpers ------------------------------------------------------------
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

// --- Toasts -----------------------------------------------------------------
let toastHost;
export function toast(message, { type = 'info', icon } = {}) {
  if (!toastHost) {
    toastHost = el('div', { class: 'toast-host', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.appendChild(toastHost);
  }
  const iconName = icon || (type === 'success' ? 'check' : type === 'error' ? 'alert-circle' : 'info');
  const node = el('div', { class: `toast toast--${type}`, role: 'status' }, [
    el('i', { 'data-lucide': iconName, 'aria-hidden': 'true' }),
    el('span', { text: message }),
  ]);
  toastHost.appendChild(node);
  if (window.lucide) window.lucide.createIcons({ nameAttr: 'data-lucide' });
  requestAnimationFrame(() => node.classList.add('is-visible'));
  const remove = () => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 300);
  };
  setTimeout(remove, 3200);
  node.addEventListener('click', remove);
}

// --- Formato ----------------------------------------------------------------
export function euros(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ nameAttr: 'data-lucide' });
}

// --- Accesibilidad: atrapar foco dentro de un contenedor --------------------
export function trapFocus(container, e) {
  const focusables = $$(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    container
  ).filter((n) => n.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
