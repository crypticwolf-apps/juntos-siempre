/**
 * Biblioteca de imágenes: todas las fotografías subidas, con su carpeta.
 */
import { listMedia, deleteMedia, supabase } from '../api.js';
import {
  el, notify, friendlyError, confirmDialog, select, input, emptyState, formatDate,
} from '../ui.js';
import { dropZone, FOLDERS, IMAGE_SPECS } from '../media.js';

function readableSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function render(host) {
  let items = await listMedia();
  let folder = 'all';

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: 'Imágenes' }),
        el('p', { text: 'Todas las fotografías que has subido. Se pueden reutilizar en cualquier parte de la web.' }),
      ]),
    ])
  );

  const folderSelect = select(
    [{ value: 'all', label: 'Todas las carpetas' }, ...FOLDERS],
    { 'aria-label': 'Filtrar por carpeta' }
  );
  const uploadFolder = select(FOLDERS, { value: 'general', 'aria-label': 'Carpeta de destino' });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Subir fotografías' }),
      el('p', { class: 'adm-card__sub', text: 'Se optimizan solas al subirlas (máximo 2000 px de lado) para que la web siga siendo rápida.' }),
      el('ul', { class: 'adm-specs' }, [
        el('li', { text: `Fotos de producto — ${IMAGE_SPECS.product}` }),
        el('li', { text: `Imagen de categoría — ${IMAGE_SPECS.category}` }),
        el('li', { text: `Banner / cabecera — ${IMAGE_SPECS.hero}` }),
        el('li', { text: `Icono del navegador — ${IMAGE_SPECS.favicon}` }),
        el('li', { text: `Icono del móvil — ${IMAGE_SPECS.app_icon}` }),
        el('li', { text: `Compartir en redes — ${IMAGE_SPECS.og}` }),
      ]),
      el('div', { style: 'max-width:320px; margin-bottom:1rem' }, [
        el('span', { class: 'adm-field__label', text: 'Guardar en la carpeta' }),
        uploadFolder,
      ]),
      dropZone({
        folder: 'general',
        onUploaded: async (rows) => {
          items = [...rows, ...items];
          draw();
        },
      }),
    ])
  );

  uploadFolder.addEventListener('change', () => {
    // Se vuelve a crear la zona de subida apuntando a la carpeta elegida.
    const card = uploadFolder.closest('.adm-card');
    const old = card.querySelector('.adm-drop-wrap');
    const fresh = dropZone({
      folder: uploadFolder.value,
      onUploaded: (rows) => {
        items = [...rows, ...items];
        draw();
      },
    });
    old.replaceWith(fresh);
  });

  host.appendChild(el('div', { class: 'adm-toolbar' }, [folderSelect]));

  const grid = el('div', { class: 'adm-photos' });
  host.appendChild(grid);

  function draw() {
    const visible = folder === 'all' ? items : items.filter((i) => i.folder === folder);
    grid.innerHTML = '';

    if (!visible.length) {
      grid.appendChild(
        emptyState({
          icon: '🖼️',
          title: 'No hay fotografías aquí',
          text: 'Sube la primera con el recuadro de arriba.',
        })
      );
      return;
    }

    visible.forEach((item) => {
      const altField = input({ value: item.alt || '', placeholder: 'Describe la foto' });
      let saveTimer;
      altField.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          try {
            await supabase.from('media_library').update({ alt: altField.value }).eq('id', item.id);
            item.alt = altField.value;
          } catch (error) {
            notify(friendlyError(error), 'error');
          }
        }, 600);
      });

      grid.appendChild(
        el('figure', { class: 'adm-photo' }, [
          el('img', { class: 'adm-photo__img', src: item.url, alt: item.alt || item.filename, loading: 'lazy' }),
          el('span', {
            class: 'adm-photo__tag',
            text: FOLDERS.find((f) => f.value === item.folder)?.label || item.folder,
          }),
          el('div', { class: 'adm-photo__body' }, [
            altField,
            el('p', {
              class: 'adm-muted',
              style: 'font-size:.75rem; margin-top:.35rem',
              text: `${readableSize(item.size_bytes)} · ${formatDate(item.created_at)}`,
            }),
            el('div', { class: 'adm-photo__actions' }, [
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm',
                type: 'button',
                text: 'Eliminar',
                onClick: async () => {
                  const ok = await confirmDialog({
                    title: '¿Eliminar esta fotografía?',
                    text: 'Se borrará definitivamente. Si se está usando en algún producto o página, ahí dejará de verse.',
                    confirmLabel: 'Sí, eliminar',
                    danger: true,
                  });
                  if (!ok) return;
                  try {
                    await deleteMedia(item);
                    items = items.filter((i) => i.id !== item.id);
                    notify('Fotografía eliminada', 'success');
                    draw();
                  } catch (error) {
                    notify(friendlyError(error), 'error');
                  }
                },
              }),
            ]),
          ]),
        ])
      );
    });
  }

  folderSelect.addEventListener('change', () => {
    folder = folderSelect.value;
    draw();
  });

  draw();
}
