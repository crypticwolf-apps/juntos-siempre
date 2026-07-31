// ============================================================================
// Juntos Siempre — Cobro seguro (Stripe + PayPal)
//
// Función de Supabase (Edge Function). Se ejecuta en el servidor de Supabase,
// NO en el navegador: aquí es el único sitio donde viven las claves secretas.
//
// Qué hace:
//   1. Recibe la cesta del cliente: [{ slug, qty }] + método de envío.
//   2. Vuelve a mirar los precios REALES en la base de datos (para que nadie
//      pueda manipular el importe desde el navegador).
//   3. Crea el cobro en Stripe o en PayPal y devuelve la dirección a la que
//      hay que enviar al cliente para pagar.
//   4. Para PayPal, también "captura" (confirma) el pago al volver.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY        (sk_live_… o sk_test_…)
//   PAYPAL_CLIENT_ID
//   PAYPAL_SECRET
//   PAYPAL_ENV               ("live" o "sandbox"; por defecto "live")
//   SITE_URL                 (https://juntossiempre.es)
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solos.)
// ============================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const env = (k: string) => Deno.env.get(k) || '';

// Coste de envío (debe coincidir con el de la web: src/modules/cart.js).
const SHIPPING: Record<string, number> = { standard: 3.95, express: 6.95, pickup: 0 };
const FREE_SHIPPING_FROM = 50;

function shippingCost(method: string, subtotal: number): number {
  if (method === 'pickup') return 0;
  if (method === 'standard' && subtotal >= FREE_SHIPPING_FROM) return 0;
  return SHIPPING[method] ?? SHIPPING.standard;
}

/** Precios reales desde la base de datos, solo productos publicados. */
async function priceItems(items: Array<{ slug: string; qty: number }>) {
  const slugs = [...new Set(items.map((i) => i.slug))].filter(Boolean);
  if (!slugs.length) return [];
  const url = `${env('SUPABASE_URL')}/rest/v1/products` +
    `?status=eq.published&slug=in.(${slugs.map((s) => `"${s}"`).join(',')})&select=slug,name,price`;
  const res = await fetch(url, {
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}` },
  });
  if (!res.ok) throw new Error('No se han podido leer los precios.');
  const rows: Array<{ slug: string; name: string; price: number }> = await res.json();
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
  const out: Array<{ name: string; price: number; qty: number }> = [];
  for (const it of items) {
    const p = bySlug[it.slug];
    const qty = Math.max(1, Math.min(20, Number(it.qty) || 1));
    if (p) out.push({ name: p.name, price: Number(p.price), qty });
  }
  return out;
}

// --------------------------------------------------------------------- STRIPE
async function stripeCheckout(lines: Array<{ name: string; price: number; qty: number }>, ship: number, successUrl: string, cancelUrl: string) {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', `${successUrl}?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', cancelUrl);
  body.append('payment_method_types[]', 'card');
  lines.forEach((l, i) => {
    body.set(`line_items[${i}][price_data][currency]`, 'eur');
    body.set(`line_items[${i}][price_data][product_data][name]`, l.name);
    body.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(l.price * 100)));
    body.set(`line_items[${i}][quantity]`, String(l.qty));
  });
  if (ship > 0) {
    const i = lines.length;
    body.set(`line_items[${i}][price_data][currency]`, 'eur');
    body.set(`line_items[${i}][price_data][product_data][name]`, 'Envío');
    body.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(ship * 100)));
    body.set(`line_items[${i}][quantity]`, '1');
  }
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Error de Stripe');
  return data.url as string;
}

// --------------------------------------------------------------------- PAYPAL
function paypalBase() {
  return env('PAYPAL_ENV') === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}
async function paypalToken() {
  const creds = btoa(`${env('PAYPAL_CLIENT_ID')}:${env('PAYPAL_SECRET')}`);
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error('No se ha podido conectar con PayPal.');
  return data.access_token as string;
}
async function paypalCreate(lines: Array<{ name: string; price: number; qty: number }>, ship: number, successUrl: string, cancelUrl: string) {
  const token = await paypalToken();
  const itemTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = itemTotal + ship;
  const order = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'EUR',
        value: total.toFixed(2),
        breakdown: {
          item_total: { currency_code: 'EUR', value: itemTotal.toFixed(2) },
          shipping: { currency_code: 'EUR', value: ship.toFixed(2) },
        },
      },
      items: lines.map((l) => ({
        name: l.name.slice(0, 127),
        quantity: String(l.qty),
        unit_amount: { currency_code: 'EUR', value: l.price.toFixed(2) },
      })),
    }],
    application_context: {
      brand_name: 'Juntos Siempre',
      user_action: 'PAY_NOW',
      shipping_preference: 'GET_FROM_FILE',
      return_url: `${successUrl}?provider=paypal`,
      cancel_url: cancelUrl,
    },
  };
  const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Error de PayPal');
  const approve = (data.links || []).find((l: { rel: string; href: string }) => l.rel === 'approve');
  return approve?.href as string;
}
async function paypalCapture(orderId: string) {
  const token = await paypalToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'No se ha podido confirmar el pago.');
  return data.status === 'COMPLETED';
}

// ----------------------------------------------------------------- SERVIDOR
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const payload = await req.json();
    const action = payload.action || 'create';
    const siteUrl = env('SITE_URL') || 'https://juntossiempre.es';
    const successUrl = `${siteUrl}/pago-completado.html`;
    const cancelUrl = `${siteUrl}/?pago=cancelado`;

    // Confirmar el pago de PayPal al volver.
    if (action === 'capture') {
      const ok = await paypalCapture(String(payload.orderId || ''));
      return json({ ok });
    }

    // Crear el cobro.
    const items = Array.isArray(payload.items) ? payload.items : [];
    const lines = await priceItems(items);
    if (!lines.length) return json({ error: 'La cesta está vacía o no es válida.' }, 400);

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const ship = shippingCost(String(payload.shipping || 'standard'), subtotal);

    if (payload.provider === 'paypal') {
      const url = await paypalCreate(lines, ship, successUrl, cancelUrl);
      return json({ url });
    }
    const url = await stripeCheckout(lines, ship, successUrl, cancelUrl);
    return json({ url });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 400);
  }
});
