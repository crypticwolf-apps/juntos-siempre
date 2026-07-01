# Créditos de imágenes — Juntos Siempre

Registro del origen y la licencia de las imágenes del proyecto.

## Estado actual

Las imágenes que se muestran ahora provienen del **kit de marca** entregado con el
proyecto (`src/assets/products`, `src/assets/models`, `src/assets/packaging`,
`src/assets/story`). **Son mockups conceptuales generados para la identidad visual**, no
fotografías comerciales definitivas. Deben sustituirse por fotografía real de producto
antes de una tienda comercial.

No se han incorporado imágenes de bancos externos (Unsplash, Pexels, Pixabay, Burst) en
esta iteración: el entorno de trabajo no permite descargar binarios de internet de forma
fiable. La estructura y la documentación quedan preparadas para añadirlas.

## Imagen de hero (pendiente de sustitución por el usuario)

| Campo | Valor |
| --- | --- |
| Archivo | `src/assets/editorial/hero-juntos-siempre-montana-atardecer.webp` |
| Estado | **Placeholder temporal** (copia de `models/amigos-unidos.jpg` del kit) |
| Uso | Imagen principal del hero de la home |
| Acción | El usuario añadirá manualmente su fotografía real de montaña/atardecer con los tres grupos (abuelos, familia con perro, dos amigos) en esa misma ruta y nombre |

Cuando se coloque la foto real (mismo nombre y ruta), la web la usará automáticamente sin
más cambios. Recomendado: exportar en **WebP/AVIF**, lado largo ≥ 2000 px, con las
personas en la mitad inferior del encuadre.

## Cómo añadir imágenes externas (plantilla obligatoria)

Descarga siempre la imagen al proyecto (no enlaces a URLs externas) en:

```text
src/assets/editorial/
```

Y añade una entrada a esta tabla por cada imagen:

| Archivo | Fuente | Autor | Licencia | URL de origen | Fecha descarga | Uso en la web |
| --- | --- | --- | --- | --- | --- | --- |
| _(ejemplo)_ `amistad-atardecer.webp` | Unsplash | — | Unsplash License (uso comercial) | https://unsplash.com/photos/... | 2026-06-26 | Sección emocional |

### Fuentes permitidas

- Unsplash (Unsplash License), Pexels (Pexels License), Pixabay (Pixabay License),
  Shopify Burst — todas con uso comercial. Indica siempre autor y URL.
- Bancos de pago: marcar claramente que requieren licencia/compra.

### No usar

- Google Images sin licencia clara, Pinterest, Instagram, campañas de otras marcas,
  medios de comunicación, imágenes de catástrofes/hospitales/víctimas/rescates, personas
  reconocibles sin licencia, prendas de otras marcas visibles.

## Logos y favicons

| Archivo | Origen | Uso |
| --- | --- | --- |
| `src/assets/logo/logo-blanco.png` | Kit de marca | Logo del header y footer |
| `public/favicon-light.svg` | Creado en el proyecto (monograma de corazón bordado) | Favicon en modo claro (trazo negro) |
| `public/favicon-dark.svg` | Creado en el proyecto | Favicon en modo oscuro (trazo claro) |
| `public/apple-touch-icon.png`, `favicon-32x32.png`, `favicon-16x16.png` | Placeholder desde `favicon.png` | Fallback PNG; pendiente generar versiones cuadradas definitivas |
