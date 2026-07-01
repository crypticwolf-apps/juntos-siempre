/**
 * Carrito — estado persistido en localStorage.
 * Cada línea guarda productId + colorId + talla + cantidad.
 * Además guarda opciones de regalo, código promocional y método de envío.
 */
import { load, save, emit, on } from './utils.js';
import { getProduct, productColor } from '../data/products.js';

const FREE_SHIPPING_FROM = 50;

export const SHIPPING_METHODS = {
  standard: { id: 'standard', label: 'Estándar (demo)', cost: 3.95 },
  express: { id: 'express', label: 'Exprés (demo)', cost: 6.95 },
  pickup: { id: 'pickup', label: 'Recogida en punto', cost: 0 },
};

// Códigos promocionales de DEMOSTRACIÓN
export const PROMOS = {
  JUNTOS10: { code: 'JUNTOS10', type: 'percent', value: 10, label: '-10%' },
  SIEMPRE: { code: 'SIEMPRE', type: 'shipping', value: 0, label: 'Envío gratis' },
  ABRAZO5: { code: 'ABRAZO5', type: 'fixed', value: 5, label: '-5 €' },
};

const defaultMeta = {
  isGift: false,
  giftBox: false,
  giftMessage: '',
  promo: null,
  shipping: 'standard',
};

let items = load('cart', []);
let meta = { ...defaultMeta, ...load('cart_meta', {}) };

function persist() {
  save('cart', items);
  save('cart_meta', meta);
  emit('cart:change', { items, meta });
}

function keyOf(productId, colorId, size) {
  return `${productId}|${colorId}|${size || 'U'}`;
}

export function getItems() {
  return items.map((it) => decorate(it));
}

export function getMeta() {
  return { ...meta };
}

function decorate(it) {
  const product = getProduct(it.productId);
  const color = product ? productColor(product, it.colorId) : null;
  return {
    ...it,
    key: keyOf(it.productId, it.colorId, it.size),
    product,
    color,
    image: color ? color.image : null,
    lineTotal: product ? product.price * it.qty : 0,
  };
}

export function addItem({ productId, colorId, size, qty = 1 }) {
  const key = keyOf(productId, colorId, size);
  const existing = items.find((it) => keyOf(it.productId, it.colorId, it.size) === key);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 20);
  } else {
    items = [...items, { productId, colorId, size: size || 'U', qty }];
  }
  persist();
}

export function updateQty(key, qty) {
  const it = items.find((i) => keyOf(i.productId, i.colorId, i.size) === key);
  if (!it) return;
  it.qty = qty;
  if (it.qty <= 0) {
    items = items.filter((i) => i !== it);
  }
  persist();
}

export function updateVariant(key, { colorId, size }) {
  const it = items.find((i) => keyOf(i.productId, i.colorId, i.size) === key);
  if (!it) return;
  const newColor = colorId ?? it.colorId;
  const newSize = size ?? it.size;
  const newKey = keyOf(it.productId, newColor, newSize);
  // Si ya existe una línea con la nueva combinación, fusiona cantidades.
  const dup = items.find((i) => i !== it && keyOf(i.productId, i.colorId, i.size) === newKey);
  it.colorId = newColor;
  it.size = newSize;
  if (dup) {
    dup.qty = Math.min(dup.qty + it.qty, 20);
    items = items.filter((i) => i !== it);
  }
  persist();
}

export function removeItem(key) {
  items = items.filter((i) => keyOf(i.productId, i.colorId, i.size) !== key);
  persist();
}

export function clearCart() {
  items = [];
  meta = { ...defaultMeta };
  persist();
}

export function setMeta(patch) {
  meta = { ...meta, ...patch };
  persist();
}

export function applyPromo(code) {
  const promo = PROMOS[(code || '').trim().toUpperCase()];
  if (!promo) {
    setMeta({ promo: null });
    return { ok: false };
  }
  setMeta({ promo: promo.code });
  return { ok: true, promo };
}

export function count() {
  return items.reduce((sum, it) => sum + it.qty, 0);
}

export function subtotal() {
  return getItems().reduce((sum, it) => sum + it.lineTotal, 0);
}

export function giftBoxCost() {
  return meta.giftBox ? 9 : 0;
}

export function shippingCost() {
  const sub = subtotal();
  const promo = meta.promo ? PROMOS[meta.promo] : null;
  if (promo && promo.type === 'shipping') return 0;
  if (meta.shipping === 'pickup') return 0;
  const base = SHIPPING_METHODS[meta.shipping]?.cost ?? 0;
  if (meta.shipping === 'standard' && sub >= FREE_SHIPPING_FROM) return 0;
  return base;
}

export function discount() {
  const promo = meta.promo ? PROMOS[meta.promo] : null;
  if (!promo) return 0;
  const sub = subtotal();
  if (promo.type === 'percent') return +(sub * (promo.value / 100)).toFixed(2);
  if (promo.type === 'fixed') return Math.min(promo.value, sub);
  return 0;
}

export function total() {
  return Math.max(0, subtotal() - discount() + shippingCost() + giftBoxCost());
}

export const FREE_SHIPPING_THRESHOLD = FREE_SHIPPING_FROM;

export function onCartChange(handler) {
  on('cart:change', handler);
}
