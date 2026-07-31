import { defineConfig } from 'vite';
import { resolve } from 'path';

// Base relativa para poder desplegar en cualquier subcarpeta.
// Multipágina: cada HTML es un punto de entrada.
export default defineConfig({
  base: './',
  // host: true expone el servidor en la red local (Wi-Fi).
  // allowedHosts: true permite además abrirlo por un túnel público (datos móviles).
  server: { host: true, allowedHosts: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        tienda: resolve(__dirname, 'tienda.html'),
        producto: resolve(__dirname, 'producto.html'),
        historia: resolve(__dirname, 'historia.html'),
        impacto: resolve(__dirname, 'impacto.html'),
        contacto: resolve(__dirname, 'contacto.html'),
        privacidad: resolve(__dirname, 'politica-privacidad.html'),
        terminos: resolve(__dirname, 'terminos-condiciones.html'),
        cookies: resolve(__dirname, 'cookies.html'),
        envios: resolve(__dirname, 'envios-devoluciones.html'),
        tallas: resolve(__dirname, 'guia-tallas.html'),
        // Vuelta tras pagar (Stripe / PayPal).
        pago: resolve(__dirname, 'pago-completado.html'),
        // Panel privado de gestión. No se enlaza desde el menú público.
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
