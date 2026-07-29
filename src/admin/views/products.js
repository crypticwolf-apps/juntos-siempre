/**
 * Productos: listado con búsqueda, filtros, orden por arrastre y acciones
 * rápidas. Si la dirección incluye un producto, se abre su ficha.
 */
import {
  listProducts, listCategories, updateProduct, deleteProduct,
  duplicateProduct, reorderProducts,
} from '../api.js';
import {
  el, $$, notify, friendlyError, confirmDialog, emptyState, input, select,
  makeSortable, dragHandle, formatPrice, statusLabel,
} from '../ui.js';
import { renderProductForm } from './product-form.js';

export async function render(host, ctx) {
  const [first] = ctx.params;
  if (first) return renderProductForm(host, ctx, first);
  return renderList(host, ctx);
}

async function renderList(host, { navigate }) {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const state = { search: '', status: 'all', category: 'all', sort: 'position' };

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: 'Productos' }),
        el('p', { text: 'Crea, ordena y publica las prendas de la tienda.' }),
      ]),
      el('button', {
        class: 'adm-btn adm-btn--primary adm-btn--big',
        type: 'button',
        text: '＋ Añadir producto',
        onClick: () => navigate('productos', 'nuevo'),
      }),
    ])
  );

  if (!products.length) {
    host.appendChild(
      emptyState({
        icon: '👕',
        title: 'Todavía no hay productos',
        text: 'Añade el primero y aparecerá en la tienda en cuanto lo publiques.',
        actionLabel: '＋ Añadir producto',
        onAction: () => navigate('productos', 'nuevo'),
      })
    );
    return;
  }

  // ---- Barra de búsqueda y filtros ----
  const searchInput = input({ type: 'search', placeholder: 'Buscar por nombre…', 'aria-label': 'Buscar productos' });
  const statusSelect = select(
    [
      { value: 'all', label: 'Todos los estados' },
      { value: 'published', label: 'Solo publicados' },
      { value: 'draft', label: 'Solo borradores' },
      { value: 'hidden', label: 'Solo ocultos' },
    ],
    { 'aria-label': 'Filtrar por estado' }
  );
  const categorySelect = select(
    [{ value: 'all', label: 'Todas las categorías' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    { 'aria-label': 'Filtrar por categoría' }
  );
  const sortSelect = select(
    [
      { value: 'position', label: 'Orden de la tienda' },
      { value: 'name', label: 'Nombre (A-Z)' },
      { value: 'price-asc', label: 'Precio: de menor a mayor' },
      { value: 'price-desc', label: 'Precio: de mayor a menor' },
      { value: 'recent', label: 'Modificados recientemente' },
    ],
    { 'aria-label': 'Ordenar' }
  );

  host.appendChild(
    el('div', { class: 'adm-toolbar' }, [searchInput, statusSelect, categorySelect, sortSelect])
  );

  const hint = el('p', { class: 'adm-muted', style: 'font-size:.85rem; margin-bottom:.75rem' });
  host.appendChild(hint);

  const list = el('div', { class: 'adm-list' });
  host.appendChild(list);

  // ---- Pintado ----
  function visibleProducts() {
    let out = [...products];
    const q = state.search.trim().toLowerCase();
    if (q) out = out.filter((p) => `${p.name} ${p.sku || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q));
    if (state.status !== 'all') out = out.filter((p) => p.status === state.status);
    if (state.category !== 'all') out = out.filter((p) => p.category_id === state.category);

    if (state.sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    else if (state.sort === 'price-asc') out.sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') out.sort((a, b) => b.price - a.price);
    else if (state.sort === 'recent') out.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    else out.sort((a, b) => a.position - b.position);
    return out;
  }

  function thumbFor(product) {
    const images = product.product_images || [];
    const primary = images.find((i) => i.is_primary) || [...images].sort((a, b) => a.position - b.position)[0];
    return primary?.url || '';
  }

  function draw() {
    const items = visibleProducts();
    const sortable = state.sort === 'position' && state.status === 'all' && state.category === 'all' && !state.search;

    hint.textContent = sortable
      ? `${items.length} ${items.length === 1 ? 'producto' : 'productos'}. Arrastra para cambiar el orden en que se ven en la tienda.`
      : `${items.length} ${items.length === 1 ? 'producto' : 'productos'}. Para reordenar, vuelve a "Orden de la tienda" y quita los filtros.`;

    list.innerHTML = '';

    if (!items.length) {
      list.appendChild(
        emptyState({
          icon: '🔍',
          title: 'No hay productos con esa búsqueda',
          text: 'Prueba con otro nombre o quita los filtros.',
          actionLabel: 'Quitar filtros',
          onAction: () => {
            state.search = '';
            state.status = 'all';
            state.category = 'all';
            searchInput.value = '';
            statusSelect.value = 'all';
            categorySelect.value = 'all';
            draw();
          },
        })
      );
      return;
    }

    items.forEach((product) => {
      const thumb = thumbFor(product);

      const badges = el('p', { class: 'adm-row__meta' }, [
        el('span', { class: `adm-badge adm-badge--${product.status}`, text: statusLabel(product.status) }),
        product.is_featured ? el('span', { class: 'adm-badge adm-badge--star', text: '★ Destacado' }) : null,
        el('span', { text: catName[product.category_id] || 'Sin categoría' }),
        el('span', { text: formatPrice(product.price) }),
      ]);

      const actions = el('div', { class: 'adm-row__actions' }, [
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Editar',
          onClick: () => navigate('productos', product.id),
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button',
          text: product.is_featured ? 'Quitar destacado' : 'Destacar',
          onClick: () => toggle(product, { is_featured: !product.is_featured }),
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button',
          text: product.status === 'published' ? 'Ocultar' : 'Publicar',
          onClick: () =>
            toggle(product, { status: product.status === 'published' ? 'hidden' : 'published' }),
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Duplicar',
          onClick: () => duplicate(product),
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Eliminar',
          onClick: () => remove(product),
        }),
      ]);

      list.appendChild(
        el('article', {
          class: 'adm-row',
          'data-id': product.id,
          ...(sortable ? { draggable: 'true' } : {}),
        }, [
          sortable ? dragHandle() : el('span'),
          thumb
            ? el('img', { class: 'adm-row__thumb', src: thumb, alt: '', loading: 'lazy' })
            : el('div', { class: 'adm-row__thumb', 'aria-hidden': 'true' }),
          el('div', {}, [el('p', { class: 'adm-row__name', text: product.name }), badges]),
          actions,
        ])
      );
    });
  }

  // ---- Acciones ----
  async function toggle(product, values) {
    try {
      await updateProduct(product.id, values, { ...product });
      Object.assign(product, values);
      notify('Cambios publicados correctamente', 'success');
      draw();
    } catch (error) {
      notify(friendlyError(error), 'error');
    }
  }

  async function duplicate(product) {
    try {
      const copy = await duplicateProduct(product.id);
      notify(`Se ha creado "${copy.name}" como borrador.`, 'success');
      navigate('productos', copy.id);
    } catch (error) {
      notify(friendlyError(error), 'error');
    }
  }

  async function remove(product) {
    const ok = await confirmDialog({
      title: `¿Eliminar "${product.name}"?`,
      text: 'Se borrará el producto con sus tallas, colores y fotografías. Esta acción no se puede deshacer. Si solo quieres que deje de verse, usa "Ocultar".',
      confirmLabel: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(product.id, product.name);
      const index = products.findIndex((p) => p.id === product.id);
      if (index >= 0) products.splice(index, 1);
      notify('Producto eliminado', 'success');
      draw();
    } catch (error) {
      notify(friendlyError(error), 'error');
    }
  }

  makeSortable(list, '.adm-row', async (orderedIds) => {
    try {
      await reorderProducts(orderedIds);
      orderedIds.forEach((id, index) => {
        const found = products.find((p) => p.id === id);
        if (found) found.position = index + 1;
      });
      notify('Orden guardado', 'success');
    } catch (error) {
      notify(friendlyError(error), 'error');
      draw();
    }
  });

  // ---- Eventos de la barra ----
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = searchInput.value;
      draw();
    }, 180);
  });
  statusSelect.addEventListener('change', () => { state.status = statusSelect.value; draw(); });
  categorySelect.addEventListener('change', () => { state.category = categorySelect.value; draw(); });
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; draw(); });

  draw();
}
