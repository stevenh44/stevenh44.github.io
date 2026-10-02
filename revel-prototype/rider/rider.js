/* Revel — the rider app, rebuilt from screen recordings (Sep 2024 – Feb 2025).
   One persistent map (the shared NYC basemap, inlined so it stays crisp at street zoom)
   under a UI layer that is re-rendered from state. Everything is fabricated. */
import { esc, usd, icon, tag, car, wordmark, button, searchBar, placeChip, placeRow, discountRow, promoBanner, wayCard, tabBar, skeleton,
  mapTopBar, mapPill, mapFab, routeFields, bottomSheet, vehicleOption, paymentRow, driverCard, tripLegs, dialog, actionSheet, menuDrawer,
  receiptCard } from '../shared/consumer/ui.js?v=5';

const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const ui = $('#ui'), mapEl = $('#map'), demoEl = $('#demo');
const clock = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const inMin = (m) => new Date(Date.now() + m * 60e3);

/* =====================================================================
   Geography — the basemap is an equirectangular 1600×1070 box over NYC
   ===================================================================== */
const BOX = { lon0: -74.35, lon1: -73.60, lat0: 40.53, lat1: 40.91 };
const WW = 1600, WH = 1070, M_PER_U = 39.5;
const toW = ([lon, lat]) => [(lon - BOX.lon0) / (BOX.lon1 - BOX.lon0) * WW, (BOX.lat1 - lat) / (BOX.lat1 - BOX.lat0) * WH];
const toLL = ([x, y]) => [BOX.lon0 + x / WW * (BOX.lon1 - BOX.lon0), BOX.lat1 - y / WH * (BOX.lat1 - BOX.lat0)];
const distU = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const distM = (a, b) => distU(toW(a), toW(b)) * M_PER_U;
// Brooklyn / Manhattan street grid runs ~29° east of north
const GU = [Math.sin(0.506), -Math.cos(0.506)], GV = [Math.cos(0.506), Math.sin(0.506)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];

/* ---------- places (public landmarks + fabricated personal addresses) ---------- */
const GPS = [-73.9978, 40.6797];                       // "Current location", Carroll Gardens
const P = (name, addr, ll, o = {}) => ({ name, addr, ll, ...o });
const SAVED = {
  home: P('Home', '214 Union St, Brooklyn, NY 11231, USA', [-73.9962, 40.6836], { icon: 'home', saved: true }),
  work: P('Work', '85 Broad St, New York, NY 10004, USA', [-74.0112, 40.7043], { icon: 'work', saved: true }),
  storage: P('Storage Unit', '330 3rd Ave, Brooklyn, NY 11215, USA', [-73.9868, 40.6762], { icon: 'star', saved: true })
};
const AIRPORTS = {
  JFK: { place: P('John F. Kennedy International Airport', 'Queens, NY 11430, USA', [-73.7781, 40.6413], { airport: 'JFK' }),
    airlines: [['Air France', 1], ['Alaska Airlines', 7], ['American Airlines', 8], ['British Airways', 8], ['Delta', 4],
      ['ITA Airways', 1], ['JetBlue', 5], ['Turkish Airlines', 1], ['Virgin Atlantic', 4]],
    more: [['Aeromexico', 1], ['Emirates', 4], ['Lufthansa', 1], ['Qatar Airways', 8], ['United', 7]],
    term: { 1: [-73.7894, 40.6431], 4: [-73.7822, 40.6440], 5: [-73.7786, 40.6457], 7: [-73.7870, 40.6484], 8: [-73.7896, 40.6466] }, fmt: (n) => `Terminal ${n}` },
  LGA: { place: P('LaGuardia Airport', 'Queens, NY 11371, USA', [-73.8740, 40.7769], { airport: 'LGA' }),
    airlines: [['Air Canada', 'B'], ['American Airlines', 'B'], ['Delta', 'C'], ['JetBlue', 'B'], ['Southwest', 'B'], ['Spirit', 'A'], ['United', 'B']],
    more: [['Alaska Airlines', 'B'], ['Frontier', 'B']],
    term: { A: [-73.8855, 40.7729], B: [-73.8745, 40.7740], C: [-73.8649, 40.7700] }, fmt: (n) => `Terminal ${n}` },
  EWR: { place: P('Newark Liberty International Airport', '3 Brewster Rd, Newark, NJ 07114, USA', [-74.1745, 40.6895], { airport: 'EWR' }),
    airlines: [['Air Canada', 'A'], ['American Airlines', 'A'], ['Delta', 'B'], ['JetBlue', 'A'], ['United', 'C'], ['Spirit', 'B']],
    more: [['Alaska Airlines', 'A'], ['Lufthansa', 'B']],
    term: { A: [-74.1822, 40.6874], B: [-74.1770, 40.6905], C: [-74.1788, 40.6952] }, fmt: (n) => `Terminal ${n}` }
};
const LANDMARKS = [
  AIRPORTS.JFK.place, AIRPORTS.LGA.place, AIRPORTS.EWR.place,
  P('The Standard, High Line', '848 Washington St, New York, NY 10014, USA', [-74.0081, 40.7409]),
  P('Barclays Center', '620 Atlantic Ave, Brooklyn, NY 11217, USA', [-73.9754, 40.6826]),
  P('Grand Central Terminal', '89 E 42nd St, New York, NY 10017, USA', [-73.9772, 40.7527]),
  P('Moynihan Train Hall', '421 8th Ave, New York, NY 10001, USA', [-73.9965, 40.7527]),
  P('Brooklyn Museum', '200 Eastern Pkwy, Brooklyn, NY 11238, USA', [-73.9636, 40.6712]),
  P('Chelsea Market', '75 9th Ave, New York, NY 10011, USA', [-74.0061, 40.7424]),
  P('Brooklyn Bridge Park Pier 1', 'Brooklyn, NY 11201, USA', [-73.9990, 40.7020]),
  P('Hudson Yards', '20 Hudson Yards, New York, NY 10001, USA', [-74.0022, 40.7536]),
  P('Yankee Stadium', '1 E 161st St, Bronx, NY 10451, USA', [-73.9262, 40.8296]),
  P('Citi Field', '41 Seaver Way, Queens, NY 11368, USA', [-73.8458, 40.7571]),
  P('Prospect Park', 'Brooklyn, NY 11225, USA', [-73.9690, 40.6602]),
  P('Domino Park', '15 River St, Brooklyn, NY 11249, USA', [-73.9680, 40.7143]),
  P('Lincoln Center', '10 Lincoln Center Plaza, New York, NY 10023, USA', [-73.9832, 40.7725]),
  P('Coney Island Boardwalk', 'Brooklyn, NY 11224, USA', [-73.9790, 40.5725]),
  P('JFK AirTrain', 'Queens, NY, USA', [-73.8081, 40.6606], { fuzzy: 'jfk' }),
  P('JFK - Terminal 7', 'Jamaica, NY, USA', [-73.7870, 40.6484], { fuzzy: 'jfk' })
];
const RECENTS = [AIRPORTS.JFK.place, LANDMARKS[3], LANDMARKS[4], P('160 Court St', 'Brooklyn, NY 11201, USA', [-73.9934, 40.6875])];

// towns an unknown street address could be in, as the real autocomplete offered
const TOWNS = [['Brooklyn, NY, USA', [-73.9570, 40.6782]], ['Hoboken, NJ, USA', [-74.0324, 40.7440]],
  ['Jersey City, NJ, USA', [-74.0776, 40.7282]], ['Newark, NJ, USA', [-74.1724, 40.7357]], ['Queens, NY, USA', [-73.8448, 40.7282]]];
const STREETS = ['Union St', 'President St', 'Carroll St', '1st Pl', '2nd Pl', '3rd Pl', 'Court St', 'Smith St', 'Clinton St',
  'Henry St', 'Sackett St', 'Degraw St', 'Kane St', 'Baltic St', 'Warren St', 'Bergen St', 'Dean St', 'Pacific St', 'Hoyt St', 'Bond St'];

function reverseGeocode(ll) {
  const near = [...Object.values(SAVED), ...LANDMARKS].map(p => [p, distM(p.ll, ll)]).sort((a, b) => a[1] - b[1])[0];
  if (near && near[1] < 90 && !near[0].saved) return { ...near[0], ll };
  const w = toW(ll), u = dot(w, GU), v = dot(w, GV);
  const street = STREETS[Math.abs(Math.floor(u / 2.05)) % STREETS.length];
  const num = 10 + Math.abs(Math.floor(v * 17)) % 480;
  const n = num - num % 2 + (Math.floor(u) % 2 ? 1 : 0);
  return P(`${n} ${street}`, `${n} ${street}, Brooklyn, NY 11231, USA`, ll);
}
const currentLocation = () => ({ ...reverseGeocode(GPS), current: true });

/* ---------- routes & pricing ---------- */
// JFK from south-west Brooklyn runs the Belt Parkway, as the recorded route did
const BELT = [[-74.0005, 40.6720], [-74.0180, 40.6520], [-74.0330, 40.6260], [-74.0320, 40.6080], [-74.0060, 40.5930],
  [-73.9700, 40.5830], [-73.9300, 40.5830], [-73.9050, 40.6000], [-73.8880, 40.6280], [-73.8700, 40.6540], [-73.8400, 40.6640], [-73.8000, 40.6630]];
function gridPath(A, B) {                     // world coords, Z-shaped along the street grid
  const d = [B[0] - A[0], B[1] - A[1]], du = dot(d, GU), dv = dot(d, GV);
  if (Math.hypot(du, dv) < 60) return [A, add(A, GU, du), B];
  const p1 = add(A, GU, du * 0.45);
  return [A, p1, add(p1, GV, dv), B];
}
function routeW(aLL, bLL, stopLL) {
  if (stopLL) { const r1 = routeW(aLL, stopLL), r2 = routeW(stopLL, bLL); return [...r1, ...r2.slice(1)]; }
  const A = toW(aLL), B = toW(bLL);
  const toJFK = bLL[0] > -73.83 && bLL[1] < 40.67 && aLL[0] < -73.95 && aLL[1] < 40.70;
  if (toJFK) {
    const way = BELT.map(toW);
    return [A, ...way, add(way[way.length - 1], GV, 0), B];
  }
  return gridPath(A, B);
}
const pathLenU = (pts) => pts.reduce((s, p, i) => i ? s + distU(pts[i - 1], p) : 0, 0);

function quote(a, b, stop, seed = 0) {
  const pts = routeW(a.ll, b.ll, stop?.ll);
  const miles = pathLenU(pts) * M_PER_U / 1609;
  const tripMin = Math.round(miles / 19 * 60 + 4);
  const airport = (a.airport || b.airport) ? 2.5 : 0;
  const cbd = [a, b].some(p => p.ll[1] > 40.70 && p.ll[1] < 40.77 && p.ll[0] < -73.965) ? 2.75 : 0;
  const fare = 2.75 + 2.4 * miles + 0.62 * tripMin + (stop ? 3 : 0);
  const full = +(fare + airport + cbd + 2.5).toFixed(2);
  const discount = +Math.min(fare * 0.4, 40).toFixed(2);     // the rider's 40% off rides, always applied
  const eta = 9 + (Math.round(a.ll[0] * 1e4 + seed) % 7 + 7) % 7;
  return { pts, miles: +miles.toFixed(1), tripMin, eta, fare: +fare.toFixed(2), airport, cbd, booking: 2.5, discount, full, price: +(full - discount).toFixed(2) };
}

/* =====================================================================
   State
   ===================================================================== */
const S = {
  screen: 'splash', tab: 'home', loadingHome: false,
  pickup: null, dest: null, stop: null, field: 'dest', q: '', showStop: false, airportCode: null, moreAirlines: false,
  when: null, quote: null, quoteReady: false, draft: null, quotedLL: null, farBanner: false, newQuote: null,
  progress: 0, driver: null, eta: 0, drive: null, expanded: false, editing: null, prevScreen: null,
  overlay: null, dialog: null, notif: null, toast: null, rating: 0, tip: 0, receipt: null, tripSeg: 0,
  fast: false, card: 0, codes: [],
  trips: [], upcoming: [], demoOpen: false
};
const CARDS = [{ brand: 'VISA', last: '4242', exp: '10/27' }, { brand: 'MC', last: '5454', exp: '07/28' }];
const DRIVERS = [{ name: 'Marco', plate: 'T624511C', model: 'Tesla Model 3' }, { name: 'Dana', plate: 'T703218C', model: 'Tesla Model Y' },
  { name: 'Idris', plate: 'T581940C', model: 'Tesla Model 3' }, { name: 'Priya', plate: 'T690377C', model: 'Tesla Model Y' }];
const RIDER = { name: 'Alex Rivera', first: 'Alex', phone: '(555) 010-2231' };

// demo timers — every wait in the flow is scaled here, and cancelled when the flow moves on
let timers = [];
const speed = () => S.fast ? 0.35 : 1;
const later = (ms, fn) => { const t = setTimeout(fn, ms * speed()); timers.push(t); return t; };
const every = (ms, fn) => { const t = setInterval(fn, ms * speed()); timers.push(t); return t; };
const clearTimers = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; };
const MINUTE = () => 3500 * speed();       // one "minute" of ETA in demo time

/* ---------- seeded trip history ---------- */
function seedTrips() {
  const mk = (from, to, daysAgo, h, m, dname) => {
    const q = quote(from, to), at = new Date(); at.setDate(at.getDate() - daysAgo); at.setHours(h, m, 0, 0);
    return { from, to, at, q, driver: DRIVERS.find(d => d.name === dname), tip: q.price > 40 ? 5 : 2 };
  };
  S.trips = [
    mk(SAVED.home, LANDMARKS[3], 2, 19, 48, 'Dana'),
    mk(LANDMARKS[4], SAVED.home, 6, 22, 14, 'Idris'),
    mk(SAVED.home, { ...AIRPORTS.JFK.place, name: 'JFK, Terminal 4, Departures, Delta', ll: AIRPORTS.JFK.term[4] }, 13, 6, 5, 'Marco'),
    mk(SAVED.work, SAVED.home, 17, 18, 31, 'Priya')
  ];
}

/* =====================================================================
   Map engine
   ===================================================================== */
const MAP = { svg: null, base: null, routes: null, grid: null, marks: null, cam: { x: 520, y: 520, w: 520 }, items: [], anim: 0, ready: false, miniURL: null };
const pxW = () => mapEl.clientWidth || 368, pxH = () => mapEl.clientHeight || 780;
const kScale = () => pxW() / MAP.cam.w;

async function initMap() {
  const txt = await fetch('../shared/map-ny.svg').then(r => r.text());
  const src = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'base'); svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<defs>
      <clipPath id="land"></clipPath>
      <pattern id="grid" patternUnits="userSpaceOnUse" width="6.3" height="2.05" patternTransform="rotate(29)">
        <path d="M0 0H6.3M0 0V2.05" style="stroke:var(--map-road-edge);stroke-width:var(--gw2)" fill="none"/>
        <path d="M0 0H6.3M0 0V2.05" style="stroke:var(--map-road);stroke-width:var(--gw1)" fill="none"/></pattern>
    </defs>`;
  const base = document.createElementNS(NS, 'g');
  base.setAttribute('class', 'nyc');
  [...src.children].forEach(n => { if (n.tagName !== 'rect') base.appendChild(document.importNode(n, true)); });
  const [other, land, minor, mid, major] = base.children;
  other.setAttribute('style', 'fill:var(--map-land-alt)');
  land.setAttribute('style', 'fill:var(--map-land);stroke:none');
  minor.setAttribute('style', 'stroke:var(--rc);stroke-width:var(--sw1)');
  mid.setAttribute('style', 'stroke:var(--rc);stroke-width:var(--sw2)');
  major.setAttribute('style', 'stroke:var(--map-road-edge);stroke-width:var(--sw3)');
  const clip = svg.querySelector('#land');
  [...other.children, ...land.children].forEach(p => clip.appendChild(p.cloneNode()));
  const grid = document.createElementNS(NS, 'rect');
  Object.entries({ x: 0, y: 0, width: WW, height: WH, fill: 'url(#grid)', 'clip-path': 'url(#land)' }).forEach(([k, v]) => grid.setAttribute(k, v));
  const routes = document.createElementNS(NS, 'g');
  svg.append(base, grid, routes);
  const marks = document.createElement('div'); marks.className = 'marks';
  mapEl.append(svg, marks);
  Object.assign(MAP, { svg, base, grid, routes, marks, ready: true });

  // a recoloured copy for the small receipt maps
  const css = getComputedStyle(document.documentElement), tok = (n) => css.getPropertyValue('--' + n).trim();
  const mini = txt.replace('#DCE1E7', tok('map-water')).replace('fill="#EDEFF2"', `fill="${tok('receipt-block')}"`)
    .replace('fill="#F5F6F8" stroke="#D3D8DE"', `fill="${tok('receipt-map')}" stroke="none"`)
    .replace('stroke="#E2E5EA" stroke-width="1.8"', `stroke="${tok('map-road')}" stroke-width=".7"`)
    .replace('stroke="#D8DCE2" stroke-width="2.6"', `stroke="${tok('map-road')}" stroke-width="1.1"`)
    .replace('stroke="#C6CCD4" stroke-width="3.4"', `stroke="${tok('map-road-edge')}" stroke-width="1.5"`);
  MAP.miniURL = URL.createObjectURL(new Blob([mini], { type: 'image/svg+xml' }));
  wireDrag();
  applyCam();
}

function applyCam() {
  if (!MAP.ready) return;
  const { x, y, w } = MAP.cam, h = w * pxH() / pxW(), k = kScale();
  MAP.svg.setAttribute('viewBox', `${x - w / 2} ${y - h / 2} ${w} ${h}`);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)).toFixed(2) + 'px';
  MAP.svg.style.setProperty('--sw1', cl(0.22 * k, 0.7, 5));
  MAP.svg.style.setProperty('--sw2', cl(0.36 * k, 1.1, 8));
  MAP.svg.style.setProperty('--sw3', cl(0.6 * k, 1.8, 12));
  // street grid: real width up close, never thinner than ~1.4px further out; fades in below w=150
  const gw1 = Math.max(0.3, 1.4 / k);
  MAP.svg.style.setProperty('--gw1', gw1.toFixed(3));
  MAP.svg.style.setProperty('--gw2', (gw1 + Math.max(0.12, 0.9 / k)).toFixed(3));
  MAP.svg.style.setProperty('--rc', w > 90 ? 'var(--map-road-edge)' : 'var(--map-road)');
  MAP.grid.style.display = w < 150 ? '' : 'none';
  MAP.grid.style.opacity = Math.min(1, (150 - w) / 50).toFixed(2);
  MAP.items.forEach(placeMark);
}
function project(ll) {
  const [wx, wy] = toW(ll), { x, y, w } = MAP.cam, k = kScale(), h = w * pxH() / pxW();
  return [(wx - (x - w / 2)) * k, (wy - (y - h / 2)) * k];
}
function unproject(sx, sy) {
  const { x, y, w } = MAP.cam, k = kScale(), h = w * pxH() / pxW();
  return toLL([x - w / 2 + sx / k, y - h / 2 + sy / k]);
}
function placeMark(it) {
  const [sx, sy] = project(it.ll);
  it.el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
  if (it.rot != null) it.el.querySelector('svg').style.transform = `rotate(${it.rot}deg)`;
  const pill = it.el.querySelector('.rc-pill');       // keep callouts inside the map
  if (pill) {
    const half = pill.offsetWidth / 2, dx = Math.max(10 + half - sx, Math.min(pxW() - 10 - half - sx, 0));
    pill.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), 0)`;
  }
}

// camera targets: fit a set of points into the visible band, or put one point at a screen spot
function camFit(pts, top, bottom, minW = 16) {
  const W = pts.map(toW), xs = W.map(p => p[0]), ys = W.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const aw = pxW() - 150, ah = Math.max(120, pxH() - top - bottom - 70);
  const k = Math.min(aw / Math.max(x1 - x0, 1e-3), ah / Math.max(y1 - y0, 1e-3));
  const w = Math.max(minW, pxW() / k), kk = pxW() / w;
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + (pxH() / 2 - (top + 25 + ah / 2)) / kk, w };
}
function camAt(ll, w, sy) {
  const [x, y] = toW(ll), k = pxW() / w;
  return { x, y: y + (pxH() / 2 - sy) / k, w };
}
function flyTo(target, ms = 750) {
  cancelAnimationFrame(MAP.anim);
  const from = { ...MAP.cam }, t0 = performance.now();
  if (!MAP.ready || ms === 0) { MAP.cam = target; return applyCam(); }
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms), e = ease(t);
    MAP.cam = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: Math.exp(Math.log(from.w) + (Math.log(target.w) - Math.log(from.w)) * e) };
    applyCam();
    if (t < 1) MAP.anim = requestAnimationFrame(step);
  };
  MAP.anim = requestAnimationFrame(step);
}

const carTop = () => `<svg viewBox="0 0 22 36" width="22" height="36" aria-hidden="true">
  <rect class="body" x="2" y="1" width="18" height="34" rx="7"/><rect class="glass" x="5" y="9" width="12" height="7" rx="2.5"/>
  <rect class="glass" x="5.5" y="25" width="11" height="5" rx="2"/></svg>`;
function markHTML(m) {
  const pill = m.label ? mapPill(m.label, m.tone) : '';
  switch (m.t) {
    case 'user': return `<div class="mk mk-user"><s></s><i></i>${pill}</div>`;
    case 'halo': return `<div class="mk mk-halo"><s></s></div>`;
    case 'pin': return `<div class="mk mk-pin${m.drop ? ' is-drop' : ''}"><u></u><i></i>${pill}</div>`;
    case 'ring': return `<div class="mk mk-ring${m.drop ? ' is-drop' : ''}"><i></i>${pill}</div>`;
    case 'car': return `<div class="mk mk-car">${carTop()}${pill}</div>`;
    default: return `<div class="mk">${pill}</div>`;
  }
}
function setMarks(list) {
  MAP.marks.innerHTML = list.map(markHTML).join('');
  MAP.items = list.map((m, i) => ({ ...m, el: MAP.marks.children[i] }));
  MAP.items.forEach(placeMark);
}
function setRoutes(list) {
  MAP.routes.innerHTML = list.map(r => {
    const pts = r.pts.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ');
    // the planned trip is route blue; the drive already under way (driver to pickup) is route-end cyan
    const stroke = r.kind === 'trip' ? 'var(--route)' : 'var(--route-end)';
    return `<polyline points="${pts}" fill="none" style="stroke:${stroke};stroke-width:5px;stroke-linecap:round;stroke-linejoin:round" vector-effect="non-scaling-stroke"/>`;
  }).join('');
}
const markById = (id) => MAP.items.find(m => m.id === id);

// point + heading at fraction t along a world-coord polyline
function along(pts, t) {
  const L = pathLenU(pts); let d = Math.max(0, Math.min(1, t)) * L;
  for (let i = 1; i < pts.length; i++) {
    const s = distU(pts[i - 1], pts[i]);
    if (d <= s || i === pts.length - 1) {
      const f = s ? Math.min(1, d / s) : 0, a = pts[i - 1], b = pts[i];
      return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], rot: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90, rest: pts.slice(i) };
    }
    d -= s;
  }
  return { p: pts[pts.length - 1], rot: 0, rest: [] };
}

/* ---------- drag to move the pickup pin ---------- */
function wireDrag() {
  let start = null;
  mapEl.addEventListener('pointerdown', (e) => {
    if (!['pickup', 'mapselect'].includes(S.screen)) return;
    cancelAnimationFrame(MAP.anim);
    start = { x: e.clientX, y: e.clientY, cam: { ...MAP.cam } };
    mapEl.setPointerCapture(e.pointerId); mapEl.classList.add('is-drag');
    $('.center-pin')?.classList.add('is-lift');
  });
  mapEl.addEventListener('pointermove', (e) => {
    if (!start) return;
    const k = kScale();
    MAP.cam = { ...start.cam, x: start.cam.x - (e.clientX - start.x) / k, y: start.cam.y - (e.clientY - start.y) / k };
    applyCam();
  });
  const end = () => {
    if (!start) return;
    start = null; mapEl.classList.remove('is-drag');
    $('.center-pin')?.classList.remove('is-lift');
    const pin = $('.center-pin');
    if (!pin) return;
    const r = pin.getBoundingClientRect(), m = mapEl.getBoundingClientRect();
    S.draft = reverseGeocode(unproject(r.left - m.left, r.top - m.top));
    S.farBanner = S.screen === 'pickup' && distM(S.draft.ll, GPS) > 450;
    render(false);
  };
  mapEl.addEventListener('pointerup', end);
  mapEl.addEventListener('pointercancel', end);
  mapEl.addEventListener('wheel', (e) => {
    if (!MAP_SCREENS.includes(S.screen) || !MAP.ready) return;
    e.preventDefault();
    MAP.cam.w = Math.max(10, Math.min(1400, MAP.cam.w * Math.exp(e.deltaY * 0.0015)));
    applyCam();
  }, { passive: false });
}

/* =====================================================================
   Pieces
   ===================================================================== */
const placeIcon = (p) => p.current ? 'locate' : p.saved ? (p.icon || 'pin') : p.airport ? 'plane' : 'pin';
const primary = (label, act, o = {}) => button(label, { block: true, act, ...o });
const exp = (c) => c.exp.replace('/', ' / ');
const payRow = () => { const c = CARDS[S.card]; return paymentRow({ brand: c.brand, last4: c.last, expiry: exp(c), attrs: { 'data-act': 'pay' } }); };
const whenLabel = () => S.when ? S.when.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + clock(S.when) : 'Now';
const legsFor = (a, b, ta, tb) => tripLegs([{ place: a.name, sub: a.addr, time: ta, kind: 'pickup' }, { place: b.name, sub: b.addr, time: tb, kind: 'dropoff' }]);
const pageTitle = (t, back) => `<div class="page-head">${back ? `<button type="button" class="rc-round-btn" data-act="${back}" aria-label="Back">${icon('arrowLeft', 24)}</button>` : ''}<h1 class="${back ? 'is-small' : ''}">${esc(t)}</h1></div>`;
const section = (t, link) => `<div class="sec"><h3>${esc(t)}</h3>${link || ''}</div>`;

function topbar(o = {}) {
  return `<div class="map-top">${mapTopBar({ value: S.dest?.name, icon: S.dest?.saved ? S.dest.icon : null,
    menuAttrs: { 'data-act': 'drawer' }, destAttrs: o.editable ? { 'data-act': 'editdest', role: 'button', tabindex: 0 } : null,
    closeAttrs: o.close ? { 'data-act': 'cleartrip' } : null })}</div>`;
}
const fabs = (back = 'back') => `${back ? mapFab({ icon: 'arrowLeft', cls: 'fab-l', attrs: { 'data-act': back } }) : ''}${mapFab({ icon: 'locate', cls: 'fab-r', attrs: { 'data-act': 'recenter' } })}`;
const sheet = (o) => bottomSheet({ ...o, cls: cx2('map-sheet', o.cls) });
const cx2 = (...a) => a.filter(Boolean).join(' ');
// the recorded referral art is a gift in a tinted circle; drawn flat in the system's colours
const giftArt = () => `<svg class="gift-art" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
  <circle cx="28" cy="28" r="28" class="g-bg"/><rect x="15" y="26" width="26" height="17" rx="2" class="g-box"/>
  <rect x="13" y="20" width="30" height="8" rx="2" class="g-lid"/><rect x="26" y="20" width="4" height="23" class="g-rib"/>
  <path d="M28 20c-3-6-10-7-10-3 0 3 5 3 10 3zM28 20c3-6 10-7 10-3 0 3-5 3-10 3z" class="g-bow"/></svg>`;
const spinner = (lg) => `<span class="spinner${lg ? ' lg' : ''}" role="progressbar" aria-label="Loading"></span>`;

/* =====================================================================
   Screens
   ===================================================================== */
function home() {
  if (S.loadingHome) return `<div class="page"><div class="page-scroll"><div class="greet">Hello,</div>${skeleton([28, 110, 110, 110])}</div></div>`;
  return `<div class="page">
    <div class="page-scroll">
      <div class="greet">Hello, ${esc(RIDER.first)}</div>
      ${searchBar({ when: whenLabel(), attrs: { 'data-act': 'search' }, whenAttrs: { 'data-act': 'schedule' } })}
      <div class="chips">${['home', 'storage', 'work'].map(k => placeChip(SAVED[k].name, { icon: SAVED[k].icon, attrs: { 'data-saved': k } })).join('')}</div>
      <div class="places">${RECENTS.slice(0, 2).map((p, i) => placeRow({ icon: 'history', title: p.name, sub: p.addr, attrs: { 'data-recent': i } })).join('')}</div>
      ${section('Your discounts', button('View all', { variant: 'text', attrs: { 'data-tab': 'discounts' } }))}
      ${discountRow('40% off rides', { attrs: { 'data-act': 'discount' } })}
      <div class="gap"></div>${promoBanner({ attrs: { 'data-act': 'refer' } })}
      ${section('Other ways to revel')}
      <div class="ways">
        ${wayCard({ title: 'Schedule and sit back', body: 'Reserve a ride up to a week in advance', attrs: { 'data-act': 'schedule' }, art: calArt() })}
        ${wayCard({ title: 'Enjoy stress-free airport rides', body: 'Upfront prices to JFK, LGA and EWR', attrs: { 'data-act': 'airport' } })}
      </div>
    </div>${tabBar(S.tab)}</div>`;
}
const calArt = () => `<span class="cal-art"><small>${new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</small>${new Date().getDate()}</span>`;

function discounts() {
  const rows = [['40% off rides', 'Up to $40 off each ride · Expires Oct 31'], ...S.codes.map(c => [c.title, c.sub])];
  return `<div class="page">${pageTitle('Discounts')}<div class="page-scroll">
    ${rows.length ? `<div class="stack">${rows.map(([t, s]) => `${discountRow(t, { attrs: { 'data-act': 'discount' } })}<p class="note">${esc(s)}</p>`).join('')}</div>` : '<p class="muted">No discounts yet.</p>'}
    ${section('Redeem promo code')}
    <label class="field"><span>Promo code</span><input id="promo" placeholder="Enter code" autocomplete="off"></label>
    ${primary('Redeem', 'redeem')}
    ${section('Refer a friend')}
    ${promoBanner({ title: 'Get $20 & give your friends $$ too', action: 'Refer a friend', attrs: { 'data-act': 'refer' } })}
  </div>${tabBar(S.tab)}</div>`;
}

function trips() {
  const past = S.trips.map((t, i) => receiptCard({ kind: 'Revel EV ride', summary: `${t.q.tripMin} min ${t.q.miles} mi`,
    date: t.at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + clock(t.at),
    price: t.q.price + t.tip, map: miniMap(t.q.pts), attrs: { 'data-receipt': i } })).join('') || `<div class="empty">${icon('receipt', 30)}No past trips yet.</div>`;
  const up = S.upcoming.map((u, i) => `<div class="upcoming">${placeRow({ icon: 'trips', title: u.dest.name,
      sub: `${u.when.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · pickup ${clock(u.when)} · from ${u.pickup.name}`, attrs: { 'aria-disabled': 'true' } })}
      ${button('Cancel', { variant: 'text', attrs: { 'data-cancelup': i } })}</div>`).join('')
    || `<div class="empty">${icon('trips', 30)}No upcoming rides.${button('Schedule a ride', { variant: 'text', act: 'schedule' })}</div>`;
  return `<div class="page">${pageTitle('Trips')}<div class="page-scroll">
    <div class="chips">${['Past', 'Upcoming'].map((l, i) => `<button type="button" class="rc-chip${S.tripSeg === i ? ' is-on' : ''}" data-seg="${i}">${l}${i && S.upcoming.length ? ` · ${S.upcoming.length}` : ''}</button>`).join('')}</div>
    <div class="stack">${S.tripSeg ? up : past}</div></div>${tabBar(S.tab)}</div>`;
}
// receipt tile: the real route on the flat receipt map, in the ReceiptCard's colours
function miniMap(pts, h) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const W = 364, H = h || 150, aspect = W / H;
  let w = Math.max((Math.max(...xs) - Math.min(...xs)) * 1.5, 14), hh = Math.max((Math.max(...ys) - Math.min(...ys)) * 1.5, 14 / aspect);
  if (w / hh < aspect) w = hh * aspect; else hh = w / aspect;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, r = w * 0.024;
  const a = pts[0], b = pts[pts.length - 1];
  return `<svg class="rc-rmap"${h ? ` style="height:${h}px"` : ''} viewBox="${cx - w / 2} ${cy - hh / 2} ${w} ${hh}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    ${MAP.miniURL ? `<image href="${MAP.miniURL}" x="0" y="0" width="${WW}" height="${WH}" preserveAspectRatio="none"/>` : `<rect class="rc-rmap-land" x="0" y="0" width="${WW}" height="${WH}"/>`}
    <polyline class="rc-rmap-trip" points="${pts.map(p => p.join(',')).join(' ')}" vector-effect="non-scaling-stroke"/>
    <circle class="rc-rmap-start" cx="${a[0]}" cy="${a[1]}" r="${r}" vector-effect="non-scaling-stroke"/>
    <circle class="rc-rmap-end" cx="${b[0]}" cy="${b[1]}" r="${r * 1.1}" vector-effect="non-scaling-stroke"/></svg>`;
}
function receipt() {
  const t = S.trips[S.receipt], q = t.q, end = new Date(t.at.getTime() + q.tripMin * 60e3), c = CARDS[0];
  const row = (k, v, cls = '') => `<div class="kv ${cls}"><span>${k}</span><span>${v}</span></div>`;
  return `<div class="page">${pageTitle('Receipt', 'closereceipt')}
    <div class="page-scroll"><div class="rc-receipt is-static">${miniMap(q.pts, 190)}</div>
      <h2 class="t-sheet-title" style="margin:20px 0 2px">Revel EV ride</h2>
      <p class="muted" style="margin:0 0 16px">${t.at.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · with ${esc(t.driver.name)} · ${esc(t.driver.plate)}</p>
      ${legsFor(t.from, t.to, clock(t.at), clock(end))}
      ${section('Fare')}
      ${row(`Trip fare · ${q.tripMin} min, ${q.miles} mi`, usd(q.fare))}${q.airport ? row('Airport access fee', usd(q.airport)) : ''}${q.cbd ? row('Congestion surcharge', usd(q.cbd)) : ''}
      ${row('Booking fee', usd(q.booking))}${q.discount ? row(`${tag(18)}40% off rides`, '−' + usd(q.discount)) : ''}${row('Tip', usd(t.tip))}
      ${row('Total', usd(q.price + t.tip), 'total')}
      <div class="kv"><span class="with-card"><span class="rc-cardmark">${c.brand}</span>Charged to ···· ${c.last}</span></div>
      <div class="places" style="margin-top:8px">${placeRow({ icon: 'help', title: 'Get help with this ride', attrs: { 'data-toast': 'Support will text you shortly' } })}
        ${placeRow({ icon: 'receipt', title: 'Email me this receipt', attrs: { 'data-toast': 'Receipt emailed to you' } })}</div>
    </div></div>`;
}

function account() {
  const rows = [['card', 'Payment', `···· ${CARDS[S.card].last} default`, { 'data-act': 'pay' }], ['home', 'Saved places', 'Home, Work, Storage Unit', { 'data-toast': 'Editing saved places isn’t in this prototype' }],
    ['history', 'Receipts', `${S.trips.length} rides`, { 'data-tab': 'trips' }], ['gift', 'Refer a friend, get $20', null, { 'data-act': 'refer' }], ['promo', 'Redeem promo code', null, { 'data-tab': 'discounts' }],
    ['help', 'Help', null, { 'data-toast': 'Support will text you shortly' }], ['settings', 'Settings', null, { 'data-toast': 'Settings aren’t in this prototype' }]];
  return `<div class="page">${pageTitle('Account')}<div class="page-scroll">
    <div class="me"><span class="rc-addphoto">Add<br>Photo<i aria-hidden="true">${icon('plus', 12)}</i></span><div><b>${esc(RIDER.name)}</b><span class="muted">${esc(RIDER.phone)}</span></div></div>
    <div class="menu">${rows.map(([ic, l, sub, attrs]) => `<button type="button" class="menu-row"${Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')}>${icon(ic, 22)}<span>${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${icon('chevronRight', 18)}</button>`).join('')}
      <button type="button" class="menu-row" data-act="driverapp">${icon('arrow', 22)}<span>Apply to be a revel driver</span>${icon('chevronRight', 18)}</button></div>
    <p class="faint" style="font-size:12px;margin-top:20px">Version 4.18.0 (prototype)</p>
  </div>${tabBar(S.tab)}</div>`;
}

/* ---------- search ---------- */
function search() {
  const val = (key) => S.field === key ? S.q : (key === 'pickup' ? (S.pickup ? (S.pickup.current ? 'Current location' : S.pickup.name) : '') : key === 'stop' ? (S.stop?.name || '') : (S.dest?.name || ''));
  const fields = [{ key: 'pickup', placeholder: 'Pickup location', kind: 'from' }, ...(S.showStop ? [{ key: 'stop', placeholder: 'Add a stop', kind: 'stop' }] : []),
    { key: 'dest', placeholder: 'Destination', kind: 'to' }].map(f => ({ ...f, value: val(f.key), active: S.field === f.key }));
  return `<div class="page">
    <div class="page-head"><button type="button" class="rc-round-btn" data-act="closesearch" aria-label="Back">${icon('arrowLeft', 24)}</button></div>
    <div class="search-top">${routeFields(fields, { addAttrs: { 'data-act': 'addstop', disabled: !!(S.showStop || S.editing) } })}
      <div class="chips">${['home', 'work', 'storage'].map(k => placeChip(SAVED[k].name, { icon: SAVED[k].icon, attrs: { 'data-saved': k } })).join('')}</div></div>
    <div class="search-list" id="slist">${searchList()}</div>
    <button type="button" class="search-foot" data-act="mapselect">${icon('pin', 22, { cls: 'is-brand' })}Select location on map</button>
  </div>`;
}
function searchList() {
  const q = S.q.trim().toLowerCase();
  let list;
  if (!q) {
    list = [...(S.field === 'pickup' ? [currentLocation()] : []), SAVED.home, ...RECENTS.map(p => ({ ...p, recent: true }))];
  } else {
    const all = [...Object.values(SAVED), ...LANDMARKS];
    list = all.filter(p => (p.name + ' ' + p.addr + ' ' + (p.airport || '') + ' ' + (p.fuzzy || '')).toLowerCase().includes(q));
    list.sort((a, b) => (b.airport ? 0 : 1) - (a.airport ? 0 : 1) || (a.fuzzy ? -1 : 0));
    if (/^\d+\s+\S/.test(q)) {
      const name = S.q.trim().replace(/\b\w/g, c => c.toUpperCase()).replace(/\bSt$/, 'Street').replace(/\bAve$/, 'Avenue');
      list = [...TOWNS.slice(0, 4).map(([town, ll], i) => P(name, town, add(ll, [0.004 * i, 0.003 * i]))), ...list];
    }
  }
  S.results = list;
  if (!list.length) return `<div class="empty">${icon('info', 30)}<b>We can't find that address</b>Please check the address you entered and try again.</div>`;
  return list.map((p, i) => placeRow({ icon: p.recent ? 'history' : placeIcon(p), title: p.current ? 'Current location' : p.name,
    sub: p.current ? null : p.addr, attrs: { 'data-result': i } })).join('');
}

/* ---------- airline picker (the recorded "Select drop-off" step) ---------- */
function airline() {
  const A = AIRPORTS[S.airportCode];
  const list = S.moreAirlines ? [...A.airlines, ...A.more].sort((a, b) => a[0].localeCompare(b[0])) : A.airlines;
  return `<div class="page"><div class="page-head"><button type="button" class="rc-round-btn" data-act="closeairline" aria-label="Back">${icon('arrowLeft', 24)}</button>
      <h1 class="is-small">Select drop-off</h1>${button('Skip', { variant: 'text', act: 'skipairline', cls: 'skip' })}</div>
    <div class="page-scroll"><h3 class="list-title">Popular airlines of ${S.airportCode}</h3><div class="places">
      ${list.map(([n, t]) => placeRow({ icon: 'plane', brand: true, title: n, sub: A.fmt(t), attrs: { 'data-airline': `${n}|${t}` } })).join('')}
      ${S.moreAirlines ? '' : placeRow({ icon: 'menu', brand: true, title: 'See all airlines', attrs: { 'data-act': 'moreairlines' } })}</div></div></div>`;
}

/* ---------- map screens ---------- */
function options() {
  const q = S.quote, sched = S.when;
  const vehicle = vehicleOption(S.quoteReady
    ? { selected: true, eta: sched ? 'Pickup ' + clock(sched) : 'Get there by ' + clock(inMin(q.eta + q.tripMin)), price: q.price, was: q.discount ? q.full : null,
        note: S.expanded ? 'All-electric, up to 4 riders · 40% off applied' : null, attrs: { 'data-toast': 'Revel EV is the only ride type in New York' } }
    : { loading: true, price: 0 });
  return `${topbar({ close: true, editable: true })}${fabs()}
    ${sheet({ hint: sched ? `Scheduled for ${whenLabel()}` : 'Swipe up to see more options', bandAttrs: { 'data-act': 'swipe' },
      body: vehicle + payRow(), action: primary(sched ? 'Schedule ride' : 'Continue', 'continue', { disabled: !S.quoteReady }) })}`;
}
function pickupScreen() {
  const mapsel = S.screen === 'mapselect', edit = S.editing === 'pickup';
  const title = mapsel ? (S.field === 'pickup' ? 'Set pickup location' : 'Set drop-off location') : 'Confirm your pickup location';
  const label = mapsel ? (S.field === 'pickup' ? 'Confirm pickup' : 'Confirm drop-off') : edit ? 'Confirm pickup' : S.when ? 'Schedule ride' : 'Request ride';
  const field = `<div class="rc-search pick-field"${mapsel ? '' : ' data-act="pickupsearch" role="button" tabindex="0"'}>${icon('search', 22, { cls: 'is-brand' })}<span>${esc(S.draft?.name || '')}</span></div>`;
  return `${S.farBanner ? `<div class="farbanner">${icon('info', 20)}<span>This pickup location is very far from you.</span><button type="button" class="rc-round-btn" data-act="closefar" aria-label="Dismiss">${icon('close', 18)}</button></div>` : ''}
    <div class="center-pin" id="cpin">${mapsel ? '' : mapPill('Confirm your pickup location')}<u></u><i></i><b></b></div>
    ${fabs(mapsel ? 'closemapsel' : edit ? 'canceledit' : 'backtooptions')}
    ${sheet({ title, body: field, action: primary(label, mapsel ? 'confirmmapsel' : 'request', { disabled: !S.draft }), attrs: { id: 'psheet' } })}`;
}
function reprice() {
  const q = S.newQuote;
  return `${fabs('backtopickup')}${sheet({ title: 'Confirm new price',
    body: `<p class="reprice"><b>${usd(q.price)}</b> (New ETA: ${clock(inMin(q.eta + q.tripMin))})</p><p class="muted c">Your price has been updated to reflect your new pickup location.</p>`,
    action: primary('Request ride', 'acceptprice') })}`;
}
function confirming() {
  const q = S.quote;
  return `${topbar()}${sheet({ title: `Confirming your ride... ${spinner()}`, subtitle: 'Finding drivers nearby',
    body: `<div class="pad-top">${legsFor(S.pickup, S.dest, 'Pickup ' + clock(inMin(q.eta)), 'Drop-off ' + clock(inMin(q.eta + q.tripMin)))}</div>` })}`;
}
function matching() {
  return `${topbar()}${fabs(null)}${sheet({ title: 'See driver details in 1 min', subtitle: "Hang tight, we'll update you soon",
    body: `<div class="progress"><i id="prog" style="width:${S.progress * 100}%"></i></div>
      ${wayCard({ title: 'Upcoming travel plans?', body: 'Schedule a ride up to a week in advance', attrs: { 'data-act': 'schedule' } })}` })}`;
}
function driverBlock(o) {
  const d = S.driver;
  return driverCard({ eta: o.title, meet: o.meet, plate: d.plate, model: d.model, driver: d.name, callAttrs: { 'data-act': 'call' }, textAttrs: { 'data-act': 'text' } });
}
function enroute() {
  const arrived = S.screen === 'arrived';
  const title = arrived ? 'Your driver is here' : `Pickup in <span data-live="eta">${S.eta}</span> min`;
  const extra = S.expanded ? `<div class="pad-top">${tripLegs([{ place: S.dest.name, sub: S.dest.addr, kind: 'dropoff', time: `Drop-off <span data-live="drop">${clock(inMin(S.eta + S.quote.tripMin))}</span>` }])}</div>
      <div class="pad-top">${button('Edit Ride', { variant: 'soft', icon: 'edit', block: true, act: 'editride' })}</div>
      <div class="divider"></div>
      <div class="refer-mini"><div><b>Refer a friend</b><span>Get $20 & give your friends $$ too.</span></div>${giftArt()}</div>
      ${button('Refer a friend', { variant: 'soft', icon: 'gift', block: true, act: 'refer' })}
      <div class="divider"></div>
      <div class="kv"><b>Payment</b><span class="with-card"><span class="rc-cardmark">${CARDS[S.card].brand}</span>···· ${CARDS[S.card].last}</span></div>
      <div class="kv"><span class="muted">Revel EV${S.quote.discount ? ' · 40% off rides' : ''}</span><b>${usd(S.quote.price)}</b></div>` : '';
  return `${topbar()}${fabs(null)}
    ${sheet({ bandAttrs: { 'data-act': 'expand' }, cls: S.expanded ? 'is-tall' : '',
      body: driverBlock({ title, meet: `Meet ${S.driver.name} at ${S.pickup.name}` }) +
        `<button type="button" class="chev-toggle${S.expanded ? ' is-up' : ''}" data-act="expand" aria-label="${S.expanded ? 'Less' : 'More'}">${icon('chevronDown', 22)}</button>${extra}` })}`;
}
function ontrip() {
  return `${topbar()}${fabs(null)}${sheet({ body: driverBlock({ title: `Arriving at <span data-live="arrive">${clock(inMin(S.eta))}</span>`, meet: `Heading to ${S.dest.name}` }) +
    `<div class="pad-top">${button('Edit drop-off', { variant: 'soft', icon: 'edit', block: true, act: 'editdest' })}</div>` })}`;
}
function complete() {
  const q = S.quote, tips = [0, 2, 5, 10];
  return `<div class="page"><div class="page-scroll">
    <div class="center-state"><small>YOU'VE ARRIVED</small><b>${esc(S.dest.name)}</b>${car(200)}</div>
    <div class="kv"><span>Revel EV · ${q.tripMin} min, ${q.miles} mi</span><b>${usd(q.price)}</b></div>
    <div class="kv"><span class="muted">Charged to ···· ${CARDS[S.card].last}</span>${q.discount ? `<span class="with-card">${tag(18)}Saved ${usd(q.discount)}</span>` : ''}</div>
    <h3 class="c" style="margin:28px 0 4px">How was your ride with ${esc(S.driver.name)}?</h3>
    <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${S.rating >= n ? 'is-on' : ''}" data-star="${n}" aria-label="${n} stars">${icon('star', 36, { filled: S.rating >= n })}</button>`).join('')}</div>
    ${section('Add a tip', `<span class="muted">100% goes to ${esc(S.driver.name)}</span>`)}
    <div class="chips tips">${tips.map(t => `<button type="button" class="rc-chip${S.tip === t ? ' is-on' : ''}" data-tip="${t}">${t ? '$' + t : 'No tip'}</button>`).join('')}</div>
    <div class="pad-top">${primary('Done', 'done')}</div></div></div>`;
}
function cancelreq() {
  return `${topbar()}${sheet({ body: `<div class="center-state"><small>CANCELLATION REQUESTED</small><b>We're working on it...</b>${spinner(true)}</div>` })}`;
}

/* ---------- overlays ---------- */
const scrim = () => '<div class="scrim" data-act="closeoverlay"></div>';
const over = (o) => `${scrim()}<div class="over-sheet">${bottomSheet(o)}</div>`;
function overlay() {
  switch (S.overlay) {
    case 'drawer': return `${scrim()}<div class="drawer-wrap">${menuDrawer({ name: RIDER.name, profileAttrs: { 'data-tab': 'account' }, footAttrs: { 'data-act': 'driverapp' },
      items: [['Refer a friend, get $20', 'gift', { 'data-act': 'refer' }], ['Redeem promo code', 'promo', { 'data-tab': 'discounts' }], ['Your discounts', 'tag', { 'data-tab': 'discounts' }],
        ['Payment', 'card', { 'data-act': 'pay' }], ['Receipts', 'history', { 'data-tab': 'trips' }], ['Help', 'help', { 'data-toast': 'Support will text you shortly' }], ['Settings', 'settings', { 'data-tab': 'account' }]]
        .map(([label, ic, attrs]) => ({ label, icon: ic, attrs })) })}</div>`;
    case 'edit': return `${scrim()}<div class="over-sheet">${actionSheet([{ label: 'Edit pickup', act: 'editpickup' }, { label: 'Add or edit drop-off', act: 'editdest' },
      { label: 'Cancel ride', act: 'cancelride' }, { label: 'Close', act: 'closeoverlay' }])}</div>`;
    case 'pay': return over({ title: 'Payment', body: `<div class="places">${CARDS.map((c, i) => `<button type="button" class="menu-row" data-card="${i}"><span class="rc-cardmark">${c.brand}</span>
        <span>···· ${c.last}<small>Expires ${exp(c)}</small></span>${S.card === i ? icon('check', 22, { cls: 'is-brand' }) : ''}</button>`).join('')}
        <button type="button" class="menu-row" data-toast="Adding a card isn’t in this prototype">${icon('plus', 22)}<span>Add payment method</span></button></div>` });
    case 'refer': return over({ body: `${promoBanner({ attrs: { 'data-act': 'share' }, action: 'Share invite link' })}
        <p class="muted" style="margin:16px 0">Give friends $20 off their first ride. You get $20 in ride credit when they take it.</p>
        <div class="rc-search code"><b>ALEX20</b>${button('Copy', { variant: 'text', act: 'copycode' })}</div>`, action: primary('Share invite link', 'share') });
    case 'discount': return over({ body: `${discountRow('40% off rides')}
        <p style="margin:16px 0 8px">40% off the fare on every ride, up to $40 per ride. Booking fee, tolls and airport fees aren't discounted.</p>
        <p class="muted" style="margin:0">Applied automatically at checkout · Expires Oct 31</p>`, action: primary('OK', 'closeoverlay') });
    case 'text': return over({ title: `Text ${S.driver.name}`, subtitle: 'Your number stays private. Texts go through Revel.',
      body: `<div class="places">${["I'm outside", 'On my way down', 'I have luggage', 'Please call me'].map(m => placeRow({ icon: 'message', title: m, attrs: { 'data-sendtext': m } })).join('')}</div>` });
    case 'schedule': return scheduleSheet();
  }
  return '';
}
function scheduleSheet() {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d; });
  const sel = S.schedDay ?? 0, slots = [];
  const start = new Date(days[sel]); start.setHours(5, 0);
  const min = new Date(Date.now() + 45 * 60e3);
  for (let t = new Date(start); t.getDate() === days[sel].getDate(); t = new Date(t.getTime() + 15 * 60e3)) if (t > min) slots.push(new Date(t));
  return over({ title: 'Schedule a ride', subtitle: 'Reserve a ride up to a week in advance',
    body: `<div class="daychips">${days.map((d, i) => `<button type="button" class="${i === sel ? 'is-on' : ''}" data-day="${i}">${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b></button>`).join('')}</div>
      <label class="field"><span>Pickup time</span><select id="schedtime">${slots.map((t, i) => `<option value="${t.getTime()}"${i === 4 ? ' selected' : ''}>${clock(t)}</option>`).join('')}</select></label>
      ${S.when ? button('Pick up now instead', { variant: 'text', act: 'clearschedule' }) : ''}`,
    action: primary('Set pickup time', 'setschedule') });
}
function dialogEl() {
  const d = S.dialog;
  return `<div class="dialog-wrap">${dialog({ title: d.title, body: d.body,
    actions: d.buttons.map(([label, act, outline]) => button(label, { variant: outline ? 'outline' : 'primary', block: true, act })).join('') })}</div>`;
}
const DIALOGS = {
  cancel: { title: 'Cancel this ride?', body: 'Your driver is on the way. Are you sure you want to cancel your ride?', buttons: [['Call driver', 'call'], ['Edit pickup', 'editpickup'], ['Yes, cancel', 'yescancel'], ['No, go back', 'closedialog', true]] }
};

/* =====================================================================
   Render
   ===================================================================== */
const ACTIVE = ['confirming', 'matching', 'enroute', 'arrived', 'ontrip', 'cancelreq'];
const MAP_SCREENS = ['options', 'pickup', 'mapselect', 'reprice', 'confirming', 'matching', 'enroute', 'arrived', 'ontrip', 'cancelreq'];
let lastScene = '';
function render(refit = true) {
  const scr = {
    splash: () => `<div class="splash">${wordmark({ onBrand: true, size: 48 })}</div>`,
    home: () => ({ home, discounts, trips, account }[S.tab])(), search, airline, options, pickup: pickupScreen, mapselect: pickupScreen, reprice,
    confirming, matching, enroute, arrived: enroute, ontrip, complete, cancelreq, receipt
  }[S.screen] || home;
  ui.innerHTML = scr() + (S.overlay ? overlay() : '') + (S.dialog ? dialogEl() : '') +
    (S.notif ? `<div class="notif" data-act="closenotif"><span class="notif-app">r</span><div><b>Revel · now</b><strong>${esc(S.notif.title)}</strong><span>${esc(S.notif.body)}</span></div></div>` : '') +
    (S.toast ? `<div class="toast" role="status">${icon('check', 20)}<div><b>${esc(S.toast.title)}</b>${S.toast.msg ? `<span>${esc(S.toast.msg)}</span>` : ''}</div></div>` : '');
  mapEl.style.visibility = MAP_SCREENS.includes(S.screen) ? '' : 'hidden';
  const key = S.screen + '|' + (S.quoteReady ? 1 : 0) + '|' + (S.dest?.name || '') + '|' + (S.pickup?.name || '') + '|' + S.expanded;
  const sheetEl = $('#ui .map-sheet');
  if (sheetEl) document.querySelectorAll('#ui .fab-l, #ui .fab-r').forEach(f => { f.style.bottom = Math.min(sheetEl.offsetHeight + 16, pxH() - 130) + 'px'; });
  placeCenterPin();
  if (MAP.ready && refit && key !== lastScene) { lastScene = key; scene(); }
  if (S.screen === 'search') focusField();
  syncHash(); renderDemo();
}

// map contents + camera for each map screen
function scene() {
  const sheetH = $('#ui .map-sheet')?.offsetHeight || 260;
  const top = 84, bottom = sheetH;
  const pickRing = (label) => ({ t: 'ring', ll: S.pickup.ll, label });
  const dropRing = (label) => ({ t: 'ring', ll: S.dest.ll, drop: true, label, tone: 'brand' });
  const trip = () => ({ kind: 'trip', pts: routeW(S.pickup.ll, S.dest.ll, S.stop?.ll) });
  switch (S.screen) {
    case 'options': case 'reprice': {
      const q = S.screen === 'reprice' ? S.newQuote : S.quote;
      setRoutes([trip()]);
      setMarks([{ t: 'user', ll: GPS }, pickRing(S.quoteReady || S.screen === 'reprice' ? (S.when ? 'Pickup ' + clock(S.when) : `Pickup in ${q.eta} min`) : null),
        ...(S.stop ? [{ t: 'ring', ll: S.stop.ll }] : []), dropRing(S.quoteReady || S.screen === 'reprice' ? `${clock(S.when ? new Date(S.when.getTime() + q.tripMin * 60e3) : inMin(q.eta + q.tripMin))} drop-off` : null)]);
      return flyTo(camFit([S.pickup.ll, S.dest.ll, ...(S.stop ? [S.stop.ll] : [])], top, bottom));
    }
    case 'pickup': case 'mapselect':
      setRoutes([]); setMarks([{ t: 'user', ll: GPS }]);
      placeCenterPin();
      return flyTo(camAt(S.draft.ll, 24, pinY()), 800);
    case 'confirming':
      setRoutes([trip()]); setMarks([pickRing(), dropRing()]);
      return flyTo(camFit([S.pickup.ll, S.dest.ll], top, bottom));
    case 'matching':
      setRoutes([]); setMarks([{ t: 'halo', ll: S.pickup.ll }, pickRing()]);
      return flyTo(camAt(S.pickup.ll, 20, (70 + pxH() - bottom) / 2 + 10));
    case 'enroute': case 'arrived': {
      const car = carNow();
      setRoutes(S.screen === 'enroute' ? [{ kind: 'approach', pts: car.rest.length ? [car.p, ...car.rest] : [] }] : []);
      setMarks([{ t: 'ring', ll: S.pickup.ll, id: 'pk', label: S.screen === 'arrived' ? 'Here' : `Pickup in ${S.eta} min` },
        { t: 'car', id: 'car', ll: toLL(car.p), rot: car.rot, label: S.drive?.waiting ? 'Closest driver is finishing a ride' : null, tone: 'soft' }]);
      return flyTo(S.screen === 'arrived' ? camAt(S.pickup.ll, 26, (70 + pxH() - bottom) / 2 + 30) : camFit([S.pickup.ll, toLL(car.p), ...(S.drive?.pts || []).map(toLL)], top, bottom, 30));
    }
    case 'ontrip': {
      const car = carNow();
      setRoutes([{ kind: 'trip', pts: [car.p, ...car.rest] }]);
      setMarks([dropRing(`${clock(inMin(S.eta))} drop-off`), { t: 'car', id: 'car', ll: toLL(car.p), rot: car.rot }]);
      return flyTo(camFit([S.pickup.ll, S.dest.ll], top, bottom));
    }
    case 'cancelreq':
      setRoutes([]); setMarks([{ t: 'user', ll: GPS }, pickRing()]);
      return flyTo(camAt(S.pickup.ll, 40, (70 + pxH() - bottom) / 2));
  }
}
const pinY = () => { const sh = $('#psheet')?.offsetHeight || 190; return Math.round((pxH() - sh) / 2 + 22); };
function placeCenterPin() { const p = $('#cpin'); if (p) p.style.top = pinY() + 'px'; }

// the car: waits ("finishing a ride"), then drives the approach polyline
function carNow() {
  const d = S.drive;
  if (!d) return { p: toW(S.pickup.ll), rot: 0, rest: [] };
  const t = Math.max(0, Math.min(1, (performance.now() - d.t0) / d.dur));
  return along(d.pts, d.wait ? Math.max(0, (t - d.wait) / (1 - d.wait)) : t);
}
let carRAF = 0;
function animateCar() {
  cancelAnimationFrame(carRAF);
  const tick = () => {
    const m = markById('car');
    if (m && S.drive && ['enroute', 'ontrip'].includes(S.screen)) {
      const c = carNow(), t = (performance.now() - S.drive.t0) / S.drive.dur;
      m.ll = toLL(c.p); m.rot = c.rot; placeMark(m);
      const waiting = S.drive.wait && t < S.drive.wait;
      if (waiting !== S.drive.waiting) { S.drive.waiting = waiting; const pill = m.el.querySelector('.rc-pill'); if (pill && !waiting) pill.remove(); }
      const line = MAP.routes.querySelector('polyline');
      if (line && c.rest.length) line.setAttribute('points', [c.p, ...c.rest].map(p => p.map(n => n.toFixed(2)).join(',')).join(' '));
    }
    carRAF = requestAnimationFrame(tick);
  };
  carRAF = requestAnimationFrame(tick);
}

function focusField() {
  const inp = $(`input[data-field="${S.field}"]`);
  if (inp && document.activeElement !== inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

/* =====================================================================
   Flow
   ===================================================================== */
function go(screen, o = {}) { S.screen = screen; S.expanded = false; Object.assign(S, o); render(); }
function goHome(toastMsg) {
  clearTimers(); cancelAnimationFrame(carRAF);
  Object.assign(S, { screen: 'home', tab: 'home', dest: null, stop: null, showStop: false, quote: null, quoteReady: false, draft: null, driver: null,
    drive: null, overlay: null, dialog: null, editing: null, farBanner: false, expanded: false, rating: 0, tip: 0, when: null, receipt: null });
  if (toastMsg) return flash(toastMsg);
  render();
}
function openSearch(field = 'dest', q = '') {
  S.field = field; S.q = q;
  if (!S.pickup) S.pickup = currentLocation();
  go('search');
}
function choose(p) {
  if (p.airport && S.field !== 'pickup') { S.airportCode = p.airport; S.moreAirlines = false; return go('airline'); }
  if (S.field === 'pickup' && S.pickupFromConfirm) {
    S.pickupFromConfirm = false; S.q = '';
    S.draft = p.current ? currentLocation() : p; S.farBanner = distM(S.draft.ll, GPS) > 450;
    return go('pickup');
  }
  if (S.field === 'pickup') S.pickup = p.current ? currentLocation() : p;
  else if (S.field === 'stop') S.stop = p;
  else S.dest = p;
  S.q = '';
  if (S.editing === 'dest' && S.field === 'dest') return finishEditDest();
  if (!S.dest) { S.field = 'dest'; return render(); }
  toOptions();
}
function toOptions() {
  clearTimers();
  S.quoteReady = false; S.quote = quote(S.pickup, S.dest, S.stop); S.expanded = false;
  go('options');
  later(1100, () => { S.quoteReady = true; if (S.screen === 'options') render(); });
}
function toPickup() {
  S.draft = { ...S.pickup }; S.quotedLL = S.pickup.ll; S.farBanner = distM(S.draft.ll, GPS) > 450;
  go('pickup');
}
function request() {
  if (S.editing === 'pickup') return finishEditPickup();
  const moved = distM(S.draft.ll, S.quotedLL) > 160;
  S.pickup = S.draft;
  if (moved) { S.newQuote = quote(S.pickup, S.dest, S.stop, 3); return go('reprice'); }
  confirmRide();
}
function confirmRide() {
  clearTimers();
  if (S.when) {
    S.upcoming.push({ pickup: S.pickup, dest: S.dest, when: S.when, q: S.quote });
    const when = S.when;
    goHome();
    S.tab = 'trips'; S.tripSeg = 1;
    S.dialog = { title: 'Ride scheduled', body: `We'll find you a driver before ${when.toLocaleDateString('en-US', { weekday: 'long' })} at ${clock(when)}. You can cancel from Trips at no charge up to an hour before.`, buttons: [['OK', 'closedialog']] };
    return render();
  }
  go('confirming');
  later(2400, startMatching);
}
function startMatching() {
  clearTimers();
  go('matching', { progress: 0 });
  every(300, () => {
    S.progress = Math.min(1, S.progress + 0.04);
    const bar = $('#prog'); if (bar) bar.style.width = S.progress * 100 + '%';
    if (S.progress >= 1) { clearTimers(); matched(); }
  });
}

function matched() {
  S.driver = DRIVERS[(Math.round(S.pickup.ll[1] * 1e4)) % DRIVERS.length];
  S.eta = S.quote.eta;
  const P0 = toW(S.pickup.ll), start = add(add(P0, GU, 26), GV, 30);
  S.drive = { pts: gridPath(start, P0), t0: performance.now(), dur: S.eta * MINUTE(), wait: 0.18, waiting: true };
  go('enroute');
  notify('Your car is on the way!', `${S.driver.name} will pick you up in ${S.eta} minutes.`);
  animateCar();
  every(MINUTE() / speed(), tickEta);
}
function tickEta() {
  if (S.screen === 'enroute') {
    S.eta = Math.max(0, S.eta - 1);
    const pill = markById('pk')?.el.querySelector('.rc-pill');
    if (pill) pill.textContent = `Pickup in ${Math.max(1, S.eta)} min`;
    document.querySelectorAll('[data-live="eta"]').forEach(n => n.textContent = Math.max(1, S.eta));
    document.querySelectorAll('[data-live="drop"]').forEach(n => n.textContent = clock(inMin(S.eta + S.quote.tripMin)));
    if (S.eta <= 0) arrive();
  } else if (S.screen === 'ontrip') {
    S.eta = Math.max(1, S.eta - 1);
    document.querySelectorAll('[data-live="arrive"]').forEach(n => n.textContent = clock(inMin(S.eta)));
  }
}
function arrive() {
  S.drive = null; go('arrived');
  notify('Your driver has arrived', `Look for ${S.driver.name} in the ${S.driver.model} · ${S.driver.plate}`);
  later(6500, startTrip);
}
function startTrip() {
  clearTimers();
  const pts = routeW(S.pickup.ll, S.dest.ll, S.stop?.ll);
  S.eta = S.quote.tripMin;
  S.drive = { pts, t0: performance.now(), dur: Math.min(22000, 9000 + S.quote.tripMin * 250) * speed() };
  go('ontrip'); animateCar();
  every(S.drive.dur / S.quote.tripMin / speed(), tickEta);
  later(S.drive.dur / speed(), () => { clearTimers(); cancelAnimationFrame(carRAF); go('complete'); });
}
function finishRide() {
  const at = new Date(Date.now() - S.quote.tripMin * 60e3);
  S.trips.unshift({ from: S.pickup, to: S.dest, at, q: S.quote, driver: S.driver, tip: S.tip });
  goHome('Thanks for riding with Revel');
}
function finishEditPickup() {
  S.pickup = S.draft; S.editing = null;
  if (S.drive) { const car = carNow(); S.drive = { pts: gridPath(car.p, toW(S.pickup.ll)), t0: performance.now(), dur: Math.max(2, S.eta) * MINUTE() }; }
  go(S.prevScreen || 'enroute'); animateCar();
  flash('Pickup updated', 'Your driver has been notified');
}
function finishEditDest() {
  S.editing = null; S.quote = quote(S.pickup, S.dest, S.stop);
  if (S.prevScreen === 'ontrip') {
    const car = carNow();
    S.drive = { pts: [car.p, ...routeW(toLL(car.p), S.dest.ll).slice(1)], t0: performance.now(), dur: S.drive?.dur || 12000 };
  }
  go(S.prevScreen || 'enroute'); animateCar();
  flash('Drop-off updated', `New price ${usd(S.quote.price)}`);
}

// ---------- toasts & push notifications ----------
let toastT, notifT;
function flash(title, msg = '') { S.toast = { title, msg }; render(false); clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; render(false); }, 2300); }
function notify(title, body) { S.notif = { title, body }; render(false); clearTimeout(notifT); notifT = setTimeout(() => { S.notif = null; render(false); }, 4200); }

/* =====================================================================
   Events
   ===================================================================== */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-tab],[data-saved],[data-recent],[data-result],[data-airline],[data-clear],[data-card],[data-receipt],[data-toast],[data-star],[data-tip],[data-day],[data-seg],[data-sendtext],[data-cancelup],[data-jump]');
  if (!el || el.disabled) return;
  const d = el.dataset;
  if (el.tagName === 'A' && !el.getAttribute('href')?.startsWith('..')) e.preventDefault();

  if (d.tab) {
    S.overlay = null;
    if (ACTIVE.includes(S.screen)) return flash('Available after your ride');
    clearTimers(); Object.assign(S, { tab: d.tab, screen: 'home', receipt: null }); return render();
  }
  if (d.saved) { const p = SAVED[d.saved]; if (S.screen === 'search') return choose(p); S.pickup = currentLocation(); S.field = 'dest'; return choose(p); }
  if (d.recent) { S.pickup = currentLocation(); S.field = 'dest'; return choose(RECENTS[+d.recent]); }
  if (d.result) return choose(S.results[+d.result]);
  if (d.airline) {
    const [name, t] = d.airline.split('|'), A = AIRPORTS[S.airportCode];
    const dest = { ...A.place, name: `${S.airportCode}, ${A.fmt(t)}, Departures, ${name}`, ll: A.term[t] || A.place.ll };
    S.dest = dest;
    if (S.editing === 'dest') return finishEditDest();
    return toOptions();
  }
  if (d.clear) { S.field = d.clear; S.q = ''; if (d.clear === 'dest') S.dest = null; if (d.clear === 'stop') S.stop = null; if (d.clear === 'pickup') S.pickup = null; return render(); }
  if (d.card) { S.card = +d.card; S.overlay = null; return render(false); }
  if (d.receipt !== undefined) { S.receipt = +d.receipt; S.screen = 'receipt'; return render(); }
  if (d.toast) return flash(d.toast);
  if (d.star) { S.rating = +d.star; return render(false); }
  if (d.tip) { S.tip = +d.tip; return render(false); }
  if (d.day) { S.schedDay = +d.day; return render(false); }
  if (d.seg) { S.tripSeg = +d.seg; return render(false); }
  if (d.sendtext) { S.overlay = null; return flash('Message sent', `"${d.sendtext}"`); }
  if (d.cancelup) { S.upcoming.splice(+d.cancelup, 1); return flash('Scheduled ride cancelled'); }
  if (d.jump) return jump(d.jump);

  switch (d.act) {
    case 'search': return openSearch('dest');
    case 'airport': return openSearch('dest', 'airport');
    case 'closesearch':
      if (S.pickupFromConfirm) { S.pickupFromConfirm = false; return go('pickup'); }
      if (S.editing === 'dest') { S.editing = null; return go(S.prevScreen); }
      return S.dest && S.quote ? go('options') : goHome();
    case 'addstop': S.showStop = true; S.field = 'stop'; S.q = ''; return render();
    case 'mapselect': {
      const base = S.field === 'pickup' ? (S.pickup?.ll || GPS) : (S.dest?.ll || GPS);
      S.draft = reverseGeocode(base); S.farBanner = false; return go('mapselect');
    }
    case 'confirmmapsel': { const p = S.draft; S.screen = 'search'; return choose(p); }
    case 'closemapsel': return go('search');
    case 'closeairline': return go('search');
    case 'skipairline': S.dest = AIRPORTS[S.airportCode].place; return S.editing === 'dest' ? finishEditDest() : toOptions();
    case 'moreairlines': S.moreAirlines = true; return render();
    case 'cleartrip': return goHome();
    case 'editdest':
      if (['options'].includes(S.screen)) return openSearch('dest');
      S.overlay = null; S.editing = 'dest'; S.prevScreen = S.screen; S.field = 'dest'; S.q = ''; return go('search');
    case 'back': return S.screen === 'options' ? openSearch('dest') : goHome();
    case 'backtooptions': return go('options');
    case 'backtopickup': S.draft = { ...S.pickup }; return go('pickup');
    case 'recenter': lastScene = ''; return render();
    case 'swipe': S.expanded = !S.expanded; return render();
    case 'continue': return toPickup();
    case 'pickupsearch': S.pickupFromConfirm = true; return openSearch('pickup');
    case 'request': return request();
    case 'acceptprice': S.quote = S.newQuote; return confirmRide();
    case 'closefar': S.farBanner = false; return render(false);
    case 'expand': S.expanded = !S.expanded; return render();
    case 'editride': S.overlay = 'edit'; return render(false);
    case 'editpickup': S.overlay = null; S.dialog = null; S.editing = 'pickup'; S.prevScreen = S.screen === 'arrived' ? 'arrived' : 'enroute'; S.draft = { ...S.pickup }; S.quotedLL = S.pickup.ll; return go('pickup');
    case 'canceledit': S.editing = null; return go(S.prevScreen || 'enroute');
    case 'cancelride': S.overlay = null; S.dialog = DIALOGS.cancel; return render(false);
    case 'yescancel': clearTimers(); cancelAnimationFrame(carRAF); S.dialog = null; go('cancelreq'); return later(2200, () => goHome('Ride cancelled'));
    case 'call': S.dialog = null; return flash(`Calling ${S.driver?.name || 'your driver'}…`, 'Your number stays private');
    case 'text': S.overlay = 'text'; return render(false);
    case 'closedialog': S.dialog = null; return render(false);
    case 'closenotif': S.notif = null; return render(false);
    case 'drawer': S.overlay = 'drawer'; return render(false);
    case 'closeoverlay': S.overlay = null; return render(false);
    case 'pay': S.overlay = 'pay'; return render(false);
    case 'refer': S.overlay = 'refer'; return render(false);
    case 'discount': S.overlay = 'discount'; return render(false);
    case 'copycode': return flash('Code copied', 'ALEX20');
    case 'share': S.overlay = null; return flash('Invite link copied');
    case 'schedule': S.overlay = 'schedule'; S.schedDay = S.schedDay ?? 0; return render(false);
    case 'setschedule': {
      const v = +$('#schedtime')?.value; if (!v) return;
      S.when = new Date(v); S.overlay = null;
      if (S.screen === 'options' && S.dest) return toOptions();
      if (S.screen === 'matching') return render(false);
      return openSearch('dest');
    }
    case 'clearschedule': S.when = null; S.overlay = null; return S.screen === 'options' ? toOptions() : render(false);
    case 'redeem': {
      const code = ($('#promo')?.value || '').trim().toUpperCase();
      if (!code) return;
      if (S.codes.some(c => c.code === code)) return flash('Code already added');
      S.codes.push({ code, title: '$10 off your next ride', sub: `Code ${code} · Expires in 30 days` });
      return flash('Promo code added', `${code} · $10 off your next ride`);
    }
    case 'closereceipt': S.screen = 'home'; S.tab = 'trips'; S.receipt = null; return render();
    case 'done': return finishRide();
    case 'driverapp': location.href = '../driver/index.html'; return;
    case 'demopanel': S.demoOpen = !S.demoOpen; return renderDemo();
    case 'fast': S.fast = !S.fast; return renderDemo();
    case 'reset': location.hash = ''; return location.reload();
  }
});

document.addEventListener('input', (e) => {
  const f = e.target.dataset?.field;
  if (!f) return;
  S.field = f; S.q = e.target.value;
  $('#slist').innerHTML = searchList();
});
document.addEventListener('focusin', (e) => {
  const f = e.target.dataset?.field;
  if (!f || S.field === f) return;
  S.field = f; S.q = '';
  e.target.select();
  $('#slist').innerHTML = searchList();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (S.overlay || S.dialog) { S.overlay = null; S.dialog = null; render(false); } }
  if (e.key === 'Enter' && e.target.dataset?.field && S.results?.length) choose(S.results[0]);
});

/* =====================================================================
   Demo panel + deep links
   ===================================================================== */
const JUMPS = [['home', 'Home'], ['search', 'Search'], ['options', 'Ride options'], ['pickup', 'Confirm pickup'], ['matching', 'Matching'],
  ['enroute', 'Driver en route'], ['arrived', 'Driver arrived'], ['ontrip', 'On trip'], ['complete', 'Trip complete'], ['trips', 'Trips / receipts']];
function renderDemo() {
  demoEl.classList.toggle('is-open', S.demoOpen);
  demoEl.innerHTML = `<h3>Revel · rider</h3>
    <p>Rebuilt from rider-side screen recordings, Sep 2024 – Feb 2025. Pickup, trip and receipt screens after the driver arrives weren't recorded and are inferred.</p>
    <h4>Jump to</h4>
    <div class="jumps">${JUMPS.map(([k, l]) => button(l, { variant: 'soft', cls: jumpKey() === k ? 'is-on' : '', attrs: { 'data-jump': k } })).join('')}</div>
    <h4>Other</h4>
    <div class="jumps">${button(S.fast ? 'Fast timers: on' : 'Fast timers: off', { variant: 'soft', act: 'fast', cls: S.fast ? 'is-on' : '' })}${button('Reset', { variant: 'soft', act: 'reset' })}</div>
    <p style="margin-top:16px"><a href="../index.html">All prototypes</a></p>`;
}
const jumpKey = () => S.screen === 'home' ? (S.tab === 'trips' ? 'trips' : 'home') : S.screen;
function syncHash() { const k = jumpKey(); if (location.hash !== '#/' + k && k !== 'splash') history.replaceState(null, '', '#/' + k); }

function ensureTrip() {
  if (!S.pickup) S.pickup = currentLocation();
  if (!S.dest) S.dest = { ...AIRPORTS.JFK.place, name: 'JFK, Terminal 4, Departures, Delta', ll: AIRPORTS.JFK.term[4] };
  S.quote = quote(S.pickup, S.dest, S.stop); S.quoteReady = true;
}
function jump(k) {
  clearTimers(); cancelAnimationFrame(carRAF);
  Object.assign(S, { overlay: null, dialog: null, editing: null, loadingHome: false, when: null, pickupFromConfirm: false });
  if (k === 'home') return goHome();
  if (k === 'trips') { goHome(); S.tab = 'trips'; S.tripSeg = 0; return render(); }
  if (k === 'search') { S.dest = null; return openSearch('dest'); }
  ensureTrip();
  if (k === 'options') return toOptions();
  if (k === 'pickup') return toPickup();
  if (k === 'matching') return startMatching();
  if (['enroute', 'arrived', 'ontrip', 'complete'].includes(k)) {
    matched();
    if (k === 'arrived') { clearTimers(); S.notif = null; arrive(); }
    if (k === 'ontrip') { clearTimers(); S.notif = null; startTrip(); }
    if (k === 'complete') { clearTimers(); cancelAnimationFrame(carRAF); S.notif = null; go('complete'); }
  }
}

function tickClock() { $('#sbclock').textContent = clock(new Date()).replace(/ [AP]M$/, ''); }

async function boot() {
  seedTrips(); tickClock(); setInterval(tickClock, 15000);
  const k = location.hash.replace(/^#\/?/, '');
  render();
  await initMap().catch(err => console.error('basemap failed', err));
  if (k && JUMPS.some(j => j[0] === k)) return jump(k);
  setTimeout(() => { S.screen = 'home'; S.loadingHome = true; render(); setTimeout(() => { S.loadingHome = false; render(); }, 650); }, 900);
}
window.addEventListener('resize', () => { lastScene = ''; if (MAP_SCREENS.includes(S.screen)) render(); });
boot();
