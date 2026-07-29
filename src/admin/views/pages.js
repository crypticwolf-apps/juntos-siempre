/**
 * Editar página: cambia los textos e imágenes de Inicio, Tienda, Historia y
 * Compromiso, ordena y oculta secciones, y añade o quita capítulos y apartados.
 *
 * Desde aquí también se abre el modo "Editar página visualmente", que permite
 * hacer los cambios encima de la web real.
 */
import {
  listPages, listSections, updateSection, updatePage,
  listImpactReports, saveImpactReport, deleteImpactReport,
} from '../api.js';
import { invalidateCache } from '../../lib/content.js';
import { resolveImage } from '../../lib/asset-map.js';
import {
  el, notify, friendlyError, confirmDialog, openModal, field, input, textarea,
  checkbox, emptyState, setDirty, select,
} from '../ui.js';
import { pickImage } from '../media.js';

// Cada página del gestor se corresponde con un archivo de la web.
const PAGE_FILES = {
  home: 'index.html',
  shop: 'tienda.html',
  story: 'historia.html',
  impact: 'impacto.html',
};

const MEDIA_FOLDER = { home: 'homepage', shop: 'general', story: 'history', impact: 'impact' };

// Nombres claros para los campos guardados.
const FIELD_LABELS = {
  brand: 'Marca', eyebrow: 'Antetítulo', title: 'Título', text: 'Texto', lead: 'Texto de entrada',
  slogan: 'Lema', body: 'Contenido', num: 'Número', caption: 'Pie de foto',
  image: 'Fotografía', image_alt: 'Descripción de la fotografía',
  title_line1: 'Título (primera línea)', title_line2: 'Título (segunda línea)',
  cta1_label: 'Texto del botón principal', cta1_href: 'Destino del botón principal',
  cta2_label: 'Texto del botón secundario', cta2_href: 'Destino del botón secundario',
  cta_label: 'Texto del botón', cta_href: 'Destino del botón',
  link_label: 'Texto del enlace', button: 'Texto del botón', consent: 'Texto de aceptación',
  field_label: 'Etiqueta del campo', placeholder: 'Texto de ayuda del campo',
  name_placeholder: 'Texto del campo Nombre', email_placeholder: 'Texto del campo Email',
  panel_title: 'Título del panel', toggle: 'Texto del botón de filtros',
  category: 'Filtro Categoría', color: 'Filtro Color', size: 'Filtro Talla',
  price: 'Filtro Precio', in_stock: 'Filtro Disponibles', clear: 'Botón Limpiar', apply: 'Botón Aplicar',
  per_page: 'Productos por página', visible: 'Visible',
};

function labelFor(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const m = key.match(/^(image|caption|item|pledge)(\d+)(_alt|_title|_text)?$/);
  if (m) {
    const base = { image: 'Fotografía', caption: 'Pie de foto', item: 'Elemento', pledge: 'Compromiso' }[m[1]];
    const suffix = { _alt: ' — descripción', _title: ' — título', _text: ' — texto' }[m[3]] || '';
    return `${base} ${m[2]}${suffix}`;
  }
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

const isImageKey = (key) => /^image\d*$/.test(key) || key === 'image';
const isLongKey = (key) => ['text', 'lead', 'body', 'description'].includes(key) || key.endsWith('_text');

// ---------------------------------------------------------------------------
// FORMULARIO GENÉRICO PARA LOS CAMPOS DE UNA SECCIÓN
// ---------------------------------------------------------------------------
function fieldsEditor(data, folder, onChange) {
  const host = el('div', {});

  Object.keys(data)
    .filter((key) => key !== 'items')
    .forEach((key) => {
      const value = data[key];

      if (isImageKey(key)) {
        const preview = el('img', {
          src: resolveImage(value) || '',
          alt: '',
          style: 'width:100%; max-width:220px; border-radius:8px; background:#efe9dd; aspect-ratio:16/10; object-fit:cover',
        });
        const btn = el('button', {
          class: 'adm-btn adm-btn--ghost',
          type: 'button',
          text: 'Cambiar fotografía',
          onClick: async () => {
            const picked = await pickImage({ folder, title: labelFor(key) });
            if (!picked) return;
            data[key] = picked.url;
            preview.src = picked.url;
            if (picked.alt && `${key}_alt` in data && !data[`${key}_alt`]) data[`${key}_alt`] = picked.alt;
            onChange();
          },
        });
        host.appendChild(
          el('div', { class: 'adm-field' }, [
            el('span', { class: 'adm-field__label', text: labelFor(key) }),
            preview,
            el('div', { style: 'margin-top:.6rem' }, [btn]),
          ])
        );
        return;
      }

      if (typeof value === 'number') {
        const control = input({ type: 'number', value: String(value), min: '1' });
        control.addEventListener('input', () => { data[key] = Number(control.value) || 0; onChange(); });
        host.appendChild(field(labelFor(key), control));
        return;
      }

      if (typeof value === 'boolean') {
        const box = checkbox(labelFor(key), value ? { checked: true } : {});
        box.querySelector('input').addEventListener('change', (e) => { data[key] = e.target.checked; onChange(); });
        host.appendChild(box);
        return;
      }

      const control = isLongKey(key)
        ? textarea({ value: value ?? '', rows: String(String(value ?? '').length > 220 ? 6 : 3) })
        : input({ value: value ?? '' });
      control.addEventListener('input', () => { data[key] = control.value; onChange(); });
      host.appendChild(field(labelFor(key), control));
    });

  return host;
}

// ---------------------------------------------------------------------------
// EDITOR DE LISTAS (capítulos de Historia, apartados de Compromiso)
// ---------------------------------------------------------------------------
function itemsEditor(data, folder, onChange, { itemName = 'elemento' } = {}) {
  const host = el('div', {});
  if (!Array.isArray(data.items)) data.items = [];

  function draw() {
    host.innerHTML = '';

    data.items.forEach((item, index) => {
      const title = item.title || item.num || `${itemName} ${index + 1}`;

      const visibleBox = checkbox('Se ve en la web', item.visible !== false ? { checked: true } : {});
      visibleBox.querySelector('input').addEventListener('change', (e) => {
        item.visible = e.target.checked;
        onChange();
      });

      const body = el('div', { style: 'display:none; margin-top:1rem' });
      const toggle = el('button', {
        class: 'adm-btn adm-btn--ghost adm-btn--sm',
        type: 'button',
        text: 'Editar',
        onClick: () => {
          const open = body.style.display !== 'none';
          body.style.display = open ? 'none' : 'block';
          toggle.textContent = open ? 'Editar' : 'Cerrar';
          if (!open && !body.childElementCount) {
            body.appendChild(fieldsEditor(item, folder, onChange));
          }
        },
      });

      const move = (delta) => {
        const target = index + delta;
        if (target < 0 || target >= data.items.length) return;
        [data.items[target], data.items[index]] = [data.items[index], data.items[target]];
        onChange();
        draw();
      };

      host.appendChild(
        el('div', { class: 'adm-row', style: 'grid-template-columns: 1fr' }, [
          el('div', {}, [
            el('p', { class: 'adm-row__name', text: title }),
            el('p', { class: 'adm-row__meta', text: item.visible === false ? 'Oculto' : 'Visible' }),
          ]),
          el('div', { class: 'adm-row__actions' }, [
            visibleBox,
            el('button', { class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: '▲', 'aria-label': 'Subir', onClick: () => move(-1) }),
            el('button', { class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: '▼', 'aria-label': 'Bajar', onClick: () => move(1) }),
            toggle,
            el('button', {
              class: 'adm-btn adm-btn--ghost adm-btn--sm',
              type: 'button',
              text: 'Eliminar',
              onClick: async () => {
                const ok = await confirmDialog({
                  title: `¿Eliminar "${title}"?`,
                  text: 'Se quitará de la página de forma definitiva.',
                  confirmLabel: 'Sí, eliminar',
                  danger: true,
                });
                if (!ok) return;
                data.items.splice(index, 1);
                onChange();
                draw();
              },
            }),
          ]),
          body,
        ])
      );
    });

    host.appendChild(
      el('button', {
        class: 'adm-btn adm-btn--ghost',
        type: 'button',
        text: `＋ Añadir ${itemName}`,
        onClick: () => {
          // El nuevo elemento copia la forma del anterior para que no falte nada.
          const template = data.items[0];
          const fresh = template
            ? Object.fromEntries(Object.keys(template).map((k) => [k, k === 'visible' ? true : '']))
            : { num: '', title: '', body: '', image: '', image_alt: '', visible: true };
          fresh.visible = true;
          fresh.title = `Nuevo ${itemName}`;
          data.items.push(fresh);
          onChange();
          draw();
        },
      })
    );
  }

  draw();
  return host;
}

// ---------------------------------------------------------------------------
// VISTA PRINCIPAL
// ---------------------------------------------------------------------------
export async function render(host, ctx) {
  const pages = await listPages();
  const [slugParam] = ctx.params;

  if (slugParam) {
    const page = pages.find((p) => p.slug === slugParam);
    if (page) return renderPage(host, ctx, page);
  }

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: 'Editar página' }),
        el('p', { text: 'Elige la página que quieres cambiar.' }),
      ]),
    ])
  );

  if (!pages.length) {
    host.appendChild(
      emptyState({
        icon: '📄',
        title: 'No hay páginas configuradas',
        text: 'Ejecuta el archivo de contenido inicial que viene con la web (0004_seed.sql) y vuelve a entrar.',
      })
    );
    return;
  }

  const list = el('div', { class: 'adm-list' });
  host.appendChild(list);

  pages.forEach((page) => {
    const file = PAGE_FILES[page.slug] || 'index.html';
    list.appendChild(
      el('article', { class: 'adm-row', style: 'grid-template-columns: 1fr auto' }, [
        el('div', {}, [
          el('p', { class: 'adm-row__name', text: page.name }),
          el('p', { class: 'adm-row__meta', text: file }),
        ]),
        el('div', { class: 'adm-row__actions' }, [
          el('a', {
            class: 'adm-btn adm-btn--primary adm-btn--sm',
            href: `${file}?editar=1`,
            target: '_blank',
            rel: 'noopener',
            text: '✏️ Editar visualmente',
          }),
          el('button', {
            class: 'adm-btn adm-btn--ghost adm-btn--sm',
            type: 'button',
            text: 'Editar por campos',
            onClick: () => ctx.navigate('paginas', page.slug),
          }),
          el('a', { class: 'adm-btn adm-btn--ghost adm-btn--sm', href: file, target: '_blank', rel: 'noopener', text: 'Ver' }),
        ]),
      ])
    );
  });

  host.appendChild(
    el('p', {
      class: 'adm-field__hint',
      style: 'margin-top:1.25rem',
      text: '"Editar visualmente" abre la web tal y como la ven los clientes y te deja cambiar textos e imágenes pulsando encima. "Editar por campos" muestra una lista con todos los textos de la página.',
    })
  );
}

// ---------------------------------------------------------------------------
// UNA PÁGINA CONCRETA
// ---------------------------------------------------------------------------
async function renderPage(host, { navigate }, page) {
  const sections = await listSections(page.id);
  const folder = MEDIA_FOLDER[page.slug] || 'general';
  const file = PAGE_FILES[page.slug] || 'index.html';

  // Copia de trabajo: nada se guarda hasta pulsar el botón.
  const draft = sections.map((s) => ({
    id: s.id,
    name: s.name,
    key: s.key,
    kind: s.kind,
    position: s.position,
    is_visible: s.is_visible,
    data: JSON.parse(JSON.stringify(s.data || {})),
    original: JSON.parse(JSON.stringify(s.data || {})),
  }));

  const touch = () => setDirty(true);

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: page.name }),
        el('p', { text: 'Cambia los textos y las fotografías de esta página.' }),
      ]),
      el('div', { class: 'adm-actions' }, [
        el('a', {
          class: 'adm-btn adm-btn--primary',
          href: `${file}?editar=1`,
          target: '_blank',
          rel: 'noopener',
          text: '✏️ Editar visualmente',
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost',
          type: 'button',
          text: '← Volver',
          onClick: () => navigate('paginas'),
        }),
      ]),
    ])
  );

  // ---- SEO de la página ---------------------------------------------------
  const seoTitle = input({ value: page.seo_title || '', maxlength: '70' });
  const seoDesc = textarea({ value: page.seo_description || '', rows: '2', maxlength: '180' });
  seoTitle.addEventListener('input', touch);
  seoDesc.addEventListener('input', touch);

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Cómo se ve esta página en Google' }),
      field('Título', seoTitle),
      field('Descripción', seoDesc),
    ])
  );

  // ---- Secciones ----------------------------------------------------------
  const sectionsHost = el('div', {});
  host.appendChild(sectionsHost);

  function drawSections() {
    sectionsHost.innerHTML = '';

    draft
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach((sec, index, arr) => {
        const visibleBox = checkbox('Se ve en la web', sec.is_visible ? { checked: true } : {});
        visibleBox.querySelector('input').addEventListener('change', (e) => {
          sec.is_visible = e.target.checked;
          touch();
        });

        const move = (delta) => {
          const target = index + delta;
          if (target < 0 || target >= arr.length) return;
          const a = arr[index];
          const b = arr[target];
          const tmp = a.position;
          a.position = b.position;
          b.position = tmp;
          touch();
          drawSections();
        };

        const body = el('div', { style: 'margin-top:1rem' });
        if (sec.kind === 'repeater') {
          body.appendChild(
            itemsEditor(sec.data, folder, touch, {
              itemName: page.slug === 'story' ? 'capítulo' : 'apartado',
            })
          );
        } else {
          body.appendChild(fieldsEditor(sec.data, folder, touch));
        }

        sectionsHost.appendChild(
          el('section', { class: 'adm-card' }, [
            el('div', { style: 'display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; justify-content:space-between' }, [
              el('h2', { class: 'adm-card__title', text: sec.name }),
              el('div', { class: 'adm-row__actions' }, [
                visibleBox,
                el('button', { class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: '▲', 'aria-label': 'Subir sección', onClick: () => move(-1) }),
                el('button', { class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: '▼', 'aria-label': 'Bajar sección', onClick: () => move(1) }),
              ]),
            ]),
            body,
          ])
        );
      });
  }

  drawSections();

  // ---- Informes de aportaciones (solo en Compromiso) ----------------------
  if (page.slug === 'impact') {
    await renderImpactReports(host);
  }

  // ---- Guardar ------------------------------------------------------------
  const stateText = el('p', { class: 'adm-savebar__state', text: 'Todo guardado' });
  const saveBtn = el('button', { class: 'adm-btn adm-btn--primary adm-btn--big', type: 'button', text: 'Guardar y publicar' });
  const discardBtn = el('button', { class: 'adm-btn adm-btn--ghost', type: 'button', text: 'Descartar cambios' });

  discardBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '¿Descartar los cambios?',
      text: 'Se perderá todo lo que hayas modificado desde la última vez que guardaste.',
      confirmLabel: 'Sí, descartar',
      danger: true,
    });
    if (!ok) return;
    setDirty(false);
    navigate('paginas', page.slug);
  });

  saveBtn.addEventListener('click', async () => {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    discardBtn.disabled = true;
    stateText.textContent = 'Guardando…';
    try {
      await Promise.all(
        draft.map((sec) =>
          updateSection(
            sec.id,
            { data: sec.data, is_visible: sec.is_visible, position: sec.position },
            sec.original
          )
        )
      );
      await updatePage(page.id, {
        seo_title: seoTitle.value || null,
        seo_description: seoDesc.value || null,
      });
      draft.forEach((sec) => { sec.original = JSON.parse(JSON.stringify(sec.data)); });

      invalidateCache();
      setDirty(false);
      stateText.textContent = 'Todo guardado';
      notify('Cambios publicados correctamente', 'success');
    } catch (error) {
      stateText.textContent = 'No se ha podido guardar';
      notify(friendlyError(error), 'error');
    } finally {
      saveBtn.disabled = false;
      discardBtn.disabled = false;
    }
  });

  host.appendChild(el('div', { class: 'adm-savebar' }, [stateText, discardBtn, saveBtn]));
}

// ---------------------------------------------------------------------------
// INFORMES DE APORTACIONES
// ---------------------------------------------------------------------------
async function renderImpactReports(host) {
  const card = el('section', { class: 'adm-card' }, [
    el('h2', { class: 'adm-card__title', text: 'Aportaciones e informes' }),
    el('p', {
      class: 'adm-card__sub',
      text: 'Cuando exista una aportación real, añádela aquí con su entidad, importe, fecha y propósito. Mientras no publiques ninguna, la web no muestra ninguna cifra.',
    }),
  ]);
  host.appendChild(card);

  let reports = [];
  try {
    reports = await listImpactReports();
  } catch (error) {
    card.appendChild(el('p', { class: 'adm-muted', text: friendlyError(error) }));
    return;
  }

  const list = el('div', { class: 'adm-list' });
  card.appendChild(list);

  function openForm(report) {
    const isNew = !report;
    const data = report || {
      title: '', entity: '', amount: '', report_date: '', purpose: '',
      description: '', media_url: '', status: 'draft',
    };

    const titleField = input({ value: data.title || '' });
    const entityField = input({ value: data.entity || '', placeholder: 'Nombre de la organización' });
    const amountField = input({ type: 'number', min: '0', step: '0.01', value: data.amount ?? '' });
    const dateField = input({ type: 'date', value: data.report_date || '' });
    const purposeField = input({ value: data.purpose || '' });
    const descField = textarea({ value: data.description || '', rows: '4' });
    const statusField = select(
      [
        { value: 'draft', label: 'Borrador (no se ve)' },
        { value: 'published', label: 'Publicado' },
        { value: 'hidden', label: 'Oculto' },
      ],
      { value: data.status || 'draft' }
    );

    const saveBtn = el('button', {
      class: 'adm-btn adm-btn--primary',
      type: 'button',
      text: 'Guardar y publicar',
      onClick: async () => {
        if (!titleField.value.trim()) return notify('El informe necesita un título.', 'error');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando…';
        try {
          const saved = await saveImpactReport(isNew ? null : report.id, {
            title: titleField.value.trim(),
            entity: entityField.value || null,
            amount: amountField.value === '' ? null : Number(amountField.value),
            report_date: dateField.value || null,
            purpose: purposeField.value || null,
            description: descField.value || null,
            status: statusField.value,
          });
          if (isNew) reports.push(saved);
          else Object.assign(report, saved);
          notify('Cambios publicados correctamente', 'success');
          modal.close();
          draw();
        } catch (error) {
          notify(friendlyError(error), 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Guardar y publicar';
        }
      },
    });

    const modal = openModal({
      title: isNew ? 'Añadir aportación' : 'Editar aportación',
      wide: true,
      body: el('div', {}, [
        field('Título', titleField),
        field('Entidad', entityField),
        el('div', { class: 'adm-grid-2' }, [
          field('Importe (€)', amountField),
          field('Fecha', dateField),
        ]),
        field('Propósito', purposeField),
        field('Descripción', descField),
        field('Estado', statusField),
      ]),
      footer: el('div', { class: 'adm-actions' }, [saveBtn]),
    });
  }

  function draw() {
    list.innerHTML = '';

    if (!reports.length) {
      list.appendChild(
        el('p', { class: 'adm-muted', text: 'Todavía no hay ninguna aportación registrada.' })
      );
    }

    reports.forEach((report) => {
      list.appendChild(
        el('div', { class: 'adm-row', style: 'grid-template-columns: 1fr auto' }, [
          el('div', {}, [
            el('p', { class: 'adm-row__name', text: report.title }),
            el('p', { class: 'adm-row__meta' }, [
              el('span', { class: `adm-badge adm-badge--${report.status}`, text: report.status === 'published' ? 'Publicado' : report.status === 'hidden' ? 'Oculto' : 'Borrador' }),
              report.entity ? el('span', { text: report.entity }) : null,
              report.report_date ? el('span', { text: report.report_date }) : null,
            ]),
          ]),
          el('div', { class: 'adm-row__actions' }, [
            el('button', { class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Editar', onClick: () => openForm(report) }),
            el('button', {
              class: 'adm-btn adm-btn--ghost adm-btn--sm',
              type: 'button',
              text: 'Eliminar',
              onClick: async () => {
                const ok = await confirmDialog({
                  title: `¿Eliminar "${report.title}"?`,
                  text: 'Se borrará de forma definitiva.',
                  confirmLabel: 'Sí, eliminar',
                  danger: true,
                });
                if (!ok) return;
                try {
                  await deleteImpactReport(report.id, report.title);
                  reports = reports.filter((r) => r.id !== report.id);
                  notify('Aportación eliminada', 'success');
                  draw();
                } catch (error) {
                  notify(friendlyError(error), 'error');
                }
              },
            }),
          ]),
        ])
      );
    });

    list.appendChild(
      el('button', {
        class: 'adm-btn adm-btn--ghost',
        type: 'button',
        text: '＋ Añadir aportación',
        onClick: () => openForm(null),
      })
    );
  }

  draw();
}
