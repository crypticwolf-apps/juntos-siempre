# Juntos Siempre — Web e-commerce

> **Luchar JUNTOS. Ayudarnos SIEMPRE.**

Web de moda **premium, minimalista y editorial** para la marca **Juntos Siempre**.
Ropa de calidad con el logo bordado sobre el corazón. Sitio **multipágina** construido
con **Vite + HTML5 + CSS3 + JavaScript moderno**, animaciones con **GSAP + ScrollTrigger**
e iconos **Lucide**. Carrito, login, newsletter y preferencias se guardan en
`localStorage`. **No hay backend ni pagos reales**: el flujo de compra es una demostración.

---

## 🚀 Puesta en marcha

Requisitos: **Node.js 18+**.

```bash
npm install      # instala dependencias
npm run dev      # servidor de desarrollo → http://localhost:5173/
npm run build    # build de producción en /dist
npm run preview  # sirve /dist para revisarlo
```

Para abrir la web cómodamente tras `npm run dev`, abre en el navegador el archivo
**`ABRIR_JUNTOS_SIEMPRE.html`** (en la raíz) y pulsa **“Abrir Juntos Siempre”**.

---

## 📁 Estructura

```text
juntos-siempre/
├── index.html                 # Home
├── tienda.html                # Catálogo (filtros + orden)
├── historia.html              # Historia de marca (6 capítulos)
├── impacto.html               # Compromiso solidario (transparente)
├── contacto.html              # Contacto + FAQ
├── ABRIR_JUNTOS_SIEMPRE.html  # Lanzador standalone (no es parte del build)
├── producto.html              # Ficha de producto dedicada
├── netlify.toml               # Build y carpeta de publicación para Netlify
├── vite.config.js             # Multipágina
├── docs/
│   └── UX_AUDIT_Y_MEJORAS.md  # Auditoría UX, decisiones y fuentes
├── public/
│   └── favicon.png
└── src/
    ├── main.js                # Entrada: monta el chrome e inicia cada página
    ├── styles.css             # Sistema de estilos (dark editorial)
    ├── data/
    │   └── products.js        # ⭐ FUENTE ÚNICA: productos, variantes, precios, stock, slogan
    ├── components/
    │   └── chrome.js          # Header + mega menú (enlace + chevron), footer, cesta, búsqueda
    └── modules/
        ├── catalog.js         # Tarjetas, colección, destacados y página de tienda
        ├── cart.js            # Carrito (variantes, regalo, promo)
        ├── auth.js            # Login / registro / cuenta (simulado)
        ├── product-page.js    # Ficha de producto dedicada
        ├── filters.js         # Filtrado y orden
        ├── modals.js          # Producto, guía de tallas, checkout por pasos, cuenta
        ├── animations.js      # GSAP + ScrollTrigger (respeta prefers-reduced-motion)
        └── utils.js           # localStorage, eventos, toasts, helpers de DOM
```

> Las fotos provienen del kit de marca y **son mockups conceptuales**: conviene
> sustituirlas por producto real antes de una tienda comercial.

---

## ✏️ Cómo editar el contenido

### Catálogo (única fuente)

Todo el catálogo vive en [`src/data/products.js`](src/data/products.js): **no hay datos de
producto repetidos** por la web. El catálogo, los modales, el carrito, los filtros y la
búsqueda leen de ahí.

- **Precio:** cambia `price` (número en euros).
- **Stock / agotados:** añade combinaciones a `soldOut` como `'colorId|TALLA'`
  (gorras/accesorios: `'colorId|U'`).
- **Imágenes:** sustituye el archivo en `src/assets/products/` (mismo nombre) o cambia el
  `import` correspondiente. Cada color define `image`, `hover` y `gallery`.
- **Colores / tallas:** edita el diccionario `COLORS` y las listas `colors` / `sizes`.
- **Textos de producto:** `name`, `shortDesc`, `description`, `composition`, `care`.

### Slogan de marca

El slogan está centralizado en `BRAND_SLOGAN` (en `products.js`) y es exactamente:
**`Luchar JUNTOS. Ayudarnos SIEMPRE.`**

### Códigos promocionales (demo)

En [`src/modules/cart.js`](src/modules/cart.js) → `PROMOS`: `JUNTOS10` (−10%),
`ABRAZO5` (−5 €), `SIEMPRE` (envío gratis).

### Textos de páginas

Los textos narrativos (hero, historia, compromiso, FAQ) están en sus respectivos `.html`,
comentados por secciones.

---

## ✨ Funcionalidades

- Home corta orientada a producto, **tienda** con filtros (barra en escritorio, panel
  inferior accesible en móvil), orden, contador de resultados y estados vacíos.
- **Header con mega menú accesible** (patrón disclosure) y menú móvil a pantalla completa.
- **Ficha de producto dedicada** con galería por variante, swatches y tallas
  accesibles, stock, guía de tallas, opción de regalo y relacionados.
- **Carrito** con variantes editables, regalo, caja, mensaje, código promo y resumen.
- **Checkout por pasos** (Información → Envío → Pago → Confirmación) con validación en
  vivo, foco al primer error y aviso de demostración.
- **Cuenta simulada**, buscador con debounce, newsletter y contacto validados.
- Toasts, progreso de scroll, volver arriba.
- **Páginas legales/info reales**: privacidad, términos, cookies, envíos y devoluciones,
  guía de tallas (sin enlaces `href="#"`).
- **Favicon adaptativo** claro/oscuro (SVG) y `theme-color` por esquema de color.

## ♿ Accesibilidad (WCAG 2.2)

- HTML semántico, landmarks, skip link, headings jerárquicos, foco visible.
- Modales y drawers con **focus trap**, cierre con **Escape** y devolución del foco.
- Botones reales, labels visibles, errores por campo y `aria-live` en feedback.
- Contraste cuidado y áreas táctiles cómodas; respeta `prefers-reduced-motion`.

## ⚡ Rendimiento

- Imagen del hero **sin** `loading="lazy"`, con `fetchpriority="high"` y `decoding="async"`.
- Resto de imágenes con `loading="lazy"` y dimensiones declaradas para evitar **CLS**.
- Solo se importan los iconos de Lucide que se usan.

## ⚠️ Esto sigue siendo demostración

No se procesan pagos ni envíos reales. Auth, pedidos, stock, promos y costes son
simulados y se guardan solo en tu navegador. Las cifras de impacto **no se inventan**:
el compromiso solidario se comunica en futuro y con prudencia.
