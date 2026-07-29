-- ============================================================================
-- Juntos Siempre — Contenido inicial
-- Migración 4 de 4. Ejecutar después de 0003_storage.sql
--
-- Carga EXACTAMENTE los textos, imágenes, categorías y productos que la web
-- tiene ahora mismo, para que al conectar Supabase se vea igual que antes.
--
-- Las imágenes que vienen con el diseño se guardan como "asset:<ruta>".
-- Cuando subas una foto nueva desde el panel, ese valor se sustituye por la
-- dirección de la imagen subida. No hace falta que hagas nada manualmente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AJUSTES GENERALES
-- ----------------------------------------------------------------------------
insert into public.site_settings (key, value) values
('brand', jsonb_build_object(
  'name', 'Juntos Siempre',
  'slogan', 'Luchar JUNTOS. Ayudarnos SIEMPRE.',
  'logo', 'asset:logo/logo-blanco.png',
  'favicon', '',
  'og_image', ''
)),
('nav', jsonb_build_object(
  'links', jsonb_build_array(
    jsonb_build_object('label', 'Tienda',   'href', 'tienda.html',   'visible', true, 'mega', true),
    jsonb_build_object('label', 'Historia', 'href', 'historia.html', 'visible', true, 'mega', false),
    jsonb_build_object('label', 'Contacto', 'href', 'contacto.html', 'visible', true, 'mega', false)
  ),
  'mega_links', jsonb_build_array(
    jsonb_build_object('label', 'Novedades', 'href', 'tienda.html?sort=new'),
    jsonb_build_object('label', 'Ver todo',  'href', 'tienda.html')
  )
)),
('footer', jsonb_build_object(
  'slogan', 'Luchar JUNTOS. Ayudarnos SIEMPRE.',
  'note', 'Web de demostración · sin pagos reales',
  'copyright', 'Juntos Siempre',
  'col_shop_title', 'Tienda',
  'col_brand_title', 'Marca',
  'col_help_title', 'Ayuda',
  'brand_links', jsonb_build_array(
    jsonb_build_object('label', 'Historia',   'href', 'historia.html'),
    jsonb_build_object('label', 'Compromiso', 'href', 'impacto.html'),
    jsonb_build_object('label', 'Contacto',   'href', 'contacto.html'),
    jsonb_build_object('label', 'Regalar',    'href', 'index.html#regalo')
  ),
  'help_links', jsonb_build_array(
    jsonb_build_object('label', 'Guía de tallas',        'href', 'guia-tallas.html'),
    jsonb_build_object('label', 'Envíos y devoluciones', 'href', 'envios-devoluciones.html'),
    jsonb_build_object('label', 'Privacidad',            'href', 'politica-privacidad.html'),
    jsonb_build_object('label', 'Términos',              'href', 'terminos-condiciones.html'),
    jsonb_build_object('label', 'Cookies',               'href', 'cookies.html')
  )
)),
('social', jsonb_build_object(
  'instagram', '',
  'tiktok', '',
  'facebook', '',
  'email', ''
)),
('seo', jsonb_build_object(
  'title', 'Juntos Siempre — Luchar JUNTOS. Ayudarnos SIEMPRE.',
  'description', 'Juntos Siempre — moda minimalista, premium y emocional con el logo bordado sobre el corazón. Luchar JUNTOS. Ayudarnos SIEMPRE.'
))
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- PÁGINAS
-- ----------------------------------------------------------------------------
insert into public.pages (slug, name, position, seo_title, seo_description) values
('home',   'Inicio',     1, 'Juntos Siempre — Luchar JUNTOS. Ayudarnos SIEMPRE.', 'Juntos Siempre — moda minimalista, premium y emocional con el logo bordado sobre el corazón. Luchar JUNTOS. Ayudarnos SIEMPRE.'),
('shop',   'Tienda',     2, 'Tienda — Juntos Siempre', 'Colección Juntos Siempre: camisetas, sudaderas, gorras y accesorios con el logo bordado sobre el corazón.'),
('story',  'Historia',   3, 'Historia — Juntos Siempre', 'La historia de Juntos Siempre: dos palabras para una forma de entender las relaciones. Luchar JUNTOS. Ayudarnos SIEMPRE.'),
('impact', 'Compromiso', 4, 'Compromiso — Juntos Siempre', 'El compromiso solidario de Juntos Siempre: transparente, prudente y verificable. Sin cifras inventadas.')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- SECCIONES — INICIO
-- ----------------------------------------------------------------------------
insert into public.page_sections (page_id, key, name, kind, position, data)
select p.id, s.key, s.name, s.kind, s.position, s.data
from public.pages p, (values
  ('hero', 'Portada', 'hero', 1, jsonb_build_object(
    'brand', 'Juntos Siempre',
    'title_line1', 'Luchar JUNTOS.',
    'title_line2', 'Ayudarnos SIEMPRE.',
    'text', 'Ropa de calidad, creada para llevar cerca del corazón.',
    'cta1_label', 'Comprar colección', 'cta1_href', 'tienda.html',
    'cta2_label', 'Conocer la marca',  'cta2_href', 'historia.html',
    'image', 'asset:editorial/hero-juntos-siempre-montana-atardecer.webp',
    'image_alt', 'Tres grupos disfrutan de un atardecer en la montaña: una pareja de abuelos, una familia con perro y dos amigos'
  )),
  ('trust', 'Garantías', 'list', 2, jsonb_build_object(
    'item1', 'Envío en 24/48 h',
    'item2', 'Pago seguro',
    'item3', 'Calidad premium',
    'item4', 'Devoluciones sencillas'
  )),
  ('collection', 'Explora la colección', 'generic', 3, jsonb_build_object(
    'eyebrow', 'Colección',
    'title', 'Explora la colección',
    'lead', 'Camisetas, sudaderas, gorras y accesorios. Logo bordado sobre el corazón.'
  )),
  ('featured', 'Destacados', 'generic', 4, jsonb_build_object(
    'eyebrow', 'Destacados',
    'title', 'Prendas esenciales',
    'link_label', 'Ver toda la tienda'
  )),
  ('quality', 'Hecho para quedarse', 'generic', 5, jsonb_build_object(
    'eyebrow', 'Producto',
    'title', 'Hecho para quedarse.',
    'lead', 'Algodón de calidad. Bordado sobre el corazón. Diseño limpio para acompañarte durante años.',
    'image1', 'asset:packaging/detalle-bordado.jpg',
    'image1_alt', 'Macro del bordado del logo sobre la prenda',
    'image2', 'asset:story/calidad-bordado.jpg',
    'image2_alt', 'Detalle del tejido de algodón',
    'image3', 'asset:packaging/sudadera-packaging.jpg',
    'image3_alt', 'Prenda doblada con su packaging'
  )),
  ('emotional', 'No es solo una prenda', 'generic', 6, jsonb_build_object(
    'eyebrow', 'La idea',
    'title', 'No es solo una prenda.',
    'lead', 'Es una forma de estar cerca. De recordar a alguien que cuenta contigo. De regalar algo que no se explica con facilidad.',
    'image1', 'asset:models/amigos-unidos.jpg',    'image1_alt', 'Amigos abrazados al atardecer',   'caption1', 'Amistad',
    'image2', 'asset:models/familia-juntos.jpg',   'image2_alt', 'Familia reunida al aire libre',   'caption2', 'Familia',
    'image3', 'asset:models/pareja-atardecer.jpg', 'image3_alt', 'Pareja sentada al atardecer',     'caption3', 'Pareja',
    'image4', 'asset:story/regalo-mensaje.jpg',    'image4_alt', 'Regalo de la marca con una tarjeta', 'caption4', 'Regalo'
  )),
  ('gift', 'Caja regalo', 'generic', 7, jsonb_build_object(
    'eyebrow', 'Regalo',
    'title', 'Un regalo que dice más.',
    'lead', 'Añade una caja regalo y una tarjeta personal. Porque algunas cosas se dicen mejor cuando se llevan cerca.',
    'field_label', 'Mensaje para la tarjeta',
    'placeholder', 'Escribe unas palabras…',
    'button', 'Crear un regalo',
    'image', 'asset:packaging/etiqueta-regalo.jpg',
    'image_alt', 'Caja regalo y prenda de Juntos Siempre'
  )),
  ('commitment', 'Compromiso', 'generic', 8, jsonb_build_object(
    'eyebrow', 'Compromiso',
    'title', 'Vestir también puede ayudar.',
    'text', 'Juntos Siempre nace con el compromiso de destinar una parte fija de sus beneficios a ayuda ante emergencias y catástrofes. Cuando existan aportaciones, se comunicarán con claridad y respeto.',
    'pledge1_title', 'Aportación comprometida',
    'pledge1_text', 'Una parte fija de los beneficios, decidida de antemano.',
    'pledge2_title', 'Comunicación verificable',
    'pledge2_text', 'Destino, entidad, importe y fecha de cada aportación real.',
    'pledge3_title', 'Con respeto',
    'pledge3_text', 'Ayuda con dignidad, nunca usando el dolor como reclamo.',
    'cta_label', 'Conocer el compromiso', 'cta_href', 'impacto.html'
  )),
  ('newsletter', 'Newsletter', 'generic', 9, jsonb_build_object(
    'eyebrow', 'Newsletter',
    'title', 'Mantente cerca.',
    'lead', 'Lanzamientos, historias y novedades de Juntos Siempre.',
    'name_placeholder', 'Nombre',
    'email_placeholder', 'Email',
    'button', 'Suscribirme',
    'consent', 'Acepto recibir comunicaciones de Juntos Siempre.'
  ))
) as s(key, name, kind, position, data)
where p.slug = 'home'
on conflict (page_id, key) do nothing;

-- ----------------------------------------------------------------------------
-- SECCIONES — TIENDA
-- ----------------------------------------------------------------------------
insert into public.page_sections (page_id, key, name, kind, position, data)
select p.id, s.key, s.name, s.kind, s.position, s.data
from public.pages p, (values
  ('header', 'Cabecera de tienda', 'generic', 1, jsonb_build_object(
    'eyebrow', 'Tienda',
    'title', 'Colección',
    'lead', 'Prendas limpias, colores sobrios y el bordado siempre cerca del corazón.'
  )),
  ('filters', 'Textos de filtros', 'generic', 2, jsonb_build_object(
    'toggle', 'Filtrar y ordenar',
    'panel_title', 'Filtrar y ordenar',
    'category', 'Categoría',
    'color', 'Color',
    'size', 'Talla',
    'price', 'Precio máximo',
    'in_stock', 'Solo disponibles',
    'clear', 'Limpiar',
    'apply', 'Ver resultados'
  )),
  ('empty', 'Cuando no hay productos', 'generic', 3, jsonb_build_object(
    'text', 'No hay prendas con estos filtros.',
    'button', 'Quitar filtros'
  )),
  ('settings', 'Ajustes del catálogo', 'settings', 4, jsonb_build_object(
    'per_page', 24
  ))
) as s(key, name, kind, position, data)
where p.slug = 'shop'
on conflict (page_id, key) do nothing;

-- ----------------------------------------------------------------------------
-- SECCIONES — HISTORIA (los capítulos se pueden añadir y borrar desde el panel)
-- ----------------------------------------------------------------------------
insert into public.page_sections (page_id, key, name, kind, position, data)
select p.id, s.key, s.name, s.kind, s.position, s.data
from public.pages p, (values
  ('hero', 'Portada de Historia', 'hero', 1, jsonb_build_object(
    'eyebrow', 'Nuestra historia',
    'title', 'Juntos Siempre no empieza con una camiseta.',
    'text', 'Empieza con una idea sencilla: hay personas que, incluso cuando no saben qué decir, deciden estar.',
    'slogan', 'Luchar JUNTOS. Ayudarnos SIEMPRE.',
    'image', 'asset:models/amigos-unidos.jpg',
    'image_alt', 'Amigos abrazados mirando el horizonte'
  )),
  ('chapters', 'Capítulos', 'repeater', 2, jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object(
      'num', 'Capítulo 1',
      'title', 'Dos palabras para algo muy grande.',
      'body', E'“Juntos” habla de compartir. De caminar al lado de alguien. De estar cuando todo va bien y cuando las cosas se complican.\n\n“Siempre” no significa estar perfecto, estar de acuerdo en todo o no alejarse nunca. Significa que, cuando importa de verdad, existe un vínculo que sigue ahí.\n\nJuntos Siempre nace de esa forma de entender las relaciones: personas reales, con diferencias, con errores, con distancia y con historia, que aun así deciden cuidarse.',
      'image', 'asset:models/pareja-atardecer.jpg',
      'image_alt', 'Pareja sentada al atardecer',
      'visible', true
    ),
    jsonb_build_object(
      'num', 'Capítulo 2',
      'title', 'A veces ayudar empieza por no irse.',
      'body', E'Hay gestos que no hacen ruido: una llamada, una visita, un mensaje, un abrazo, una camiseta entregada como regalo.\n\nEstar no siempre es tener la solución. Muchas veces es simplemente recordar a alguien que no tiene que pasar por algo solo.\n\nJuntos Siempre quiere convertir esa idea en algo que se pueda llevar cerca del corazón.',
      'image', 'asset:models/familia-unida.jpg',
      'image_alt', 'Familia abrazada',
      'visible', true
    ),
    jsonb_build_object(
      'num', 'Capítulo 3',
      'title', 'Lo importante no siempre se ve desde lejos.',
      'body', E'El logo es pequeño porque no necesita gritar. Va bordado sobre el corazón porque ahí está el sentido de la marca: llevar una promesa, una persona o un recuerdo cerca.\n\nUna camiseta puede ser solo una camiseta. Pero también puede ser un regalo entre amigos, una manera de acompañar a alguien, una señal de reconciliación o una forma de decir “cuenta conmigo”.',
      'image', 'asset:packaging/detalle-bordado.jpg',
      'image_alt', 'Macro del bordado del logo',
      'visible', true
    ),
    jsonb_build_object(
      'num', 'Capítulo 4',
      'title', 'Hay momentos en los que las diferencias dejan de importar.',
      'body', E'En los momentos difíciles, muchas personas descubren que ayudar no entiende de edad, origen, ideas, género o distancia.\n\nUna comunidad puede unirse para apoyar a un vecino. Un grupo de desconocidos puede aparecer para sostener a quien lo necesita. Una familia puede hacerse más fuerte cuando alguien atraviesa una etapa complicada.\n\nEsa capacidad humana de unirse es una de las razones por las que existe Juntos Siempre.',
      'image', 'asset:models/familia-juntos.jpg',
      'image_alt', 'Familia reunida al aire libre',
      'visible', true
    ),
    jsonb_build_object(
      'num', 'Capítulo 5',
      'title', 'Hay regalos que no se olvidan porque dicen algo de verdad.',
      'body', E'Regalar una prenda Juntos Siempre no tiene que ser un gesto enorme. Puede ser una forma sencilla de decir: “te tengo presente”, “te acompaño”, “gracias por estar”, “lo siento”, “me importas”.\n\nLa caja, la tarjeta y el mensaje personal no son un añadido sin más. Son parte de la experiencia de regalar algo que lleva un significado.',
      'image', 'asset:story/regalo-mensaje.jpg',
      'image_alt', 'Regalo de la marca con una tarjeta',
      'visible', true
    ),
    jsonb_build_object(
      'num', 'Capítulo 6',
      'title', 'Una marca que esté a la altura de su nombre.',
      'body', E'Juntos Siempre quiere crear ropa que dure, que se regale y que acompañe.\n\nTambién quiere construir un proyecto responsable, capaz de aportar ayuda cuando existan los medios, las alianzas y la transparencia necesarias para hacerlo bien.\n\nNo se trata de prometerlo todo desde el primer día. Se trata de construirlo con cuidado, paso a paso, y demostrarlo con hechos.',
      'image', 'asset:products/sudadera-beige-colgada.jpg',
      'image_alt', 'Prenda de la marca colgada',
      'visible', true
    )
  ))),
  ('manifesto', 'Cierre', 'generic', 3, jsonb_build_object(
    'title', 'Luchar JUNTOS. Ayudarnos SIEMPRE.',
    'text', 'Porque todos necesitamos a alguien. Porque estar también es cuidar. Porque una prenda puede recordar lo que importa. Porque, al final, lo que nos une es lo que permanece.',
    'cta1_label', 'Ver la colección',      'cta1_href', 'tienda.html',
    'cta2_label', 'Conocer el compromiso', 'cta2_href', 'impacto.html'
  ))
) as s(key, name, kind, position, data)
where p.slug = 'story'
on conflict (page_id, key) do nothing;

-- ----------------------------------------------------------------------------
-- SECCIONES — COMPROMISO
-- ----------------------------------------------------------------------------
insert into public.page_sections (page_id, key, name, kind, position, data)
select p.id, s.key, s.name, s.kind, s.position, s.data
from public.pages p, (values
  ('hero', 'Portada de Compromiso', 'hero', 1, jsonb_build_object(
    'eyebrow', 'Compromiso',
    'title', 'Vestir también puede ayudar.',
    'lead', 'La ayuda solo tiene sentido cuando se hace con respeto, claridad y responsabilidad. Por eso Juntos Siempre comunicará cada aportación real con información verificable: destino, entidad, importe, fecha y propósito.'
  )),
  ('intro', 'Qué significa el compromiso', 'generic', 2, jsonb_build_object(
    'eyebrow', 'Qué significa el compromiso',
    'title', 'Una intención clara, sin promesas vacías.',
    'lead', 'Juntos Siempre nace con el compromiso de destinar una parte fija de sus beneficios a ayuda ante emergencias y catástrofes. Es un punto de partida honesto: hablamos en futuro porque preferimos demostrarlo con hechos antes que adornarlo con cifras.'
  )),
  ('steps', 'Apartados numerados', 'repeater', 3, jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('num', '01', 'title', 'Cómo se decidirá el destino',
      'text', 'Las aportaciones se dirigirán a emergencias y catástrofes concretas, priorizando necesidades reales y contrastadas en cada momento.', 'visible', true),
    jsonb_build_object('num', '02', 'title', 'Qué entidades se valorarán',
      'text', 'Se valorarán organizaciones y proyectos con experiencia sobre el terreno, gestión responsable y capacidad de rendir cuentas.', 'visible', true),
    jsonb_build_object('num', '03', 'title', 'Cómo se publicarán las aportaciones',
      'text', 'Cuando existan aportaciones reales, se publicarán de forma clara y accesible, sin convertir la ayuda en un reclamo comercial.', 'visible', true),
    jsonb_build_object('num', '04', 'title', 'Qué información se mostrará',
      'text', 'De cada aportación real compartiremos destino, entidad, importe, fecha y propósito, con el contexto necesario para entenderla.', 'visible', true)
  ))),
  ('soon', 'Informes verificables', 'generic', 4, jsonb_build_object(
    'eyebrow', 'Próximamente',
    'title', 'Informes verificables',
    'lead', 'Aquí publicaremos los informes de impacto cuando existan acciones reales. Hasta entonces, preferimos no mostrar datos que no podamos respaldar.',
    'item1', 'Sin contadores ni porcentajes ficticios.',
    'item2', 'Sin imágenes dramáticas como reclamo.',
    'item3', 'Con trazabilidad y contexto en cada aportación.'
  )),
  ('newsletter', 'Newsletter', 'generic', 5, jsonb_build_object(
    'eyebrow', 'Mantente al día',
    'title', 'Te avisaremos cuando haya novedades.',
    'lead', 'Suscríbete para conocer las primeras aportaciones y los informes cuando se publiquen.',
    'name_placeholder', 'Nombre',
    'email_placeholder', 'Email',
    'button', 'Suscribirme',
    'consent', 'Acepto recibir comunicaciones de Juntos Siempre.'
  ))
) as s(key, name, kind, position, data)
where p.slug = 'impact'
on conflict (page_id, key) do nothing;

-- ----------------------------------------------------------------------------
-- CATEGORÍAS
-- ----------------------------------------------------------------------------
insert into public.categories (name, slug, position, image_url, image_alt, description) values
('Camisetas',  'camisetas',  1, 'asset:products/camiseta-negra-urbano.jpg',  'Camisetas Juntos Siempre',  'Camisetas con el logo bordado sobre el corazón.'),
('Sudaderas',  'sudaderas',  2, 'asset:products/sudadera-beige-familia.jpg', 'Sudaderas Juntos Siempre',  'Sudaderas de tacto suave y bordado discreto.'),
('Gorras',     'gorras',     3, 'asset:products/gorra-negra.jpg',            'Gorras Juntos Siempre',     'Gorras sobrias con bordado frontal.'),
('Accesorios', 'accesorios', 4, 'asset:packaging/etiqueta-regalo.jpg',       'Accesorios Juntos Siempre', 'Accesorios y regalo para acompañar la prenda.')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- PRODUCTOS, VARIANTES E IMÁGENES
-- Se cargan desde una descripción compacta para evitar errores de tecleo.
-- Por cada color: foto 1 = principal, foto 2 = al pasar el ratón, resto = galería.
-- ----------------------------------------------------------------------------
do $seed$
declare
  spec        jsonb;
  prod        jsonb;
  col         jsonb;
  img         text;
  sz          text;
  new_id      uuid;
  cat_id      uuid;
  img_pos     int;
  var_pos     int;
  is_first    boolean;
  sold        text[];
  stock_value int;
begin
  spec := $json$
  [
    {
      "name": "Camiseta Essential", "slug": "camiseta-essential", "category": "camisetas",
      "price": 15, "is_new": true, "featured": true, "position": 1, "requires_size": true,
      "short": "Camiseta minimalista con logo bordado sobre el corazón.",
      "desc": "Logo bordado sobre el corazón. Silueta limpia, colores sobrios y una presencia discreta.",
      "composition": "Algodón de calidad y acabados cuidados. La composición final se confirmará cuando exista ficha técnica de producción.",
      "care": "Cuidados orientativos: lavar del revés, ciclo suave y evitar calor alto sobre el bordado. La etiqueta final tendrá la indicación definitiva.",
      "shipping": "Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.",
      "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
      "sold_out": ["arena|XS", "azul-marino|XXL", "gris-piedra|XS"],
      "colors": [
        { "slug": "negro", "name": "Negro", "hex": "#1c1c1c",
          "images": ["products/camiseta-negra-frontal.jpg", "products/camiseta-negra-urbano.jpg", "products/camiseta-blanca-espalda.jpg", "packaging/detalle-bordado.jpg", "products/camiseta-negra-urbano.jpg"] },
        { "slug": "blanco-roto", "name": "Blanco roto", "hex": "#f3efe6",
          "images": ["products/camiseta-blanca-frontal.jpg", "products/camiseta-blanca-espalda.jpg", "products/camiseta-blanca-espalda.jpg", "packaging/detalle-bordado.jpg", "products/camiseta-blanca-frontal.jpg"] },
        { "slug": "arena", "name": "Arena", "hex": "#d8c5a4",
          "images": ["products/pack-camisetas-neutras.jpg", "products/camiseta-blanca-frontal.jpg", "products/camiseta-blanca-espalda.jpg", "packaging/detalle-bordado.jpg", "products/camiseta-blanca-frontal.jpg"] },
        { "slug": "gris-piedra", "name": "Gris piedra", "hex": "#9c968c",
          "images": ["products/pack-camisetas-neutras.jpg", "products/camiseta-blanca-espalda.jpg", "products/camiseta-blanca-espalda.jpg", "packaging/detalle-bordado.jpg", "products/camiseta-negra-urbano.jpg"] },
        { "slug": "azul-marino", "name": "Azul marino", "hex": "#212f40",
          "images": ["products/camiseta-negra-urbano.jpg", "products/camiseta-negra-frontal.jpg", "products/camiseta-blanca-espalda.jpg", "packaging/detalle-bordado.jpg", "products/camiseta-negra-urbano.jpg"] }
      ]
    },
    {
      "name": "Sudadera Crew", "slug": "sudadera-crew", "category": "sudaderas",
      "price": 25, "is_new": true, "featured": true, "position": 2, "requires_size": true,
      "short": "Sudadera de cuello redondo con bordado discreto.",
      "desc": "Logo bordado sobre el corazón. Silueta limpia, colores sobrios y una presencia discreta.",
      "composition": "Algodón de calidad y acabados cuidados. La composición final se confirmará cuando exista ficha técnica de producción.",
      "care": "Cuidados orientativos: lavar del revés, ciclo suave y evitar calor alto sobre el bordado. La etiqueta final tendrá la indicación definitiva.",
      "shipping": "Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.",
      "sizes": ["S", "M", "L", "XL", "XXL"],
      "sold_out": ["beige|XXL", "azul-marino|S"],
      "colors": [
        { "slug": "negro", "name": "Negro", "hex": "#1c1c1c",
          "images": ["products/sudadera-negra-exterior.jpg", "products/sudadera-beige-familia.jpg", "packaging/detalle-cuello.jpg", "packaging/detalle-bordado.jpg", "products/sudadera-beige-familia.jpg"] },
        { "slug": "beige", "name": "Beige", "hex": "#cdbb9c",
          "images": ["products/sudadera-beige-familia.jpg", "products/sudadera-beige-colgada.jpg", "products/sudadera-beige-colgada.jpg", "packaging/detalle-bordado.jpg", "products/sudadera-beige-familia.jpg"] },
        { "slug": "gris-piedra", "name": "Gris piedra", "hex": "#9c968c",
          "images": ["products/sudadera-beige-colgada.jpg", "products/capsula-negro-neutros.jpg", "products/capsula-negro-neutros.jpg", "packaging/detalle-bordado.jpg", "products/sudadera-beige-familia.jpg"] },
        { "slug": "azul-marino", "name": "Azul marino", "hex": "#212f40",
          "images": ["products/sudadera-negra-exterior.jpg", "products/capsula-negro-neutros.jpg", "products/capsula-negro-neutros.jpg", "packaging/detalle-bordado.jpg", "products/sudadera-negra-exterior.jpg"] }
      ]
    },
    {
      "name": "Gorra", "slug": "gorra", "category": "gorras",
      "price": 12, "is_new": false, "featured": true, "position": 3, "requires_size": false,
      "short": "Gorra sobria con bordado frontal.",
      "desc": "Logo bordado en una pieza limpia y fácil de llevar a diario.",
      "composition": "Algodón de calidad y acabados cuidados. La composición final se confirmará cuando exista ficha técnica de producción.",
      "care": "Cuidados orientativos: lavar del revés, ciclo suave y evitar calor alto sobre el bordado. La etiqueta final tendrá la indicación definitiva.",
      "shipping": "Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.",
      "sizes": ["Única"],
      "sold_out": ["beige|Única"],
      "colors": [
        { "slug": "negro", "name": "Negro", "hex": "#1c1c1c",
          "images": ["products/gorra-negra.jpg", "packaging/detalle-bordado.jpg", "products/gorra-negra.jpg", "packaging/detalle-bordado.jpg", "products/gorra-negra.jpg"] },
        { "slug": "beige", "name": "Beige", "hex": "#cdbb9c",
          "images": ["products/gorra-negra.jpg", "packaging/detalle-bordado.jpg", "products/gorra-negra.jpg", "packaging/detalle-bordado.jpg", "products/gorra-negra.jpg"] },
        { "slug": "azul-marino", "name": "Azul marino", "hex": "#212f40",
          "images": ["products/gorra-negra.jpg", "packaging/detalle-bordado.jpg", "products/gorra-negra.jpg", "packaging/detalle-bordado.jpg", "products/gorra-negra.jpg"] }
      ]
    },
    {
      "name": "Tote bag", "slug": "tote-bag", "category": "accesorios",
      "price": 19, "is_new": false, "featured": true, "position": 4, "requires_size": false,
      "short": "Bolsa de tela con presencia mínima.",
      "desc": "Accesorio de demostración para completar el pedido.",
      "composition": "Material y producción pendientes de confirmar.",
      "care": "Cuidados pendientes de confirmar.",
      "shipping": "Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.",
      "sizes": ["Única"], "sold_out": [],
      "colors": [
        { "slug": "natural", "name": "Natural", "hex": "#e4dccb",
          "images": ["packaging/etiqueta-regalo.jpg", "packaging/sudadera-packaging.jpg", "packaging/sudadera-packaging.jpg", "packaging/detalle-bordado.jpg", "packaging/etiqueta-regalo.jpg"] }
      ]
    },
    {
      "name": "Tarjeta regalo", "slug": "tarjeta-regalo", "category": "accesorios",
      "price": 25, "is_new": false, "featured": false, "position": 5, "requires_size": true,
      "size_label": "Importe",
      "short": "Una tarjeta para elegir la prenda después.",
      "desc": "Tarjeta de demostración para regalar una elección pendiente.",
      "composition": "Formato y condiciones pendientes de confirmar.",
      "care": "No aplica.",
      "shipping": "Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.",
      "sizes": ["25 €", "50 €", "75 €", "100 €"], "sold_out": [],
      "colors": [
        { "slug": "craft", "name": "Kraft", "hex": "#c4a373",
          "images": ["packaging/etiqueta-cuello.jpg", "packaging/etiqueta-regalo.jpg", "packaging/etiqueta-regalo.jpg", "packaging/detalle-cuello.jpg", "packaging/etiqueta-regalo.jpg"] }
      ]
    },
    {
      "name": "Caja regalo", "slug": "caja-regalo", "category": "accesorios",
      "price": 9, "is_new": false, "featured": false, "position": 6, "requires_size": false,
      "short": "Caja regalo y tarjeta personalizable.",
      "desc": "Packaging de regalo para acompañar la prenda con un mensaje personal.",
      "composition": "Caja, envoltorio y tarjeta de presentación. Materiales finales pendientes de confirmar.",
      "care": "No aplica.",
      "shipping": "Checkout de demostración. Envíos, cambios y devoluciones se definirán antes de una venta real.",
      "sizes": ["Única"], "sold_out": [],
      "colors": [
        { "slug": "craft", "name": "Kraft", "hex": "#c4a373",
          "images": ["packaging/sudadera-packaging.jpg", "packaging/etiqueta-regalo.jpg", "packaging/etiqueta-regalo.jpg", "packaging/detalle-cuello.jpg", "packaging/sudadera-packaging.jpg"] }
      ]
    }
  ]
  $json$::jsonb;

  for prod in select * from jsonb_array_elements(spec)
  loop
    -- No sobrescribe si el producto ya existe.
    if exists (select 1 from public.products where slug = prod ->> 'slug') then
      continue;
    end if;

    select id into cat_id from public.categories where slug = prod ->> 'category';

    insert into public.products (
      name, slug, category_id, short_description, description, composition, care,
      shipping_note, price, status, is_featured, is_new, position, requires_size,
      size_label, image_alt, seo_title, seo_description, stock_status
    ) values (
      prod ->> 'name',
      prod ->> 'slug',
      cat_id,
      prod ->> 'short',
      prod ->> 'desc',
      prod ->> 'composition',
      prod ->> 'care',
      prod ->> 'shipping',
      (prod ->> 'price')::numeric,
      'published',
      (prod ->> 'featured')::boolean,
      (prod ->> 'is_new')::boolean,
      (prod ->> 'position')::int,
      (prod ->> 'requires_size')::boolean,
      prod ->> 'size_label',
      prod ->> 'name',
      (prod ->> 'name') || ' — Juntos Siempre',
      prod ->> 'short',
      'in_stock'
    )
    returning id into new_id;

    sold := coalesce(
      (select array_agg(value #>> '{}') from jsonb_array_elements(prod -> 'sold_out')),
      '{}'::text[]
    );

    img_pos  := 0;
    var_pos  := 0;
    is_first := true;

    for col in select * from jsonb_array_elements(prod -> 'colors')
    loop
      -- Fotografías de este color, en orden.
      for img in select value #>> '{}' from jsonb_array_elements(col -> 'images')
      loop
        insert into public.product_images (product_id, url, alt, color_slug, position, is_primary)
        values (
          new_id,
          'asset:' || img,
          prod ->> 'name',
          col ->> 'slug',
          img_pos,
          is_first
        );
        is_first := false;
        img_pos  := img_pos + 1;
      end loop;

      -- Una variante por talla dentro de este color.
      for sz in select value #>> '{}' from jsonb_array_elements(prod -> 'sizes')
      loop
        stock_value := case
          when ((col ->> 'slug') || '|' || sz) = any (sold) then 0
          else 25
        end;

        insert into public.product_variants (
          product_id, size, color_name, color_slug, color_hex, stock, is_active, position
        ) values (
          new_id, sz, col ->> 'name', col ->> 'slug', col ->> 'hex',
          stock_value, true, var_pos
        )
        on conflict (product_id, size, color_slug) do nothing;

        var_pos := var_pos + 1;
      end loop;
    end loop;
  end loop;
end
$seed$;

-- ============================================================================
-- CONVERTIR TU CUENTA EN ADMINISTRADORA
-- ----------------------------------------------------------------------------
-- Cambia el correo por el tuyo y ejecuta SOLO esta consulta después de haber
-- creado tu usuario en Supabase (Authentication -> Users -> Add user).
-- ============================================================================
-- update public.profiles
-- set role = 'admin', is_active = true
-- where email = 'tu-correo@ejemplo.com';
