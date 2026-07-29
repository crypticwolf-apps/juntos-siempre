/**
 * Piezas visuales reutilizables del panel: avisos, ventanas de confirmación,
 * campos de formulario, listas ordenables y pantallas vacías.
 *
 * Todo en español y sin tecnicismos: los textos que ve la persona que gestiona
 * la web hablan de "fotografías", "guardar" u "ocultar", nunca de la tecnología
 * que hay debajo.
 */
import { el, $, $$ } from '../modules/utils.js';

export { el, $, $$ };

// ---------------------------------------------------------------------------
// TEXTO
// ---------------------------------------------------------------------------
/** Convierte "Camiseta Essential" en "camiseta-essential". */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

const STATUS_LABEL = { draft: 'Borrador', published: 'Publicado', hidden: 'Oculto' };
export const statusLabel = (s) => STATUS_LABEL[s] || s;

/** Traduce los errores técnicos a un mensaje claro. */
export function friendlyError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (msg.includes('email not confirmed')) return 'Todavía no has confirmado tu correo. Revisa tu bandeja de entrada.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (msg.includes('duplicate key') && msg.includes('slug')) return 'Ya existe otro elemento con esa dirección. Cambia el nombre o la dirección.';
  if (msg.includes('duplicate key')) return 'Ese dato ya existe. Revisa que no esté repetido.';
  if (msg.includes('row-level security') || msg.includes('violates row-level')) return 'Tu cuenta no tiene permiso para hacer este cambio.';
  if (msg.includes('no puedes cambiar tu propio rol')) return 'No puedes cambiar tu propio permiso.';
  if (msg.includes('solo un administrador')) return 'Solo un administrador puede cambiar los permisos.';
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) return 'No hay conexión. Comprueba tu internet y vuelve a intentarlo.';
  if (msg.includes('payload too large') || msg.includes('exceeded the maximum')) return 'La imagen pesa demasiado. Prueba con una más ligera.';
  if (msg.includes('mime type')) return 'Ese tipo de archivo no se admite. Usa JPG, PNG o WebP.';
  return error?.message || 'Ha ocurrido un error. Vuelve a intentarlo.';
}

// ---------------------------------------------------------------------------
// AVISOS
// ---------------------------------------------------------------------------
let toastHost;
export function notify(message, type = 'info') {
  if (!toastHost) {
    toastHost = el('div', { class: 'adm-toasts', 'aria-live': 'polite' });
    document.body.appendChild(toastHost);
  }
  const node = el('div', { class: `adm-toast adm-toast--${type}`, role: 'status' }, [
    el('span', { text: message }),
  ]);
  toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  const close = () => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 250);
  };
  setTimeout(close, type === 'error' ? 6000 : 3500);
  node.addEventListener('click', close);
}

// ---------------------------------------------------------------------------
// VENTANAS
// ---------------------------------------------------------------------------
export function openModal({ title, body, footer, wide = false, onClose }) {
  const overlay = el('div', { class: 'adm-modal-overlay' });
  const closeBtn = el('button', { class: 'adm-icon-btn', type: 'button', 'aria-label': 'Cerrar', text: '✕' });

  const panel = el(
    'div',
    { class: 'adm-modal' + (wide ? ' adm-modal--wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    [
      el('div', { class: 'adm-modal__head' }, [el('h2', { text: title }), closeBtn]),
      el('div', { class: 'adm-modal__body' }, [body]),
      footer ? el('div', { class: 'adm-modal__foot' }, [footer]) : null,
    ]
  );

  const close = () => {
    overlay.remove();
    document.body.classList.remove('adm-no-scroll');
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  document.body.classList.add('adm-no-scroll');
  setTimeout(() => panel.querySelector('input, textarea, select, button')?.focus(), 60);

  return { close, panel };
}

/** Confirmación antes de una acción que no se puede deshacer. */
export function confirmDialog({
  title = '¿Seguro?',
  text = '',
  confirmLabel = 'Sí, continuar',
  cancelLabel = 'Cancelar',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      modal.close();
      resolve(value);
    };
    const footer = el('div', { class: 'adm-actions' }, [
      el('button', { class: 'adm-btn adm-btn--ghost', type: 'button', text: cancelLabel, onClick: () => finish(false) }),
      el('button', {
        class: 'adm-btn ' + (danger ? 'adm-btn--danger' : 'adm-btn--primary'),
        type: 'button',
        text: confirmLabel,
        onClick: () => finish(true),
      }),
    ]);
    const modal = openModal({
      title,
      body: el('p', { class: 'adm-modal__text', text }),
      footer,
      onClose: () => finish(false),
    });
  });
}

// ---------------------------------------------------------------------------
// CAMPOS DE FORMULARIO
// ---------------------------------------------------------------------------
let fieldSeq = 0;
const nextId = () => `adm-f-${++fieldSeq}`;

export function field(label, control, { hint, error } = {}) {
  const id = control.id || nextId();
  control.id = id;
  return el('label', { class: 'adm-field', for: id }, [
    el('span', { class: 'adm-field__label', text: label }),
    control,
    hint ? el('span', { class: 'adm-field__hint', text: hint }) : null,
    el('span', { class: 'adm-field__error', 'data-error-for': id, text: error || '' }),
  ]);
}

export function input(props = {}) {
  return el('input', { class: 'adm-input', type: 'text', ...props });
}

export function textarea(props = {}) {
  const { value = '', ...rest } = props;
  const node = el('textarea', { class: 'adm-input adm-textarea', rows: '4', ...rest });
  node.value = value;
  return node;
}

export function select(options, props = {}) {
  const { value, ...rest } = props;
  const node = el('select', { class: 'adm-input adm-select', ...rest },
    options.map((o) => el('option', { value: o.value, text: o.label }))
  );
  if (value !== undefined) node.value = value;
  return node;
}

export function checkbox(labelText, props = {}) {
  const box = el('input', { type: 'checkbox', ...props });
  return el('label', { class: 'adm-checkbox' }, [box, el('span', { text: labelText })]);
}

export function setFieldError(control, message) {
  const err = document.querySelector(`[data-error-for="${control.id}"]`);
  if (err) err.textContent = message || '';
  control.classList.toggle('is-invalid', Boolean(message));
}

// ---------------------------------------------------------------------------
// ESTADOS
// ---------------------------------------------------------------------------
export function skeleton(count = 3) {
  return el('div', { class: 'adm-skeletons' }, Array.from({ length: count }, () => el('div', { class: 'adm-skeleton' })));
}

export function emptyState({ title, text, actionLabel, onAction, icon = '📦' }) {
  return el('div', { class: 'adm-empty' }, [
    el('div', { class: 'adm-empty__icon', text: icon, 'aria-hidden': 'true' }),
    el('h3', { text: title }),
    text ? el('p', { text }) : null,
    actionLabel
      ? el('button', { class: 'adm-btn adm-btn--primary', type: 'button', text: actionLabel, onClick: onAction })
      : null,
  ]);
}

/** Botón que se bloquea mientras trabaja y evita el doble envío. */
export function actionButton(label, handler, { className = 'adm-btn adm-btn--primary', busyLabel = 'Guardando…' } = {}) {
  const btn = el('button', { class: className, type: 'button', text: label });
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = busyLabel;
    try {
      await handler();
    } catch (error) {
      notify(friendlyError(error), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
  return btn;
}

// ---------------------------------------------------------------------------
// LISTAS ORDENABLES
// ---------------------------------------------------------------------------
/**
 * Permite reordenar arrastrando con el ratón y, además, con botones de subir y
 * bajar para que también funcione con el dedo y con el teclado.
 *
 * @param {HTMLElement} container elemento que contiene las filas
 * @param {string} itemSelector selector de cada fila
 * @param {(ids: string[]) => void} onReorder recibe el nuevo orden
 */
export function makeSortable(container, itemSelector, onReorder) {
  let dragged = null;

  const ids = () => $$(itemSelector, container).map((n) => n.dataset.id);

  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    dragged = item;
    item.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox necesita que se escriba algo para iniciar el arrastre.
    e.dataTransfer.setData('text/plain', item.dataset.id || '');
  });

  container.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('is-dragging');
    dragged = null;
    onReorder(ids());
  });

  container.addEventListener('dragover', (e) => {
    if (!dragged) return;
    e.preventDefault();
    const over = e.target.closest(itemSelector);
    if (!over || over === dragged) return;
    const rect = over.getBoundingClientRect();
    const after = (e.clientY - rect.top) / rect.height > 0.5;
    over.parentNode.insertBefore(dragged, after ? over.nextSibling : over);
  });

  container.addEventListener('click', (e) => {
    const up = e.target.closest('[data-move="up"]');
    const down = e.target.closest('[data-move="down"]');
    if (!up && !down) return;
    const item = e.target.closest(itemSelector);
    if (!item) return;
    if (up && item.previousElementSibling) {
      item.parentNode.insertBefore(item, item.previousElementSibling);
    } else if (down && item.nextElementSibling) {
      item.parentNode.insertBefore(item.nextElementSibling, item);
    } else {
      return;
    }
    (up ? item.querySelector('[data-move="up"]') : item.querySelector('[data-move="down"]'))?.focus();
    onReorder(ids());
  });
}

/** Asa de arrastre + botones de subir/bajar para una fila ordenable. */
export function dragHandle() {
  return el('div', { class: 'adm-drag' }, [
    el('span', { class: 'adm-drag__grip', 'aria-hidden': 'true', text: '⠿' }),
    el('button', { class: 'adm-drag__btn', type: 'button', 'data-move': 'up', 'aria-label': 'Subir', text: '▲' }),
    el('button', { class: 'adm-drag__btn', type: 'button', 'data-move': 'down', 'aria-label': 'Bajar', text: '▼' }),
  ]);
}

// ---------------------------------------------------------------------------
// CAMBIOS SIN GUARDAR
// ---------------------------------------------------------------------------
let dirty = false;

export function setDirty(value) {
  dirty = Boolean(value);
  document.body.classList.toggle('adm-dirty', dirty);
}

export function isDirty() {
  return dirty;
}

window.addEventListener('beforeunload', (e) => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

/** Pregunta antes de abandonar una pantalla con cambios pendientes. */
export async function confirmLeave() {
  if (!dirty) return true;
  const ok = await confirmDialog({
    title: 'Tienes cambios sin guardar',
    text: 'Si sales ahora se perderán los cambios que no hayas publicado.',
    confirmLabel: 'Salir sin guardar',
    cancelLabel: 'Seguir editando',
    danger: true,
  });
  if (ok) setDirty(false);
  return ok;
}
