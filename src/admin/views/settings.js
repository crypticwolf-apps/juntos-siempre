/**
 * Configuración general: marca, menú, pie de página, redes, buscadores,
 * personas con acceso e historial de cambios para poder deshacer.
 */
import {
  listSettings, saveSetting, listProfiles, updateProfile, isAdmin,
  getCurrentUser, listRevisions, updateSection, updateProduct, listActivity,
} from '../api.js';
import { invalidateCache } from '../../lib/content.js';
import { resolveImage } from '../../lib/asset-map.js';
import {
  el, notify, friendlyError, confirmDialog, field, input, textarea, select,
  checkbox, setDirty, formatDate, emptyState,
} from '../ui.js';
import { pickImage, recropAndUpload, IMAGE_SPECS } from '../media.js';

// ---------------------------------------------------------------------------
// EDITOR DE LISTAS DE ENLACES
// ---------------------------------------------------------------------------
function linkListEditor(items, { onChange, withVisibility = false }) {
  const host = el('div', { class: 'adm-list' });
  const list = Array.isArray(items) ? items.map((i) => ({ ...i })) : [];

  function draw() {
    host.innerHTML = '';

    list.forEach((link, index) => {
      const labelField = input({ value: link.label || '', placeholder: 'Texto del enlace' });
      labelField.addEventListener('input', () => { link.label = labelField.value; onChange(list); });

      const hrefField = input({ value: link.href || '', placeholder: 'tienda.html' });
      hrefField.addEventListener('input', () => { link.href = hrefField.value; onChange(list); });

      const controls = [
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: '▲', 'aria-label': 'Subir',
          onClick: () => {
            if (index === 0) return;
            [list[index - 1], list[index]] = [list[index], list[index - 1]];
            onChange(list);
            draw();
          },
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: '▼', 'aria-label': 'Bajar',
          onClick: () => {
            if (index === list.length - 1) return;
            [list[index + 1], list[index]] = [list[index], list[index + 1]];
            onChange(list);
            draw();
          },
        }),
        el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm', type: 'button', text: 'Quitar',
          onClick: async () => {
            const ok = await confirmDialog({
              title: '¿Quitar este enlace?',
              text: `Se quitará "${link.label || 'el enlace'}" del menú.`,
              confirmLabel: 'Sí, quitar',
              danger: true,
            });
            if (!ok) return;
            list.splice(index, 1);
            onChange(list);
            draw();
          },
        }),
      ];

      const visibleBox = withVisibility
        ? checkbox('Visible', link.visible !== false ? { checked: true } : {})
        : null;
      if (visibleBox) {
        visibleBox.querySelector('input').addEventListener('change', (e) => {
          link.visible = e.target.checked;
          onChange(list);
        });
      }

      host.appendChild(
        el('div', { class: 'adm-row', style: 'grid-template-columns: 1fr' }, [
          el('div', { class: 'adm-grid-2' }, [
            field('Texto', labelField),
            field('Destino', hrefField),
          ]),
          visibleBox,
          el('div', { class: 'adm-row__actions' }, controls),
        ])
      );
    });

    host.appendChild(
      el('button', {
        class: 'adm-btn adm-btn--ghost',
        type: 'button',
        text: '＋ Añadir enlace',
        onClick: () => {
          list.push({ label: 'Nuevo enlace', href: 'index.html', visible: true });
          onChange(list);
          draw();
        },
      })
    );
  }

  draw();
  return host;
}

// ---------------------------------------------------------------------------
// IMAGEN CON VISTA PREVIA
// ---------------------------------------------------------------------------
function imageField(labelText, currentUrl, folder, onPick, { hint, aspect } = {}) {
  let current = currentUrl || '';
  const preview = el('img', {
    src: resolveImage(current) || '',
    alt: '',
    style: 'width:100%; max-width:200px; border-radius:8px; background:#efe9dd; object-fit:contain; padding:.5rem',
  });
  const btn = el('button', {
    class: 'adm-btn adm-btn--ghost',
    type: 'button',
    text: current ? 'Cambiar imagen' : 'Elegir imagen',
    onClick: async () => {
      const picked = await pickImage({ folder, title: labelText, aspect, hint });
      if (!picked) return;
      current = picked.url;
      preview.src = picked.url;
      btn.textContent = 'Cambiar imagen';
      recropBtn.hidden = false;
      onPick(picked.url);
    },
  });
  const recropBtn = el('button', {
    class: 'adm-btn adm-btn--ghost adm-btn--sm',
    type: 'button',
    text: '✂ Encuadrar',
    hidden: !current,
    onClick: async () => {
      if (!current) return;
      const row = await recropAndUpload(resolveImage(current), { folder, aspect, hint });
      if (!row) return;
      current = row.url;
      preview.src = row.url;
      onPick(row.url);
      notify('Encuadre aplicado', 'success');
    },
  });
  return el('div', { class: 'adm-field' }, [
    el('span', { class: 'adm-field__label', text: labelText }),
    preview,
    el('div', { class: 'adm-actions', style: 'margin-top:.6rem; gap:.5rem' }, [btn, recropBtn]),
    hint ? el('span', { class: 'adm-field__hint', text: hint }) : null,
  ]);
}

// ---------------------------------------------------------------------------
// VISTA
// ---------------------------------------------------------------------------
export async function render(host) {
  const settings = await listSettings();

  const draft = {
    brand: { ...(settings.brand || {}) },
    nav: { ...(settings.nav || {}) },
    footer: { ...(settings.footer || {}) },
    social: { ...(settings.social || {}) },
    seo: { ...(settings.seo || {}) },
    payments: { ...(settings.payments || {}) },
  };

  const touch = () => setDirty(true);

  host.appendChild(
    el('div', { class: 'adm-page-head' }, [
      el('div', {}, [
        el('h1', { text: 'Configuración' }),
        el('p', { text: 'La marca, el menú, el pie de página y quién puede gestionar la web.' }),
      ]),
    ])
  );

  // ---- MARCA --------------------------------------------------------------
  const brandName = input({ value: draft.brand.name || 'Juntos Siempre' });
  brandName.addEventListener('input', () => { draft.brand.name = brandName.value; touch(); });

  const brandSlogan = input({ value: draft.brand.slogan || 'Luchar JUNTOS. Ayudarnos SIEMPRE.' });
  brandSlogan.addEventListener('input', () => { draft.brand.slogan = brandSlogan.value; touch(); });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Marca' }),
      el('p', { class: 'adm-card__sub', text: 'El nombre, el lema y el logotipo que se ven en toda la web.' }),
      field('Nombre de la marca', brandName),
      field('Lema', brandSlogan),
      imageField('Logotipo', draft.brand.logo, 'general', (url) => { draft.brand.logo = url; touch(); }, {
        hint: `Se muestra en la cabecera y en el pie. ${IMAGE_SPECS.logo}`,
        aspect: 1570 / 664,
      }),
      imageField('Icono del navegador (favicon)', draft.brand.favicon, 'general', (url) => { draft.brand.favicon = url; touch(); }, {
        hint: IMAGE_SPECS.favicon,
        aspect: 1,
      }),
      imageField('Icono del acceso directo en el móvil', draft.brand.app_icon, 'general', (url) => { draft.brand.app_icon = url; touch(); }, {
        hint: IMAGE_SPECS.app_icon,
        aspect: 1,
      }),
      imageField('Imagen al compartir en redes', draft.brand.og_image, 'general', (url) => { draft.brand.og_image = url; touch(); }, {
        hint: `Se ve al compartir la web en WhatsApp, Facebook o X. ${IMAGE_SPECS.og}`,
        aspect: 1200 / 630,
      }),
    ])
  );

  // ---- MENÚ ---------------------------------------------------------------
  const navLinks = Array.isArray(draft.nav.links) && draft.nav.links.length
    ? draft.nav.links
    : [
        { label: 'Tienda', href: 'tienda.html', visible: true, mega: true },
        { label: 'Historia', href: 'historia.html', visible: true, mega: false },
        { label: 'Contacto', href: 'contacto.html', visible: true, mega: false },
      ];

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Menú de navegación' }),
      el('p', { class: 'adm-card__sub', text: 'Cambia el texto, el orden y qué enlaces se ven en la cabecera.' }),
      linkListEditor(navLinks, {
        withVisibility: true,
        onChange: (list) => { draft.nav.links = list; touch(); },
      }),
    ])
  );

  // ---- PIE ----------------------------------------------------------------
  const footerFields = [
    ['Lema del pie', 'slogan'],
    ['Texto pequeño', 'note'],
    ['Texto del copyright', 'copyright'],
    ['Título de la columna Tienda', 'col_shop_title'],
    ['Título de la columna Marca', 'col_brand_title'],
    ['Título de la columna Ayuda', 'col_help_title'],
  ].map(([label, key]) => {
    const control = input({ value: draft.footer[key] || '' });
    control.addEventListener('input', () => { draft.footer[key] = control.value; touch(); });
    return field(label, control);
  });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Pie de página' }),
      el('p', { class: 'adm-card__sub', text: 'Los textos y enlaces del final de todas las páginas.' }),
      ...footerFields,
      el('p', { class: 'adm-field__label', style: 'margin-top:1rem', text: 'Enlaces de la columna "Marca"' }),
      linkListEditor(draft.footer.brand_links || [], {
        onChange: (list) => { draft.footer.brand_links = list; touch(); },
      }),
      el('p', { class: 'adm-field__label', style: 'margin-top:1.5rem', text: 'Enlaces de la columna "Ayuda"' }),
      linkListEditor(draft.footer.help_links || [], {
        onChange: (list) => { draft.footer.help_links = list; touch(); },
      }),
    ])
  );

  // ---- REDES Y CONTACTO ---------------------------------------------------
  const socialFields = [
    ['Correo de contacto', 'email', 'hola@juntossiempre.es'],
    ['Instagram', 'instagram', 'https://instagram.com/…'],
    ['TikTok', 'tiktok', 'https://tiktok.com/@…'],
    ['Facebook', 'facebook', 'https://facebook.com/…'],
  ].map(([label, key, placeholder]) => {
    const control = input({ value: draft.social[key] || '', placeholder });
    control.addEventListener('input', () => { draft.social[key] = control.value; touch(); });
    return field(label, control, { hint: 'Déjalo vacío si todavía no lo tienes: no aparecerá en la web.' });
  });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Contacto y redes sociales' }),
      el('p', { class: 'adm-card__sub', text: 'Se muestran en el pie de página cuando los rellenas.' }),
      ...socialFields,
    ])
  );

  // ---- BUSCADORES ---------------------------------------------------------
  const seoTitle = input({ value: draft.seo.title || '', maxlength: '70' });
  seoTitle.addEventListener('input', () => { draft.seo.title = seoTitle.value; touch(); });
  const seoDesc = textarea({ value: draft.seo.description || '', rows: '3', maxlength: '180' });
  seoDesc.addEventListener('input', () => { draft.seo.description = seoDesc.value; touch(); });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Cómo se ve la web en Google' }),
      field('Título general', seoTitle),
      field('Descripción general', seoDesc),
    ])
  );

  // ---- PAGOS --------------------------------------------------------------
  const payEnabled = checkbox('Activar cobros reales en la tienda', draft.payments.enabled ? { checked: true } : {});
  payEnabled.querySelector('input').addEventListener('change', (e) => { draft.payments.enabled = e.target.checked; touch(); });
  const payStripe = checkbox('Aceptar tarjeta (Stripe: Visa, Mastercard, Apple Pay, Google Pay)', draft.payments.stripe ? { checked: true } : {});
  payStripe.querySelector('input').addEventListener('change', (e) => { draft.payments.stripe = e.target.checked; touch(); });
  const payPaypal = checkbox('Aceptar PayPal', draft.payments.paypal ? { checked: true } : {});
  payPaypal.querySelector('input').addEventListener('change', (e) => { draft.payments.paypal = e.target.checked; touch(); });

  host.appendChild(
    el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Pagos' }),
      el('p', { class: 'adm-card__sub', text: 'Cobra de verdad con tarjeta o PayPal. Mientras esté desactivado, la tienda usa el pago de demostración.' }),
      payEnabled,
      payStripe,
      payPaypal,
      el('ul', { class: 'adm-specs', style: 'margin-top:1rem' }, [
        el('li', { text: 'Importante: aquí solo se activan los métodos. Las claves SECRETAS (las privadas) NO se ponen aquí: se guardan en Supabase → Edge Functions → Secrets, y nunca viajan a la web.' }),
        el('li', { text: 'Pasos completos en el archivo CONFIGURAR_PAGOS.md del proyecto (o pídeselos a quien te ayuda con la web).' }),
        el('li', { text: 'Antes de cobrar de verdad: estar dado de alta (autónomo/empresa), tener cuenta de Stripe/PayPal, y revisar las páginas legales (envíos, devoluciones, términos y privacidad).' }),
      ]),
    ])
  );

  // ---- PERSONAS CON ACCESO (solo administración) --------------------------
  if (isAdmin()) {
    const usersCard = el('section', { class: 'adm-card' }, [
      el('h2', { class: 'adm-card__title', text: 'Personas con acceso' }),
      el('p', {
        class: 'adm-card__sub',
        text: 'El administrador puede hacerlo todo. El editor puede gestionar productos, categorías, páginas e imágenes, pero no cambiar permisos ni la configuración de accesos.',
      }),
    ]);
    host.appendChild(usersCard);

    try {
      const profiles = await listProfiles();
      const me = getCurrentUser();

      profiles.forEach((profile) => {
        const isMe = profile.id === me?.id;
        const roleSelect = select(
          [
            { value: 'editor', label: 'Editor' },
            { value: 'admin', label: 'Administrador' },
          ],
          { value: profile.role, ...(isMe ? { disabled: true } : {}) }
        );
        roleSelect.addEventListener('change', async () => {
          try {
            await updateProfile(profile.id, { role: roleSelect.value });
            notify('Permiso actualizado', 'success');
          } catch (error) {
            roleSelect.value = profile.role;
            notify(friendlyError(error), 'error');
          }
        });

        const activeBtn = el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm',
          type: 'button',
          text: profile.is_active ? 'Desactivar' : 'Activar',
          ...(isMe ? { disabled: true } : {}),
          onClick: async () => {
            try {
              await updateProfile(profile.id, { is_active: !profile.is_active });
              profile.is_active = !profile.is_active;
              activeBtn.textContent = profile.is_active ? 'Desactivar' : 'Activar';
              notify('Acceso actualizado', 'success');
            } catch (error) {
              notify(friendlyError(error), 'error');
            }
          },
        });

        usersCard.appendChild(
          el('div', { class: 'adm-row', style: 'grid-template-columns: 1fr auto' }, [
            el('div', {}, [
              el('p', { class: 'adm-row__name', text: profile.full_name || profile.email }),
              el('p', { class: 'adm-row__meta' }, [
                el('span', { text: profile.email || '' }),
                isMe ? el('span', { class: 'adm-badge adm-badge--star', text: 'Tú' }) : null,
                profile.is_active ? null : el('span', { class: 'adm-badge adm-badge--hidden', text: 'Sin acceso' }),
              ]),
            ]),
            el('div', { class: 'adm-row__actions' }, [roleSelect, activeBtn]),
          ])
        );
      });

      usersCard.appendChild(
        el('p', {
          class: 'adm-field__hint',
          style: 'margin-top:1rem',
          text: 'Para dar acceso a alguien nuevo, créale primero una cuenta desde el panel de Supabase (Authentication → Users → Add user). Aparecerá aquí y podrás elegir su permiso. Por seguridad, nadie puede cambiar su propio permiso.',
        })
      );
    } catch (error) {
      usersCard.appendChild(el('p', { class: 'adm-muted', text: friendlyError(error) }));
    }
  }

  // ---- HISTORIAL ----------------------------------------------------------
  const historyCard = el('section', { class: 'adm-card' }, [
    el('h2', { class: 'adm-card__title', text: 'Historial de cambios' }),
    el('p', { class: 'adm-card__sub', text: 'Si algo se ha cambiado por error, aquí puedes volver a como estaba.' }),
  ]);
  host.appendChild(historyCard);

  try {
    const revisions = await listRevisions({}, 30);
    if (!revisions.length) {
      historyCard.appendChild(el('p', { class: 'adm-muted', text: 'Todavía no hay cambios guardados en el historial.' }));
    } else {
      revisions.forEach((rev) => {
        const canRestore = ['ajuste', 'seccion', 'producto'].includes(rev.entity_type) && rev.old_value;

        const restoreBtn = el('button', {
          class: 'adm-btn adm-btn--ghost adm-btn--sm',
          type: 'button',
          text: 'Volver a esta versión',
          ...(canRestore ? {} : { disabled: true }),
          onClick: async () => {
            const ok = await confirmDialog({
              title: '¿Volver a la versión anterior?',
              text: 'Se recuperará como estaba antes de ese cambio. El cambio actual quedará también guardado en el historial.',
              confirmLabel: 'Sí, recuperar',
            });
            if (!ok) return;
            restoreBtn.disabled = true;
            restoreBtn.textContent = 'Recuperando…';
            try {
              if (rev.entity_type === 'ajuste') {
                await saveSetting(rev.entity_id, rev.old_value);
              } else if (rev.entity_type === 'seccion') {
                await updateSection(rev.entity_id, { data: rev.old_value });
              } else if (rev.entity_type === 'producto') {
                const { id, created_at, updated_at, product_variants, product_images, ...rest } = rev.old_value;
                await updateProduct(rev.entity_id, rest);
              }
              invalidateCache();
              notify('Versión recuperada correctamente', 'success');
            } catch (error) {
              notify(friendlyError(error), 'error');
            } finally {
              restoreBtn.disabled = false;
              restoreBtn.textContent = 'Volver a esta versión';
            }
          },
        });

        historyCard.appendChild(
          el('div', { class: 'adm-row', style: 'grid-template-columns: 1fr auto' }, [
            el('div', {}, [
              el('p', { class: 'adm-row__name', text: rev.entity_label || rev.entity_id }),
              el('p', { class: 'adm-row__meta' }, [
                el('span', { text: formatDate(rev.created_at) }),
              ]),
            ]),
            el('div', { class: 'adm-row__actions' }, [restoreBtn]),
          ])
        );
      });
    }
  } catch (error) {
    historyCard.appendChild(el('p', { class: 'adm-muted', text: friendlyError(error) }));
  }

  // ---- GUARDAR ------------------------------------------------------------
  const stateText = el('p', { class: 'adm-savebar__state', text: 'Todo guardado' });
  const saveBtn = el('button', { class: 'adm-btn adm-btn--primary adm-btn--big', type: 'button', text: 'Guardar y publicar' });

  saveBtn.addEventListener('click', async () => {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    stateText.textContent = 'Guardando…';
    try {
      await Promise.all([
        saveSetting('brand', draft.brand, settings.brand),
        saveSetting('nav', draft.nav, settings.nav),
        saveSetting('footer', draft.footer, settings.footer),
        saveSetting('social', draft.social, settings.social),
        saveSetting('seo', draft.seo, settings.seo),
        saveSetting('payments', draft.payments, settings.payments),
      ]);
      invalidateCache();
      setDirty(false);
      stateText.textContent = 'Todo guardado';
      notify('Cambios publicados correctamente', 'success');
    } catch (error) {
      stateText.textContent = 'No se ha podido guardar';
      notify(friendlyError(error), 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  host.appendChild(el('div', { class: 'adm-savebar' }, [stateText, saveBtn]));
}
