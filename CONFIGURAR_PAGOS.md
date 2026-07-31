# Activar los cobros (Stripe y PayPal)

Esta web ya tiene todo el código para cobrar de verdad. Solo falta **enchufar tus
cuentas**. Nada de esto se puede hacer por ti: las claves son tuyas y privadas.

> Mientras no completes estos pasos, la tienda sigue funcionando con el pago de
> **demostración** (no cobra). No se rompe nada.

---

## 0. Antes de nada (requisitos para vender en España)

- Estar dado de **alta como autónomo o empresa**.
- Tener listas las páginas legales reales (envíos, **devoluciones de 14 días**,
  términos y privacidad) y los **datos fiscales**.
- Definir **gastos y plazos de envío** reales.

Puedes preparar todo esto en el panel mientras tanto.

---

## 1. Crear las cuentas

- **Stripe:** crea una cuenta en https://stripe.com (España). En el panel de Stripe,
  ve a *Developers → API keys* y copia la **Secret key** (`sk_live_…`).
- **PayPal:** crea una cuenta de empresa y una app en
  https://developer.paypal.com → *Apps & Credentials* (modo **Live**). Copia el
  **Client ID** y el **Secret**.

---

## 2. Subir la función de cobro a Supabase

La función está en `supabase/functions/checkout/index.ts`.

**Opción fácil (desde el navegador):** Supabase → tu proyecto → **Edge Functions**
→ *Create a function* → nómbrala exactamente `checkout` → pega el contenido de ese
archivo → *Deploy*.

**Opción técnica (con el programa Supabase CLI):**

```bash
supabase functions deploy checkout
```

---

## 3. Guardar las claves SECRETAS en Supabase (nunca en la web)

Supabase → **Edge Functions → Secrets** (o *Project Settings → Edge Functions*),
y añade:

| Nombre | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | tu `sk_live_…` de Stripe |
| `PAYPAL_CLIENT_ID` | el Client ID de PayPal |
| `PAYPAL_SECRET` | el Secret de PayPal |
| `PAYPAL_ENV` | `live` (o `sandbox` para pruebas) |
| `SITE_URL` | `https://juntossiempre.es` |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los pone Supabase solo.

---

## 4. Activar los métodos en el panel

Entra en el panel → **Configuración → Pagos** y marca:

- ✅ *Activar cobros reales*
- ✅ *Aceptar tarjeta (Stripe)* y/o ✅ *Aceptar PayPal*

Pulsa **Guardar y publicar**. ¡Listo! El checkout ya cobra de verdad.

---

## 5. Probar antes de cobrar en serio

- Con Stripe puedes usar el **modo de prueba** (clave `sk_test_…`) y la tarjeta de
  test `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.
- Con PayPal, pon `PAYPAL_ENV = sandbox` y usa una cuenta de pruebas.
- Cuando todo funcione, cambia a las claves **live** y `PAYPAL_ENV = live`.

---

## Notas

- El importe se calcula **en el servidor** a partir de los precios reales de la
  base de datos: nadie puede pagar menos manipulando la web.
- Los **códigos promocionales** y la **caja regalo** del checkout son de
  demostración; el cobro real es *productos + envío*. Si quieres descuentos
  reales, se añaden después.
- Recomendado más adelante: correos de confirmación automáticos y webhook de
  Stripe para registrar cada pedido pagado.
