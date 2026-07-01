# QA de navegación y errores — Juntos Siempre

Verificación funcional del rediseño. Las comprobaciones se hicieron sobre el servidor de
desarrollo consultando el DOM y los estilos computados (la captura de pantalla del
entorno no estaba disponible; las transiciones se validan por estado/clase, no por
fotograma).

## Errores encontrados y corregidos

| # | Error | Causa | Archivo | Solución | Resultado |
| --- | --- | --- | --- | --- | --- |
| 1 | Categoría "Hoodies" presente | Producto y categoría en datos | `src/data/products.js` | Eliminado producto `hoodie` y categoría `hoodies` | No existe en menú, filtros, datos ni URL |
| 2 | `?categoria=hoodies` mostraría vacío | Sin redirección | `src/modules/catalog.js` | Redirección a `tienda.html` con `replaceState` | URL se limpia y muestra todo |
| 3 | Categorías usaban `?cat=` | Parámetro antiguo | `catalog.js`, `chrome.js` | Cambiado a `?categoria=` (con fallback `cat`) | Rutas correctas en mega, home y footer |
| 4 | "Tienda" abría el menú con el mismo clic | Botón único toggle | `chrome.js` | Enlace real a `tienda.html` + botón chevron independiente | El enlace navega; el chevron abre/cierra sin navegar |
| 5 | Enlaces legales `href="#"` + modales | Placeholders | `chrome.js` + páginas nuevas | Páginas reales: privacidad, términos, cookies, envíos, tallas | 0 enlaces `href="#"` |
| 6 | Favicon roto (`./public/favicon.png`) | Ruta incorrecta para build | Todos los `<head>` | Favicons SVG claro/oscuro + PNG en `/` + `color-scheme` + `theme-color` por esquema | Favicon adaptativo claro/oscuro |
| 7 | Hero no respondía a la composición pedida | Imagen y layout antiguos | `index.html` + `styles.css` | Imagen de montaña, texto arriba, `object-position: center bottom`, gradiente suave | Texto arriba; personas visibles abajo |
| 8 | Menús/carrito podían quedar bajo secciones | z-index bajos | `styles.css` | Jerarquía: header 100, mega 500, overlay 900, drawer/menú 1000, search 1050, modal 1100, toast 1300 | Carrito y menú por encima de todo |
| 9 | Mega menú no se recogía / desaparecía al pasar el ratón | `[hidden]` anulado + hueco trigger-panel | `styles.css`, `chrome.js` | `.mega[hidden]{display:none}` + cierre con retardo de 220 ms | Se recoge y permite seleccionar |
| 10 | Imágenes de producto borrosas en modal | `backdrop-filter` + `transform` (capa GPU) | `styles.css` | Overlays sólidos sin `backdrop-filter` | Imágenes nítidas |

## Checklist (sección 30)

| # | Comprobación | Resultado |
| --- | --- | --- |
| 1 | Inicio abre correctamente | ✅ home con 4 colecciones y 4 destacados |
| 2 | Tienda abre `/tienda.html` con todos los productos | ✅ 6 productos, sin categoría activa |
| 3 | Chevron de Tienda abre mega sin navegar | ✅ toggle `display none↔grid`, URL sin cambios |
| 4 | Camisetas abre catálogo filtrado | ✅ `?categoria=camisetas` |
| 5 | Sudaderas abre catálogo filtrado | ✅ |
| 6 | Gorras abre catálogo filtrado | ✅ título "Gorras", 1 producto |
| 7 | Accesorios abre catálogo filtrado | ✅ |
| 8 | Hoodies no existe (menú, página, filtros, URL, código) | ✅ solo queda la lógica de redirección |
| 9 | Cada producto abre su ficha exacta | ✅ tarjetas enlazan a `producto.html?id=<id>` |
| 10 | Favoritos no abren producto por error | ✅ ficha dedicada (sin botón favorito que solape el enlace) |
| 11 | Ficha muestra producto correcto | ✅ `product-page.js` lee `?id=` |
| 12 | Cambiar color actualiza variante | ✅ (verificado en sesión previa) |
| 13 | Cambiar talla actualiza stock | ✅ combinaciones agotadas deshabilitadas |
| 14 | Añadir a carrito usa variante correcta | ✅ |
| 15 | Carrito por encima de todo | ✅ z-index 1000 |
| 16 | Menú móvil por encima tras scroll | ✅ z-index 1000, `position: fixed` |
| 17 | Menú móvil cierra con Escape | ✅ |
| 18 | Mega no queda detrás del hero | ✅ z-index 500 |
| 19 | Ningún overlay bloquea clics | ✅ overlays con cierre; reveals sobre imagen |
| 20 | Header legible sobre fondos claros y oscuros | ✅ barra oscura translúcida + logo blanco |
| 21 | Favicon negro en modo claro | ✅ `favicon-light.svg` (trazo negro) |
| 22 | Favicon blanco en modo oscuro | ✅ `favicon-dark.svg` (trazo claro) |
| 23 | No existe slogan anterior | ✅ búsqueda global: 0 coincidencias |
| 24 | No quedan `href="#"` | ✅ 0 coincidencias |
| 25 | Sin errores en consola | ✅ consola limpia tras navegar |
| 26 | `npm run build` sin errores | ✅ 11 páginas |
| 27 | En el hero se ven abuelos, familia con perro y amigos | ⚠️ depende de la foto real que añada el usuario; la composición (texto arriba, `object-position: center bottom`, gradiente suave) ya está preparada |

## Viewports probados

- **Escritorio 1440 / portátil 1280:** navegación, mega (enlace + chevron), tienda con
  `?categoria=`, filtros, ficha, carrito, checkout por pasos, formularios, Escape.
- **Tablet 768:** grid 2-3 columnas, panel de filtros, menú.
- **Móvil 390 / 320:** menú a pantalla completa (z-index 1000), filtros como hoja
  inferior, grid 2 columnas, sin scroll horizontal.

## Pendientes / limitaciones honestas

- **Foto real del hero**: el usuario debe colocar su imagen de montaña en
  `src/assets/editorial/hero-juntos-siempre-montana-atardecer.webp` (ahora hay un
  placeholder). La visibilidad exacta de los tres grupos depende de esa foto.
- **Favicons PNG**: `apple-touch-icon.png` y los `favicon-NN.png` son copias del PNG
  existente; conviene generar versiones cuadradas definitivas. Los SVG adaptativos sí son
  definitivos.
- **Imágenes externas con licencia**: no se descargaron en esta iteración (ver
  `CREDITOS_IMAGENES.md`); la estructura queda lista para añadirlas.
- **Demostración**: pagos, envíos, stock, cuenta y promos siguen siendo simulados.
