/**
 * Panel de gestión de Juntos Siempre.
 *
 * Arranque, pantalla de acceso y navegación entre secciones.
 * Nadie entra por conocer la dirección: sin sesión válida y sin permiso
 * asignado no se muestra el panel, y aunque se mostrara, la base de datos
 * rechazaría cualquier cambio.
 */
import './admin.css';
import {
  isConfigured, getSession, getProfile, signIn, signOut, sendResetEmail,
  updatePassword, setCurrentUser, getCurrentUser, supabase,
} from './api.js';
import {
  el, $, notify, friendlyError, field, input, actionButton, confirmLeave, setDirty,
} from './ui.js';

const root = document.getElementById('admin-root');

// ---------------------------------------------------------------------------
// SECCIONES DEL PANEL
// ---------------------------------------------------------------------------
const SECTIONS = [
  { id: 'resumen',    label: 'Resumen',       icon: '🏠', load: () => import('./views/overview.js') },
  { id: 'productos',  label: 'Productos',     icon: '👕', load: () => import('./views/products.js') },
  { id: 'categorias', label: 'Categorías',    icon: '🗂️', load: () => import('./views/categories.js') },
  { id: 'paginas',    label: 'Editar página', icon: '✏️', load: () => import('./views/pages.js') },
  { id: 'imagenes',   label: 'Imágenes',      icon: '🖼️', load: () => import('./views/media.js') },
  { id: 'ajustes',    label: 'Configuración', icon: '⚙️', load: () => import('./views/settings.js') },
];

// ---------------------------------------------------------------------------
// PANTALLA DE ACCESO
// ---------------------------------------------------------------------------
function loginScreen({ message = '' } = {}) {
  const emailInput = input({ type: 'email', autocomplete: 'email', placeholder: 'tu@correo.com', required: true });
  const passInput = input({ type: 'password', autocomplete: 'current-password', placeholder: '••••••••', required: true });

  const toggle = el('button', {
    class: 'adm-btn adm-btn--ghost adm-btn--sm',
    type: 'button',
    text: 'Mostrar',
    'aria-label': 'Mostrar contraseña',
    onClick: () => {
      const shown = passInput.type === 'text';
      passInput.type = shown ? 'password' : 'text';
      toggle.textContent = shown ? 'Mostrar' : 'Ocultar';
      toggle.setAttribute('aria-label', shown ? 'Mostrar contraseña' : 'Ocultar contraseña');
      passInput.focus();
    },
  });

  const feedback = el('p', { class: 'adm-field__error', role: 'alert', text: message });

  const submit = el('button', { class: 'adm-btn adm-btn--primary adm-btn--full', type: 'submit', text: 'Iniciar sesión' });

  const form = el('form', { class: 'adm-login__form', novalidate: true }, [
    field('Correo electrónico', emailInput),
    el('div', { class: 'adm-field' }, [
      el('span', { class: 'adm-field__label', text: 'Contraseña' }),
      el('div', { style: 'display:flex; gap:.5rem; align-items:stretch;' }, [passInput, toggle]),
    ]),
    feedback,
    submit,
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    feedback.textContent = '';

    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      feedback.textContent = 'Escribe un correo electrónico válido.';
      emailInput.focus();
      return;
    }
    if (!password) {
      feedback.textContent = 'Escribe tu contraseña.';
      passInput.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Entrando…';
    try {
      await signIn(email, password);
      await boot(); // entra directo al panel
    } catch (error) {
      feedback.textContent = friendlyError(error);
      submit.disabled = false;
      submit.textContent = 'Iniciar sesión';
      passInput.focus();
    }
  });

  const forgot = el('button', {
    class: 'adm-btn adm-btn--ghost adm-btn--sm',
    type: 'button',
    text: '¿Has olvidado la contraseña?',
    onClick: async () => {
      const email = emailInput.value.trim();
      if (!email) {
        feedback.textContent = 'Escribe primero tu correo y vuelve a pulsar aquí.';
        emailInput.focus();
        return;
      }
      try {
        await sendResetEmail(email);
        notify('Te hemos enviado un correo para crear una contraseña nueva.', 'success');
      } catch (error) {
        notify(friendlyError(error), 'error');
      }
    },
  });

  render(
    el('div', { class: 'adm-login' }, [
      el('div', { class: 'adm-login__card' }, [
        el('p', { class: 'adm-login__brand', text: 'Juntos Siempre' }),
        el('p', { class: 'adm-login__slogan', text: 'Luchar JUNTOS. Ayudarnos SIEMPRE.' }),
        el('h1', { class: 'adm-login__title', text: 'Acceso a la gestión de la web' }),
        form,
        el('div', { class: 'adm-login__foot' }, [forgot]),
        el('p', {
          class: 'adm-login__note',
          text: 'Solo pueden entrar las cuentas autorizadas. No existe registro público.',
        }),
      ]),
    ])
  );
  emailInput.focus();
}

/** Pantalla para escribir la contraseña nueva tras el correo de recuperación. */
function newPasswordScreen() {
  const pass = input({ type: 'password', autocomplete: 'new-password', placeholder: 'Nueva contraseña' });
  const repeat = input({ type: 'password', autocomplete: 'new-password', placeholder: 'Repite la contraseña' });
  const feedback = el('p', { class: 'adm-field__error', role: 'alert' });

  const save = actionButton(
    'Guardar contraseña',
    async () => {
      feedback.textContent = '';
      if (pass.value.length < 8) {
        feedback.textContent = 'La contraseña debe tener al menos 8 caracteres.';
        return;
      }
      if (pass.value !== repeat.value) {
        feedback.textContent = 'Las dos contraseñas no coinciden.';
        return;
      }
      await updatePassword(pass.value);
      notify('Contraseña actualizada. Ya puedes entrar.', 'success');
      location.hash = '#/resumen';
      await boot();
    },
    { className: 'adm-btn adm-btn--primary adm-btn--full', busyLabel: 'Guardando…' }
  );

  render(
    el('div', { class: 'adm-login' }, [
      el('div', { class: 'adm-login__card' }, [
        el('p', { class: 'adm-login__brand', text: 'Juntos Siempre' }),
        el('h1', { class: 'adm-login__title', text: 'Crea tu contraseña nueva' }),
        field('Nueva contraseña', pass, { hint: 'Mínimo 8 caracteres.' }),
        field('Repite la contraseña', repeat),
        feedback,
        save,
      ]),
    ])
  );
}

/** Cuenta sin permiso asignado todavía. */
function noAccessScreen(profile) {
  render(
    el('div', { class: 'adm-login' }, [
      el('div', { class: 'adm-login__card' }, [
        el('p', { class: 'adm-login__brand', text: 'Juntos Siempre' }),
        el('h1', { class: 'adm-login__title', text: 'Esta cuenta no tiene acceso' }),
        el('p', { class: 'adm-muted', text: `Has entrado como ${profile?.email || 'tu cuenta'}, pero todavía no tiene permiso para gestionar la web.` }),
        el('p', { class: 'adm-login__note', text: 'Pide a una persona administradora que te dé acceso desde Configuración.' }),
        el('div', { style: 'margin-top:1.25rem' }, [
          el('button', {
            class: 'adm-btn adm-btn--ghost adm-btn--full',
            type: 'button',
            text: 'Cerrar sesión',
            onClick: async () => {
              await signOut();
              boot();
            },
          }),
        ]),
      ]),
    ])
  );
}

/** La web todavía no está conectada con el gestor. */
function notConfiguredScreen() {
  render(
    el('div', { class: 'adm-login' }, [
      el('div', { class: 'adm-login__card' }, [
        el('p', { class: 'adm-login__brand', text: 'Juntos Siempre' }),
        el('h1', { class: 'adm-login__title', text: 'Falta un paso de configuración' }),
        el('p', { class: 'adm-muted', text: 'La web todavía no está conectada con el sistema de gestión, así que el panel no puede abrirse.' }),
        el('p', { class: 'adm-login__note', text: 'Sigue el manual CONFIGURACION_ADMIN_PASO_A_PASO.md que viene con la web. Mientras tanto, la web pública funciona con normalidad.' }),
      ]),
    ])
  );
}

// ---------------------------------------------------------------------------
// ESTRUCTURA DEL PANEL
// ---------------------------------------------------------------------------
function render(node) {
  root.innerHTML = '';
  root.appendChild(node);
}

let sidebar;
let contentHost;

function buildShell(profile) {
  const navButtons = SECTIONS.map((s) =>
    el('button', {
      class: 'adm-nav-link',
      type: 'button',
      'data-section': s.id,
      onClick: () => navigate(s.id),
    }, [
      el('span', { class: 'adm-nav-link__icon', text: s.icon, 'aria-hidden': 'true' }),
      el('span', { text: s.label }),
    ])
  );

  const logout = el('button', { class: 'adm-nav-link', type: 'button' }, [
    el('span', { class: 'adm-nav-link__icon', text: '🚪', 'aria-hidden': 'true' }),
    el('span', { text: 'Cerrar sesión' }),
  ]);
  logout.addEventListener('click', async () => {
    if (!(await confirmLeave())) return;
    await signOut();
    setCurrentUser(null);
    location.hash = '';
    boot();
  });

  sidebar = el('aside', { class: 'adm-side', 'aria-label': 'Secciones del panel' }, [
    el('p', { class: 'adm-side__brand', text: 'Juntos Siempre' }),
    el('p', { class: 'adm-side__slogan', text: 'Gestión de la web' }),
    ...navButtons,
    el('div', { class: 'adm-side__spacer' }),
    el('a', { class: 'adm-nav-link', href: 'index.html', target: '_blank', rel: 'noopener' }, [
      el('span', { class: 'adm-nav-link__icon', text: '🌐', 'aria-hidden': 'true' }),
      el('span', { text: 'Ver la web' }),
    ]),
    logout,
    el('div', { class: 'adm-side__user' }, [
      el('div', { text: profile.full_name || profile.email }),
      el('span', { class: 'adm-side__role', text: profile.role === 'admin' ? 'Administrador' : 'Editor' }),
    ]),
  ]);

  contentHost = el('main', { class: 'adm-main', id: 'adm-content' });

  const burger = el('button', {
    class: 'adm-icon-btn',
    type: 'button',
    'aria-label': 'Abrir el menú',
    text: '☰',
    style: 'color:inherit',
  });

  let backdrop = null;
  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    backdrop?.remove();
    backdrop = null;
  };
  burger.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) return closeMenu();
    sidebar.classList.add('is-open');
    backdrop = el('div', { class: 'adm-side__backdrop', onClick: closeMenu });
    document.body.appendChild(backdrop);
  });
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.adm-nav-link')) closeMenu();
  });

  const topbar = el('header', { class: 'adm-topbar' }, [
    burger,
    el('span', { class: 'adm-topbar__brand', text: 'Juntos Siempre' }),
  ]);

  render(el('div', {}, [topbar, el('div', { class: 'adm-shell' }, [sidebar, contentHost])]));
}

function markActive(id) {
  sidebar?.querySelectorAll('[data-section]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.section === id);
  });
}

// ---------------------------------------------------------------------------
// NAVEGACIÓN
// ---------------------------------------------------------------------------
let currentRoute = '';

export async function navigate(sectionId, params = '') {
  if (!(await confirmLeave())) return;
  const hash = `#/${sectionId}${params ? `/${params}` : ''}`;
  if (location.hash === hash) return renderRoute();
  location.hash = hash;
}

async function renderRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [sectionId = 'resumen', ...rest] = raw.split('/');
  const section = SECTIONS.find((s) => s.id === sectionId) || SECTIONS[0];

  currentRoute = raw;
  markActive(section.id);
  setDirty(false);

  contentHost.innerHTML = '';
  contentHost.appendChild(el('div', { class: 'adm-skeletons' }, [
    el('div', { class: 'adm-skeleton' }),
    el('div', { class: 'adm-skeleton' }),
    el('div', { class: 'adm-skeleton' }),
  ]));

  try {
    const module = await section.load();
    if (currentRoute !== raw) return; // el usuario ya se movió a otra pantalla
    contentHost.innerHTML = '';
    await module.render(contentHost, { params: rest, navigate });
    contentHost.scrollIntoView({ block: 'start' });
  } catch (error) {
    contentHost.innerHTML = '';
    contentHost.appendChild(
      el('div', { class: 'adm-empty' }, [
        el('div', { class: 'adm-empty__icon', text: '⚠️' }),
        el('h3', { text: 'No se ha podido abrir esta sección' }),
        el('p', { text: friendlyError(error) }),
        el('button', {
          class: 'adm-btn adm-btn--primary',
          type: 'button',
          text: 'Volver a intentarlo',
          onClick: renderRoute,
        }),
      ])
    );
  }
}

window.addEventListener('hashchange', () => {
  if (!contentHost) return;
  if (location.hash.includes('nueva-contrasena')) return;
  renderRoute();
});

// ---------------------------------------------------------------------------
// ARRANQUE
// ---------------------------------------------------------------------------
async function boot() {
  if (!isConfigured) return notConfiguredScreen();

  // Enlace del correo de recuperación de contraseña.
  const isRecovery =
    location.hash.includes('nueva-contrasena') ||
    location.hash.includes('type=recovery');

  const session = await getSession();

  if (isRecovery && session) return newPasswordScreen();
  if (!session) return loginScreen();

  const profile = await getProfile();
  if (!profile || !profile.is_active || !['admin', 'editor'].includes(profile.role)) {
    return noAccessScreen(profile);
  }

  setCurrentUser(profile);
  buildShell(profile);

  if (!location.hash || location.hash === '#') location.hash = '#/resumen';
  await renderRoute();
}

// Si la sesión caduca en otra pestaña, se vuelve a la pantalla de acceso.
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && getCurrentUser()) {
      setCurrentUser(null);
      setDirty(false);
      boot();
    }
  });
}

boot();
