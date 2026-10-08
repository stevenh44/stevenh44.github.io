/* The Revel Consumer design system's components as HTML-string renderers.
   Each emits the markup of its React counterpart in
   design-system-consumer/project/components/bundle.js, so consumer.css styles both the same.
   Interactive pieces take `attrs` (data-* hooks for the app's click delegation).
   Icons come from data.js, generated from that bundle. */
import { ICON_PATHS, FILLED } from './data.js?v=1';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cx = (...a) => a.filter(Boolean).join(' ');
const at = (o) => Object.entries(o || {})
  .filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');
export const usd = (n) => '$' + Number(n || 0).toFixed(2);

/* ---------- art ---------- */
export function icon(name, size = 20, o = {}) {
  const filled = o.filled || FILLED[name];
  return `<svg class="${cx('rc-icon', o.cls)}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${filled ? 'currentColor' : 'none'}"
    stroke="currentColor" stroke-width="${filled ? 0.6 : 1.7}" stroke-linecap="round" stroke-linejoin="round"${
    o.label ? ` role="img" aria-label="${esc(o.label)}"` : ' aria-hidden="true"'}>${(ICON_PATHS[name] || []).map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
export const tag = (size = 22) => `<svg class="rc-tag" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
  <path d="M3 12.4V4.2A1.2 1.2 0 0 1 4.2 3h8.2l8.4 8.4a1.7 1.7 0 0 1 0 2.4l-7 7a1.7 1.7 0 0 1-2.4 0z"/><circle cx="8" cy="8" r="1.7" class="rc-tag-hole"/></svg>`;
export const car = (w = 96, cls) => `<svg class="${cx('rc-car', cls)}" viewBox="-2 0 204 66" width="${w}" height="${Math.round(w * 0.3235)}" aria-hidden="true">
  <defs><clipPath id="rc-car-clip"><path d="M20.74 55L8 54C3 53 1 49 .8 44C.6 39 2.5 35.5 7 34C24 31 46 27.5 64 25C76 15 88 6 100 3.6C112 1.6 124 2 134 4.4C152 8.5 172 15 186 19.4L190 19.6C196 20 199 22 199.4 26L199.4 44C199.4 50 197 54 192 54.6L173.76 55A17 17 0 0 0 143.24 55L51.26 55A17 17 0 0 0 20.74 55Z"/></clipPath></defs>
  <ellipse class="rc-car-shadow" cx="100" cy="63.2" rx="97" ry="2.8"/>
  <path class="rc-car-body" d="M20.74 55L8 54C3 53 1 49 .8 44C.6 39 2.5 35.5 7 34C24 31 46 27.5 64 25C76 15 88 6 100 3.6C112 1.6 124 2 134 4.4C152 8.5 172 15 186 19.4L190 19.6C196 20 199 22 199.4 26L199.4 44C199.4 50 197 54 192 54.6L173.76 55A17 17 0 0 0 143.24 55L51.26 55A17 17 0 0 0 20.74 55Z"/>
  <rect class="rc-car-shade" x="-2" y="44.5" width="204" height="14" clip-path="url(#rc-car-clip)"/>
  <path class="rc-car-glass" d="M70 25.5C80 16 90 9 101 6.6C113 4.8 124 5.2 133 7.2C148 10.8 163 16 174.5 19.8C150 21.4 100 24.2 70 25.5Z"/>
  <path class="rc-car-glint" d="M86 21L100 8.4L106 8L92 20.4Z"/>
  <path class="rc-car-pillar" d="M117 5.4L115.6 23.4"/>
  <path class="rc-car-seam" d="M64.5 27.5C63 38 62 46 62.6 54.2M114.6 24.4L115.4 54.4M151 21.6C153 33 151.6 45 147.6 53.8"/>
  <path class="rc-car-crease" d="M72 30.4L178 23.8"/>
  <path class="rc-car-handle" d="M84.8 31.2h7.4a.85 .85 0 0 1 0 1.7h-7.4a.85 .85 0 0 1 0-1.7zM130.8 28.6h7.4a.85 .85 0 0 1 0 1.7h-7.4a.85 .85 0 0 1 0-1.7z"/>
  <path class="rc-car-body" d="M65.5 25.4C64.6 22.2 68.6 20.6 73.4 21.4C74.6 22.8 72.4 24.9 65.5 25.4Z"/>
  <path class="rc-car-lamp" d="M3.4 38.8C8 36.8 14 36 19.4 36.2C15.4 38.6 9.4 39.8 3.4 39.6Z"/>
  <path class="rc-car-tail" d="M187.6 21.2L199.3 23.6L199.4 27C195 26.2 191 24.4 187.6 21.2Z"/>
  <circle class="rc-car-tyre" cx="36" cy="47.5" r="14.5"/>
  <circle class="rc-car-rim" cx="36" cy="47.5" r="9.6"/>
  <circle class="rc-car-disc" cx="36" cy="47.5" r="7"/>
  <circle class="rc-car-hub" cx="36" cy="47.5" r="1.8"/>
  <circle class="rc-car-tyre" cx="158.5" cy="47.5" r="14.5"/>
  <circle class="rc-car-rim" cx="158.5" cy="47.5" r="9.6"/>
  <circle class="rc-car-disc" cx="158.5" cy="47.5" r="7"/>
  <circle class="rc-car-hub" cx="158.5" cy="47.5" r="1.8"/></svg>`;

/* ---------- brand ---------- */
export const wordmark = (o = {}) => `<span class="${cx('rc-wordmark', o.onBrand && 'is-on-brand')}"${o.size ? ` style="font-size:${o.size}px"` : ''} aria-label="Revel">revel</span>`;

/* ---------- actions ---------- */
// button('Continue', { block: true, act: 'continue' })  — label is HTML
export function button(label, o = {}) {
  const { variant = 'primary', block, icon: ic, disabled, act, attrs, cls } = o;
  return `<button type="button" class="${cx('rc-btn', 'rc-btn-' + variant, block && 'rc-btn-block', cls)}"${at({ 'data-act': act, disabled, ...attrs })}>${
    ic ? icon(ic, 18) : ''}${label}</button>`;
}

/* ---------- home ---------- */
export function searchBar(o = {}) {
  return `<div class="rc-search" role="search">${icon('search', 22)}
    <input class="rc-search-input" placeholder="${esc(o.placeholder || 'Enter destination')}" aria-label="Destination" value="${esc(o.value || '')}" readonly${at(o.attrs)}>
    <button type="button" class="rc-search-when"${at(o.whenAttrs)}>${icon('trips', 20)}${esc(o.when || 'Now')}${icon('chevronDown', 16)}</button></div>`;
}
export const placeChip = (label, o = {}) =>
  `<button type="button" class="rc-chip"${at(o.attrs)}>${icon(o.icon || 'star', 18)}${esc(label)}</button>`;
export function placeRow(o) {
  const ic = o.icon || 'history';
  return `<button type="button" class="rc-place"${at(o.attrs)}><span class="${cx('rc-place-icon', (ic === 'home' || ic === 'pin' || o.brand) && 'is-brand')}">${icon(ic, 22)}</span>
    <span class="rc-place-text"><b>${esc(o.title)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</span></button>`;
}
export const discountRow = (label, o = {}) =>
  `<button type="button" class="rc-discount"${at(o.attrs)}>${tag()}<b>${esc(label)}</b>${icon('arrow', 20)}</button>`;
export const promoBanner = (o = {}) => `<div class="rc-promo"><div class="rc-promo-text"><b>${esc(o.title || 'Refer a friend, Get $20')}</b>
    <button type="button" class="rc-promo-btn"${at(o.attrs)}>${esc(o.action || 'Refer your friends')}</button></div>${car(190, 'rc-promo-car')}</div>`;
export const wayCard = (o) => `<button type="button" class="rc-way"${at(o.attrs)}>
    <span class="rc-way-text"><b>${esc(o.title)} ${icon('arrow', 16)}</b>${o.body ? `<span>${esc(o.body)}</span>` : ''}</span>
    <span class="rc-way-art"${o.image ? ` style="background-image:url(${esc(o.image)})"` : ''}>${o.image ? '' : o.art || car(104)}</span></button>`;

const TABS = [{ key: 'home', label: 'Home', icon: 'home' }, { key: 'discounts', label: 'Discounts', icon: 'tag' },
  { key: 'trips', label: 'Trips', icon: 'trips' }, { key: 'account', label: 'Account', icon: 'account' }];
export const tabBar = (active, items = TABS) => `<nav class="rc-tabbar">${items.map(it => {
  const on = it.key === active;
  return `<button type="button" class="${cx('rc-tab', on && 'is-active')}"${on ? ' aria-current="page"' : ''} data-tab="${it.key}">${icon(it.icon, 26)}${esc(it.label)}</button>`;
}).join('')}</nav>`;

export const skeleton = (rows = [28, 110, 110, 110]) =>
  `<div class="rc-skel" aria-busy="true" aria-label="Loading">${rows.map(r => `<i style="height:${r}px"></i>`).join('')}</div>`;

/* ---------- map chrome ---------- */
export function mapTopBar(o = {}) {
  return `<div class="rc-topbar"><button type="button" class="rc-round-btn" aria-label="Menu"${at(o.menuAttrs)}>${icon('menu', 24)}</button>
    <div class="rc-topbar-dest"${at(o.destAttrs)}><small>${esc(o.label || 'FINAL STOP')}</small>
      <span>${o.icon ? icon(o.icon, 16, { cls: 'is-brand' }) : ''}${esc(o.value || 'Enter your destination')}</span></div>${
    o.closeAttrs ? `<button type="button" class="rc-round-btn" aria-label="Clear destination"${at(o.closeAttrs)}>${icon('close', 24)}</button>` : ''}</div>`;
}
export const mapPill = (text, tone) => `<span class="${cx('rc-pill', tone === 'brand' && 'is-brand', tone === 'soft' && 'is-soft')}">${esc(text)}</span>`;
export function mapFab(o = {}) {
  const ic = o.icon || 'locate';
  return `<button type="button" class="${cx('rc-fab', o.cls)}" aria-label="${esc(o.label || (ic === 'arrowLeft' ? 'Back' : 'Show my location'))}"${at(o.attrs)}>${icon(ic, 26)}</button>`;
}

// fields: [{ key, value, placeholder, active, kind: 'from' | 'stop' | 'to' }] — editable, with a clear button
export function routeFields(fields, o = {}) {
  const rail = fields.map((f, i) => `${i ? '<b></b>' : ''}<i class="is-${f.kind}"></i>`).join('');
  const inputs = fields.map(f => `<label class="${cx('rc-route-field', f.active && 'is-active')}"><span class="rc-sr">${esc(f.placeholder)}</span>
      <input value="${esc(f.value)}" placeholder="${esc(f.placeholder)}" autocomplete="off" data-field="${f.key}">${
      f.value ? `<button type="button" class="rc-route-clear" data-clear="${f.key}" aria-label="Clear ${esc(f.placeholder)}">${icon('close', 12)}</button>` : ''}</label>`).join('');
  return `<div class="rc-route"><span class="rc-route-rail" aria-hidden="true">${rail}</span><div class="rc-route-fields">${inputs}</div>
    <button type="button" class="rc-route-add" aria-label="Add a stop"${at(o.addAttrs)}>${icon('plus', 20)}</button></div>`;
}

/* ---------- booking ---------- */
export function bottomSheet(o = {}) {
  return `<section class="${cx('rc-sheet', o.cls)}"${at(o.attrs)}>${
    o.hint != null ? `<div class="rc-sheet-band"${at(o.bandAttrs)}><span class="rc-sheet-handle"></span>${esc(o.hint)}</div>` : `<span class="rc-sheet-handle is-solo"${at(o.bandAttrs)}></span>`}
    <div class="rc-sheet-body">${o.title ? `<h2 class="rc-sheet-title">${o.title}</h2>` : ''}${o.subtitle ? `<p class="rc-sheet-sub">${o.subtitle}</p>` : ''}${o.body || ''}</div>${
    o.action ? `<div class="rc-sheet-action">${o.action}</div>` : ''}</section>`;
}
export function vehicleOption(o) {
  const price = o.loading
    ? `<span class="rc-skel" style="gap:6px"><i style="height:18px;width:72px"></i><i style="height:14px;width:60px;margin-left:auto"></i></span>`
    : `<span class="rc-price">${o.was ? tag(22) : ''}${usd(o.price)}</span>${o.was ? `<s>${usd(o.was)}</s>` : ''}`;
  return `<button type="button" class="${cx('rc-vehicle', o.selected && 'is-selected')}" aria-pressed="${!!o.selected}"${at(o.attrs)}>${car(80)}
    <span class="rc-vehicle-text"><b>${esc(o.name || 'Revel EV')}<span class="rc-seats">${icon('seat', 16)}${o.seats || 4}</span></b>${
      o.eta ? `<span class="rc-vehicle-eta">${esc(o.eta)}</span>` : ''}${o.note ? `<span class="rc-vehicle-note">${esc(o.note)}</span>` : ''}</span>
    <span class="rc-vehicle-price">${price}</span></button>`;
}
export const paymentRow = (o = {}) => `<button type="button" class="rc-pay"${at(o.attrs)}><span class="rc-cardmark">${esc(o.brand || 'VISA')}</span>
  <span class="rc-pay-num">···· ${esc(o.last4 || '4242')}</span><span class="rc-pay-exp">${esc(o.expiry || '10 / 27')}</span>${icon('chevronRight', 18)}</button>`;

// title is HTML so the app can keep a live-updating minute count inside it
export function driverCard(o = {}) {
  return `<div class="rc-driver"><h2 class="rc-sheet-title">${o.eta || 'Pickup in 14 min'}</h2>${o.meet ? `<p class="rc-sheet-sub">${esc(o.meet)}</p>` : ''}
    <div class="rc-driver-row"><span class="rc-driver-art">${car(116)}<span class="rc-driver-face" aria-hidden="true">${icon('account', 24)}</span></span>
      <span class="rc-driver-id"><b>${esc(o.plate)}</b><span>${esc(o.model)}</span><span class="rc-driver-name">${icon('verified', 16)}${esc(o.driver)}</span></span></div>
    <div class="rc-duo">${button('Call', { variant: 'soft', icon: 'phone', attrs: o.callAttrs })}${button('Text', { variant: 'soft', icon: 'message', attrs: o.textAttrs })}</div></div>`;
}
// legs: [{ place, sub, time (HTML), kind: 'pickup' | 'dropoff' }]
export const tripLegs = (legs) => `<ol class="rc-legs">${legs.map((l, i) =>
  `<li class="is-${l.kind || (i === 0 ? 'pickup' : 'dropoff')}"><i aria-hidden="true"></i><span><b>${esc(l.place)}</b>${l.sub ? `<small>${esc(l.sub)}</small>` : ''}</span>${
    l.time ? `<time>${l.time}</time>` : ''}</li>`).join('')}</ol>`;

/* ---------- overlays ---------- */
export const dialog = (o) => `<div class="rc-dialog" role="alertdialog" aria-label="${esc(o.title)}"><h2>${esc(o.title)}</h2>${
  o.body ? `<p>${esc(o.body)}</p>` : ''}<div class="rc-dialog-actions">${o.actions || button('OK', { block: true, act: 'closedialog' })}</div></div>`;
// items: [{ label, act }]
export const actionSheet = (items) => `<div class="rc-actions" role="menu">${items.map(it =>
  `<button type="button" role="menuitem"${at({ 'data-act': it.act, ...it.attrs })}>${esc(it.label)}</button>`).join('')}</div>`;
// items: [{ label, icon, attrs }]
export function menuDrawer(o) {
  return `<aside class="rc-drawer"><div class="rc-drawer-me"><span class="rc-addphoto">Add<br>Photo<i aria-hidden="true">${icon('plus', 12)}</i></span>
      <b>${esc(o.name)}</b><a href="#"${at(o.profileAttrs)}>View profile</a></div>
    <nav>${o.items.map(it => `<button type="button"${at(it.attrs)}>${icon(it.icon, 20)}${esc(it.label)}</button>`).join('')}</nav>
    <button type="button" class="rc-drawer-foot"${at(o.footAttrs)}>${esc(o.footer || 'Apply to be a revel driver')}${icon('arrow', 20)}</button></aside>`;
}

/* ---------- account ---------- */
const RECEIPT_MAP = `<svg class="rc-rmap" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect class="rc-rmap-land" width="360" height="150"/><path class="rc-rmap-block" d="M232 6h100l-28 44H214zM18 88l60-40 50 60-60 40zM240 96h96v54h-120z"/>
  <path class="rc-rmap-road" d="M-10 40 L380 118 M150 -10 L96 170 M300 -10 L220 170"/><path class="rc-rmap-trip" d="M168 26 L196 62 L182 58 L198 108"/>
  <circle class="rc-rmap-start" cx="168" cy="26" r="8"/><circle class="rc-rmap-end" cx="198" cy="110" r="9"/></svg>`;
// map: optional HTML for the tile (an <svg class="rc-rmap">); defaults to the system's stock tile
export const receiptCard = (o) => `<button type="button" class="rc-receipt"${at(o.attrs)}>${o.map || RECEIPT_MAP}
  <span class="rc-receipt-body"><span class="rc-receipt-icon">${icon('receipt', 26)}</span>
    <span class="rc-receipt-text"><b>${esc(o.kind || 'Revel EV ride')}</b><span>${esc(o.summary)}</span><span>${esc(o.date)}</span></span>
    <span class="rc-receipt-price">${usd(o.price)}${icon('chevronRight', 18)}</span></span></button>`;
