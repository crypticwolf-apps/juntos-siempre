/**
 * Secciones que se pueden ampliar desde el panel: los capítulos de Historia y
 * los apartados numerados de Compromiso.
 *
 * Si el gestor no devuelve nada, no se toca el HTML y la web mantiene los
 * capítulos y apartados que ya tenía escritos.
 */
import { section, resolveImage } from './content.js';
import { el } from '../modules/utils.js';

/** Convierte los saltos de línea del editor en párrafos, como en el diseño. */
function paragraphs(body) {
  return String(body || '')
    .split(/\n{2,}|\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => el('p', { text: t }));
}

// ---------------------------------------------------------------------------
// HISTORIA — capítulos
// ---------------------------------------------------------------------------
export function mountChapters() {
  const host = document.querySelector('.chapters');
  if (!host) return;

  const sec = section('story', 'chapters');
  const items = sec?.data?.items;
  if (!Array.isArray(items) || !items.length) return; // se queda el original

  if (sec.visible === false) {
    host.hidden = true;
    return;
  }

  host.innerHTML = '';
  items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item && item.visible !== false)
    .forEach(({ item, index }, shown) => {
      const article = el(
        'article',
        {
          class: 'chapter' + (shown % 2 === 1 ? ' chapter--reverse' : ''),
          'data-anim': '',
          'data-cms-item': `story.chapters.items.${index}`,
        },
        [
          el('div', { class: 'chapter__media' + (shown === 0 ? ' media--left' : '') }, [
            el('img', {
              src: resolveImage(item.image),
              alt: item.image_alt || '',
              loading: 'lazy',
              decoding: 'async',
              'data-cms-field': 'image',
            }),
          ]),
          el('div', { class: 'chapter__copy' }, [
            el('p', { class: 'chapter__num', text: item.num || '', 'data-cms-field': 'num' }),
            el('h2', { class: 'chapter__title', text: item.title || '', 'data-cms-field': 'title' }),
            el('div', { class: 'chapter__body', 'data-cms-field': 'body' }, paragraphs(item.body)),
          ]),
        ]
      );
      host.appendChild(article);
    });
}

// ---------------------------------------------------------------------------
// COMPROMISO — apartados numerados
// ---------------------------------------------------------------------------
export function mountImpactSteps() {
  const host = document.querySelector('.impact-steps__list');
  if (!host) return;

  const sec = section('impact', 'steps');
  const items = sec?.data?.items;
  if (!Array.isArray(items) || !items.length) return; // se queda el original

  const wrapper = host.closest('section');
  if (sec.visible === false) {
    if (wrapper) wrapper.hidden = true;
    return;
  }

  host.innerHTML = '';
  items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item && item.visible !== false)
    .forEach(({ item, index }) => {
      host.appendChild(
        el('li', { class: 'impact-step', 'data-cms-item': `impact.steps.items.${index}` }, [
          el('span', { class: 'impact-step__num', text: item.num || '', 'data-cms-field': 'num' }),
          el('h3', { text: item.title || '', 'data-cms-field': 'title' }),
          el('p', { text: item.text || '', 'data-cms-field': 'text' }),
        ])
      );
    });
}
