/**
 * Subida y optimización de fotografías.
 *
 * Antes de enviar una imagen se reduce su tamaño si es enorme y se convierte a
 * WebP cuando el navegador puede hacerlo, manteniendo buena calidad visual.
 * Nunca se recorta ni se deforma una foto sin avisar: el recorte solo ocurre si
 * la persona lo pide expresamente desde el ajuste de encuadre.
 */
import { supabase, BUCKET, registerMedia, findMediaByChecksum, getCurrentUser, logActivity } from './api.js';
import { el, notify, friendlyError, openModal, slugify } from './ui.js';

export const FOLDERS = [
  { value: 'products', label: 'Productos' },
  { value: 'categories', label: 'Categorías' },
  { value: 'homepage', label: 'Inicio' },
  { value: 'history', label: 'Historia' },
  { value: 'impact', label: 'Compromiso' },
  { value: 'general', label: 'General' },
];

/**
 * Resoluciones recomendadas para cada tipo de imagen. Se muestran como pista
 * junto a cada campo para que quien suba una foto sepa el tamaño ideal.
 * Todo se optimiza y se reduce solo al subirlo (máximo 2000 px de lado).
 */
export const IMAGE_SPECS = {
  logo: 'PNG con fondo transparente · ancho ideal ~800 px (proporción apaisada).',
  favicon: 'Cuadrada · 512 × 512 px · PNG o SVG. Es el icono de la pestaña del navegador.',
  app_icon: 'Cuadrada · 1024 × 1024 px · PNG sin transparencia. Es el icono que queda al añadir la web a la pantalla de inicio del móvil.',
  og: 'Horizontal · 1200 × 630 px · JPG. Es la imagen que se ve al compartir el enlace.',
  category: 'Vertical (proporción 4:5) · ~1000 × 1250 px.',
  product: 'Vertical (proporción 4:5) · ~1200 × 1500 px. Todas las fotos del producto con el mismo encuadre quedan mejor.',
  hero: 'Horizontal (16:9) · ~1920 × 1080 px.',
  banner: 'Horizontal ancha · ~1920 × 800 px.',
};

const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // 15 MB de origen
const MAX_EDGE = 2000; // lado máximo tras optimizar
const QUALITY = 0.86;

// ---------------------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------------------
function supportsType(type) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  return canvas.toDataURL(type).startsWith(`data:${type}`);
}

const CAN_WEBP = supportsType('image/webp');

/** Huella del archivo para no subir dos veces la misma foto. */
async function checksum(file) {
  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se ha podido leer la imagen.'));
    };
    img.src = url;
  });
}

/**
 * Reduce y convierte la imagen. Mantiene la proporción original: solo cambia
 * el tamaño, nunca el encuadre.
 */
async function optimize(file, { crop = null } = {}) {
  if (file.type === 'image/svg+xml' || file.type === 'application/pdf') {
    return { blob: file, width: null, height: null, type: file.type };
  }

  const img = await loadImage(file);
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (crop) {
    sx = Math.round(crop.x * sw);
    sy = Math.round(crop.y * sh);
    sw = Math.round(crop.width * sw);
    sh = Math.round(crop.height * sh);
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  const type = CAN_WEBP ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

  // Si la conversión no mejora nada, se conserva el archivo original.
  if (!blob || (blob.size >= file.size && scale === 1)) {
    return { blob: file, width: img.naturalWidth, height: img.naturalHeight, type: file.type };
  }
  return { blob, width, height, type };
}

function extensionFor(type) {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/avif') return 'avif';
  if (type === 'image/svg+xml') return 'svg';
  if (type === 'application/pdf') return 'pdf';
  return 'jpg';
}

// ---------------------------------------------------------------------------
// SUBIDA
// ---------------------------------------------------------------------------
/**
 * Sube un archivo y lo registra en la biblioteca.
 *
 * @param {File} file
 * @param {object} options
 * @param {string} options.folder carpeta de destino
 * @param {(percent:number)=>void} options.onProgress
 * @param {object|null} options.crop encuadre en proporciones 0..1
 * @param {number} options.retries reintentos automáticos si falla la red
 */
export async function uploadImage(file, { folder = 'general', onProgress, crop = null, retries = 2 } = {}) {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La imagen pesa demasiado. Prueba con una de menos de 15 MB.');
  }

  onProgress?.(5);

  // Si ya está subida exactamente la misma foto, se reutiliza.
  const hash = await checksum(file);
  const existing = await findMediaByChecksum(hash);
  if (existing) {
    onProgress?.(100);
    return { ...existing, reused: true };
  }

  onProgress?.(20);
  const { blob, width, height, type } = await optimize(file, { crop });
  onProgress?.(45);

  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'imagen';
  const filename = `${Date.now()}-${base}.${extensionFor(type)}`;
  const path = `${folder}/${filename}`;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: type, upsert: false, cacheControl: '31536000' });
      if (error) throw error;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  if (lastError) throw lastError;

  onProgress?.(85);
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const row = await registerMedia({
    storage_path: path,
    url,
    folder,
    filename,
    mime_type: type,
    size_bytes: blob.size,
    width,
    height,
    checksum: hash,
    alt: '',
    created_by: getCurrentUser()?.id || null,
  });

  await logActivity('subir', { type: 'imagen', id: row.id, label: filename });
  onProgress?.(100);
  return row;
}

// ---------------------------------------------------------------------------
// ZONA DE ARRASTRAR Y SOLTAR
// ---------------------------------------------------------------------------
/**
 * Crea el recuadro donde se pueden soltar fotos o pulsar para elegirlas.
 *
 * @param {object} options
 * @param {string} options.folder
 * @param {(rows:object[])=>void} options.onUploaded
 */
export function dropZone({ folder = 'general', multiple = true, onUploaded, label = 'Arrastra aquí tus fotografías' }) {
  const fileInput = el('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp,image/avif',
    class: 'adm-visually-hidden',
    ...(multiple ? { multiple: true } : {}),
  });

  const progressList = el('div', { class: 'adm-uploads' });

  const zone = el('div', { class: 'adm-drop', tabindex: '0', role: 'button' }, [
    el('div', { class: 'adm-drop__icon', text: '🖼️', 'aria-hidden': 'true' }),
    el('p', { class: 'adm-drop__label', text: label }),
    el('p', { class: 'adm-drop__hint', text: 'También puedes pulsar aquí para elegirlas desde tu ordenador o tu móvil.' }),
    fileInput,
  ]);

  const wrapper = el('div', { class: 'adm-drop-wrap' }, [zone, progressList]);

  async function handleFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      notify('Solo se pueden subir imágenes (JPG, PNG o WebP).', 'error');
      return;
    }

    const results = [];
    for (const file of list) {
      const bar = el('div', { class: 'adm-upload__bar' }, [el('span', { style: 'width:0%' })]);
      const row = el('div', { class: 'adm-upload' }, [
        el('span', { class: 'adm-upload__name', text: file.name }),
        bar,
        el('span', { class: 'adm-upload__state', text: 'Subiendo…' }),
      ]);
      progressList.appendChild(row);
      const fill = bar.firstElementChild;
      const state = row.lastElementChild;

      try {
        const uploaded = await uploadImage(file, {
          folder,
          onProgress: (p) => {
            fill.style.width = `${p}%`;
          },
        });
        state.textContent = uploaded.reused ? 'Ya estaba subida' : 'Lista';
        row.classList.add('is-done');
        results.push(uploaded);
        setTimeout(() => row.remove(), 2500);
      } catch (error) {
        row.classList.add('is-error');
        state.textContent = 'No se ha podido subir';
        const retry = el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm',
          type: 'button',
          text: 'Reintentar',
          onClick: () => {
            row.remove();
            handleFiles([file]);
          },
        });
        row.appendChild(retry);
        notify(`${file.name}: ${friendlyError(error)}`, 'error');
      }
    }

    if (results.length) onUploaded?.(results);
  }

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.add('is-over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
      zone.classList.remove('is-over');
    })
  );
  zone.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  });

  return wrapper;
}

// ---------------------------------------------------------------------------
// SELECTOR DESDE LA BIBLIOTECA
// ---------------------------------------------------------------------------
/**
 * Abre la ventana para elegir una fotografía: se puede subir una nueva o
 * reutilizar una que ya esté en la biblioteca.
 *
 * @returns {Promise<{url:string, storage_path?:string, alt?:string}|null>}
 */
export function pickImage({ folder = 'general', title = 'Elegir fotografía' } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(value);
    };

    const grid = el('div', { class: 'adm-media-grid' }, [el('p', { class: 'adm-muted', text: 'Cargando fotografías…' })]);

    const renderGrid = (items) => {
      grid.innerHTML = '';
      if (!items.length) {
        grid.appendChild(
          el('p', { class: 'adm-muted', text: 'Todavía no hay fotografías guardadas. Sube la primera arriba.' })
        );
        return;
      }
      items.forEach((item) => {
        grid.appendChild(
          el('button', {
            class: 'adm-media-item',
            type: 'button',
            title: item.filename,
            onClick: () => finish({ url: item.url, storage_path: item.storage_path, alt: item.alt || '' }),
          }, [
            el('img', { src: item.url, alt: item.alt || item.filename, loading: 'lazy' }),
          ])
        );
      });
    };

    import('./api.js').then(({ listMedia }) =>
      listMedia().then(renderGrid).catch(() => renderGrid([]))
    );

    const body = el('div', { class: 'adm-picker' }, [
      dropZone({
        folder,
        onUploaded: (rows) => {
          if (rows[0]) finish({ url: rows[0].url, storage_path: rows[0].storage_path, alt: rows[0].alt || '' });
        },
      }),
      el('h3', { class: 'adm-picker__title', text: 'O elige una que ya tengas' }),
      grid,
    ]);

    const modal = openModal({
      title,
      body,
      wide: true,
      footer: el('div', { class: 'adm-actions' }, [
        el('button', { class: 'adm-btn adm-btn--ghost', type: 'button', text: 'Cancelar', onClick: () => finish(null) }),
      ]),
      onClose: () => finish(null),
    });
  });
}
