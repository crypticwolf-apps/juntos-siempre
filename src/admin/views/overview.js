/**
 * Resumen: el primer vistazo al estado de la web.
 */
import { listProducts, listCategories, listActivity, listRevisions, isAdmin } from '../api.js';
import { el, formatDate } from '../ui.js';

const ACTION_LABEL = {
  crear: 'ha creado',
  editar: 'ha modificado',
  eliminar: 'ha eliminado',
  duplicar: 'ha duplicado',
  ordenar: 'ha reordenado',
  subir: 'ha subido',
};

const TYPE_LABEL = {
  producto: 'el producto',
  categoria: 'la categoría',
  seccion: 'la sección',
  pagina: 'la página',
  ajuste: 'la configuración',
  imagen: 'la fotografía',
  informe: 'el informe',
  usuario: 'el acceso de',
};

function stat(num, label) {
  return el('div', { class: 'adm-stat' }, [
    el('p', { class: 'adm-stat__num', text: String(num) }),
    el('p', { class: 'adm-stat__label', text: label }),
  ]);
}

export async function render(host, { navigate }) {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);

  const published = products.filter((p) => p.status === 'published').length;
  const hidden = products.filter((p) => p.status === 'hidden').length;
  const drafts = products.filter((p) => p.status === 'draft').length;
  const featured = products.filter((p) => p.is_featured).length;
  const activeCats = categories.filter((c) => c.is_active).length;

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: 'Resumen' }),
        el('p', { text: 'Todo lo que hay publicado ahora mismo en la web.' }),
      ]),
    ])
  );

  host.appendChild(
    el('div', { class: 'adm-stats' }, [
      stat(products.length, products.length === 1 ? 'Producto en total' : 'Productos en total'),
      stat(published, 'Publicados'),
      stat(hidden, 'Ocultos'),
      stat(drafts, 'En borrador'),
      stat(featured, 'Destacados'),
      stat(activeCats, 'Categorías activas'),
    ])
  );

  // Accesos rápidos
  host.appendChild(
    el('div', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: '¿Qué quieres hacer?' }),
      el('p', { class: 'adm-card__sub', text: 'Los atajos que más se usan.' }),
      el('div', { class: 'adm-actions' }, [
        el('button', {
          class: 'adm-btn adm-btn--primary adm-btn--big',
          type: 'button',
          text: '＋ Añadir producto',
          onClick: () => navigate('productos', 'nuevo'),
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--big',
          type: 'button',
          text: '✏️ Editar página visualmente',
          onClick: () => navigate('paginas'),
        }),
        el('a', {
          class: 'adm-btn adm-btn--ghost adm-btn--big',
          href: 'tienda.html',
          target: '_blank',
          rel: 'noopener',
          text: '🌐 Ver la tienda',
        }),
      ]),
    ])
  );

  // Últimos cambios
  const changes = el('div', { class: 'adm-card' }, [
    el('h2', { class: 'adm-card__title', text: 'Últimos cambios' }),
    el('p', { class: 'adm-card__sub', text: 'Quién ha cambiado qué y cuándo.' }),
  ]);
  host.appendChild(changes);

  let entries = [];
  try {
    // El registro completo solo lo ve quien administra; el resto ve su historial.
    entries = isAdmin() ? await listActivity(12) : await listRevisions({}, 12);
  } catch {
    entries = [];
  }

  if (!entries.length) {
    changes.appendChild(el('p', { class: 'adm-muted', text: 'Todavía no se ha registrado ningún cambio.' }));
    return;
  }

  changes.appendChild(
    el('ul', { class: 'adm-list' }, entries.map((entry) => {
      const who = entry.user_email || 'Alguien';
      const what = entry.action
        ? `${ACTION_LABEL[entry.action] || entry.action} ${TYPE_LABEL[entry.entity_type] || ''} ${entry.entity_label || ''}`
        : `ha modificado ${TYPE_LABEL[entry.entity_type] || ''} ${entry.entity_label || ''}`;
      return el('li', { class: 'adm-row', style: 'grid-template-columns: 1fr auto;' }, [
        el('div', {}, [
          el('p', { class: 'adm-row__name', text: what.replace(/\s+/g, ' ').trim() }),
          el('p', { class: 'adm-row__meta', text: who }),
        ]),
        el('span', { class: 'adm-muted', style: 'font-size:.82rem; white-space:nowrap', text: formatDate(entry.created_at) }),
      ]);
    }))
  );
}
