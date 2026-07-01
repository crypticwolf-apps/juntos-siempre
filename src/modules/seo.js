/**
 * SEO/PWA por página, idempotente. Completa lo que falte en el <head>:
 * manifest, metas de Apple, Open Graph/Twitter (a partir del title y la
 * description de la página) y canonical/og:url con la URL real.
 * La home ya trae Open Graph estático; aquí no se duplica.
 */
function ensure(selector, create) {
  if (document.head.querySelector(selector)) return;
  document.head.appendChild(create());
}
function metaProp(prop, content) {
  const m = document.createElement('meta');
  m.setAttribute('property', prop);
  m.setAttribute('content', content);
  return m;
}
function metaName(name, content) {
  const m = document.createElement('meta');
  m.setAttribute('name', name);
  m.setAttribute('content', content);
  return m;
}

export function initSeo() {
  const title = document.title || 'Juntos Siempre';
  const desc = document.querySelector('meta[name="description"]')?.content
    || 'Ropa de calidad con el logo bordado sobre el corazón. Luchar JUNTOS. Ayudarnos SIEMPRE.';
  const ogImage = '/og-image.jpg';
  const url = location.origin + location.pathname;

  // PWA
  ensure('link[rel="manifest"]', () => {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = '/manifest.webmanifest';
    return l;
  });
  ensure('meta[name="apple-mobile-web-app-capable"]', () => metaName('apple-mobile-web-app-capable', 'yes'));
  ensure('meta[name="mobile-web-app-capable"]', () => metaName('mobile-web-app-capable', 'yes'));
  ensure('meta[name="apple-mobile-web-app-title"]', () => metaName('apple-mobile-web-app-title', 'Juntos Siempre'));

  // Open Graph (solo si la página no trae el suyo estático)
  if (!document.head.querySelector('meta[property="og:title"]')) {
    document.head.append(
      metaProp('og:type', 'website'),
      metaProp('og:site_name', 'Juntos Siempre'),
      metaProp('og:locale', 'es_ES'),
      metaProp('og:title', title),
      metaProp('og:description', desc),
      metaProp('og:image', ogImage),
      metaName('twitter:card', 'summary_large_image'),
      metaName('twitter:title', title),
      metaName('twitter:description', desc),
      metaName('twitter:image', ogImage)
    );
  }

  // Canonical + og:url con la URL real (sea cual sea el dominio)
  ensure('link[rel="canonical"]', () => {
    const l = document.createElement('link');
    l.rel = 'canonical';
    l.href = url;
    return l;
  });
  ensure('meta[property="og:url"]', () => metaProp('og:url', url));
}
