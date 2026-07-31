/**
 * Pagos reales (Stripe / PayPal).
 *
 * El navegador NUNCA ve las claves secretas: solo llama a la función segura de
 * Supabase ("checkout"), que es quien crea el cobro con el proveedor y devuelve
 * la dirección a la que hay que enviar al cliente para pagar.
 *
 * Mientras los pagos no estén activados en Configuración → Pagos, la web sigue
 * usando el checkout de demostración, exactamente igual que antes.
 */
import { supabase, isConfigured } from '../lib/supabase.js';
import { settings } from '../lib/content.js';

export function paymentsConfig() {
  return settings('payments', null, {}) || {};
}

/** ¿Hay pagos reales activados y bien configurados? */
export function paymentsEnabled() {
  const c = paymentsConfig();
  return Boolean(isConfigured && c.enabled && (c.stripe || c.paypal));
}

/** Proveedores activos, en orden de preferencia. */
export function enabledProviders() {
  const c = paymentsConfig();
  const out = [];
  if (c.stripe) out.push('stripe');
  if (c.paypal) out.push('paypal');
  return out;
}

/**
 * Inicia el pago: pide a la función segura que cree el cobro y lleva al cliente
 * a la pasarela (Stripe o PayPal).
 *
 * @param {'stripe'|'paypal'} provider
 * @param {{items: Array<{slug:string, qty:number}>, shipping?: string}} order
 */
export async function startCheckout(provider, { items, shipping = 'standard' }) {
  const { data, error } = await supabase.functions.invoke('checkout', {
    body: { provider, items, shipping },
  });
  if (error) throw new Error(error.message || 'No se ha podido iniciar el pago.');
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('El proveedor de pago no ha devuelto un enlace.');
  window.location.href = data.url;
}

/** Confirma (captura) un pago de PayPal al volver a la web. */
export async function capturePaypal(orderId) {
  const { data, error } = await supabase.functions.invoke('checkout', {
    body: { action: 'capture', orderId },
  });
  if (error) throw new Error(error.message || 'No se ha podido confirmar el pago.');
  return Boolean(data?.ok);
}
