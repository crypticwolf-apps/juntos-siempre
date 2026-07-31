/**
 * Categorías: crear, editar, ordenar, activar y eliminar.
 *
 * Los filtros de la tienda pública se generan solos a partir de estas
 * categorías y de los colores y tallas de los productos.
 */
import {
  listCategories, listProducts, createCategory, updateCategory,
  deleteCategory, reassignProducts, reorderCategories, uniqueSlug,
} from '../api.js';
import { invalidateCache } from '../../lib/content.js';
import { resolveImage } from '../../lib/asset-map.js';
import {
  el, notify, friendlyError, confirmDialog, openModal, field, input, textarea,
  select, checkbox, slugify, emptyState, makeSortable, dragHandle,
} from '../ui.js';
import { pickImage, recropAndUpload, IMAGE_SPECS } from '../media.js';

export async function render(host) {
  let categories = await listCategories();
  let products = await listProducts();

  const countFor = (id) => products.filter((p) => p.category_id === id).length;

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: 'Categorías' }),
        el('p', { text: 'Agrupan los productos y crean los filtros de la tienda.' }),
      ]),
      el('button', {
        class: 'adm-btn adm-btn--primary adm-btn--big',
        type: 'button',
        text: '＋ Añadir categoría',
        onClick: () => openForm(null),
      }),
    ])
  );

  const list = el('div', { class: 'adm-list' });
  host.appendChild(list);

  function draw() {
    list.innerHTML = '';

    if (!categories.length) {
      list.appendChild(
        emptyState({
          icon: '🗂️',
          title: 'Todavía no hay categorías',
          text: 'Crea la primera para poder agrupar los productos.',
          actionLabel: '＋ Añadir categoría',
          onAction: () => openForm(null),
        })
      );
      return;
    }

    categories
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach((cat) => {
        const n = countFor(cat.id);
        list.appendChild(
          el('article', { class: 'adm-row', 'data-id': cat.id, draggable: 'true' }, [
            dragHandle(),
            cat.image_url
              ? el('img', { class: 'adm-row__thumb', src: resolveImage(cat.image_url), alt: '', loading: 'lazy' })
              : el('div', { class: 'adm-row__thumb', 'aria-hidden': 'true' }),
            el('div', {}, [
              el('p', { class: 'adm-row__name', text: cat.name }),
              el('p', { class: 'adm-row__meta' }, [
                el('span', {
                  class: `adm-badge adm-badge--${cat.is_active ? 'published' : 'hidden'}`,
                  text: cat.is_active ? 'Activa' : 'Oculta',
                }),
                el('span', { text: `${n} ${n === 1 ? 'producto' : 'productos'}` }),
              ]),
            ]),
            el('div', { class: 'adm-row__actions' }, [
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Editar',
                onClick: () => openForm(cat),
              }),
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button',
                text: cat.is_active ? 'Ocultar' : 'Activar',
                onClick: () => toggleActive(cat),
              }),
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Eliminar',
                onClick: () => remove(cat),
              }),
            ]),
          ])
        );
      });
  }

  async function toggleActive(cat) {
    try {
      await updateCategory(cat.id, { is_active: !cat.is_active }, { ...cat });
      cat.is_active = !cat.is_active;
      invalidateCache();
      notify('Cambios publicados correctamente', 'success');
      draw();
    } catch (error) {
      notify(friendlyError(error), 'error');
    }
  }

  // -------------------------------------------------------------------------
  // ELIMINAR CON PRODUCTOS DENTRO
  // -------------------------------------------------------------------------
  async function remove(cat) {
    const n = countFor(cat.id);

    if (!n) {
      const ok = await confirmDialog({
        title: `¿Eliminar "${cat.name}"?`,
        text: 'Esta categoría está vacía. Se eliminará de forma definitiva.',
        confirmLabel: 'Sí, eliminar',
        danger: true,
      });
      if (!ok) return;
      return doDelete(cat, null);
    }

    // Hay productos dentro: hay que decidir qué hacer con ellos.
    const others = categories.filter((c) => c.id !== cat.id);
    const choice = select(
      [
        ...others.map((c) => ({ value: c.id, label: `Moverlos a "${c.name}"` })),
        { value: '', label: 'Dejarlos sin categoría' },
      ],
      {}
    );

    await new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        modal.close();
        resolve(value);
      };

      const confirmBtn = el('button', {
        class: 'adm-btn adm-btn--danger',
        type: 'button',
        text: 'Eliminar la categoría',
        onClick: async () => {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Eliminando…';
          try {
            await doDelete(cat, choice.value || null);
            finish(true);
          } catch (error) {
            notify(friendlyError(error), 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Eliminar la categoría';
          }
        },
      });

      const modal = openModal({
        title: `"${cat.name}" tiene ${n} ${n === 1 ? 'producto' : 'productos'}`,
        body: el('div', {}, [
          el('p', {
            class: 'adm-modal__text',
            text: 'Antes de eliminarla, decide qué quieres hacer con esos productos. No se borrará ningún producto.',
          }),
          el('div', { style: 'margin-top:1rem' }, [field('¿Qué hacemos con ellos?', choice)]),
        ]),
        footer: el('div', { class: 'adm-actions' }, [
          el('button', { class: 'adm-btn adm-btn--ghost', type: 'button', text: 'Cancelar', onClick: () => finish(false) }),
          confirmBtn,
        ]),
        onClose: () => finish(false),
      });
    });
  }

  async function doDelete(cat, moveToId) {
    if (countFor(cat.id)) await reassignProducts(cat.id, moveToId);
    await deleteCategory(cat.id, cat.name);
    categories = categories.filter((c) => c.id !== cat.id);
    products = products.map((p) =>
      p.category_id === cat.id ? { ...p, category_id: moveToId || null } : p
    );
    invalidateCache();
    notify('Categoría eliminada', 'success');
    draw();
  }

  // -------------------------------------------------------------------------
  // FORMULARIO
  // -------------------------------------------------------------------------
  function openForm(cat) {
    const isNew = !cat;
    const data = cat
      ? { ...cat }
      : { name: '', slug: '', description: '', image_url: '', image_alt: '', is_active: true, seo_title: '', seo_description: '' };

    const nameField = input({ value: data.name, placeholder: 'Camisetas' });
    const slugField = input({ value: data.slug, placeholder: 'camisetas' });
    let slugTouched = Boolean(data.slug);

    nameField.addEventListener('input', () => {
      if (!slugTouched) slugField.value = slugify(nameField.value);
    });
    slugField.addEventListener('input', () => { slugTouched = true; });

    const descField = textarea({ value: data.description || '', rows: '3' });
    const altField = input({ value: data.image_alt || '', placeholder: 'Describe la imagen' });
    const seoTitleField = input({ value: data.seo_title || '' });
    const seoDescField = textarea({ value: data.seo_description || '', rows: '2' });
    const activeBox = checkbox('Mostrar esta categoría en la web', data.is_active ? { checked: true } : {});

    const preview = el('img', {
      src: resolveImage(data.image_url) || '',
      alt: '',
      style: 'width:100%; max-width:220px; aspect-ratio:4/5; object-fit:cover; border-radius:8px; background:#efe9dd',
    });
    let imageUrl = data.image_url || '';

    const imageBtn = el('button', {
      class: 'adm-btn adm-btn--ghost',
      type: 'button',
      text: imageUrl ? 'Cambiar imagen' : 'Elegir imagen',
      onClick: async () => {
        const picked = await pickImage({
          folder: 'categories', title: 'Imagen de la categoría',
          aspect: 4 / 5, hint: IMAGE_SPECS.category,
        });
        if (!picked) return;
        imageUrl = picked.url;
        preview.src = picked.url;
        imageBtn.textContent = 'Cambiar imagen';
        recropBtn.hidden = false;
        if (!altField.value && picked.alt) altField.value = picked.alt;
      },
    });
    const recropBtn = el('button', {
      class: 'adm-btn adm-btn--ghost adm-btn--sm',
      type: 'button',
      text: '✂ Encuadrar',
      hidden: !imageUrl,
      onClick: async () => {
        if (!imageUrl) return;
        const row = await recropAndUpload(resolveImage(imageUrl), { folder: 'categories', aspect: 4 / 5, hint: IMAGE_SPECS.category });
        if (!row) return;
        imageUrl = row.url;
        preview.src = row.url;
        notify('Encuadre aplicado', 'success');
      },
    });

    const saveBtn = el('button', { class: 'adm-btn adm-btn--primary', type: 'button', text: 'Guardar y publicar' });

    saveBtn.addEventListener('click', async () => {
      const name = nameField.value.trim();
      if (!name) return notify('La categoría necesita un nombre.', 'error');

      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando…';
      try {
        const slug = await uniqueSlug(slugify(slugField.value || name), 'categories', isNew ? null : cat.id);
        const values = {
          name,
          slug,
          description: descField.value || null,
          image_url: imageUrl || null,
          image_alt: altField.value || null,
          is_active: activeBox.querySelector('input').checked,
          seo_title: seoTitleField.value || null,
          seo_description: seoDescField.value || null,
        };

        if (isNew) {
          const created = await createCategory({ ...values, position: categories.length + 1 });
          categories.push(created);
        } else {
          const updated = await updateCategory(cat.id, values, { ...cat });
          Object.assign(cat, updated);
        }

        invalidateCache();
        notify('Cambios publicados correctamente', 'success');
        modal.close();
        draw();
      } catch (error) {
        notify(friendlyError(error), 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar y publicar';
      }
    });

    const modal = openModal({
      title: isNew ? 'Añadir categoría' : `Editar "${cat.name}"`,
      wide: true,
      body: el('div', {}, [
        field('Nombre', nameField),
        field('Dirección en la web', slugField, { hint: 'Se crea sola a partir del nombre.' }),
        field('Descripción', descField),
        el('div', { class: 'adm-field' }, [
          el('span', { class: 'adm-field__label', text: 'Imagen' }),
          preview,
          el('div', { class: 'adm-actions', style: 'margin-top:.6rem; gap:.5rem' }, [imageBtn, recropBtn]),
          el('span', { class: 'adm-field__hint', text: IMAGE_SPECS.category }),
        ]),
        field('Descripción de la imagen', altField),
        activeBox,
        field('Título para buscadores', seoTitleField),
        field('Descripción para buscadores', seoDescField),
      ]),
      footer: el('div', { class: 'adm-actions' }, [saveBtn]),
    });
  }

  makeSortable(list, '.adm-row', async (orderedIds) => {
    try {
      await reorderCategories(orderedIds);
      orderedIds.forEach((id, index) => {
        const found = categories.find((c) => c.id === id);
        if (found) found.position = index + 1;
      });
      invalidateCache();
      notify('Orden guardado', 'success');
    } catch (error) {
      notify(friendlyError(error), 'error');
      draw();
    }
  });

  draw();
}
