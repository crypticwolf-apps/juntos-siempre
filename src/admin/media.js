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
export function dropZone({ folder = 'general', multiple = true, onUploaded, label = 'Arrastra aquí tus fotografías', crop = false, aspect, hint }) {
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
    let list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      notify('Solo se pueden subir imágenes (JPG, PNG o WebP).', 'error');
      return;
    }

    // Encuadre opcional antes de subir. Si se cancela un recorte, se omite ese
    // archivo; "Usar tal cual" mantiene el original.
    if (crop) {
      const framed = [];
      for (const file of list) {
        const out = await openCropper(file, { aspect, hint });
        if (out) framed.push(out);
      }
      list = framed;
      if (!list.length) return;
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
// RECORTADOR (zoom + arrastre) para encuadrar una foto al espacio
// ---------------------------------------------------------------------------
const ASPECT_PRESETS = [
  { id: 'square', label: 'Cuadrada', ratio: 1 },
  { id: 'portrait', label: 'Producto 4:5', ratio: 4 / 5 },
  { id: 'landscape', label: 'Banner 16:9', ratio: 16 / 9 },
  { id: 'wide', label: 'Ancha 2:1', ratio: 2 },
];

/**
 * Abre un recuadro para encuadrar la foto: se puede arrastrar y ampliar (con el
 * dedo en el móvil, con la rueda o el deslizador en el ordenador). Funciona
 * tanto en el panel como en el modo "editar visualmente".
 *
 * @param {File|string} source archivo recién elegido o URL de una foto ya subida
 * @param {object} opts
 * @param {number} [opts.aspect] proporción fija ancho/alto (si se omite, se elige)
 * @param {string} [opts.title]
 * @param {string} [opts.hint] resolución recomendada, se muestra como ayuda
 * @param {boolean} [opts.allowAsIs] permite "usar tal cual" (solo con archivo)
 * @returns {Promise<File|null>} archivo recortado listo para subir, o null
 */
export function openCropper(source, { aspect, title = 'Encuadrar la foto', hint, allowAsIs = true } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let objectUrl = null;
    const done = (val) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      document.body.classList.remove('adm-no-scroll');
      document.removeEventListener('keydown', onKey);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(val);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };

    const st = { zoom: 1, tx: 0, ty: 0, base: 1, nw: 0, nh: 0, fw: 0, fh: 0, ar: aspect || 4 / 5 };

    const img = el('img', {
      alt: '',
      draggable: 'false',
      style: 'position:absolute; top:0; left:0; transform-origin:0 0; user-select:none; -webkit-user-drag:none; max-width:none;',
    });
    img.crossOrigin = 'anonymous';

    const frame = el('div', {
      style: `position:relative; overflow:hidden; margin:0 auto; background:#000;
              border-radius:10px; touch-action:none; cursor:grab; box-shadow:0 0 0 1px rgba(255,255,255,.25) inset;`,
    }, [img]);

    const zoom = el('input', {
      type: 'range', min: '1', max: '4', step: '0.01', value: '1',
      'aria-label': 'Ampliar', style: 'width:100%;',
    });

    const scale = () => st.base * st.zoom;
    const render = () => {
      const s = scale();
      img.style.width = `${st.nw * s}px`;
      img.style.height = `${st.nh * s}px`;
      img.style.transform = `translate(${st.tx}px, ${st.ty}px)`;
    };
    const clamp = () => {
      const s = scale();
      st.tx = Math.min(0, Math.max(st.fw - st.nw * s, st.tx));
      st.ty = Math.min(0, Math.max(st.fh - st.nh * s, st.ty));
    };
    const setZoom = (nz, cx = st.fw / 2, cy = st.fh / 2) => {
      const s0 = scale();
      const ix = (cx - st.tx) / s0;
      const iy = (cy - st.ty) / s0;
      st.zoom = Math.min(4, Math.max(1, nz));
      const s1 = scale();
      st.tx = cx - ix * s1;
      st.ty = cy - iy * s1;
      zoom.value = String(st.zoom);
      clamp();
      render();
    };

    const layout = (center = false) => {
      const maxW = Math.min(560, window.innerWidth - 72);
      let fw = maxW;
      let fh = fw / st.ar;
      const maxH = Math.max(180, window.innerHeight * 0.5);
      if (fh > maxH) { fh = maxH; fw = fh * st.ar; }
      st.fw = fw; st.fh = fh;
      frame.style.width = `${fw}px`;
      frame.style.height = `${fh}px`;
      if (!st.nw) return;
      st.base = Math.max(fw / st.nw, fh / st.nh);
      if (center) {
        st.zoom = 1;
        const s = scale();
        st.tx = (fw - st.nw * s) / 2;
        st.ty = (fh - st.nh * s) / 2;
        zoom.value = '1';
      }
      clamp();
      render();
    };

    img.onload = () => { st.nw = img.naturalWidth; st.nh = img.naturalHeight; layout(true); };
    img.onerror = () => { notify('No se ha podido abrir la imagen para recortarla.', 'error'); done(null); };
    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }

    // --- Arrastre (ratón y dedo) ---
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    frame.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      frame.style.cursor = 'grabbing';
      try { frame.setPointerCapture(e.pointerId); } catch { /* algunos punteros no admiten captura */ }
    });
    frame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      st.tx += e.clientX - lastX; st.ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      clamp(); render();
    });
    const endDrag = () => { dragging = false; frame.style.cursor = 'grab'; };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
    frame.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      setZoom(st.zoom * (e.deltaY < 0 ? 1.08 : 0.92), e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });
    zoom.addEventListener('input', () => setZoom(Number(zoom.value)));

    // --- Selector de proporción (solo si no viene fija) ---
    let aspectRow = null;
    if (!aspect) {
      const buttons = ASPECT_PRESETS.map((p) =>
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: p.label,
          'data-ratio': String(p.ratio),
          onClick: () => {
            st.ar = p.ratio;
            aspectRow.querySelectorAll('.adm-btn').forEach((b) => b.classList.remove('adm-btn--primary'));
            aspectRow.querySelector(`[data-ratio="${p.ratio}"]`)?.classList.add('adm-btn--primary');
            layout(true);
          },
        })
      );
      aspectRow = el('div', { class: 'adm-actions', style: 'margin-bottom:.85rem; flex-wrap:wrap' }, buttons);
    }

    const crop = () => {
      const s = scale();
      const sx = -st.tx / s;
      const sy = -st.ty / s;
      const sw = st.fw / s;
      const sh = st.fh / s;
      const MAX = 1800;
      const outW = Math.max(1, Math.round(Math.min(sw, MAX)));
      const outH = Math.max(1, Math.round(outW * (sh / sw)));
      const canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      try {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      } catch (err) {
        notify('No se ha podido recortar esta imagen (permisos de la foto).', 'error');
        done(null);
        return;
      }
      const type = supportsType('image/webp') ? 'image/webp' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (!blob) { done(null); return; }
        const ext = type === 'image/webp' ? 'webp' : 'jpg';
        done(new File([blob], `recorte-${Date.now()}.${ext}`, { type }));
      }, type, 0.9);
    };

    const footer = el('div', { class: 'adm-actions adm-actions--end', style: 'gap:.6rem' }, [
      el('button', { class: 'adm-btn adm-btn--ghost', type: 'button', text: 'Cancelar', onClick: () => done(null) }),
      allowAsIs && typeof source !== 'string'
        ? el('button', { class: 'adm-btn adm-btn--ghost', type: 'button', text: 'Usar tal cual', onClick: () => done(source) })
        : null,
      el('button', { class: 'adm-btn adm-btn--primary', type: 'button', text: 'Recortar y usar', onClick: crop }),
    ]);

    const panel = el('div', {
      style: `background:var(--crema,#f4f1ea); color:var(--tinta,#232220); border-radius:14px;
              width:min(640px, 100%); max-height:calc(100vh - 2rem); overflow:auto;
              padding:clamp(1rem,3vw,1.5rem); box-shadow:0 24px 70px rgba(0,0,0,.4);
              font-family:var(--sans, system-ui, sans-serif);`,
    }, [
      el('h2', { style: 'font-size:1.15rem; margin:0 0 .35rem;', text: title }),
      el('p', {
        style: 'font-size:.85rem; color:var(--tinta-suave,#6f6a60); margin:0 0 1rem;',
        text: 'Arrastra para mover y usa el deslizador (o dos dedos / la rueda) para ampliar. Lo que quede dentro del recuadro es lo que se verá.',
      }),
      aspectRow,
      frame,
      el('div', { style: 'display:flex; align-items:center; gap:.6rem; margin:.9rem 0 .35rem;' }, [
        el('span', { 'aria-hidden': 'true', text: '🔍', style: 'font-size:1rem;' }),
        zoom,
      ]),
      hint ? el('p', { class: 'adm-field__hint', style: 'color:var(--tinta-suave,#6f6a60); font-size:.8rem; margin:.35rem 0 0;', text: hint }) : null,
      el('div', { style: 'margin-top:1.1rem;' }, [footer]),
    ]);

    const overlay = el('div', {
      style: `position:fixed; inset:0; background:rgba(14,14,13,.6); z-index:10060;
              display:grid; place-items:center; padding:1rem; overflow:auto;`,
      onClick: (e) => { if (e.target === overlay) done(null); },
    }, [panel]);

    document.body.appendChild(overlay);
    document.body.classList.add('adm-no-scroll');
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => layout(false), { once: false });
  });
}

/**
 * Reencuadra una foto que ya está subida: abre el recortador sobre su URL y,
 * si se confirma, sube la versión recortada y la devuelve.
 *
 * @returns {Promise<{url:string, storage_path?:string, alt?:string}|null>}
 */
export async function recropAndUpload(url, { folder = 'general', aspect, hint } = {}) {
  const file = await openCropper(url, { aspect, hint, allowAsIs: false, title: 'Reencuadrar la foto' });
  if (!file) return null;
  return uploadImage(file, { folder });
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
export function pickImage({ folder = 'general', title = 'Elegir fotografía', aspect, hint } = {}) {
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
        crop: Boolean(aspect || hint),
        aspect,
        hint,
        onUploaded: (rows) => {
          if (rows[0]) finish({ url: rows[0].url, storage_path: rows[0].storage_path, alt: rows[0].alt || '' });
        },
      }),
      hint ? el('p', { class: 'adm-field__hint', style: 'margin:.5rem 0 0', text: hint }) : null,
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
