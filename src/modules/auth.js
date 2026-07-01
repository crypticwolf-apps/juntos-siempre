/**
 * Autenticación SIMULADA (solo frontend, sin backend ni seguridad real).
 * Guarda usuarios de demostración y la sesión actual en localStorage.
 */
import { load, save, emit, on } from './utils.js';

let users = load('users', []);
let session = load('session', null);

// Pedidos simulados de ejemplo que se muestran en la cuenta.
const DEMO_ORDERS = [
  {
    id: 'JS-2026-0481',
    date: '12 jun 2026',
    status: 'Entregado',
    total: 108,
    items: ['Sudadera Crew · Beige · M', 'Gorra · Negro · Única'],
  },
  {
    id: 'JS-2026-0517',
    date: '20 jun 2026',
    status: 'En reparto',
    total: 39,
    items: ['Camiseta Essential · Azul marino · L'],
  },
];

export function currentUser() {
  return session;
}

export function isLoggedIn() {
  return !!session;
}

export function register({ name, email, password }) {
  email = (email || '').trim().toLowerCase();
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: 'Ya existe una cuenta con este email.' };
  }
  const user = { name: name.trim(), email, password };
  users = [...users, user];
  save('users', users);
  session = { name: user.name, email: user.email };
  save('session', session);
  emit('auth:change', { user: session });
  return { ok: true, user: session };
}

export function login({ email, password }) {
  email = (email || '').trim().toLowerCase();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return { ok: false, error: 'Email o contraseña incorrectos.' };
  }
  session = { name: user.name, email: user.email };
  save('session', session);
  emit('auth:change', { user: session });
  return { ok: true, user: session };
}

export function recover(email) {
  email = (email || '').trim().toLowerCase();
  const exists = users.some((u) => u.email === email);
  // Demostración: nunca revelamos si el email existe, igual que en producción.
  return { ok: true, exists };
}

export function logout() {
  session = null;
  save('session', null);
  emit('auth:change', { user: null });
}

export function getOrders() {
  return DEMO_ORDERS;
}

export function onAuthChange(handler) {
  on('auth:change', handler);
}
