/* The Revel design system's components as HTML-string renderers.
   Each emits exactly the markup of its React counterpart in
   design-system/project/components/bundle.js, so revel.css styles both the same.
   Icons and the status vocabulary come from ds-data.js, generated from that bundle. */
import { ICON_PATHS, STATUS } from './ds-data.js?v=8';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cx = (...a) => a.filter(Boolean).join(' ');
const attrs = (o = {}) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');
const usd = (n) => '$' + Number(n || 0).toFixed(2);

/* ---------- Icon ---------- */
export function icon(name, size = 18, label) {
  const paths = ICON_PATHS[name] || [];
  return `<svg class="rv-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${
    paths.map(d => `<path d="${d}"/>`).join('')}</svg>`;
}

/* ---------- Button ---------- */
// btn('Add Shift', { variant: 'primary', icon: 'plus', act: 'addshift' })
export function btn(label, o = {}) {
  const { variant = 'secondary', block, icon: ic, act, cls, attrs: extra, disabled, title } = o;
  return `<button type="button" class="${cx('rv-btn', 'rv-btn-' + variant, block && 'rv-btn-block', cls)}"${
    attrs({ 'data-act': act, disabled, title, ...extra })}>${ic ? icon(ic, 16) : ''}${label}</button>`;
}

/* ---------- StatusChip ---------- */
export function chip(status, o = {}) {
  const label = String(status ?? '').toUpperCase();
  const [tone, solid] = STATUS[label] || ['neutral', 0];
  const isSolid = o.solid ?? !!solid;
  return `<span class="${cx('rv-chip', 'rv-chip-' + (o.tone || tone), isSolid && 'rv-chip-solid', o.cls)}">${esc(o.text ?? label)}</span>`;
}

/* ---------- Avatar / DriverCell ---------- */
export function avatar(name, size = 36) {
  const g = Math.round(size / 2);
  return `<span class="rv-avatar" style="width:${size}px;height:${size}px" title="${esc(name)}">
    <svg viewBox="0 0 24 24" width="${g}" height="${g}" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
    <circle cx="12" cy="9" r="3.4"/><path d="M5.5 20a6.8 6.8 0 0 1 13 0"/></svg></span>`;
}

export function driverCell(name, statuses = [], o = {}) {
  const chips = (o.first ? chip('1ST', { text: '1st' }) : '') + statuses.map(s => chip(s)).join('');
  return `<div class="rv-driver-cell">${avatar(name, o.size || 36)}
    <div class="rv-driver-cell-text"><span class="rv-driver-cell-name">${esc(name)}</span>${
      chips ? `<span class="rv-driver-cell-chips">${chips}</span>` : ''}${o.sub ? `<span class="rv-sub">${o.sub}</span>` : ''}</div></div>`;
}

/* ---------- Facet ---------- */
export function facet(label, count, o = {}) {
  return `<label class="${cx('rv-facet', o.nested && 'rv-facet-nested')}">
    <input type="checkbox"${attrs({ 'data-f': o.group, 'data-v': label, checked: !!o.checked })}>
    <span class="rv-facet-label">${o.chip ? chip(label) : esc(label)}</span>
    ${count != null ? `<span class="rv-facet-count">${count}</span>` : ''}</label>`;
}

/* ---------- KeyValue ---------- */
export function kv(items) {
  return `<dl class="rv-kv">${items.filter(Boolean).map(([k, v]) =>
    `<div class="rv-kv-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

/* ---------- Note ---------- */
export function note({ author, time, body, state, photos }) {
  return `<div class="${cx('rv-note', state && 'rv-note-' + state)}">${
    state === 'rejected' ? chip('REJECTED') : ''}${state === 'appeal' ? chip('APPEAL SUBMITTED') : ''}
    <div class="rv-note-head"><b>${esc(author)}</b><time>${esc(time)}</time></div>
    <div class="rv-note-body">${esc(body)}</div>${
    photos ? `<div class="rv-note-photos">${'<i>photo</i>'.repeat(photos)}</div>` : ''}</div>`;
}

/* ---------- QueueItem ---------- */
export function queueItem({ name, time, meta, badge, selected, id }) {
  return `<button type="button" class="${cx('rv-queue-item', selected && 'is-selected')}"${attrs({ 'data-rev': id })}>
    <b>${esc(name)}</b>${time ? `<span class="rv-queue-meta">${esc(time)}</span>` : ''}${
    meta ? `<span class="rv-queue-meta">${esc(meta)}</span>` : ''}${badge ? chip(badge) : ''}</button>`;
}

/* ---------- TopNav / MarketSelect / Tabs / Segmented / Pager ---------- */
export function topNav(items, active) {
  return `<nav class="rv-topnav">${items.map(it =>
    `<a href="${it.href}" class="${cx('rv-topnav-item', it.key === active && 'is-active')}"${
      it.key === active ? ' aria-current="page"' : ''}>${icon(it.icon || it.key)}${esc(it.label)}</a>`).join('')}</nav>`;
}

export function marketSelect(markets, value, clock) {
  return `<label class="rv-market"><span class="rv-sr">Market</span>
    <select data-act="market">${markets.map(m =>
      `<option value="${m.key}"${m.key === value ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select>${
    icon('chevronDown', 14).replace('class="rv-icon"', 'class="rv-icon rv-market-caret"')}${
    clock ? `<span class="rv-market-clock">${esc(clock)}</span>` : ''}</label>`;
}

// items: [{ key, label, count?, href }]
export function tabs(items, active, o = {}) {
  return `<div class="${cx('rv-tabs', o.center && 'rv-tabs-center')}" role="tablist">${items.map(it => {
    const on = it.key === active;
    return `<a role="tab" aria-selected="${on}" href="${it.href}" class="${cx('rv-tab', on && 'is-active')}">${
      it.count != null ? it.count + ' ' : ''}${esc(it.label)}</a>`;
  }).join('')}</div>`;
}

// seg(['All','Paid'], 0, 'invGlobal')  → buttons carry data-seg="invGlobal:i"
export function seg(options, value, key) {
  return `<div class="rv-seg" role="group">${options.map((o, i) =>
    `<button type="button" class="${i === value ? 'is-active' : ''}" aria-pressed="${i === value}"${
      key ? ` data-seg="${key}:${i}"` : ''}>${esc(o)}</button>`).join('')}</div>`;
}

export function pager(page, total, per = 20) {
  const last = Math.max(0, Math.ceil(total / per) - 1);
  const from = total ? page * per + 1 : 0, to = Math.min(total, (page + 1) * per);
  return `<div class="rv-pager">
    <button type="button" data-act="prev" aria-label="Previous page"${page <= 0 ? ' disabled' : ''}>${icon('chevronLeft', 14)}</button>
    <span>${from} – ${to} of ${total.toLocaleString()}</span>
    <button type="button" data-act="next" aria-label="Next page"${page >= last ? ' disabled' : ''}>${icon('chevronRight', 14)}</button></div>`;
}

/* ---------- SearchField / DateNav ---------- */
export function search(placeholder = 'Search...') {
  return `<label class="rv-search">${icon('search', 16)}<input type="search" placeholder="${esc(placeholder)}" aria-label="Search"></label>`;
}

// the date label wraps a transparent native <input type=date> so the whole chip opens the picker
export function dateNav(label, isoValue, showToday) {
  return `<div class="rv-datenav">
    <button type="button" class="rv-datenav-step" data-act="dateprev" aria-label="Previous day">${icon('chevronLeft', 14)}</button>
    <label class="rv-datenav-date">${icon('calendar', 16)}<span>${esc(label)}</span>
      <input type="date" class="rv-datenav-native" value="${isoValue}" data-act="datepick" aria-label="Pick a date"></label>
    <button type="button" class="rv-datenav-step" data-act="datenext" aria-label="Next day">${icon('chevronRight', 14)}</button>
    ${showToday ? btn('Go to Today', { act: 'today' }) : ''}</div>`;
}

/* ---------- Modal / Toast ---------- */
export function modal(title, body, footer, width) {
  return `<div class="rv-scrim" data-act="closemodal-bg">
    <div class="rv-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"${width ? ` style="width:${width}px"` : ''}>
      <div class="rv-modal-head"><h4>${esc(title)}</h4>
        <button type="button" class="rv-modal-x" data-act="closemodal" aria-label="Close">${icon('close', 16)}</button></div>
      <div class="rv-modal-body">${body}</div>${footer ? `<div class="rv-modal-foot">${footer}</div>` : ''}</div></div>`;
}

export function toast(message, title = 'Success') {
  return `<div class="rv-toast" role="status">${icon('check', 18)}
    <div><b>${esc(title)}</b><div class="rv-toast-msg">${esc(message)}</div></div>
    <button type="button" class="rv-toast-x" data-act="closetoast" aria-label="Dismiss">${icon('close', 14)}</button></div>`;
}

/* ---------- driver app ---------- */
// items: [{ key, label, icon }]; onboarding: true to show the orange entry
export function sideNav({ name = 'Demo Mode', items, active, onboarding, version, foot }) {
  return `<aside class="rv-sidenav">
    <div class="rv-sidenav-me">${avatar(name, 60)}<b>${esc(name)}</b><a href="#" data-nav="profile">View profile</a></div>
    <nav>${onboarding ? `<a href="#" class="rv-sidenav-onboard" data-nav="onboarding">Onboarding ${icon('arrow', 16)}</a>` : ''}${
      items.map(it => `<a href="#" data-nav="${it.key}" class="${it.key === active ? 'is-active' : ''}"${
        it.key === active ? ' aria-current="page"' : ''}>${icon(it.icon || it.key, 20)}${esc(it.label)}</a>`).join('')}</nav>
    <div class="rv-sidenav-foot">${version ? 'Version: ' + esc(version) : ''}${foot || ''}</div></aside>`;
}

export function banner(tone, text, nav) {
  return nav
    ? `<button type="button" class="rv-banner rv-banner-${tone}" data-nav="${nav}"><span>${esc(text)}</span>${icon('arrow', 14)}</button>`
    : `<div class="rv-banner rv-banner-${tone}"><span>${esc(text)}</span>${tone !== 'active' ? icon('arrow', 14) : ''}</div>`;
}

export function step({ label, sub, done, inert, key, act, tone }) {
  if (inert) return `<div class="rv-step rv-step-inert"><b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  return `<button type="button" class="${cx('rv-step', done && 'is-done', tone && 'rv-step-' + tone)}"${
    attrs({ 'data-step': key, 'data-act': act, disabled: !!done })}>
    <span>${esc(label)}${sub ? `<em>${esc(sub)}</em>` : ''}</span>${icon(done ? 'check' : 'arrow', 16)}</button>`;
}

export function rideCard({ kind = 'Ride', time, total, fare, tip, tolls, extra, idx }) {
  const lines = kind === 'Ride' ? [['Fare', fare], ['Tip', tip], ['Tolls', tolls]].filter(l => l[1]) : [];
  return `<div class="rv-ride"${idx != null ? ` data-ride="${idx}"` : ''}>
    <div class="rv-ride-head">${icon('ride', 17)}<b>${esc(kind)}</b>
      <span class="rv-ride-time">${esc(time)}</span><span class="rv-ride-total">${usd(total)}</span></div>${
    lines.length || extra ? `<div class="rv-ride-lines">${lines.map(l =>
      `<div><span>${l[0]}</span><span>${usd(l[1])}</span></div>`).join('')}${extra || ''}</div>` : ''}</div>`;
}

export function strikeMeter(label, strikes, max = 5) {
  const n = Math.max(0, Math.min(max, strikes)), crit = n >= max;
  const segs = Array.from({ length: max }, (_, i) => `<i class="${i < n ? (crit ? 'is-crit' : 'is-on') : ''}"></i>`).join('');
  return `<div class="rv-meter">
    <span class="rv-meter-dot ${crit ? 'is-crit' : n ? 'is-on' : 'is-clear'}" aria-hidden="true">${n ? '!' : '✓'}</span>
    <div class="rv-meter-text"><b>${esc(label)}</b><span>${n} / ${max} Strikes</span></div>
    <span class="rv-meter-bar" role="img" aria-label="${n} of ${max} strikes">${segs}</span>${icon('chevronRight', 16)}</div>`;
}

export function otp(length = 6) {
  return `<div class="rv-otp" id="otp">${Array.from({ length }, (_, i) =>
    `<input inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Digit ${i + 1}">`).join('')}</div>`;
}

export function actionBar(inner, caption) {
  return `<div class="rv-actionbar">${caption ? `<div class="rv-actionbar-cap">${esc(caption)}</div>` : ''}
    <div class="rv-actionbar-row">${inner}</div></div>`;
}

export function takeover({ tone = 'review', title, body, action = 'Ok, got it', act = 'closetake' }) {
  return `<div class="rv-takeover rv-takeover-${tone}" role="alertdialog" aria-label="${esc(title)}">
    <div class="rv-takeover-mark" aria-hidden="true">!</div>
    <h2>${esc(title)}</h2><p>${esc(body)}</p>
    <button type="button" data-act="${act}">${esc(action)}</button></div>`;
}
