/**
 * Editar página visualmente.
 *
 * Se activa al abrir cualquier página con ?editar=1 y solo funciona si hay una
 * sesión con permiso. La web se ve igual que para los clientes, pero al pasar
 * el ratón aparece un borde y un lápiz sobre lo que se puede cambiar.
 *
 * Nada se publica hasta pulsar "Guardar y publicar".
 */
import './visual-editor.css';
import { supabase, isConfigured } from '../lib/supabase.js';
import { invalidateCache } from '../lib/content.js';

// data-page del <body> -> identificador de la página en el gestor
const PAGE_BY_BODY = { home: 'home', shop: 'shop', story: 'story', impact: 'impact' };
const FOLDER_BY_PAGE = { home: 'homepage', shop: 'general', story: 'history', impact: 'impact' };

const h = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  [].concat(children).forEach((c) => {
    if (c == null) return;
    node.append(c.nodeType ? c : document.createTextNode(c));
  });
  return node;
};

// ---------------------------------------------------------------------------
// ARRANQUE
// ---------------------------------------------------------------------------
export async function startVisualEditor() {
  if (!isConfigured) return gate('La web todavía no está conectada con el gestor de contenido.');

  const { data } = await supabase.auth.getSession();
  if (!data?.session) return gate('Para editar la página tienes que iniciar sesión primero.', true);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.session.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active || !['admin', 'editor'].includes(profile.role)) {
    return gate('Esta cuenta no tiene permiso para editar la web.', true);
  }

  const pageSlug = PAGE_BY_BODY[document.body.dataset.page];
  if (!pageSlug) {
    return gate('Esta página no se puede editar visualmente. Vuelve al panel y elige otra.', true);
  }

  new VisualEditor(pageSlug).start();
}

function gate(message, withLink = false) {
  document.body.appendChild(
    h('div', { class: 've-gate' }, [
      h('div', {}, [
        h('h1', { text: 'Modo edición no disponible' }),
        h('p', { text: message }),
        withLink ? h('a', { class: 've-btn ve-btn--primary', href: 'admin.html', text: 'Ir al panel' }) : null,
        h('a', {
          class: 've-btn',
          href: location.pathname,
          text: 'Ver la página normal',
          style: 'margin-left:.5rem',
        }),
      ]),
    ])
  );
}

// ---------------------------------------------------------------------------
// EDITOR
// ---------------------------------------------------------------------------
class VisualEditor {
  constructor(pageSlug) {
    this.pageSlug = pageSlug;
    this.folder = FOLDER_BY_PAGE[pageSlug] || 'general';
    this.sections = new Map(); // key -> { id, data, original, is_visible, position, dirty }
    this.dirty = false;
    this.current = null;
  }

  async start() {
    await this.loadSections();
    document.body.classList.add('ve-on');
    this.buildBar();
    this.buildPanel();
    this.markEditables();
    this.markSections();

    window.addEventListener('beforeunload', (e) => {
      if (!this.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  async loadSections() {
    const { data: page } = await supabase.from('pages').select('id').eq('slug', this.pageSlug).maybeSingle();
    if (!page) return;
    this.pageId = page.id;
    const { data: rows } = await supabase
      .from('page_sections')
      .select('id, key, name, data, is_visible, position')
      .eq('page_id', page.id);

    (rows || []).forEach((row) => {
      this.sections.set(row.key, {
        id: row.id,
        name: row.name,
        data: JSON.parse(JSON.stringify(row.data || {})),
        original: JSON.parse(JSON.stringify(row.data || {})),
        is_visible: row.is_visible,
        position: row.position,
        dirty: false,
      });
    });
  }

  setDirty(value) {
    this.dirty = value;
    this.stateText.textContent = value ? 'Tienes cambios sin publicar' : 'Todo publicado';
    this.saveBtn.disabled = !value;
    this.discardBtn.disabled = !value;
  }

  /** Lee y escribe un campo de una sección: "home.hero.title" */
  fieldValue(id, value) {
    const [, key, ...rest] = id.split('.');
    const fieldName = rest.join('.');
    const sec = this.sections.get(key);
    if (!sec) return '';
    if (value === undefined) return sec.data[fieldName] ?? '';
    sec.data[fieldName] = value;
    sec.dirty = true;
    this.setDirty(true);
    return value;
  }

  // -------------------------------------------------------------------------
  // ELEMENTOS EDITABLES
  // -------------------------------------------------------------------------
  markEditables() {
    const selector = '[data-cms-text], [data-cms-html], [data-cms-img], [data-cms-alt]';
    document.querySelectorAll(selector).forEach((node) => {
      if (node.closest('.ve-panel, .ve-bar')) return;

      const isImage = node.tagName === 'IMG';
      const id = isImage ? node.dataset.cmsImg : node.dataset.cmsText || node.dataset.cmsHtml;
      if (!id) return;

      const [page] = id.split('.');
      if (page !== this.pageSlug) return;

      // El objetivo del clic: en las imágenes, el propio contenedor.
      const target = isImage ? node.parentElement || node : node;
      target.setAttribute('data-ve-editable', '');
      target.appendChild(h('span', { class: 've-pencil', text: isImage ? '🖼' : '✏️', 'aria-hidden': 'true' }));

      target.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isImage) this.editImage(node, id);
        else this.editText(node, id);
      });
    });
  }

  markSections() {
    document.querySelectorAll('[data-cms-section]').forEach((node) => {
      const [page, key] = node.dataset.cmsSection.split('.');
      if (page !== this.pageSlug) return;
      const sec = this.sections.get(key);
      if (!sec) return;

      // En modo edición las secciones ocultas se ven en gris, no desaparecen.
      node.hidden = false;
      this.paintSectionState(node, sec);

      const bar = h('div', { class: 've-section-bar' }, [
        h('button', {
          type: 'button',
          text: sec.is_visible ? '👁 Ocultar' : '👁 Mostrar',
          onClick: (e) => {
            e.stopPropagation();
            sec.is_visible = !sec.is_visible;
            sec.dirty = true;
            this.setDirty(true);
            e.currentTarget.textContent = sec.is_visible ? '👁 Ocultar' : '👁 Mostrar';
            this.paintSectionState(node, sec);
          },
        }),
        h('button', {
          type: 'button',
          text: '▲',
          title: 'Subir la sección',
          onClick: (e) => {
            e.stopPropagation();
            this.moveSection(node, key, -1);
          },
        }),
        h('button', {
          type: 'button',
          text: '▼',
          title: 'Bajar la sección',
          onClick: (e) => {
            e.stopPropagation();
            this.moveSection(node, key, 1);
          },
        }),
      ]);
      node.appendChild(bar);
    });
  }

  paintSectionState(node, sec) {
    if (sec.is_visible) {
      node.removeAttribute('data-ve-hidden');
      node.querySelector('.ve-hidden-note')?.remove();
    } else {
      node.setAttribute('data-ve-hidden', '');
      if (!node.querySelector('.ve-hidden-note')) {
        node.appendChild(
          h('div', { class: 've-hidden-note' }, [h('span', { text: 'Esta sección no se verá en la web' })])
        );
      }
    }
  }

  /** Cambia el orden de una sección y lo refleja al momento en la página. */
  moveSection(node, key, delta) {
    const all = [...document.querySelectorAll('[data-cms-section]')].filter((n) => {
      const [page, k] = n.dataset.cmsSection.split('.');
      return page === this.pageSlug && this.sections.has(k);
    });
    const index = all.indexOf(node);
    const target = index + delta;
    if (target < 0 || target >= all.length) return;

    const other = all[target];
    const [, otherKey] = other.dataset.cmsSection.split('.');
    const a = this.sections.get(key);
    const b = this.sections.get(otherKey);

    const tmp = a.position;
    a.position = b.position;
    b.position = tmp;
    a.dirty = true;
    b.dirty = true;
    this.setDirty(true);

    // Mueve el elemento en la página para ver el resultado al instante.
    if (delta < 0) other.parentNode.insertBefore(node, other);
    else other.parentNode.insertBefore(other, node);
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // -------------------------------------------------------------------------
  // EDICIÓN DE TEXTO
  // -------------------------------------------------------------------------
  editText(node, id) {
    document.querySelectorAll('.is-editing').forEach((n) => n.classList.remove('is-editing'));
    (node.parentElement || node).classList.add('is-editing');

    const value = this.fieldValue(id) || node.textContent.trim();
    const isLong = value.length > 90;

    const control = isLong
      ? h('textarea', { rows: '6' })
      : h('input', { type: 'text' });
    control.value = value;

    control.addEventListener('input', () => {
      node.textContent = control.value;
      this.fieldValue(id, control.value);
    });

    this.openPanel({
      title: 'Editar texto',
      body: [
        h('label', { class: 've-panel__label', text: this.labelFor(id) }),
        control,
        h('p', { class: 've-panel__hint', text: 'Los cambios se ven al momento. Se publican al pulsar "Guardar y publicar".' }),
      ],
      onClose: () => (node.parentElement || node).classList.remove('is-editing'),
    });
    control.focus();
  }

  // -------------------------------------------------------------------------
  // EDICIÓN DE IMAGEN
  // -------------------------------------------------------------------------
  async editImage(node, id) {
    const altId = node.dataset.cmsAlt;
    const preview = h('img', { class: 've-panel__img', src: node.src, alt: '' });

    const changeBtn = h('button', {
      class: 've-btn ve-btn--primary',
      type: 'button',
      text: 'Cambiar fotografía',
      style: 'width:100%',
      onClick: async () => {
        const { pickImage } = await import('../admin/media.js');
        const picked = await pickImage({ folder: this.folder, title: 'Elegir fotografía' });
        if (!picked) return;
        node.src = picked.url;
        node.removeAttribute('srcset');
        preview.src = picked.url;
        this.fieldValue(id, picked.url);
        if (altId && picked.alt) {
          node.alt = picked.alt;
          this.fieldValue(altId, picked.alt);
          altControl.value = picked.alt;
        }
      },
    });

    const altControl = h('input', { type: 'text' });
    altControl.value = altId ? this.fieldValue(altId) || node.alt || '' : node.alt || '';
    altControl.addEventListener('input', () => {
      node.alt = altControl.value;
      if (altId) this.fieldValue(altId, altControl.value);
    });

    this.openPanel({
      title: 'Cambiar fotografía',
      body: [
        preview,
        changeBtn,
        h('label', { class: 've-panel__label', style: 'margin-top:1.15rem', text: 'Descripción de la fotografía' }),
        altControl,
        h('p', {
          class: 've-panel__hint',
          text: 'La descripción la leen los buscadores y las personas que navegan con lector de pantalla.',
        }),
      ],
    });
  }

  labelFor(id) {
    const [, key, ...rest] = id.split('.');
    const sec = this.sections.get(key);
    const fieldName = rest.join('.');
    const pretty = fieldName.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    return sec ? `${sec.name} · ${pretty}` : pretty;
  }

  // -------------------------------------------------------------------------
  // PANEL LATERAL
  // -------------------------------------------------------------------------
  buildPanel() {
    this.panelTitle = h('h2', { text: 'Edición' });
    this.panelBody = h('div', { class: 've-panel__body' });

    this.panel = h('aside', { class: 've-panel', role: 'dialog', 'aria-label': 'Panel de edición' }, [
      h('div', { class: 've-panel__head' }, [
        this.panelTitle,
        h('button', {
          class: 've-btn',
          type: 'button',
          text: '✕',
          'aria-label': 'Cerrar el panel',
          onClick: () => this.closePanel(),
        }),
      ]),
      this.panelBody,
    ]);
    document.body.appendChild(this.panel);
  }

  openPanel({ title, body, onClose }) {
    this.closePanel();
    this.onPanelClose = onClose;
    this.panelTitle.textContent = title;
    this.panelBody.innerHTML = '';
    [].concat(body).forEach((n) => n && this.panelBody.appendChild(n));
    this.panel.classList.add('is-open');
  }

  closePanel() {
    this.panel?.classList.remove('is-open');
    if (this.onPanelClose) {
      this.onPanelClose();
      this.onPanelClose = null;
    }
  }

  // -------------------------------------------------------------------------
  // BARRA INFERIOR
  // -------------------------------------------------------------------------
  buildBar() {
    this.stateText = h('span', { class: 've-bar__state', text: 'Todo publicado' });

    this.saveBtn = h('button', {
      class: 've-btn ve-btn--primary',
      type: 'button',
      text: 'Guardar y publicar',
      disabled: true,
      onClick: () => this.save(),
    });

    this.discardBtn = h('button', {
      class: 've-btn',
      type: 'button',
      text: 'Descartar cambios',
      disabled: true,
      onClick: () => this.discard(),
    });

    const sizes = h('div', { class: 've-sizes' }, [
      ['Escritorio', 1440, 900],
      ['Tablet', 834, 1112],
      ['Móvil', 390, 844],
    ].map(([label, w, hgt]) =>
      h('button', {
        class: 've-btn',
        type: 'button',
        text: label,
        title: `Ver la página a ${w} píxeles de ancho`,
        onClick: () => {
          const url = location.pathname;
          window.open(url, `ve-preview-${w}`, `width=${w},height=${hgt},scrollbars=yes`);
        },
      })
    ));

    this.bar = h('div', { class: 've-bar' }, [
      h('span', { class: 've-bar__brand', text: '✏️ Editando la página' }),
      this.stateText,
      h('span', { style: 'font-size:.8rem; opacity:.7; margin-right:.35rem', text: 'Vista previa:' }),
      sizes,
      h('a', { class: 've-btn', href: 'admin.html', text: 'Volver al panel' }),
      this.discardBtn,
      this.saveBtn,
    ]);
    document.body.appendChild(this.bar);
  }

  // -------------------------------------------------------------------------
  // GUARDAR Y DESCARTAR
  // -------------------------------------------------------------------------
  async save() {
    const changed = [...this.sections.values()].filter((s) => s.dirty);
    if (!changed.length) return;

    this.saveBtn.disabled = true;
    this.discardBtn.disabled = true;
    this.stateText.textContent = 'Guardando…';

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      for (const sec of changed) {
        const { error } = await supabase
          .from('page_sections')
          .update({
            data: sec.data,
            is_visible: sec.is_visible,
            position: sec.position,
            updated_by: userId,
          })
          .eq('id', sec.id);
        if (error) throw error;

        // Historial, para poder deshacer desde el panel.
        await supabase.from('content_revisions').insert({
          entity_type: 'seccion',
          entity_id: sec.id,
          entity_label: sec.name,
          old_value: sec.original,
          new_value: sec.data,
          created_by: userId,
        });

        sec.original = JSON.parse(JSON.stringify(sec.data));
        sec.dirty = false;
      }

      invalidateCache();
      this.setDirty(false);
      this.stateText.textContent = 'Cambios publicados correctamente';
      this.flash('Cambios publicados correctamente');
    } catch (error) {
      this.stateText.textContent = 'No se ha podido guardar';
      this.flash(
        String(error?.message || '').includes('row-level')
          ? 'Tu cuenta no tiene permiso para publicar estos cambios.'
          : 'No se ha podido guardar. Comprueba tu conexión e inténtalo otra vez.',
        true
      );
      this.saveBtn.disabled = false;
      this.discardBtn.disabled = false;
    }
  }

  discard() {
    if (!confirm('¿Descartar los cambios? Se recargará la página y volverá a como estaba.')) return;
    this.dirty = false;
    location.reload();
  }

  flash(message, isError = false) {
    const note = h('div', {
      style: `position:fixed; left:50%; bottom:110px; transform:translateX(-50%);
              background:${isError ? '#a33b32' : '#2f7d5d'}; color:#fff; padding:.8rem 1.25rem;
              border-radius:8px; z-index:10005; font-family:system-ui,sans-serif; font-size:.92rem;
              box-shadow:0 8px 24px rgba(0,0,0,.25); max-width:90vw; text-align:center;`,
      text: message,
    });
    document.body.appendChild(note);
    setTimeout(() => note.remove(), isError ? 5000 : 2800);
  }
}
