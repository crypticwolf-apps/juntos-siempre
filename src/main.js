import './styles.css';
import {
  createIcons,
  X, Search, ShoppingBag, User, Menu, ChevronDown, ChevronRight, SlidersHorizontal,
  SearchX, Ruler, Minus, Gift, ArrowUp, ArrowRight, Eye, Check, Trash2, Plus, Tag,
  MailCheck, Send, Info, UserCheck, LogOut, ShieldCheck, CreditCard, Wallet, Smartphone,
  AlertCircle, HeartHandshake, Instagram, MapPin, RefreshCw, Sparkles,
  Truck, RotateCcw, Leaf, Heart, FileCheck,
} from 'lucide';

const icons = {
  X, Search, ShoppingBag, User, Menu, ChevronDown, ChevronRight, SlidersHorizontal,
  SearchX, Ruler, Minus, Gift, ArrowUp, ArrowRight, Eye, Check, Trash2, Plus, Tag,
  MailCheck, Send, Info, UserCheck, LogOut, ShieldCheck, CreditCard, Wallet, Smartphone,
  AlertCircle, HeartHandshake, Instagram, MapPin, RefreshCw, Sparkles,
  Truck, RotateCcw, Leaf, Heart, FileCheck,
};
window.lucide = { createIcons: (opts = {}) => createIcons({ icons, nameAttr: 'data-lucide', ...opts }) };

import { $, $$, el, load, save, toast, refreshIcons } from './modules/utils.js';
import { mountChrome, initChrome } from './components/chrome.js';
import { mountHomeCollections, mountFeatured, mountShop } from './modules/catalog.js';
import { mountProductPage } from './modules/product-page.js';
import { initAnimations } from './modules/animations.js';
import { initSeo } from './modules/seo.js';
import { loadContent, applyContent } from './lib/content.js';
import { loadRemoteCatalog } from './lib/remote-catalog.js';
import { setCatalog } from './data/products.js';
import { mountChapters, mountImpactSteps } from './lib/repeaters.js';

// ---------------------------------------------------------------------------
// FORMULARIOS
// ---------------------------------------------------------------------------
function setMsg(node, text, ok) {
  if (!node) return;
  node.textContent = text;
  node.className = 'form-feedback ' + (ok ? 'is-ok' : 'is-error');
}

function wireNewsletter() {
  const form = $('[data-newsletter]');
  if (!form) return;
  const msg = $('[data-newsletter-msg]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    if (!name) return setMsg(msg, 'Indica tu nombre.', false);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setMsg(msg, 'Email no válido.', false);
    if (!data.get('accept')) return setMsg(msg, 'Debes aceptar para continuar.', false);
    save('newsletter', [...load('newsletter', []), { name, email, date: Date.now() }]);
    form.reset();
    setMsg(msg, '¡Gracias! Te mantendremos cerca.', true);
    toast('Suscripción confirmada', { type: 'success', icon: 'mail-check' });
  });
}

function wireContact() {
  const form = $('[data-contact]');
  if (!form) return;
  const msg = $('[data-contact-msg]');
  const fields = {
    name: [(v) => v.trim().length >= 2, 'Indica tu nombre.'],
    email: [(v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Email no válido.'],
    subject: [(v) => v.trim().length >= 2, 'Añade un asunto.'],
    message: [(v) => v.trim().length >= 5, 'Escribe tu mensaje.'],
  };
  // Validación en vivo, no agresiva (al salir del campo)
  Object.keys(fields).forEach((key) => {
    const input = form.elements[key];
    if (!input) return;
    input.addEventListener('blur', () => {
      const [ok, m] = fields[key];
      const errEl = $(`[data-err="${key}"]`, form);
      if (input.value && !ok(input.value)) { input.classList.add('is-invalid'); if (errEl) errEl.textContent = m; }
      else { input.classList.remove('is-invalid'); if (errEl) errEl.textContent = ''; }
    });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let firstBad = null;
    for (const key of Object.keys(fields)) {
      const input = form.elements[key];
      const [ok, m] = fields[key];
      const errEl = $(`[data-err="${key}"]`, form);
      if (!ok((input.value || '').toString())) {
        input.classList.add('is-invalid');
        if (errEl) errEl.textContent = m;
        if (!firstBad) firstBad = input;
      } else { input.classList.remove('is-invalid'); if (errEl) errEl.textContent = ''; }
    }
    const privacyBad = !form.elements.privacy.checked;
    if (privacyBad && !firstBad) firstBad = form.elements.privacy;
    if (firstBad) {
      firstBad.focus();
      return setMsg(msg, privacyBad && firstBad === form.elements.privacy ? 'Acepta la política de privacidad.' : 'Revisa los campos marcados.', false);
    }
    form.reset();
    setMsg(msg, 'Mensaje enviado. Te responderemos por el canal disponible.', true);
    toast('Mensaje enviado', { type: 'success', icon: 'send' });
  });
}

// Favicon adaptativo (fallback JS para navegadores que ignoran media en <link>)
function initFavicon() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  let link = document.querySelector('link[rel="icon"][data-dynamic]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.setAttribute('data-dynamic', '');
    document.head.appendChild(link);
  }
  const apply = () => { link.href = mq.matches ? 'favicon-dark.svg' : 'favicon-light.svg'; };
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply);
}

function wireAccordions() {
  $$('[data-accordion] .accordion__head').forEach((head) => {
    head.addEventListener('click', () => {
      const item = head.closest('.accordion__item');
      const open = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', open ? 'false' : 'true');
      item.classList.toggle('is-open', !open);
    });
  });
}

// ---------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------
/**
 * Arranque.
 *
 * Primero se piden los textos y el catálogo publicados desde el panel. Si no
 * hay conexión configurada, ambas llamadas devuelven vacío al instante y la
 * web se dibuja con su contenido original, exactamente igual que antes.
 */
async function init() {
  document.body.classList.add('is-loading-content');

  const [, remote] = await Promise.all([loadContent(), loadRemoteCatalog()]);
  if (remote) setCatalog(remote);

  document.body.classList.remove('is-loading-content');

  initSeo();
  mountChrome();
  initChrome();

  const page = document.body.dataset.page;
  if (page === 'home') {
    mountHomeCollections();
    mountFeatured();
  } else if (page === 'shop') {
    mountShop();
  } else if (page === 'product') {
    mountProductPage();
  } else if (page === 'story') {
    mountChapters();
  } else if (page === 'impact') {
    mountImpactSteps();
  }

  // Los textos e imágenes guardados se aplican encima del contenido original.
  applyContent(document);

  initFavicon();
  wireNewsletter();
  wireContact();
  wireAccordions();
  initAnimations();
  refreshIcons();

  // Modo "Editar página visualmente": solo se descarga si se pide.
  if (new URLSearchParams(location.search).has('editar')) {
    import('./editor/visual-editor.js')
      .then((m) => m.startVisualEditor())
      .catch(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
