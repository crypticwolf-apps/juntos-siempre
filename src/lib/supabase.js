/**
 * Cliente de Supabase.
 *
 * Si no hay variables de entorno configuradas, `supabase` vale null y toda la
 * web sigue funcionando exactamente igual que antes con su contenido original.
 * Esto permite desplegar sin Supabase y conectarlo más tarde sin romper nada.
 */
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'site-media';

/** true cuando la web tiene conexión configurada con el gestor de contenido. */
export const isConfigured = Boolean(
  URL && KEY && !URL.includes('TU-PROYECTO') && !KEY.includes('TU_CLAVE')
);

export const supabase = isConfigured
  ? createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'juntos-siempre-auth',
      },
    })
  : null;

/** Dirección pública de un archivo guardado en el contenedor de imágenes. */
export function publicUrl(path) {
  if (!supabase || !path) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
