/**
 * Ficha de producto: todos los datos, las tallas y colores, y las fotografías.
 *
 * Las tallas y los colores se añaden pulsando botones. En ningún momento hay
 * que escribir estructuras raras ni tocar código.
 */
import {
  getProduct, createProduct, updateProduct, listCategories,
  saveVariants, saveProductImages, uniqueSlug,
} from '../api.js';
import { invalidateCache } from '../../lib/content.js';
import { resolveImage } from '../../lib/asset-map.js';
import {
  el, notify, friendlyError, confirmDialog, field, input, textarea, select,
  checkbox, slugify, setDirty, makeSortable, setFieldError,
} from '../ui.js';
import { dropZone, pickImage } from '../media.js';

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOR_PRESETS = [
  { name: 'Negro', hex: '#1c1c1c' },
  { name: 'Blanco roto', hex: '#f3efe6' },
  { name: 'Arena', hex: '#d8c5a4' },
  { name: 'Gris piedra', hex: '#9c968c' },
  { name: 'Azul marino', hex: '#212f40' },
  { name: 'Beige', hex: '#cdbb9c' },
  { name: 'Natural', hex: '#e4dccb' },
  { name: 'Kraft', hex: '#c4a373' },
];

const STOCK_OPTIONS = [
  { value: 'in_stock', label: 'Disponible' },
  { value: 'low_stock', label: 'Quedan pocas' },
  { value: 'out_of_stock', label: 'Agotado' },
  { value: 'preorder', label: 'Reserva anticipada' },
];

const blankProduct = () => ({
  name: '', slug: '', category_id: null, short_description: '', description: '',
  composition: '', care: '', shipping_note: '', price: '', compare_at_price: '',
  status: 'draft', is_featured: false, is_new: false, position: 999, tags: [],
  stock_status: 'in_stock', sku: '', requires_size: true, size_label: '',
  seo_title: '', seo_description: '', image_alt: '',
  product_variants: [], product_images: [],
});

export async function renderProductForm(host, { navigate }, idOrNew) {
  const isNew = idOrNew === 'nuevo';
  const [categories, product] = await Promise.all([
    listCategories(),
    isNew ? Promise.resolve(blankProduct()) : getProduct(idOrNew),
  ]);

  const original = JSON.parse(JSON.stringify(product));

  // --- Estado editable -----------------------------------------------------
  const form = { ...product };
  const sizes = [];
  const colors = [];
  const variantMap = new Map(); // "colorSlug|talla" -> { stock, sku, price, is_active }
  let images = (product.product_images || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ url: i.url, storage_path: i.storage_path, alt: i.alt || '', color_slug: i.color_slug || '' }));

  (product.product_variants || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .forEach((v) => {
      if (!sizes.includes(v.size)) sizes.push(v.size);
      if (!colors.some((c) => c.slug === v.color_slug)) {
        colors.push({ name: v.color_name, slug: v.color_slug, hex: v.color_hex });
      }
      variantMap.set(`${v.color_slug}|${v.size}`, {
        stock: v.stock, sku: v.sku || '', price: v.price ?? '', is_active: v.is_active,
      });
    });

  const touch = () => setDirty(true);

  // ==========================================================================
  // CABECERA
  // ==========================================================================
  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: isNew ? 'Añadir producto' : 'Editar producto' }),
        el('p', { text: isNew ? 'Rellena los datos y pulsa "Guardar y publicar".' : product.name }),
      ]),
      el('button', {
        class: 'adm-btn adm-btn--ghost',
        type: 'button',
        text: '← Volver a la lista',
        onClick: () => navigate('productos'),
      }),
    ])
  );

  // ==========================================================================
  // DATOS BÁSICOS
  // ==========================================================================
  const nameInput = input({ value: form.name, placeholder: 'Camiseta Essential', maxlength: '120' });
  const slugInput = input({ value: form.slug, placeholder: 'camiseta-essential' });
  let slugTouched = Boolean(form.slug);

  nameInput.addEventListener('input', () => {
    form.name = nameInput.value;
    if (!slugTouched) {
      form.slug = slugify(nameInput.value);
      slugInput.value = form.slug;
    }
    touch();
  });
  slugInput.addEventListener('input', () => {
    slugTouched = true;
    form.slug = slugify(slugInput.value);
    touch();
  });
  slugInput.addEventListener('blur', () => {
    slugInput.value = form.slug;
  });

  const categorySelect = select(
    [{ value: '', label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    { value: form.category_id || '' }
  );
  categorySelect.addEventListener('change', () => {
    form.category_id = categorySelect.value || null;
    touch();
  });

  const shortInput = textarea({ value: form.short_description || '', rows: '2', placeholder: 'Una frase que resuma la prenda.' });
  shortInput.addEventListener('input', () => { form.short_description = shortInput.value; touch(); });

  const descInput = textarea({ value: form.description || '', rows: '5' });
  descInput.addEventListener('input', () => { form.description = descInput.value; touch(); });

  const priceInput = input({ type: 'number', min: '0', step: '0.01', value: form.price ?? '' });
  priceInput.addEventListener('input', () => { form.price = priceInput.value; touch(); });

  const compareInput = input({ type: 'number', min: '0', step: '0.01', value: form.compare_at_price ?? '' });
  compareInput.addEventListener('input', () => { form.compare_at_price = compareInput.value; touch(); });

  const statusSelect = select(
    [
      { value: 'draft', label: 'Borrador (no se ve en la web)' },
      { value: 'published', label: 'Publicado (visible para todos)' },
      { value: 'hidden', label: 'Oculto (guardado pero no visible)' },
    ],
    { value: form.status }
  );
  statusSelect.addEventListener('change', () => { form.status = statusSelect.value; touch(); });

  const featuredBox = checkbox('Destacar en la página de inicio', form.is_featured ? { checked: true } : {});
  featuredBox.querySelector('input').addEventListener('change', (e) => { form.is_featured = e.target.checked; touch(); });

  const newBox = checkbox('Marcar como novedad', form.is_new ? { checked: true } : {});
  newBox.querySelector('input').addEventListener('change', (e) => { form.is_new = e.target.checked; touch(); });

  const tagsInput = input({ value: (form.tags || []).join(', '), placeholder: 'regalo, algodón, unisex' });
  tagsInput.addEventListener('input', () => {
    form.tags = tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean);
    touch();
  });

  const stockSelect = select(STOCK_OPTIONS, { value: form.stock_status });
  stockSelect.addEventListener('change', () => { form.stock_status = stockSelect.value; touch(); });

  const skuInput = input({ value: form.sku || '', placeholder: 'Opcional' });
  skuInput.addEventListener('input', () => { form.sku = skuInput.value; touch(); });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Datos del producto' }),
      el('p', { class: 'adm-card__sub', text: 'Lo que verá quien visite la tienda.' }),
      field('Nombre', nameInput),
      field('Dirección en la web', slugInput, {
        hint: 'Se crea sola a partir del nombre. Solo cámbiala si sabes lo que haces: si la cambias, los enlaces antiguos dejarán de funcionar.',
      }),
      el('div', { class: 'adm-grid-2' }, [
        field('Categoría', categorySelect),
        field('Estado', statusSelect),
      ]),
      field('Descripción corta', shortInput, { hint: 'Aparece en la tarjeta del producto.' }),
      field('Descripción completa', descInput),
      el('div', { class: 'adm-grid-2' }, [
        field('Precio (€)', priceInput),
        field('Precio anterior (€)', compareInput, { hint: 'Solo si está en oferta. Déjalo vacío si no lo está.' }),
      ]),
      el('div', { class: 'adm-grid-2' }, [
        field('Disponibilidad', stockSelect),
        field('Referencia interna', skuInput, { hint: 'Solo para ti. No se muestra en la web.' }),
      ]),
      field('Etiquetas', tagsInput, { hint: 'Separadas por comas.' }),
      featuredBox,
      newBox,
    ])
  );

  // ==========================================================================
  // TALLAS Y COLORES
  // ==========================================================================
  const requiresSizeBox = checkbox('Este producto se vende por tallas', form.requires_size ? { checked: true } : {});
  const sizeLabelInput = input({ value: form.size_label || '', placeholder: 'Talla' });
  sizeLabelInput.addEventListener('input', () => { form.size_label = sizeLabelInput.value; touch(); });

  const sizeChips = el('div', { class: 'adm-chips' });
  const colorChips = el('div', { class: 'adm-chips' });
  const variantHost = el('div', { class: 'adm-table-scroll' });
  const sizeBlock = el('div', {});

  function drawSizes() {
    sizeChips.innerHTML = '';

    SIZE_PRESETS.forEach((s) => {
      const active = sizes.includes(s);
      sizeChips.appendChild(
        el('button', {
          class: 'adm-chip' + (active ? ' is-active' : ''),
          type: 'button',
          'aria-pressed': active ? 'true' : 'false',
          text: s,
          onClick: () => {
            if (active) sizes.splice(sizes.indexOf(s), 1);
            else sizes.push(s);
            touch();
            drawSizes();
            drawVariants();
          },
        })
      );
    });

    // Tallas propias que no están entre las habituales
    sizes
      .filter((s) => !SIZE_PRESETS.includes(s))
      .forEach((s) => {
        sizeChips.appendChild(
          el('span', { class: 'adm-chip is-active' }, [
            el('span', { text: s }),
            el('button', {
              class: 'adm-chip__remove',
              type: 'button',
              'aria-label': `Quitar la talla ${s}`,
              text: '✕',
              onClick: () => {
                sizes.splice(sizes.indexOf(s), 1);
                touch();
                drawSizes();
                drawVariants();
              },
            }),
          ])
        );
      });

    sizeChips.appendChild(
      el('button', {
        class: 'adm-chip',
        type: 'button',
        text: '＋ Añadir talla',
        onClick: () => {
          const value = prompt('¿Qué talla quieres añadir? (por ejemplo: 3XL, Única o 50 €)');
          const clean = (value || '').trim();
          if (!clean) return;
          if (sizes.includes(clean)) return notify('Esa talla ya está añadida.', 'error');
          sizes.push(clean);
          touch();
          drawSizes();
          drawVariants();
        },
      })
    );
  }

  function drawColors() {
    colorChips.innerHTML = '';

    colors.forEach((c) => {
      colorChips.appendChild(
        el('span', { class: 'adm-chip is-active' }, [
          el('span', { class: 'adm-chip__dot', style: `background:${c.hex}` }),
          el('span', { text: c.name }),
          el('button', {
            class: 'adm-chip__remove',
            type: 'button',
            'aria-label': `Quitar el color ${c.name}`,
            text: '✕',
            onClick: async () => {
              const usedByPhotos = images.some((i) => i.color_slug === c.slug);
              if (usedByPhotos) {
                const ok = await confirmDialog({
                  title: `¿Quitar el color ${c.name}?`,
                  text: 'Hay fotografías asignadas a este color. Se quedarán sin color asignado.',
                  confirmLabel: 'Sí, quitar',
                  danger: true,
                });
                if (!ok) return;
                images = images.map((i) => (i.color_slug === c.slug ? { ...i, color_slug: '' } : i));
              }
              colors.splice(colors.indexOf(c), 1);
              touch();
              drawColors();
              drawVariants();
              drawPhotos();
            },
          }),
        ])
      );
    });

    COLOR_PRESETS.filter((p) => !colors.some((c) => c.slug === slugify(p.name))).forEach((p) => {
      colorChips.appendChild(
        el('button', {
          class: 'adm-chip',
          type: 'button',
          onClick: () => {
            colors.push({ name: p.name, slug: slugify(p.name), hex: p.hex });
            touch();
            drawColors();
            drawVariants();
            drawPhotos();
          },
        }, [el('span', { class: 'adm-chip__dot', style: `background:${p.hex}` }), el('span', { text: p.name })])
      );
    });

    colorChips.appendChild(
      el('button', {
        class: 'adm-chip',
        type: 'button',
        text: '＋ Otro color',
        onClick: () => openCustomColor(),
      })
    );
  }

  function openCustomColor() {
    const nameField = input({ placeholder: 'Verde oliva' });
    const hexField = el('input', { type: 'color', value: '#8a9a5b', class: 'adm-input', style: 'height:46px; padding:.25rem' });

    import('../ui.js').then(({ openModal }) => {
      const add = el('button', {
        class: 'adm-btn adm-btn--primary',
        type: 'button',
        text: 'Añadir color',
        onClick: () => {
          const name = nameField.value.trim();
          if (!name) return notify('Escribe el nombre del color.', 'error');
          const slug = slugify(name);
          if (colors.some((c) => c.slug === slug)) return notify('Ese color ya está añadido.', 'error');
          colors.push({ name, slug, hex: hexField.value });
          touch();
          drawColors();
          drawVariants();
          drawPhotos();
          modal.close();
        },
      });
      const modal = openModal({
        title: 'Añadir un color',
        body: el('div', {}, [field('Nombre del color', nameField), field('Color', hexField)]),
        footer: el('div', { class: 'adm-actions' }, [add]),
      });
    });
  }

  function effectiveSizes() {
    return form.requires_size ? sizes : ['Única'];
  }

  function drawVariants() {
    variantHost.innerHTML = '';
    const useSizes = effectiveSizes();

    if (!colors.length) {
      variantHost.appendChild(el('p', { class: 'adm-muted', text: 'Añade al menos un color para poder indicar el stock.' }));
      return;
    }
    if (!useSizes.length) {
      variantHost.appendChild(el('p', { class: 'adm-muted', text: 'Añade al menos una talla.' }));
      return;
    }

    const rows = [];
    colors.forEach((c) => {
      useSizes.forEach((s) => {
        const key = `${c.slug}|${s}`;
        const current = variantMap.get(key) || { stock: 25, sku: '', price: '', is_active: true };
        variantMap.set(key, current);

        const stockField = input({ type: 'number', min: '0', step: '1', value: current.stock });
        stockField.addEventListener('input', () => { current.stock = stockField.value; touch(); });

        const skuField = input({ value: current.sku, placeholder: 'Opcional' });
        skuField.addEventListener('input', () => { current.sku = skuField.value; touch(); });

        const priceField = input({ type: 'number', min: '0', step: '0.01', value: current.price, placeholder: 'Igual' });
        priceField.addEventListener('input', () => { current.price = priceField.value; touch(); });

        const activeBox = el('input', { type: 'checkbox', ...(current.is_active ? { checked: true } : {}) });
        activeBox.addEventListener('change', () => { current.is_active = activeBox.checked; touch(); });

        rows.push(
          el('tr', {}, [
            el('td', {}, [
              el('span', { class: 'adm-chip__dot', style: `background:${c.hex}; display:inline-block; vertical-align:middle; margin-right:.4rem` }),
              el('span', { text: c.name }),
            ]),
            el('td', { text: s }),
            el('td', {}, [stockField]),
            el('td', {}, [skuField]),
            el('td', {}, [priceField]),
            el('td', { style: 'text-align:center' }, [activeBox]),
          ])
        );
      });
    });

    variantHost.appendChild(
      el('table', { class: 'adm-variant-table' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { text: 'Color' }),
            el('th', { text: form.size_label || 'Talla' }),
            el('th', { text: 'Unidades' }),
            el('th', { text: 'Referencia' }),
            el('th', { text: 'Precio propio (€)' }),
            el('th', { text: 'A la venta' }),
          ]),
        ]),
        el('tbody', {}, rows),
      ])
    );
  }

  requiresSizeBox.querySelector('input').addEventListener('change', (e) => {
    form.requires_size = e.target.checked;
    sizeBlock.hidden = !form.requires_size;
    touch();
    drawVariants();
  });
  sizeBlock.hidden = !form.requires_size;

  sizeBlock.append(
    field('Nombre del selector de talla', sizeLabelInput, {
      hint: 'Por defecto "Talla". Cámbialo si vendes por importe, por ejemplo una tarjeta regalo.',
    }),
    el('p', { class: 'adm-field__label', text: 'Tallas disponibles' }),
    sizeChips
  );

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Tallas y colores' }),
      el('p', { class: 'adm-card__sub', text: 'Pulsa para añadir o quitar. Debajo aparecerá el stock de cada combinación.' }),
      requiresSizeBox,
      sizeBlock,
      el('p', { class: 'adm-field__label', style: 'margin-top:1rem', text: 'Colores disponibles' }),
      colorChips,
      el('p', { class: 'adm-field__label', style: 'margin-top:1rem', text: 'Stock por talla y color' }),
      variantHost,
    ])
  );

  // ==========================================================================
  // FOTOGRAFÍAS
  // ==========================================================================
  const photoGrid = el('div', { class: 'adm-photos' });

  function drawPhotos() {
    photoGrid.innerHTML = '';

    if (!images.length) {
      photoGrid.appendChild(
        el('p', { class: 'adm-muted', text: 'Todavía no hay fotografías. Arrastra las tuyas al recuadro de arriba.' })
      );
      return;
    }

    images.forEach((img, index) => {
      const colorOptions = [
        { value: '', label: 'Sin color concreto' },
        ...colors.map((c) => ({ value: c.slug, label: c.name })),
      ];
      const colorPick = select(colorOptions, { value: img.color_slug || '' });
      colorPick.addEventListener('change', () => { img.color_slug = colorPick.value; touch(); });

      const altField = input({ value: img.alt || '', placeholder: 'Describe la foto' });
      altField.addEventListener('input', () => { img.alt = altField.value; touch(); });

      const tag = index === 0 ? 'Principal' : index === 1 ? 'Al pasar el ratón' : `Galería ${index - 1}`;

      photoGrid.appendChild(
        el('figure', { class: 'adm-photo', 'data-id': String(index), draggable: 'true' }, [
          el('img', { class: 'adm-photo__img', src: resolveImage(img.url), alt: img.alt || '', loading: 'lazy' }),
          el('span', { class: 'adm-photo__tag', text: tag }),
          el('div', { class: 'adm-photo__body' }, [
            colorPick,
            altField,
            el('div', { class: 'adm-photo__actions' }, [
              index !== 0
                ? el('button', {
                    class: 'adm-btn adm-btn--ghost adm-btn--sm',
                    type: 'button',
                    text: 'Hacer principal',
                    onClick: () => {
                      images.unshift(images.splice(index, 1)[0]);
                      touch();
                      drawPhotos();
                    },
                  })
                : null,
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm',
                type: 'button',
                text: '◀',
                'aria-label': 'Mover antes',
                onClick: () => {
                  if (index === 0) return;
                  [images[index - 1], images[index]] = [images[index], images[index - 1]];
                  touch();
                  drawPhotos();
                },
              }),
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm',
                type: 'button',
                text: '▶',
                'aria-label': 'Mover después',
                onClick: () => {
                  if (index === images.length - 1) return;
                  [images[index + 1], images[index]] = [images[index], images[index + 1]];
                  touch();
                  drawPhotos();
                },
              }),
              el('button', {
                class: 'adm-btn adm-btn--ghost adm-btn--sm',
                type: 'button',
                text: 'Quitar',
                onClick: async () => {
                  const ok = await confirmDialog({
                    title: '¿Quitar esta fotografía?',
                    text: 'Dejará de verse en este producto. La foto seguirá guardada en la sección Imágenes.',
                    confirmLabel: 'Sí, quitar',
                    danger: true,
                  });
                  if (!ok) return;
                  images.splice(index, 1);
                  touch();
                  drawPhotos();
                },
              }),
            ]),
          ]),
        ])
      );
    });
  }

  makeSortable(photoGrid, '.adm-photo', (orderedIds) => {
    const next = orderedIds.map((i) => images[Number(i)]).filter(Boolean);
    if (next.length === images.length) {
      images = next;
      touch();
      drawPhotos();
    }
  });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Fotografías' }),
      el('p', {
        class: 'adm-card__sub',
        text: 'La primera es la principal y la segunda es la que se ve al pasar el ratón. Arrástralas para cambiar el orden.',
      }),
      dropZone({
        folder: 'products',
        onUploaded: (rows) => {
          rows.forEach((r) => images.push({ url: r.url, storage_path: r.storage_path, alt: r.alt || '', color_slug: '' }));
          touch();
          drawPhotos();
        },
      }),
      el('div', { class: 'adm-actions', style: 'margin:.85rem 0 1.1rem' }, [
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm',
          type: 'button',
          text: 'Elegir de la biblioteca',
          onClick: async () => {
            const picked = await pickImage({ folder: 'products', title: 'Añadir una fotografía' });
            if (!picked) return;
            images.push({ ...picked, color_slug: '' });
            touch();
            drawPhotos();
          },
        }),
      ]),
      photoGrid,
    ])
  );

  // ==========================================================================
  // BUSCADORES (SEO)
  // ==========================================================================
  const seoTitle = input({ value: form.seo_title || '', maxlength: '70' });
  seoTitle.addEventListener('input', () => { form.seo_title = seoTitle.value; touch(); });
  const seoDesc = textarea({ value: form.seo_description || '', rows: '2', maxlength: '180' });
  seoDesc.addEventListener('input', () => { form.seo_description = seoDesc.value; touch(); });
  const altGeneral = input({ value: form.image_alt || '' });
  altGeneral.addEventListener('input', () => { form.image_alt = altGeneral.value; touch(); });

  const extraFields = [
    ['Composición', 'composition', 4],
    ['Cuidados', 'care', 3],
    ['Envíos y devoluciones', 'shipping_note', 3],
  ].map(([label, key, rows]) => {
    const control = textarea({ value: form[key] || '', rows: String(rows) });
    control.addEventListener('input', () => { form[key] = control.value; touch(); });
    return field(label, control);
  });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Información adicional' }),
      el('p', { class: 'adm-card__sub', text: 'Aparece en las pestañas de la ficha del producto.' }),
      ...extraFields,
    ])
  );

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Cómo se ve en Google' }),
      el('p', { class: 'adm-card__sub', text: 'Si lo dejas vacío se usará el nombre y la descripción corta.' }),
      field('Título para buscadores', seoTitle),
      field('Descripción para buscadores', seoDesc),
      field('Descripción de las fotos', altGeneral, {
        hint: 'Ayuda a quien navega con lector de pantalla y mejora la posición en buscadores.',
      }),
    ])
  );

  // ==========================================================================
  // GUARDAR
  // ==========================================================================
  const stateText = el('p', { class: 'adm-savebar__state', text: isNew ? 'Producto nuevo sin guardar' : 'Todo guardado' });
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
    navigate('productos', isNew ? '' : product.id);
  });

  function validate() {
    let ok = true;
    setFieldError(nameInput, '');
    setFieldError(priceInput, '');
    setFieldError(slugInput, '');

    if (!form.name.trim()) {
      setFieldError(nameInput, 'El producto necesita un nombre.');
      ok = false;
    }
    if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      setFieldError(priceInput, 'Escribe un precio válido (por ejemplo 15).');
      ok = false;
    }
    if (!form.slug) {
      setFieldError(slugInput, 'Hace falta una dirección para la web.');
      ok = false;
    }
    if (form.requires_size && !sizes.length) {
      notify('Añade al menos una talla, o desmarca "se vende por tallas".', 'error');
      ok = false;
    }
    if (!colors.length) {
      notify('Añade al menos un color.', 'error');
      ok = false;
    }
    return ok;
  }

  saveBtn.addEventListener('click', async () => {
    if (saveBtn.disabled) return;
    if (!validate()) {
      notify('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    saveBtn.disabled = true;
    discardBtn.disabled = true;
    stateText.textContent = 'Guardando…';

    try {
      const slug = await uniqueSlug(form.slug, 'products', isNew ? null : product.id);

      const payload = {
        name: form.name.trim(),
        slug,
        category_id: form.category_id || null,
        short_description: form.short_description || null,
        description: form.description || null,
        composition: form.composition || null,
        care: form.care || null,
        shipping_note: form.shipping_note || null,
        price: Number(form.price),
        compare_at_price: form.compare_at_price === '' || form.compare_at_price == null ? null : Number(form.compare_at_price),
        status: form.status,
        is_featured: Boolean(form.is_featured),
        is_new: Boolean(form.is_new),
        tags: form.tags || [],
        stock_status: form.stock_status,
        sku: form.sku || null,
        requires_size: Boolean(form.requires_size),
        size_label: form.size_label || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        image_alt: form.image_alt || null,
      };

      const saved = isNew
        ? await createProduct({ ...payload, position: 999 })
        : await updateProduct(product.id, payload, original);

      // Tallas y colores
      const useSizes = effectiveSizes();
      const variants = [];
      colors.forEach((c) => {
        useSizes.forEach((s) => {
          const v = variantMap.get(`${c.slug}|${s}`) || { stock: 0, sku: '', price: '', is_active: true };
          variants.push({
            size: s,
            color_name: c.name,
            color_slug: c.slug,
            color_hex: c.hex,
            sku: v.sku,
            stock: v.stock,
            price: v.price,
            is_active: v.is_active,
          });
        });
      });
      await saveVariants(saved.id, variants);
      await saveProductImages(saved.id, images);

      // Para que la web pública muestre los cambios al instante.
      invalidateCache();

      setDirty(false);
      stateText.textContent = 'Todo guardado';
      notify('Cambios publicados correctamente', 'success');

      if (isNew) navigate('productos', saved.id);
    } catch (error) {
      stateText.textContent = 'No se ha podido guardar';
      notify(friendlyError(error), 'error');
    } finally {
      saveBtn.disabled = false;
      discardBtn.disabled = false;
    }
  });

  host.appendChild(el('div', { class: 'adm-savebar' }, [stateText, discardBtn, saveBtn]));

  drawSizes();
  drawColors();
  drawVariants();
  drawPhotos();
}
