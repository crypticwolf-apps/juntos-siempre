/**
 * Mapa de las imágenes que vienen incluidas con el diseño original.
 *
 * El contenido guardado en la base de datos puede referirse a ellas con
 * "asset:carpeta/archivo.jpg". Aquí se traduce esa referencia a la dirección
 * real que genera Vite al compilar (con su hash de caché).
 */

const modules = import.meta.glob('../assets/**/*.{jpg,jpeg,png,webp,avif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** { 'products/gorra-negra.jpg': '/assets/gorra-negra-a1b2c3.jpg', ... } */
export const ASSETS = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.replace('../assets/', ''), url])
);

/**
 * Convierte cualquier valor de imagen guardado en el gestor a una dirección
 * utilizable en un <img src>.
 *
 *   "asset:products/gorra-negra.jpg" -> imagen original del diseño
 *   "https://…supabase.co/…"         -> imagen subida desde el panel
 *   ""                                -> cadena vacía (se mantiene la original)
 */
export function resolveImage(value) {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('asset:')) return ASSETS[value.slice(6)] || '';
  return value;
}
