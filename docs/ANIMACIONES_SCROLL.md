# Animaciones y scroll — Juntos Siempre

Documento técnico de las animaciones de scroll de la web.

## Librería

- **GSAP 3 + ScrollTrigger** (`src/modules/animations.js`).
- Se importan solo `gsap` y `gsap/ScrollTrigger`. No se cargan plugins de pago.
- Todas las animaciones priorizan `transform`, `opacity`, `scale` y `clip-path`
  (propiedades aceleradas por GPU). No se animan `top`, `left`, `width` ni `height`.

## Animaciones creadas y dónde se aplican

| Animación | Selector | Páginas / secciones | Técnica |
| --- | --- | --- | --- |
| Entrada del hero | `[data-hero-anim]` | Hero de inicio e historia | `opacity` + `y`, stagger, al cargar |
| Parallax del hero | `[data-hero-img]` | Hero de inicio e historia | `yPercent` con `scrub` (muy leve) |
| Desvanecido del texto del hero | `.hero__content` | Hero de inicio | `opacity`+`y` con `scrub` al iniciar scroll |
| Reveal individual | `[data-anim]` | Todas (cabeceras, bloques) | `opacity` + `y`, al entrar en viewport |
| Reveal en grupo (stagger) | `[data-anim-group] > *` | Grids, galerías, destacados | `opacity` + `y`, stagger |
| Image reveal (cortina) | `.chapter__media`, `.quality__item`, `.gift__media` | Historia, calidad, regalo | `clip-path: inset()` + `scale` |
| Entrada de tarjetas filtradas | tarjetas del grid | Tienda | `opacity` + `y` al re-renderizar |

> El parallax intenso y el scroll-jacking están **descartados**: el scroll nunca se
> bloquea ni se secuestra, y el parallax del hero es mínimo para no ocultar a las
> personas de la parte inferior de la imagen.

## Adaptación a móvil

- Se detecta `(max-width: 768px)` y se **reduce la intensidad**: el parallax del hero
  baja de `yPercent: 10` a `5`, y el `scale` del image-reveal de `1.06` a `1.02`.
- Las cortinas `clip-path` se mantienen pero más sutiles.
- No se aplican efectos pesados ni simultáneos: como máximo 2-3 elementos animados por
  pantalla.

## `prefers-reduced-motion`

- Al inicio de `initAnimations()` se comprueba
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
- Si está activo: **no se registra ninguna animación**. Todo el contenido marcado como
  animable se fuerza a `opacity: 1` y `transform: none`, quedando visible y estático.
- El CSS también incluye un bloque que neutraliza `animation`/`transition` con
  `prefers-reduced-motion: reduce`.

## Robustez

- El contenido **no depende de JavaScript para ser visible**: los elementos `[data-anim]`
  no parten de `opacity: 0` en CSS; si GSAP no cargara, se ven igualmente.
- `refreshScroll()` recalcula ScrollTrigger tras renders dinámicos (filtros de tienda).
- Las cortinas de reveal se aplican sobre la imagen, no sobre zonas clicables, y nunca
  dejan capas con `pointer-events` que bloqueen botones o enlaces.
