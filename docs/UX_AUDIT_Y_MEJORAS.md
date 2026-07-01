# Juntos Siempre — Auditoría UX y plan de mejoras

Documento de trabajo del rediseño. Recoge los fallos detectados en la versión
anterior, las decisiones de rediseño, las buenas prácticas investigadas (con
fuentes), lo mejorado, las pruebas realizadas y lo que queda pendiente.

---

## 1. Fallos detectados en la web anterior

**Arquitectura y contenido**
- **Demasiadas secciones en una sola página** (SPA larga): hero, colección, tienda,
  calidad, historia, regalo, compromiso, newsletter… todo apilado. Saturaba y diluía
  la jerarquía.
- **Texto repetido** del mismo mensaje en varios bloques; el slogan aparecía 4–5 veces.
- **Mezcla de tono** entre tienda de moda, ONG y plantilla corporativa.
- **Exceso de iconos, tarjetas y bloques** que restaban aire y sensación premium.
- **Estadísticas ficticias** (contadores de prendas, fondos, comunidades) y un
  "informe de impacto" con cifras inventadas: poco creíble y éticamente discutible.
- **Imágenes de catástrofe/hospital** usadas como reclamo emocional de venta.

**Navegación**
- Header con demasiados enlaces sueltos y sin agrupar la tienda.
- Sin mega menú ni jerarquía de categorías.
- Navegación basada en anclas dentro de una única página.

**Producto / catálogo**
- Catálogo correcto pero embebido en la home; faltaba una página de tienda dedicada.
- La ficha de producto vivía solo en un modal de "vista rápida".

**Accesibilidad / rendimiento**
- Imagen del hero sin prioridad de carga declarada.
- Sin estrategia de `srcset`/formatos modernos.
- Animaciones por scroll razonables, pero sin una jerarquía clara de “2–3 elementos
  por pantalla”.

---

## 2. Decisiones de rediseño

- **Multipágina real** con Vite: `index`, `tienda`, `historia`, `impacto`, `contacto`
  y un lanzador `ABRIR_JUNTOS_SIEMPRE.html`. Cada página tiene una intención clara.
- **Chrome compartido por componentes JS** (header con mega menú, footer, cesta,
  búsqueda, banner de cookies) inyectado en todas las páginas para no
  duplicar marcado y mantener una sola fuente de verdad.
- **Dirección visual oscura y editorial**: negro profundo + crema/arena, serif para
  titulares y sans para interfaz. Mucho espacio en blanco, foto grande, producto
  protagonista, menos adornos.
- **Home corta y orientada a producto**: hero → colección → destacados → calidad →
  emocional → regalo → compromiso → newsletter.
- **Eliminación total de cifras inventadas** y de imágenes de catástrofe como reclamo.
  El compromiso solidario se comunica en futuro y con prudencia.
- **Datos de catálogo centralizados** en `src/data/products.js` (única fuente).
- **Cambio de slogan** en todo el proyecto a: **Luchar JUNTOS. Ayudarnos SIEMPRE.**

---

## 3. Buenas prácticas investigadas (fuentes)

**Accesibilidad de modales (WCAG 2.2 / ARIA APG)**
- El diálogo modal **atrapa el foco** (Tab/Shift+Tab circulan dentro), se cierra con
  **Escape**, **devuelve el foco** al disparador y deja **inerte** el resto de la página.
  El foco inicial va al primer elemento útil del diálogo.
  Fuentes: [Dialog (Modal) Pattern — W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
  [SC 2.1.2 No Keyboard Trap — WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html),
  [SC 2.4.11 Focus Not Obscured — WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).

**Navegación / mega menú**
- Patrón **disclosure**: botón con `aria-expanded` que muestra/oculta un panel de
  enlaces; estructura con listas anidadas; operable con teclado y ratón; Escape cierra.
  Fuentes: [Menus Tutorial — W3C WAI](https://www.w3.org/WAI/tutorials/menus/),
  [Disclosure Navigation — W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).

**Selector de variantes (color/talla)**
- **Swatches de color** visibles (mín. ~32 px escritorio, ~40 px móvil) con indicador
  de selección claro (borde grueso/anillo), no solo cambio de color.
- **Tallas como botones**, no desplegable oculto.
- Las **miniaturas/imagen principal se actualizan al cambiar de variante**.
- Aportar **información de tallas** suficiente (guía).
  Fuentes: [Product Page UX — Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux),
  [Apparel UX Best Practices — Baymard](https://baymard.com/blog/apparel-5-best-practices),
  [Variation thumbnails — Baymard](https://baymard.com/blog/color-and-variation-searches).

**Rendimiento / imágenes (Core Web Vitals)**
- La imagen **LCP** (hero) debe estar en el HTML inicial, **sin** `loading="lazy"`, con
  `fetchpriority="high"` y `decoding` adecuado; **lazy** solo por debajo del pliegue.
- Usar **WebP/AVIF**, `srcset`/`sizes` cuando aporte; declarar `width`/`height` o
  `aspect-ratio` para evitar **CLS**. Evitar `data-src` que dependa de JS.
  Fuentes: [Optimize LCP — web.dev](https://web.dev/articles/optimize-lcp),
  [Too much lazy loading — web.dev](https://web.dev/articles/lcp-lazy-loading),
  [Fix image LCP — MDN](https://developer.mozilla.org/en-US/blog/fix-image-lcp/),
  [Responsive images — web.dev](https://web.dev/learn/design/responsive-images).

---

## 4. Qué se ha mejorado y por qué

- **Estructura clara multipágina** → cada página con un objetivo, menos saturación.
- **Header con mega menú accesible (disclosure)** → agrupa la tienda, navegación limpia.
- **Dirección visual editorial oscura** → sensación de marca real, producto protagonista.
- **Catálogo en página propia** con filtros (barra horizontal en escritorio, panel
  inferior accesible en móvil), orden, contador de resultados y estados vacíos.
- **Ficha de producto dedicada** con galería que cambia por variante,
  swatches accesibles, tallas en botones, stock, guía de tallas y relacionados.
- **Carrito** limpio: variantes editables, regalo, caja, mensaje, promo demo y resumen.
- **Checkout por pasos** (información → envío → pago → confirmación) con validación en
  vivo, foco al primer error y aviso de demostración.
- **Sin estadísticas falsas**: la página de impacto explica el compromiso en futuro y
  cómo se comunicará, con un bloque “Próximamente”.
- **Slogan único** “Luchar JUNTOS. Ayudarnos SIEMPRE.” en hero, footer, historia y cierre.
- **Rendimiento**: hero sin lazy + `fetchpriority="high"` + `decoding`; resto de
  imágenes con `loading="lazy"` y dimensiones declaradas para evitar CLS.
- **Accesibilidad**: skip link, landmarks, headings jerárquicos, foco visible, focus
  trap y Escape en modales/drawers, labels visibles, errores por campo, `aria-live`.

---

## 5. Pruebas realizadas

Verificación funcional sobre el servidor de desarrollo (consultando estado del DOM y
estilos computados) en escritorio (1280 px), tablet (≈768–1024 px) y móvil (375 px):

**Escritorio**
- Home: chrome montado, 4 categorías, 4 destacados, hero con `fetchpriority="high"` y
  sin `lazy`, footer con slogan correcto, 0 imágenes rotas.
- Mega menú: abre/cierra con `aria-expanded`, se cierra con Escape; enlaces a
  `tienda.html?cat=…`.
- Tienda: `?cat=` filtra al cargar; filtros (categoría, color, talla, precio,
  disponibilidad), orden y contador funcionan; estado vacío con "Quitar filtros".
- Producto (vista rápida): galería con miniaturas etiquetadas, swatches y tallas;
  `arena·XS` sale como agotada y deshabilitada; no añade sin talla; añadir abre la cesta.
- Carrito: variantes editables, regalo, caja, promo (`JUNTOS10`), totales y vaciar.
- Checkout por pasos: 4 pasos; sin datos no avanza (7 errores); recorre
  Información → Envío → Pago → Confirmación; final "Gracias por luchar JUNTOS." y vacía cesta.
- Historia: 6 capítulos, manifiesto y hero con el slogan; un único `h1`.
- Compromiso: **0 contadores** y sin imágenes dramáticas; 4 principios y bloque "Próximamente".
- Contacto: validación por campo con foco al primer error; FAQ acordeón accesible.
- Consola **sin errores** tras navegar por las 5 páginas.

**Móvil (375 px)**
- Hamburguesa y "Filtrar y ordenar" visibles; menú a pantalla completa abre/cierra.
- Panel de filtros como hoja inferior con overlay y botón "Ver N resultados".
- Grid a 2 columnas y **sin scroll horizontal** (`scrollWidth == innerWidth`).

**Build**
- `npm run build` genera las 5 páginas sin errores ni warnings relevantes.
- Búsqueda global: el slogan vigente es exactamente
  **Luchar JUNTOS. Ayudarnos SIEMPRE.**

> Nota: la captura de pantalla del entorno de previsualización no estaba disponible, por
> lo que la verificación visual se hizo leyendo el DOM y los estilos computados. Algunas
> transiciones (max-height de acordeón, translate de drawers, contadores por rAF) aparecen
> "congeladas" al inspeccionarlas porque el render del preview no avanza fotogramas; las
> clases de estado se aplican correctamente y animan en un navegador real.

---

## 6. Pendientes / limitaciones (honestas)

- **Conversión a WebP/AVIF**: recomendada para las fotos del kit (JPG de 0,5–1 MB).
  Requiere un paso de build con herramienta de imágenes; se deja documentado para no
  introducir dependencias frágiles. Las dimensiones, el lazy selectivo y la prioridad
  del hero ya están aplicados.
- **`srcset` multi-resolución**: las imágenes del kit son únicas; generar variantes
  aporta valor real solo tras producir activos definitivos.
- **Backend / pagos / envíos**: siguen siendo **demostración** (localStorage, sin
  cobros). Auth, pedidos, stock, promos y costes son simulados.
- Las **fotos del kit son mockups conceptuales**; sustituir por producto real antes de
  una tienda comercial.
