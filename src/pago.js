/**
 * Página de vuelta tras pagar.
 *
 *   · Stripe: solo llega aquí si el pago se ha completado → mostramos éxito.
 *   · PayPal: vuelve con la referencia del pedido y hay que confirmarlo
 *     (capturarlo) llamando a la función segura de Supabase.
 *
 * En ambos casos se vacía la cesta al terminar bien.
 */
import './styles.css';
import { loadContent } from './lib/content.js';
import { capturePaypal } from './modules/payments.js';

const box = document.querySelector('[data-pago]');
const params = new URLSearchParams(location.search);
const provider = params.get('provider');

function clearCart() {
  try {
    localStorage.removeItem('cart');
    localStorage.removeItem('cart_meta');
  } catch {
    /* almacenamiento no disponible */
  }
}

function view(icon, title, text, { error = false } = {}) {
  box.innerHTML = '';
  box.className = 'pago__card' + (error ? ' is-error' : ' is-ok');
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="pago__icon" aria-hidden="true">${icon}</div>
    <h1 class="pago__title">${title}</h1>
    <p class="pago__text">${text}</p>
    <div class="pago__actions">
      <a class="btn btn--primary" href="index.html">Volver al inicio</a>
      <a class="btn btn--outline" href="tienda.html">Seguir comprando</a>
    </div>`;
  box.appendChild(wrap);
}

function success() {
  clearCart();
  view('❤', '¡Gracias por tu compra!', 'Tu pago se ha completado. Te enviaremos la confirmación por correo. Luchar JUNTOS. Ayudarnos SIEMPRE.');
}

function failure(msg) {
  view('⚠', 'No hemos podido confirmar el pago', `${msg} Si el importe se te ha cobrado, escríbenos y lo revisamos enseguida.`, { error: true });
}

async function run() {
  await loadContent().catch(() => {});
  if (provider === 'paypal') {
    const token = params.get('token');
    if (!token) return failure('Falta la referencia del pago.');
    try {
      const done = await capturePaypal(token);
      done ? success() : failure('El pago no se ha completado.');
    } catch (e) {
      failure(e?.message || 'Ha ocurrido un error al confirmar el pago.');
    }
  } else {
    // Stripe (u otros con redirección tras pago): llegar aquí ya es éxito.
    success();
  }
}

run();
