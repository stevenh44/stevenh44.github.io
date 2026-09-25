import { DB, TRACKS, INCIDENT_TYPES, RESTRICTIONS, OPS_STAFF,
         fmtDate, fmtDateShort, fmtTime, fmtDT, TODAY, day, int, pick } from '../shared/seed.js?v=7';
import { esc, icon, btn, chip, avatar, driverCell, facet, kv, note, queueItem, topNav, marketSelect,
         tabs, seg, pager, search, dateNav, modal, toast as toastEl } from '../shared/ui.js?v=7';
import { STATUS } from '../shared/ds-data.js?v=7';

const app = document.getElementById('app');
const usd = (n) => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ago = (m) => m < 60 ? `${m} minutes ago` : m < 1440 ? `${Math.round(m / 60)} hours ago`
  : m < 43200 ? `${Math.round(m / 1440)} days ago` : m < 525600 ? `${Math.round(m / 43200)} months ago`
  : `${Math.round(m / 525600)} years ago`;
const sortIcon = `<span class="sort">${icon('sort', 13)}</span>`;
const slug = (t) => t.toLowerCase().replace(/\s/g, '');

// ---------- routing & state ----------
let route = { market: 'ny', page: 'shifts', id: null, tab: null };
let state = { sel: null, page: 0, modal: null, toast: null, seg: {}, dateOffset: 0, f: {} };
const F = (g) => (state.f[g] ||= new Set());
const toggleF = (g, v) => { const s = F(g); s.has(v) ? s.delete(v) : s.add(v); state.page = 0; };
const matches = (g, v) => { const s = state.f[g]; return !s || s.size === 0 || s.has(v); };
const anyFilters = () => Object.values(state.f).some(v => v.size);
const clearFilters = () => { state.f = {}; state.page = 0; };

function parseHash() {
  const p = (location.hash.replace(/^#\/?/, '') || 'ny/shifts').split('/');
  route = { market: p[0] === 'la' ? 'la' : 'ny', page: p[1] || 'shifts', id: p[2] || null, tab: p[3] || null };
}
const go = (h) => { location.hash = h; };
window.addEventListener('hashchange', () => { parseHash(); state.sel = null; state.page = 0; render(); });

const M = () => DB.markets[route.market];
const boardDate = () => { const d = new Date(TODAY); d.setDate(d.getDate() + state.dateOffset); return d; };
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const slice = (arr, per = 20) => arr.slice(state.page * per, state.page * per + per);
const pagerRow = (total, per) => `<div class="pager-row">${pager(state.page, total, per)}</div>`;
const who = (d, statuses = []) => driverCell(d.name, statuses);

// ---------- chrome ----------
function topbar() {
  const m = M();
  const now = new Date(); now.setHours(route.market === 'ny' ? 16 : 13, 32);
  const items = m.nav.map(n => ({ key: slug(n), label: n, href: `#/${m.key}/${slug(n)}` }));
  const active = route.page === 'timeline' ? 'shifts' : route.page;
  return `<header class="topbar">
    ${marketSelect(Object.values(DB.markets), m.key, `${fmtTime(now)} ${m.tz}`)}
    ${topNav(items, active)}
    <div class="topbar-right">
      <button type="button" class="icon-btn" aria-label="Search">${icon('search', 18)}</button>
      <a class="logout" href="../index.html">Logout</a>
    </div></header>`;
}

function facetGroup(title, items, group) {
  return `<h4>${title}</h4>` + items.map(([label, count, isChip]) =>
    facet(label, count, { group, chip: isChip, nested: isChip, checked: state.f[group]?.has(label) })).join('');
}
const clearBtn = () => anyFilters() ? `<button type="button" class="clearf" data-act="clearf">${icon('close', 14)}Clear Filters</button>` : '';

// ---------- shifts ----------
function shiftPasses(s) {
  return matches('depot', s.depot)
    && (!state.f.live?.size || (s.live && state.f.live.has(s.live)))
    && (!state.f.inactive?.size || (!s.live && state.f.inactive.has(s.status)))
    && matches('vehicle', s.vehicle ? 'Has Vehicle' : 'No Vehicle')
    && matches('note', s.note ? 'Has a Note' : 'No Note');
}

function pageShifts() {
  const m = M();
  const base = m.boards[state.dateOffset] || [];
  const all = base.filter(shiftPasses);
  const ct = (f) => base.filter(f).length;
  const rail = `<aside class="rail">${clearBtn()}
    ${facetGroup('Depot', m.depots.map(d => [d, ct(s => s.depot === d)]), 'depot')}
    ${facetGroup('Active Shifts', DB.ref.SHIFT_LIVE.map(s => [s, ct(x => x.live === s), true]), 'live')}
    ${facetGroup('Inactive Shifts', DB.ref.SHIFT_INACTIVE.map(s => [s, ct(x => x.status === s && !x.live), true]), 'inactive')}
    ${facetGroup('Vehicle', [['Has Vehicle', ct(s => s.vehicle)], ['No Vehicle', ct(s => !s.vehicle)]], 'vehicle')}
    ${facetGroup('Note', [['Has a Note', ct(s => s.note)], ['No Note', ct(s => !s.note)]], 'note')}
  </aside>`;
  const t = (v) => v ? fmtTime(v) : '--';
  const rows = slice(all).map(s => `
    <tr data-shift="${s.id}">
      <td>${driverCell(s.driver.name, [s.live || s.status], { first: s.first })}</td>
      <td class="mono">${s.vehicle ? esc(s.vehicle.plate) : '--'}</td>
      <td class="tnum">${t(s.start)}</td><td class="tnum">${t(s.end)}</td>
      <td class="tnum">${t(s.arrival)}</td><td class="tnum">${t(s.clockIn)}</td><td class="tnum">${t(s.clockOut)}</td>
      <td class="tnum">~ ${s.dur}h</td>
      <td class="actions"><button type="button" class="row-btn" aria-label="More">${icon('more', 18)}</button></td>
    </tr>`).join('');
  return `<div class="wrap">${rail}<main class="main">
    <div class="toolbar">
      ${dateNav(fmtDate(boardDate()), isoDate(boardDate()), state.dateOffset !== 0)}
      <div class="count">${all.length} Shifts</div>${search()}
    </div>
    <table class="t frozen"><thead><tr>
      <th>Driver</th><th>Vehicle</th><th>Start${sortIcon}</th><th>End${sortIcon}</th>
      <th>Arrival</th><th>Clock In${sortIcon}</th><th>Clock Out${sortIcon}</th><th>Duration</th><th></th>
    </tr></thead><tbody>${rows || '<tr><td colspan="9" class="empty">No shifts match these filters</td></tr>'}</tbody></table>
    ${pagerRow(all.length)}
  </main></div>`;
}

// ---------- map ----------
function pageMap() {
  const m = M();
  const live = m.shifts.filter(s => s.live);
  const ct = (f) => live.filter(f).length;
  const shown = live.filter(s => matches('depot', s.depot) && matches('live', s.live));
  const BOX = { lon0: -74.35, lon1: -73.60, lat0: 40.53, lat1: 40.91 };   // basemap extent
  const pins = shown.map((s, i) => {
    const v = s.vehicle || m.vehicles[i % m.vehicles.length];
    const x = (v.lng - BOX.lon0) / (BOX.lon1 - BOX.lon0) * 100;
    const y = (BOX.lat1 - v.lat) / (BOX.lat1 - BOX.lat0) * 100;
    const tone = (STATUS[s.live] || ['dispatch-blue'])[0];
    return `<button type="button" class="pin pin-${tone}" title="${esc(s.driver.name)} — ${s.live}" data-shift="${s.id}"
      style="left:${Math.max(1.5, Math.min(98, x))}%;top:${Math.max(2, Math.min(97, y))}%"></button>`;
  }).join('');
  return `<div class="wrap">
    <aside class="rail">${clearBtn()}
      ${facetGroup('Depot', m.depots.map(d => [d, ct(s => s.depot === d)]), 'depot')}
      ${facetGroup('Shift Status', DB.ref.SHIFT_LIVE.map(x => [x, ct(s => s.live === x), true]), 'live')}
    </aside>
    <main class="main">
      <div class="toolbar"><div class="count">${shown.length} Shifts</div>${search()}</div>
      <div class="mapbox">
        ${route.market === 'ny' ? '<img class="basemap" src="../shared/map-ny.svg" alt="Map of New York City">' : '<div class="basemap fallback"></div>'}
        ${pins}
        <div class="maplegend">Refreshing every 10s</div>
      </div>
    </main></div>`;
}

// ---------- vehicles ----------
const battery = (pct) => `<span class="batt ${pct < 40 ? 'low' : ''}">${icon('battery', 16)}${pct}%</span>`;

function pageVehicles() {
  const m = M();
  const ct = (f) => m.vehicles.filter(f).length;
  const vis = m.vehicles.filter(v => matches('assigned', v.assigned ? 'Assigned' : 'Unassigned')
    && matches('insurance', v.insurance) && matches('model', `${v.make} - ${v.model}`) && matches('fleetio', v.fleetio));
  const rows = slice(vis).map(v => `
    <tr data-veh="${v.id}" class="${state.sel === v.id ? 'sel' : ''}">
      <td><div class="rv-driver-cell"><span class="veh-thumb">${icon('vehicles', 18)}</span>
        <div class="rv-driver-cell-text"><span class="rv-driver-cell-name">${esc(v.plate)}</span>
        <span class="rv-sub">${v.color} - ${v.make} - ${v.model}</span></div></div></td>
      <td class="mono">${esc(v.vin)}</td>
      <td class="tnum">${battery(v.battery)}</td>
      <td>${v.fleetio === 'Unknown' ? '--' : esc(v.fleetio)}</td>
      <td>${ago(v.updatedMins)}</td>
    </tr>`).join('');
  const models = [...new Set(m.vehicles.map(v => `${v.make} - ${v.model}`))];
  return `<div class="wrap">
    <aside class="rail">${clearBtn()}
      <h4>Location</h4><select aria-label="Depot"><option>Select a depot</option>${m.depots.map(d => `<option>${d}</option>`).join('')}</select>
      <h4>Battery Charge</h4><input type="range" min="0" max="100" value="100" aria-label="Battery charge">
      <div class="scale"><span>25%</span><span>50%</span><span>75%</span></div>
      ${facetGroup('Assigned', [['Assigned', ct(v => v.assigned)], ['Unassigned', ct(v => !v.assigned)]], 'assigned')}
      ${facetGroup('Insurance', [...new Set(m.vehicles.map(v => v.insurance))].map(i => [i, ct(v => v.insurance === i)]), 'insurance')}
      ${facetGroup('Make - Model', models.map(mm => [mm, ct(v => `${v.make} - ${v.model}` === mm)]), 'model')}
      ${facetGroup('Fleetio Status', DB.ref.FLEETIO.map(f => [f, ct(v => v.fleetio === f)]), 'fleetio')}
    </aside>
    <main class="main">
      <div class="toolbar">${seg(['Table', 'Map'], 0)}<div class="count">${vis.length} Vehicles</div>${search()}</div>
      <table class="t"><thead><tr><th>License</th><th>VIN</th><th>Battery${sortIcon}</th><th>Fleetio Status</th><th>Last Updated${sortIcon}</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">No vehicles match these filters</td></tr>'}</tbody></table>
      ${pagerRow(vis.length)}
    </main>
    ${state.sel ? vehiclePanel(m.vehicles.find(v => v.id === state.sel)) : ''}
  </div>`;
}

function vehiclePanel(v) {
  if (!v) return '';
  return `<aside class="panel">
    <div class="panel-head"><button type="button" class="row-btn" data-act="closepanel" aria-label="Close">${icon('close', 16)}</button></div>
    ${v.updatedMins > 43200 ? `<span class="stale">LOCATION UPDATED ${ago(v.updatedMins).toUpperCase()}</span>` : ''}
    <span class="veh-thumb">${icon('vehicles', 20)}</span>
    <h3>${esc(v.plate)}</h3>
    <div class="rv-sub" style="margin-bottom:var(--space-3)">${v.make} ${v.model}, ${v.year} · ${battery(v.battery)}</div>
    ${kv([['VIN', `<span class="mono">${esc(v.vin)}</span>`], [route.market === 'ny' ? 'FHV License' : 'Plate', esc(v.plate)], ['Fleetio Status', esc(v.fleetio)]])}
    <h5>Controls</h5>
    <div class="controls">${['Start Car', 'Charge Port', 'Lock', 'Unlock', 'Flash', 'Horn', 'Trunk', 'Frunk']
      .map(c => btn(c, { act: 'vcmd', attrs: { 'data-cmd': c }, disabled: !v.controllable })).join('')}</div>
    <h5>Location</h5>
    <div class="minimap"><img class="basemap" src="../shared/map-ny.svg" alt=""><span class="pin pin-dispatch-blue" style="left:50%;top:50%"></span></div>
    <div style="margin-top:var(--space-2)">${seg(['Vehicle Map', 'Shift Map'], 0)}</div>
    <h5>Details</h5>
    ${kv([['Insurance Provider', esc(v.insurance)],
      v.tlcBase && ['TLC Base', esc(v.tlcBase)], v.tlcBase && ['Dispatching TLC Base', esc(v.tlcBase)],
      ['Telematics Provider', esc(v.telematics)], ['Controllable', String(v.controllable)], ['Speed Limit Pin', 'Not Set']])}
  </aside>`;
}

// ---------- drivers ----------
function pageDrivers() {
  const m = M();
  const rows = slice(m.drivers).map(d => `
    <tr data-driver="${d.id}">
      <td>${who(d)}</td><td>${chip(d.status)}</td>
      <td class="mono">${esc(d.phone)}</td>
      <td class="mono">${d.tlc ? esc(d.tlc.number) : esc(d.dl.number)}</td>
      <td class="mono rv-sub">${esc(d.externalId)}</td>
      <td>${d.subscriptionVehicle === 'None' ? '--' : esc(d.subscriptionVehicle)}</td>
      <td>${d.hadShift ? 'Yes' : 'No'}</td>
    </tr>`).join('');
  return `<div class="wrap"><main class="main">
    <div class="toolbar"><div class="count" style="margin:0 auto 0 0">${m.drivers.length.toLocaleString()} Drivers</div>${search()}</div>
    <table class="t"><thead><tr><th>Driver</th><th>Status</th><th>Phone</th><th>${route.market === 'ny' ? 'TLC License' : 'License'}</th><th>External ID</th><th>Vehicle</th><th>Had Shift</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${pagerRow(m.drivers.length)}
  </main></div>`;
}

// ---------- invoices ----------
const INV_TABS = ['All', 'Paid', 'Failed', 'Voided'];
const stripeBtn = btn('Stripe', { variant: 'ghost', icon: 'external' });

function pageInvoices() {
  const m = M();
  const s = state.seg.invGlobal || 0;
  const every = m.drivers.flatMap(d => d.invoices.map(i => ({ ...i, driver: d }))).sort((a, b) => b.date - a.date);
  const all = s === 0 ? every : every.filter(i => i.status === INV_TABS[s].toUpperCase());
  const rows = slice(all).map(i => `
    <tr data-inv="${i.id}">
      <td>${who(i.driver)}</td>
      <td class="tnum">${fmtDateShort(i.date)}<div class="rv-sub">${fmtTime(i.date)}</div></td>
      <td>${chip(i.status)}</td><td class="tnum">${usd(i.total)}</td><td>${esc(i.kind)}</td>
      <td class="actions">${stripeBtn}</td>
    </tr>`).join('');
  return `<div class="wrap"><main class="main">
    <div class="toolbar">${seg(INV_TABS, s, 'invGlobal')}<div class="count">${all.length.toLocaleString()} Invoices</div>${search()}</div>
    <table class="t"><thead><tr><th>Driver</th><th>Date</th><th>Status</th><th>Amount</th><th>Description</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="empty">No invoices</td></tr>'}</tbody></table>
    ${pagerRow(all.length)}
  </main></div>`;
}

// ---------- alerts ----------
function pageAlerts() {
  const m = M();
  const rows = m.alerts.map(a => `
    <tr data-alert="${a.id}" class="${state.sel === a.id ? 'sel' : ''}">
      <td>${who(a.driver)}</td><td><b>${esc(a.type)}</b></td>
      <td class="tnum">${fmtDT(a.driverNotified)}</td><td class="tnum">${fmtDT(a.opsNotified)}</td>
      <td>${a.notes.length ? `<b>${esc(a.notes[0].by)}</b><div class="rv-sub">${fmtDT(a.notes[0].at)}</div>` : '--'}</td>
      <td class="actions">${a.notes.length ? `<span class="muted" title="${a.notes.length} notes" style="display:inline-flex;gap:4px;align-items:center">${icon('message', 16)}${a.notes.length}</span>` : ''}</td>
    </tr>`).join('');
  const a = m.alerts.find(x => x.id === state.sel);
  return `${tabs([{ key: 'b', label: 'Driver Behaviors', count: m.alerts.length, href: `#/${m.key}/alerts` }], 'b', { center: true })}
    <div class="wrap"><main class="main">
      <div class="toolbar">${btn('Filter', { icon: 'filter' })}<div class="count">${m.alerts.length} Alerts</div></div>
      <table class="t"><thead><tr><th>Driver</th><th>Alert</th><th>Driver Notified</th><th>Ops Notified</th><th>Note Updated</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </main>${a ? alertPanel(a) : ''}</div>`;
}

function alertPanel(a) {
  const s = a.shift;
  return `<aside class="panel">
    <div class="panel-head"><button type="button" class="row-btn" data-act="closepanel" aria-label="Close">${icon('close', 16)}</button></div>
    ${kv([['Depot', esc(s.depot)], ['Phone', `<span class="mono">${esc(a.driver.phone)}</span>`], ['Date', fmtDate(s.date)],
      ['Shift Times', `${fmtTime(s.start)} - ${fmtTime(s.end)}`],
      ['Clock Times', `${s.clockIn ? fmtTime(s.clockIn) : 'TBD'} - ${s.clockOut ? fmtTime(s.clockOut) : 'TBD'}`],
      ['Duration', `~ ${s.dur}h`], ['Actual Meal Break', s.breaks.meal ? s.breaks.meal.mins + 'm' : 'TBD'],
      ['Actual Rest Break', s.breaks.rest1 ? s.breaks.rest1.mins + 'm' : 'TBD']])}
    <h5>Driver Behaviors</h5>
    <div style="font-weight:600">${esc(a.type)}</div>
    <div class="rv-sub">Driver Notified: ${fmtDT(a.driverNotified)}</div>
    <div class="rv-sub" style="margin-bottom:var(--space-2)">Ops Notified: ${fmtDT(a.opsNotified)}</div>
    ${a.notes.map(n => note({ author: n.by, time: fmtDT(n.at), body: n.text })).join('') || '<div class="thread-empty">No notes</div>'}
    <h5>Notes <button type="button" class="link-btn" data-act="note">${icon('plus', 14)}Add Note</button></h5>
    <div class="thread-empty">0 Notes</div>
    <div style="margin-top:var(--space-4)">${btn('Actions', { icon: 'more', cls: 'rv-btn-block' })}</div>
  </aside>`;
}

// ---------- driver record ----------
const D_TABS = {
  ny: ['Shifts', 'Rides', 'Schedule', 'Tickets', 'Invoices', 'Deposits', 'Restrictions', 'Notes'],
  la: ['Reservations', 'Rides', 'Schedule', 'Tickets', 'Incidents', 'Invoices', 'Deposits', 'Restrictions', 'Notes']
};
const editBtn = (label) => `<button type="button" class="link-btn">${icon(label === 'Add' ? 'plus' : 'edit', 13)}${label}</button>`;

function pageDriverDetail() {
  const m = M();
  const d = m.drivers.find(x => x.id === route.id);
  if (!d) return `<div class="empty">Driver not found. <a href="#/${m.key}/drivers">Back to Drivers</a></div>`;
  const list = D_TABS[m.key];
  const tab = list.find(t => slug(t) === (route.tab || '').toLowerCase()) || list[0];
  const nR = d.restrictionKeys.length;
  const fld = (label, value, action) => `<div class="fld">
    <div class="lb"><span>${label}</span>${action ? editBtn(action) : ''}</div>
    <div class="vl ${value ? '' : 'none'}">${value ? esc(value) : 'None'}</div></div>`;
  const licence = (label, l) => `<div class="fld"><div class="lb"><span>${label}</span>${editBtn('Add')}</div>
    <div class="boxed"><div><div>${esc(l.number)}</div><div class="rv-sub">Expires: ${l.expires.toLocaleDateString('en-US')}</div></div>
    <button type="button" class="row-btn" aria-label="Edit">${icon('edit', 15)}</button></div></div>`;

  const side = `<aside class="dside">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">${avatar(d.name, 52)}${editBtn('Edit Info')}</div>
    <h2>${esc(d.name)}</h2><div class="email">${esc(d.email)}</div>
    ${nR ? `<span class="restrbar">${nR} Restriction${nR > 1 ? 's' : ''}</span>` : ''}
    ${fld('Joined', d.joined.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}
    ${fld('Phone Number', d.phone)}
    ${fld('Address', `${d.address.line1}, ${d.address.city}, ${d.address.state} ${d.address.zip}`, 'Edit')}
    ${licence("Driver's License", d.dl)}
    ${d.tlc ? licence('TLC License', d.tlc) : ''}
    ${fld('Insurance', d.insurance, 'Edit')}
    ${fld('Vehicle Preference', d.vehiclePreference, 'Edit')}
    ${fld('Accident Insurance', d.accidentInsurance, 'Edit')}
    ${fld('Subscription Type', d.subscriptionType === 'None' ? null : d.subscriptionType, 'Edit')}
    ${fld('Subscription Vehicle', null, 'Edit')}
  </aside>`;
  const bar = tabs(list.map(t => ({ key: t, label: t, href: `#/${m.key}/drivers/${d.id}/${slug(t)}` })), tab);
  return `<div class="dwrap">${side}<div class="dmain">${bar}${driverTab(d, tab)}</div></div>`;
}

function driverTab(d, tab) {
  const s = state.seg[tab] || 0;
  const t = (v) => v ? fmtTime(v) : '--';
  switch (tab) {
    case 'Shifts': case 'Reservations': {
      const list = s === 1 ? d.shifts.filter(x => x.date > TODAY) : d.shifts;
      return `<div class="subhead"><h3>${tab}</h3>${seg(['Past', 'Future'], s, tab)}
        <div class="spacer"></div>${btn('Add Shift', { variant: 'primary', icon: 'plus', act: 'addshift' })}</div>
        <table class="t"><thead><tr><th>Date</th><th>Status</th><th>Start</th><th>End</th><th>Arrival</th><th>Clock In</th><th>Clock Out</th><th>Duration</th><th></th></tr></thead><tbody>
        ${list.slice(0, 20).map(x => `<tr ${x.timeline ? `data-timeline="${x.id}"` : ''}>
          <td>${fmtDate(x.date)}</td><td>${chip(x.status)}</td>
          <td class="tnum">${t(x.start)}</td><td class="tnum">${t(x.end)}</td><td class="tnum">${t(x.arrival)}</td>
          <td class="tnum">${t(x.clockIn)}</td><td class="tnum">${t(x.clockOut)}</td><td class="tnum">~ ${x.dur}h</td>
          <td class="actions">${x.timeline ? `<button type="button" class="row-btn" title="Shift timeline">${icon('list', 17)}</button>` : ''}<button type="button" class="row-btn" aria-label="More">${icon('more', 18)}</button></td>
        </tr>`).join('') || '<tr><td colspan="9" class="empty">No shifts found</td></tr>'}</tbody></table>`;
    }
    case 'Rides':
      return `<div class="subhead"><h3>Rides</h3>${seg(['All Statuses'], 0)}<div class="spacer"></div>
        <span class="rv-datenav-date">${icon('calendar', 16)}${fmtDate(TODAY)}</span></div>
        <table class="t"><thead><tr><th>Passenger</th><th>Car</th><th>Status</th><th>Start</th><th>End</th><th>Duration</th><th>Pay</th></tr></thead><tbody>
        ${Array.from({ length: 9 }, (_, i) => {
          const st = new Date(TODAY); st.setHours(9 + i, int(0, 55));
          const mins = int(9, 34), pay = mins * (0.62 + (i % 5) * 0.1);
          return `<tr><td class="rv-sub">Hidden for passenger safety</td><td class="mono">${pick(M().vehicles).plate}</td>
            <td>${chip('COMPLETE')}</td><td class="tnum">${fmtTime(st)}</td>
            <td class="tnum">${fmtTime(new Date(st.getTime() + mins * 60e3))}</td><td class="tnum">${mins}m</td><td class="tnum">${usd(pay)}</td></tr>`;
        }).join('')}</tbody></table>`;
    case 'Schedule': {
      const hhmm = (h) => { const x = new Date(TODAY); x.setHours(h, 0, 0, 0); return fmtTime(x); };
      return `<div class="subhead"><h3>Recurring Schedule</h3><div class="spacer"></div>
        ${btn('Add Recurring', { variant: 'primary', icon: 'plus', act: 'addrecurring' })}</div>
        <table class="t"><thead><tr><th>Day</th><th>Start</th><th>End</th><th>Duration</th><th>Depot</th><th></th></tr></thead><tbody>
        ${(d.recurring || []).map(r => `<tr><td><b>${r.day}</b></td><td class="tnum">${hhmm(r.startH)}</td>
          <td class="tnum">${hhmm(r.startH + r.dur)}</td><td class="tnum">${r.dur}h</td><td>${esc(r.depot)}</td>
          <td class="actions"><button type="button" class="row-btn" aria-label="More">${icon('more', 18)}</button></td></tr>`).join('')
        || '<tr><td colspan="6" class="empty">No recurring shifts found</td></tr>'}</tbody></table>`;
    }
    case 'Tickets': {
      const total = d.tickets.reduce((a, x) => a + x.amount, 0);
      return `<div class="subhead"><h3>Tickets</h3><span class="rv-sub">${d.tickets.length} Tickets · ${usd(total)}</span></div>
        <table class="t"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>
        ${d.tickets.map(x => `<tr><td>${fmtDT(x.date)}</td><td>${x.type}</td><td class="tnum">${usd(x.amount)}</td>
          <td class="actions">${btn('Shift', { variant: 'ghost', icon: 'list' })}${btn('.gov', { variant: 'ghost', icon: 'external' })}</td></tr>`).join('')
        || '<tr><td colspan="4" class="empty">No tickets</td></tr>'}</tbody></table>`;
    }
    case 'Incidents': {
      const filt = ['Active', 'Expired', 'Forgiven'][s];
      const list = d.incidents.filter(i => filt === 'Active' ? ['active', 'dispute submitted', 'dispute denied', 'appeal submitted'].includes(i.state)
        : filt === 'Expired' ? i.state === 'expired' : ['waived', 'dispute approved'].includes(i.state));
      const disputeChip = (i) => !i.dispute ? '' : i.state.includes('appeal') ? chip('APPEAL SUBMITTED')
        : i.state === 'dispute approved' ? chip('DISPUTE APPROVED', { tone: 'ok' })
        : i.state === 'dispute denied' ? chip('DISPUTE DENIED', { tone: 'fail' }) : chip('DISPUTE SUBMITTED', { tone: 'noshow' });
      return `<div class="subhead"><h3>Incidents</h3>${seg(['Active', 'Expired', 'Forgiven'], s, 'Incidents')}
        <select class="inline-select" aria-label="Track"><option>Track</option>${TRACKS.map(x => `<option>${x.label}</option>`).join('')}</select>
        <div class="spacer"></div>${btn('Add Incident', { variant: 'primary', icon: 'plus', act: 'addincident' })}</div>
        <table class="t"><thead><tr><th>Incident Type</th><th>Track</th><th>Strikes</th><th>Dispute Status</th><th>Time</th><th>Expires</th></tr></thead><tbody>
        ${list.map(i => `<tr data-incident="${i.id}" class="${state.sel === i.id ? 'sel' : ''}">
          <td><b>${esc(i.type)}</b></td><td>${TRACKS.find(x => x.key === i.track).prd}</td>
          <td>${i.points} Strike${i.points > 1 ? 's' : ''}</td><td>${disputeChip(i)}</td>
          <td>${fmtDate(i.occurred)}<div class="rv-sub">${fmtTime(i.occurred)}</div></td>
          <td>${i.expires ? fmtDate(i.expires) : '--'}</td></tr>`).join('')
        || `<tr><td colspan="6" class="empty">No ${filt.toLowerCase()} incidents</td></tr>`}</tbody></table>`;
    }
    case 'Invoices': {
      const list = s === 0 ? d.invoices : d.invoices.filter(i => i.status === INV_TABS[s].toUpperCase());
      return `<div class="subhead"><h3>Invoices</h3>${seg(INV_TABS, s, 'Invoices')}
        <div class="spacer muted">${usd(0)} Credit</div>
        ${btn('Credit', { icon: 'plus' })}${btn('New Invoice', { variant: 'primary', icon: 'plus', act: 'newinvoice' })}</div>
        <table class="t"><thead><tr><th>Date</th><th>Status</th><th>Amount</th><th>Description</th><th></th></tr></thead><tbody>
        ${list.slice(0, 20).map(i => `<tr data-inv="${i.id}" class="${state.sel === i.id ? 'sel' : ''}">
          <td>${fmtDate(i.date)}<div class="rv-sub">${fmtTime(i.date)}</div></td><td>${chip(i.status)}</td>
          <td class="tnum">${usd(i.total)}</td><td>${esc(i.kind)}</td><td class="actions">${stripeBtn}</td></tr>`).join('')
        || '<tr><td colspan="5" class="empty">No invoices</td></tr>'}</tbody></table>`;
    }
    case 'Deposits':
      return `<div class="subhead"><h3>Deposits</h3></div>
        <table class="t"><thead><tr><th>Date</th><th>Amount</th><th>Description</th></tr></thead><tbody>
        ${d.deposits.map(x => `<tr><td>${fmtDate(x.date)}</td><td class="tnum">${usd(x.amount)}</td><td>${x.desc}</td></tr>`).join('')
        || '<tr><td colspan="3" class="empty">No deposits</td></tr>'}</tbody></table>`;
    case 'Restrictions': {
      const col = (svc, title) => {
        const mine = RESTRICTIONS.filter(r => (r.svc === svc || r.svc === 'both') && d.restrictionKeys.includes(r.k));
        const groups = [...new Set(mine.map(r => r.group))];
        return `<div><h3>${title}</h3><div class="rv-sub" style="margin-bottom:var(--space-1)">Status</div>
          ${mine.length ? chip('RESTRICTED', { tone: 'noshow' }) : chip('CLEAR', { tone: 'ok' })}
          ${mine.length ? groups.map(g => `<h5>${g}</h5>${mine.filter(r => r.group === g)
            .map(r => `<div class="item">${icon('close', 15)}<span>${esc(r.driver)}</span></div>`).join('')}`).join('')
            : `<div class="clear">${icon('check', 15)}Service Closed</div>`}</div>`;
      };
      return `<div class="restr">${col('rental', 'Rental')}${col('rideshare', 'Rideshare')}</div>`;
    }
    case 'Notes':
      return `<div class="subhead"><h3>Notes</h3><div class="spacer"></div>${btn('Add Note', { variant: 'primary', icon: 'plus', act: 'note' })}</div>
        <div class="notes-col">${[0, 1, 2].map(k => note({ author: OPS_STAFF[(k + d.name.length) % OPS_STAFF.length],
          time: fmtDT(day(-(k * 37 + 4))), body: ['Called about outstanding invoice, will pay Friday.', 'Requested vehicle swap — noise from rear brake.', 'Confirmed new address with driver.'][k] })).join('')}</div>`;
    default: return '<div class="empty">—</div>';
  }
}

// ---------- reviews ----------
function pageReviews() {
  const m = M(), q = m.queues;
  const counts = { 'Licenses': q.licenses.length, 'Applications': q.applications.length, 'Time Adjustments': q.timeAdjust.length,
    'Disputes': q.disputes.length, 'Employment Reviews': q.employmentReviews.length, 'Offboardings': q.offboardings.length };
  const tab = m.reviewTabs.find(t => slug(t) === (route.id || '').toLowerCase()) || m.reviewTabs[0];
  const bar = tabs(m.reviewTabs.map(t => ({ key: t, label: t, count: counts[t], href: `#/${m.key}/reviews/${slug(t)}` })), tab, { center: true });
  return bar + reviewBody(tab, q);
}

const reviewActions = `${btn('Approve', { variant: 'approve', icon: 'check', act: 'approve' })}${btn('Reject', { variant: 'reject', icon: 'close', act: 'reject' })}`;
const field = (label, value) => `<label class="field"><span class="lb">${label}</span><input value="${esc(value)}"></label>`;

function reviewBody(tab, q) {
  if (tab === 'Licenses') {
    const list = q.licenses, sel = list.find(x => x.id === state.sel) || list[0];
    if (!sel) return '<div class="empty">Queue is clear</div>';
    const dr = sel.driver;
    return `<div class="rev">
      <div class="revlist">${list.map(l => queueItem({ id: l.id, name: l.driver.name, time: fmtDT(l.submitted), selected: l === sel }).replace('</button>', `${chip(l.kind, { tone: l.kind === 'TLC' ? 'offline' : 'scheduled' })}</button>`)).join('')}</div>
      <div class="revbody">
        <div class="revhead">${avatar(dr.name, 46)}<div style="flex:1"><h3>${esc(dr.name)}</h3>
          <div class="meta mono">${esc(dr.phone)} · ${esc(dr.email)}</div></div>${reviewActions}</div>
        <div class="lic">
          <div class="licform"><div class="licform-title">License information</div>
            <div class="field-row">${field('First Name', dr.name.split(' ')[0])}${field('Last Name', dr.name.split(' ').slice(1).join(' '))}</div>
            <div class="field-row">${field('License Number', sel.kind === 'TLC' && dr.tlc ? dr.tlc.number : dr.dl.number)}${field('Expiration Date', dr.dl.expires.toLocaleDateString('en-US'))}</div>
            <div class="field-row">${field('Date of Birth', new Date(1975 + (dr.name.length % 25), dr.name.length % 12, 1 + dr.name.length % 27).toLocaleDateString('en-US'))}${field('Vehicle Class', sel.kind === 'TLC' ? 'FHV' : 'D')}</div>
            ${field('Address', dr.address.line1)}${field('City', dr.address.city)}
            <div class="field-row">${field('State', dr.address.state)}${field('Zip', dr.address.zip)}</div>
          </div>
          <div class="licphoto">${btn('Upload new photo', { icon: 'camera' })}
            <div class="frame ${sel.badPhoto ? 'bad' : ''}">${sel.badPhoto
              ? `<div>${icon('warning', 26)}<div style="margin-top:6px">Submitted photo is not a licence</div><div class="rv-sub">(water bottle)</div></div>`
              : `<div>${sel.kind} licence photo<div class="rv-sub">Redacted in prototype</div></div>`}</div>
          </div>
        </div>
      </div></div>`;
  }

  if (tab === 'Applications') {
    const list = q.applications, sel = list.find(x => x.id === state.sel) || list[0];
    if (!sel) return '<div class="empty">No applications pending</div>';
    return `<div class="rev">
      <div class="revlist"><div class="revlist-tools">${btn('Download Approved', { icon: 'download', cls: 'rv-btn-block' })}</div>
        ${list.map(a => queueItem({ id: a.id, name: a.name, time: fmtDT(a.submitted), selected: a === sel })).join('')}</div>
      <div class="revbody">
        <div class="revhead"><div style="flex:1"><h3>${esc(sel.name)}</h3>
          <div class="meta mono">${esc(sel.phone)} · ${esc(sel.email)} · ${sel.hours}</div></div>${reviewActions}</div>
        <div class="lic">
          <div class="licform"><div class="licform-title">License information <button type="button" class="link-btn">${icon('edit', 13)}Edit License Info</button></div>
            ${kv(['First Name', 'Last Name', 'License Number', 'Expiration Date', 'Date of Birth', 'Vehicle Class', 'Address', 'City', 'State', 'Zip'].map(f => [f, 'N/A']))}</div>
          <div class="licphoto"><div class="frame promo"><div><b>Drive with<br>Revel today</b><div style="margin-top:6px">No driver waitlist</div></div></div></div>
        </div></div></div>`;
  }

  if (tab === 'Time Adjustments') {
    const list = q.timeAdjust;
    return `<div>${slice(list).map(t => `<div class="queue-row">${avatar(t.driver.name)}<b>${esc(t.driver.name)}</b>
        <span class="rv-sub">${fmtDT(t.submitted)}</span>${btn('Review', { act: 'reviewshift', attrs: { 'data-ta': t.id } })}</div>`).join('')
      || '<div class="empty">Queue is clear</div>'}${pagerRow(list.length)}</div>`;
  }

  if (tab === 'Disputes') {
    const list = q.disputes, sel = list.find(x => x.id === state.sel) || list[0];
    if (!sel) return '<div class="empty">Queue is clear</div>';
    const i = sel.incident, dp = i.dispute, track = TRACKS.find(x => x.key === i.track);
    const strikes = (n) => `${n} Strike${n > 1 ? 's' : ''}`;
    return `<div class="rev">
      <div class="revlist"><div class="revlist-tools">${btn('Filter', { variant: 'ghost', icon: 'filter' })}</div>
        ${list.map(x => queueItem({ id: x.id, name: x.driver.name, time: fmtDT(x.incident.dispute.submitted),
          meta: `${strikes(x.incident.points)} · ${x.incident.type}`, badge: x.incident.state === 'appeal submitted' ? 'APPEAL' : null, selected: x === sel })).join('')}</div>
      <div class="revbody">
        <div class="revhead"><div style="flex:1"><h3>${esc(i.type)}</h3>
          <div class="meta">${i.state === 'appeal submitted' ? chip('APPEAL SUBMITTED') : ''}<span>${track.prd} · ${strikes(i.points)} · ${fmtDT(i.occurred)}</span></div></div>${reviewActions}</div>
        <div class="card"><div class="card-head">${avatar(sel.driver.name)}<div><b>${esc(sel.driver.name)}</b>
          <div class="rv-sub mono">${esc(sel.driver.phone)} · ${esc(sel.driver.email)}</div></div></div>
          ${kv([['Occurred', fmtDT(i.occurred)], ['Created', fmtDT(i.created)], ['Expires', i.expires ? fmtDT(i.expires) : 'Never'],
            ['Policy', `<span style="font-weight:400;display:block;max-width:330px">${esc(i.policy)}</span>`]])}</div>
        <div class="section-title" style="max-width:580px">Notes <button type="button" class="link-btn" data-act="note">${icon('plus', 14)}Add Note</button></div>
        <div class="thread">${i.notes.length ? i.notes.map(n => note({ author: n.by, time: fmtDT(n.at), body: n.text })).join('') : '<div class="thread-empty">0 Notes</div>'}</div>
        <div class="section-title">Dispute</div>
        <div class="thread">
          ${note({ author: sel.driver.name, time: fmtDT(dp.submitted), body: dp.reason, photos: dp.photos })}
          ${dp.rejectionReason ? note({ author: OPS_STAFF[i.type.length % OPS_STAFF.length], time: fmtDT(new Date(dp.submitted.getTime() + 864e5)), body: dp.rejectionReason, state: 'rejected' }) : ''}
          ${dp.appeal ? note({ author: sel.driver.name, time: fmtDT(dp.appeal.submitted), body: dp.appeal.reason, photos: dp.appeal.photos, state: 'appeal' }) : ''}
        </div>
      </div></div>`;
  }

  if (tab === 'Employment Reviews') {
    return `<table class="t"><tbody>${q.employmentReviews.map(e => `<tr>
        <td style="width:260px">${who(e.driver)}</td><td>${e.tracks.map(x => `<div>${x}</div>`).join('')}</td>
        <td class="tnum">${fmtDT(e.entered)}</td>
        <td class="actions">${btn('View Incidents', { act: 'goincidents', attrs: { 'data-id': e.driver.id } })}</td></tr>`).join('')
      || '<tr><td class="empty">Queue is clear</td></tr>'}</tbody></table>`;
  }

  if (tab === 'Offboardings') {
    const list = q.offboardings;
    return `<div><div class="toolbar"><div class="count">${list.length} Offboarding</div></div>
      <table class="t"><thead><tr><th>Renter</th><th>Requested Date</th><th>Days Overdue</th><th>Address</th><th>Amount</th><th></th></tr></thead><tbody>
      ${slice(list).map(o => `<tr><td>${who(o.driver)}</td><td>${fmtDate(o.requested)}</td>
        <td class="tnum" style="${o.overdue > 3 ? 'color:var(--reject);font-weight:600' : ''}">${o.overdue}</td>
        <td>${esc(o.driver.address.line1)}<div class="rv-sub">${esc(o.driver.address.city)}, ${o.driver.address.state} ${o.driver.address.zip}</div></td>
        <td class="tnum">${usd(o.amount)}</td><td class="actions">${btn('Confirm Refund', { act: 'refund' })}</td></tr>`).join('')}</tbody></table>
      ${pagerRow(list.length)}</div>`;
  }
  return '<div class="empty">—</div>';
}

// ---------- shift timeline ----------
function pageTimeline() {
  const m = M();
  let shift = null;
  for (const d of m.drivers) { const x = d.shifts.find(y => y.id === route.id); if (x) { shift = x; break; } }
  if (!shift || !shift.timeline) return '<div class="empty">No timeline for this shift.</div>';
  const d = shift.driver, t = (v) => v ? fmtTime(v) : '--';
  const breaks = ['meal', 'rest1', 'rest2'].map(k => shift.breaks[k]
    ? `<div>${t(shift.breaks[k].start)} – ${t(new Date(shift.breaks[k].start.getTime() + shift.breaks[k].mins * 60e3))}</div>` : '').join('') || '--';
  const f = (label, value) => `<div class="fld"><div class="lb">${label}</div><div class="vl">${value}</div></div>`;
  return `<div class="dwrap">
    <aside class="dside">${driverCell(d.name, [shift.status])}<div style="height:var(--space-3)"></div>
      ${f('Type', chip(d.type, { tone: 'ok' }))}${f('Depot', esc(shift.depot))}${f('Dayforce ID', d.dayforceId || '--')}
      ${f('Phone', `<span class="mono">${esc(d.phone)}</span>`)}${f('Device Type', d.deviceType)}${f('App Version', d.appVersion)}
      ${f('Shift Times', `${t(shift.start)} – ${t(shift.end)}`)}${f('Arrival', t(shift.arrival))}
      ${f('Clock Times', `${t(shift.clockIn)} – ${t(shift.clockOut)}`)}${f('Actual Breaks', `<span style="font-weight:400">${breaks}</span>`)}
    </aside>
    <div class="dmain">
      <div class="subhead"><h3>Shift Timeline</h3><span class="rv-sub">${fmtDate(shift.date)}</span><div class="spacer"></div>
        ${btn('Edit Shift', { icon: 'edit' })}${btn('Actions', { icon: 'more' })}</div>
      <table class="t"><thead><tr><th>Type</th><th>State</th><th>Assigned</th><th>Acknowledged</th><th>Finalized</th><th>Address</th><th></th></tr></thead><tbody>
      ${shift.timeline.map(e => `<tr><td><b>${e.kind}</b></td><td>${chip(e.state)}</td>
        <td class="tnum">${t(e.assigned)}</td><td class="tnum">${e.ack ? t(e.ack) : '--:--'}</td><td class="tnum">${t(e.fin)}</td>
        <td>${esc(e.address)}</td><td class="actions">${btn('CX', { variant: 'ghost' })}</td></tr>`).join('')}
      </tbody></table>
    </div></div>`;
}

// ---------- modals ----------
function modalHTML() {
  const m = state.modal;
  if (!m) return '';
  const cancel = (label = 'Cancel') => btn(label, { act: 'closemodal' });
  const commit = (label, msg, variant = 'primary') => btn(label, { variant, act: 'commit', attrs: { 'data-msg': msg } });

  if (m.kind === 'addincident') {
    return modal('Add incident', `
      <label class="field"><span class="lb">Incident type</span><select>${TRACKS.map(tr => `<optgroup label="${tr.prd}">${
        INCIDENT_TYPES.filter(i => i.t === tr.key).map(i => `<option>${i.n} — ${i.p} Point${i.p > 1 ? 's' : ''}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="field"><span class="lb">Occurred on</span><input type="datetime-local" value="2025-08-25T13:34"></label>
      <label class="field"><span class="lb">Note</span><textarea placeholder="Incident note which will not be surfaced to the driver"></textarea></label>`,
      cancel('Dismiss') + commit('Add Incident', 'Created driver incident'));
  }
  if (m.kind === 'addrecurring') {
    return modal('Create Recurring Shift', `
      <label class="field"><span class="lb">Day</span><select><option>Select a day...</option>${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="field"><span class="lb">Start Date</span><input type="date" value="2025-08-25"></label>
      <label class="field"><span class="lb">Depot</span><select><option>Select a depot...</option>${M().depots.map(x => `<option>${x}</option>`).join('')}</select></label>
      <div class="field-row"><label class="field"><span class="lb">Start Time</span><input type="time" value="12:00"></label>
        <label class="field"><span class="lb">End Time</span><input type="time" value="18:00"></label>
        <label class="field" style="flex:0 0 80px"><span class="lb">Duration</span><input value="6h" disabled></label></div>`,
      cancel() + commit('Save', 'Recurring shift created'));
  }
  if (m.kind === 'reviewshift') {
    const ta = M().queues.timeAdjust.find(x => x.id === m.id);
    if (!ta) return '';
    const s = ta.shift;
    const flag = (k) => ta.issues.includes(k) ? chip('DRIVER: TIMESTAMP CHANGE') : chip('NO ISSUES');
    const block = (label, key, a, b, actual, vals) => `
      <div class="rs-row"><b>${label}</b>${flag(key)}</div>
      <div class="field-row"><label class="field"><span class="lb">${a}</span><input value="${vals[0]}"></label>
        <label class="field"><span class="lb">${b}</span><input value="${vals[1]}"></label>
        <label class="field" style="flex:0 0 84px"><span class="lb">Actual</span><input value="${actual}" disabled></label></div>
      <div class="requested">Requested: ${vals[0]} · Requested: ${vals[1]}</div>`;
    const meal = s.breaks.meal;
    return modal('Review Shift', `
      <div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-3)">
        ${driverCell(ta.driver.name, ['COMPLETED'])}${chip('UBER OFFLINE', { tone: 'offline', solid: true })}
        <div style="margin-left:auto;text-align:right" class="rv-sub">${esc(ta.driver.email)}<br>${esc(ta.driver.phone)}<br>${fmtDate(s.date)}</div></div>
      <div class="callout"><b>${icon('warning', 15)}Driver timestamp change</b><div style="margin-top:3px">${esc(ta.driverNote)}</div></div>
      ${block('Clock In / Out', 'clock', 'Actual Clock In', 'Actual Clock Out', `${s.dur}h`, [fmtTime(s.clockIn), fmtTime(s.clockOut)])}
      ${block('Meal Break', 'meal', 'Start Time', 'End Time', meal ? meal.mins + 'm' : '--',
        meal ? [fmtTime(meal.start), fmtTime(new Date(meal.start.getTime() + meal.mins * 60e3))] : ['--', '--'])}
      <div class="rs-row"><b>Rest Break (1/2)</b>${flag('rest1')}</div>
      <div class="rs-row"><b>Rest Break (2/2)</b>${chip('NO ISSUES')}</div>
      <label class="field" style="margin-top:var(--space-3)"><span class="lb">Reviewers Note (Required)</span><textarea placeholder="Add additional details"></textarea></label>`,
      btn('Clear edits', { variant: 'ghost' }) + '<span class="spacer"></span>' + cancel('Dismiss') + commit('Save and approve', 'Shift approved and pushed to Rippling'), 660);
  }
  if (m.kind === 'newinvoice') {
    const TYPES = [['Weekly Rental', 'Recurring weekly vehicle rental fee'], ['Charging', 'Charging sessions billed for the week'],
      ['Toll', 'Toll incurred during a reservation'], ['Traffic Violation', 'Citation passed through to the driver'],
      ['Damage', 'Repair cost recovered from the driver'], ['Security Deposit', 'Refundable deposit held during the rental'],
      ['Late Fee', 'Charge for a vehicle returned late'], ['Cleaning Fee', 'Interior cleaning beyond normal wear']];
    return modal('New invoice', `
      <label class="field"><span class="lb">Invoice type</span><select>${TYPES.map(([x, dsc]) => `<option>${x} — ${dsc}</option>`).join('')}</select></label>
      <div class="field-row"><label class="field"><span class="lb">Amount</span><input value="$0.00"></label>
        <label class="field"><span class="lb">Charge date</span><input type="date" value="${isoDate(TODAY)}"></label></div>
      <label class="field"><span class="lb">Description shown to the driver</span><input placeholder="Optional"></label>
      <label class="check"><input type="checkbox" checked> Charge the card on file immediately</label>`,
      cancel() + commit('Create invoice', 'Invoice created'), 500);
  }
  if (m.kind === 'note') {
    return modal('Add note', `<label class="field"><span class="lb">Note</span><textarea placeholder="Visible to ops only — never surfaced to the driver"></textarea></label>`,
      cancel() + commit('Add Note', 'Note added'));
  }
  if (m.kind === 'confirm') {
    return modal(m.title, `<p style="margin:0">${m.body}</p>`, cancel() + commit(m.cta, m.msg, m.variant), 400);
  }
  return '';
}

// ---------- render ----------
function render() {
  document.documentElement.dataset.theme = 'console';
  let body;
  switch (route.page) {
    case 'shifts': case 'reservations': body = pageShifts(); break;
    case 'map': body = pageMap(); break;
    case 'vehicles': body = pageVehicles(); break;
    case 'drivers': body = route.id ? pageDriverDetail() : pageDrivers(); break;
    case 'invoices': body = pageInvoices(); break;
    case 'alerts': body = pageAlerts(); break;
    case 'reviews': body = pageReviews(); break;
    case 'timeline': body = pageTimeline(); break;
    default: body = `<div class="empty">Not found — <a href="#/${M().key}/shifts">go to Shifts</a></div>`;
  }
  app.innerHTML = topbar() + body + modalHTML() + (state.toast ? `<div class="toast-slot">${toastEl(state.toast)}</div>` : '');
}

// ---------- events ----------
let toastTimer;
function toast(msg) {
  state.toast = msg; render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 2600);
}

const CONFIRMS = {
  approve: { title: 'Review', body: 'Are you sure you want to approve?', cta: 'Approve', variant: 'approve', msg: 'Successfully approved' },
  reject: { title: 'Review', body: 'The rejection reason will be shown to the driver. Continue?', cta: 'Reject', variant: 'reject', msg: 'Rejected and driver notified' },
  refund: { title: 'Confirm Refund', body: 'Record the security deposit refund and mark the check as sent?', cta: 'Confirm Refund', variant: 'primary', msg: 'Refund recorded' }
};

document.addEventListener('click', (e) => {
  const t = e.target;
  const el = t.closest('[data-act]');
  const act = el?.dataset.act;
  if (act === 'closemodal-bg' && t !== el) return;          // clicks inside the dialog don't close it

  const open = (kind, extra) => { state.modal = { kind, ...extra }; render(); };
  switch (act) {
    case 'clearf': clearFilters(); return render();
    case 'dateprev': state.dateOffset--; state.page = 0; return render();
    case 'datenext': state.dateOffset++; state.page = 0; return render();
    case 'today': state.dateOffset = 0; state.page = 0; return render();
    case 'closepanel': state.sel = null; return render();
    case 'closemodal': case 'closemodal-bg': state.modal = null; return render();
    case 'closetoast': state.toast = null; return render();
    case 'newinvoice': return open('newinvoice');
    case 'addincident': return open('addincident');
    case 'addrecurring': case 'addshift': return open('addrecurring');
    case 'note': return open('note');
    case 'reviewshift': return open('reviewshift', { id: el.dataset.ta });
    case 'approve': case 'reject': case 'refund': return open('confirm', CONFIRMS[act]);
    case 'vcmd': return toast(`${el.dataset.cmd} command sent`);
    case 'goincidents': return go(`#/la/drivers/${el.dataset.id}/incidents`);
    case 'commit': { const msg = el.dataset.msg; state.modal = null; return toast(msg); }
    case 'prev': state.page = Math.max(0, state.page - 1); return render();
    case 'next': state.page++; return render();
  }

  const segBtn = t.closest('[data-seg]');
  if (segBtn) { const [k, v] = segBtn.dataset.seg.split(':'); state.seg[k] = +v; return render(); }

  const rev = t.closest('[data-rev]');
  if (rev) { state.sel = rev.dataset.rev; return render(); }

  const pin = t.closest('.pin[data-shift]');
  const tr = pin || t.closest('tr');
  if (!tr) return;
  const ds = tr.dataset;
  if (ds.driver) return go(`#/${route.market}/drivers/${ds.driver}`);
  if (ds.timeline) return go(`#/${route.market}/timeline/${ds.timeline}`);
  if (ds.shift) {
    const all = Object.values(M().boards).flat();
    const s = all.find(x => x.id === ds.shift);
    if (s) go(`#/${route.market}/drivers/${s.driver.id}`);
    return;
  }
  if (ds.veh) { state.sel = state.sel === ds.veh ? null : ds.veh; return render(); }
  if (ds.alert) { state.sel = state.sel === ds.alert ? null : ds.alert; return render(); }
  if (ds.incident) { state.sel = ds.incident; return render(); }
  if (ds.inv) { state.sel = ds.inv; return render(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.act === 'market') {
    route.market = t.value; state.sel = null; state.page = 0; clearFilters();
    return go(`#/${route.market}/${slug(M().nav[0])}`);
  }
  if (t.dataset.act === 'datepick' && t.value) {
    const [y, mo, dd] = t.value.split('-').map(Number);
    state.dateOffset = Math.round((new Date(y, mo - 1, dd, 12) - TODAY) / 864e5);
    state.page = 0; return render();
  }
  if (t.dataset.f) { toggleF(t.dataset.f, t.dataset.v); render(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.modal) { state.modal = null; render(); }
});

parseHash();
render();
