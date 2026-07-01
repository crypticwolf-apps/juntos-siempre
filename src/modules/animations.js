/**
 * Animaciones de scroll — sin dependencias (antes usaba GSAP).
 * - Reveals de entrada basados en eventos de scroll (fiables; si algo falla el
 *   contenido queda visible, nunca oculto permanentemente).
 * - Parallax muy sutil del hero y desvanecido del texto, con un único handler
 *   de scroll throttleado con requestAnimationFrame.
 * Respeta prefers-reduced-motion. Prioriza transform y opacity (GPU).
 */
import { $$ } from './utils.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Reveals de entrada -----------------------------------------------------
function revealTargets() {
  const list = [];
  $$('[data-anim]').forEach((n) => list.push(n));
  $$('[data-anim-group]').forEach((g) => Array.from(g.children).forEach((c) => list.push(c)));
  return list;
}

function initReveals() {
  const targets = revealTargets();
  if (!targets.length) return;

  if (reduce) {
    targets.forEach((n) => { n.style.opacity = '1'; n.style.transform = 'none'; });
    return;
  }

  targets.forEach((n) => {
    n.style.opacity = '0';
    n.style.transform = 'translateY(26px)';
    n.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)';
  });

  let pending = targets.length;
  const reveal = (n) => {
    if (n._revealed) return;
    n._revealed = true;
    n.style.opacity = '1';
    n.style.transform = 'none';
    pending -= 1;
    if (pending <= 0) {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    }
  };

  const check = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (const n of targets) {
      if (n._revealed) continue;
      const r = n.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -40) reveal(n);
    }
  };

  check();
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check, { passive: true });
  window.addEventListener('load', () => { check(); setTimeout(check, 600); });
  setTimeout(() => targets.forEach(reveal), 2600);
}

// --- Hero: parallax + desvanecido del texto (un solo handler) ---------------
function initHero() {
  if (reduce) return;
  const heroImg = document.querySelector('[data-hero-img]');
  const heroContent = document.querySelector('.hero__content, .story-hero__content');
  const section = (heroImg || heroContent)?.closest('section');
  if (!section) return;

  const maxShift = window.matchMedia('(max-width: 768px)').matches ? 5 : 10; // %
  let ticking = false;

  const update = () => {
    ticking = false;
    const rect = section.getBoundingClientRect();
    const h = rect.height || 1;
    const progress = Math.min(Math.max(-rect.top / h, 0), 1);
    if (rect.bottom < 0 || rect.top > window.innerHeight) return; // fuera de vista
    if (heroImg) heroImg.style.transform = `translate3d(0, ${progress * maxShift}%, 0)`;
    if (heroContent) {
      const p = Math.min(progress / 0.45, 1);
      heroContent.style.opacity = String(1 - p);
      heroContent.style.transform = `translate3d(0, ${-30 * p}px, 0)`;
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

export function initAnimations() {
  initReveals();
  initHero();
}

/** Compatibilidad: el revelado ya no depende de una librería de scroll. */
export function refreshScroll() {}

/** Entrada de tarjetas recién insertadas (catálogo filtrado).
 * Fade + slide con transición, y red de seguridad por temporizador: las
 * tarjetas SIEMPRE acaban visibles aunque requestAnimationFrame no dispare. */
export function animateIn(nodes) {
  if (reduce || !nodes.length) return;
  nodes.forEach((n, i) => {
    n.style.opacity = '0';
    n.style.transform = 'translateY(14px)';
    n.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)';
    n.style.transitionDelay = `${Math.min(i, 10) * 0.035}s`;
  });
  const reveal = () => nodes.forEach((n) => { n.style.opacity = '1'; n.style.transform = 'none'; });
  requestAnimationFrame(() => requestAnimationFrame(reveal));
  setTimeout(reveal, 250); // failsafe: garantiza visibilidad
}
