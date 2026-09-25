/* Revel — the rider app, rebuilt from screen recordings (Sep 2024 – Feb 2025).
   One persistent map (the shared NYC basemap, inlined so it stays crisp at street zoom)
   under a UI layer that is re-rendered from state. Everything is fabricated. */
import { esc, icon, btn, avatar, toast as toastEl } from '../shared/ui.js?v=8';

const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const ui = $('#ui'), mapEl = $('#map'), demoEl = $('#demo');
const usd = (n) => '$' + n.toFixed(2);
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
  const discount = S.promo ? +Math.min(fare * 0.4, 40).toFixed(2) : 0;
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
  progress: 0, busy: false, driver: null, eta: 0, drive: null, expanded: false, editing: null, prevScreen: null,
  overlay: null, dialog: null, notif: null, toast: null, rating: 0, tip: 0, receipt: null, tripSeg: 0,
  outcome: 'match', fast: false, promo: true, card: 0, codes: [],
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
      <linearGradient id="tripgrad" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--route)"/><stop offset="1" style="stop-color:var(--route-end)"/></linearGradient>
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
  const mini = txt.replace('#DCE1E7', tok('map-water')).replace('fill="#EDEFF2"', `fill="${tok('map-land-alt')}"`)
    .replace('fill="#F5F6F8" stroke="#D3D8DE"', `fill="${tok('map-land')}" stroke="none"`)
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
  const pill = it.el.querySelector('.pill');       // keep callouts inside the map
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
  const pill = m.label ? `<span class="pill${m.tone ? ' is-' + m.tone : ''}" data-pill="${m.id || ''}">${esc(m.label)}</span>` : '';
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
    const stroke = r.kind === 'trip' ? 'url(#tripgrad)' : 'var(--route)';
    return `<polyline points="${pts}" fill="none" style="stroke:${stroke};stroke-width:${r.kind === 'trip' ? 4.5 : 4}px;stroke-linecap:round;stroke-linejoin:round" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  const trip = list.find(r => r.kind === 'trip');
  if (trip) {
    const g = MAP.svg.querySelector('#tripgrad'), a = trip.pts[0], b = trip.pts[trip.pts.length - 1];
    g.setAttribute('x1', a[0]); g.setAttribute('y1', a[1]); g.setAttribute('x2', b[0]); g.setAttribute('y2', b[1]);
  }
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
const carSide = (w = 120) => `<svg viewBox="0 0 120 46" width="${w}" height="${Math.round(w * 46 / 120)}" aria-hidden="true">
  <ellipse cx="60" cy="43" rx="52" ry="2.6" style="fill:var(--ink);opacity:.12"/>
  <path style="fill:var(--brand-cyan)" d="M7 33c0-5 3-8 9-9l19-4c6-6 15-9 26-9h13c10 0 18 4 24 10l10 3c5 1 8 4 8 9v4c0 2-1 3-3 3H10c-2 0-3-1-3-3z"/>
  <path style="fill:var(--brand-teal)" d="M39 21c6-5 13-7 22-7h12c7 0 13 2 18 7z"/>
  <path style="stroke:var(--surface-raised);stroke-width:1;fill:none;opacity:.6" d="M64 14v7M16 27h8"/>
  <circle cx="31" cy="38" r="7.5" style="fill:var(--brand-night)"/><circle cx="31" cy="38" r="3.2" style="fill:var(--line-strong)"/>
  <circle cx="92" cy="38" r="7.5" style="fill:var(--brand-night)"/><circle cx="92" cy="38" r="3.2" style="fill:var(--line-strong)"/></svg>`;
const cardMark = (c) => `<span class="cardmark">${c.brand}</span>`;
const placeIcon = (p) => p.current ? 'locate' : p.saved ? (p.icon || 'pin') : p.airport ? 'plane' : 'pin';
const destLabel = (p) => p ? (p.saved ? `${icon(p.icon, 15)}${esc(p.name)}` : esc(p.name)) : 'Enter your destination';
const primary = (label, act, o = {}) => btn(label, { variant: 'primary', block: true, act, ...o });
const legs = (a, b, ta, tb, linked = true) => `<div class="legs${linked ? ' linked' : ''}">
  <div class="leg"><span class="dot"></span><div>${esc(a.name)}<small>${esc(a.addr)}</small></div><time>${ta}</time></div>
  <div class="leg is-drop"><span class="dot"></span><div>${esc(b.name)}<small>${esc(b.addr)}</small></div><time>${tb}</time></div></div>`;
const payRow = () => { const c = CARDS[S.card]; return `<button type="button" class="payrow" data-act="pay">${cardMark(c)}<span>···· ${c.last}</span><span class="exp">${c.exp} ${icon('chevronRight', 14)}</span></button>`; };
const whenLabel = () => S.when ? S.when.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + clock(S.when) : 'Now';

function topbar(o = {}) {
  return `<div class="topbar"><button type="button" class="icon-btn" data-act="drawer" aria-label="Menu">${icon('menu', 22)}</button>
    <button type="button" class="dest" data-act="${o.editable ? 'editdest' : ''}"><small>Final stop</small><span>${destLabel(S.dest)}</span></button>
    ${o.close ? `<button type="button" class="icon-btn" data-act="cleartrip" aria-label="Clear trip">${icon('close', 20)}</button>` : ''}</div>`;
}
const fabs = (bottom, back = 'back') => `
  ${back ? `<button type="button" class="fab l" style="bottom:${bottom}px" data-act="${back}" aria-label="Back">${icon('chevronLeft', 22)}</button>` : ''}
  <button type="button" class="fab r" style="bottom:${bottom}px" data-act="recenter" aria-label="Recenter">${icon('locate', 20)}</button>`;

/* =====================================================================
   Screens
   ===================================================================== */
function home() {
  if (S.loadingHome) return `<div class="page"><div class="page-scroll"><div class="greet">Hello,</div>
    <div class="skel"><span class="shim" style="height:18px"></span><span class="shim" style="height:90px"></span><span class="shim" style="height:90px"></span><span class="shim" style="height:90px"></span></div></div></div>`;
  const recents = RECENTS.slice(0, 2);
  return `<div class="page">
    <div class="page-scroll">
      <div class="greet">Hello, ${esc(RIDER.first)}</div>
      <div class="searchbar"><button type="button" class="q" data-act="search">${icon('search', 18)}Enter destination</button>
        <button type="button" class="when" data-act="schedule">${icon('calendar', 16)}${esc(whenLabel())}${icon('chevronDown', 14)}</button></div>
      <div class="chips">${['home', 'storage', 'work'].map(k => `<button type="button" class="chip" data-saved="${k}">${icon(SAVED[k].icon, 15)}${SAVED[k].name}</button>`).join('')}</div>
      ${recents.map(p => `<button type="button" class="place" data-recent="${RECENTS.indexOf(p)}">${icon('history', 19)}<span><b>${esc(p.name)}</b><small>${esc(p.addr)}</small></span></button>`).join('')}
      <div class="sec"><h3>Your discounts</h3><button type="button" class="link" data-tab="discounts">View all</button></div>
      ${S.promo ? `<button type="button" class="disc-row" data-act="discount">${icon('tag', 17)}40% off rides<span class="go">${icon('arrow', 17)}</span></button>` : '<div class="muted">No active discounts.</div>'}
      <button type="button" class="refer" data-act="refer"><b>Refer a friend, Get $20</b><span class="pillbtn">Refer your friends</span>${carSide(170)}</button>
      <div class="sec"><h3>Other ways to revel</h3></div>
      <div class="ways">
        <button type="button" class="way" data-act="schedule"><div class="t"><b>Schedule and sit back ${icon('arrow', 15)}</b><span>Reserve a ride up to a week in advance</span></div>
          <div class="img cal"><div class="cal-art"><div><small>${new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</small>${new Date().getDate()}</div></div></div></button>
        <button type="button" class="way" data-act="airport"><div class="t"><b>Enjoy stress-free airport rides ${icon('arrow', 15)}</b><span>Flat, upfront prices to JFK, LGA and EWR</span></div>
          <div class="img">${icon('plane', 40)}</div></button>
      </div>
    </div>${tabbar()}</div>`;
}
function tabbar() {
  const T = [['home', 'Home', 'home'], ['discounts', 'Discounts', 'tag'], ['trips', 'Trips', 'calendar'], ['account', 'Account', 'drivers']];
  return `<nav class="tabbar">${T.map(([k, l, ic]) => `<button type="button" class="${S.tab === k ? 'is-on' : ''}" data-tab="${k}">${icon(ic, 22)}${l}</button>`).join('')}</nav>`;
}

function discounts() {
  const rows = [S.promo && ['40% off rides', 'Up to $40 off each ride · Expires Oct 31'], ...S.codes.map(c => [c.title, c.sub])].filter(Boolean);
  return `<div class="page"><div class="page-head"><h1 style="padding-left:8px">Discounts</h1></div><div class="page-scroll">
    ${rows.length ? rows.map(([t, s]) => `<button type="button" class="rowlink" data-act="discount">${icon('tag', 20)}<span>${esc(t)}<small>${esc(s)}</small></span><span class="go">${icon('chevronRight', 16)}</span></button>`).join('') : '<div class="empty">No discounts yet.</div>'}
    <div class="sec"><h3>Redeem promo code</h3></div>
    <label class="field"><span>Promo code</span><input id="promo" placeholder="Enter code" autocomplete="off"></label>
    ${btn('Redeem', { variant: 'primary', block: true, act: 'redeem' })}
    <div class="sec"><h3>Refer a friend</h3></div>
    <div class="refer-mini"><div><b>Get $20 & give your friends $$ too.</b><span>Share your code ALEX20 — you both get ride credit after their first ride.</span></div><span class="giftblob">${icon('gift', 24)}</span></div>
    ${btn(`${icon('gift', 16)}Refer a friend`, { block: true, cls: 'soft', act: 'refer' })}
  </div>${tabbar()}</div>`;
}

function trips() {
  const past = S.trips.map((t, i) => tripCard(t, i)).join('') || `<div class="empty">${icon('receipt', 30)}No past trips yet.</div>`;
  const up = S.upcoming.map((u, i) => `<div class="rowlink" style="cursor:default">${icon('calendar', 20)}<span><span class="chip-up">SCHEDULED</span>
      <b style="display:block;margin-top:6px;font-weight:500">${esc(u.dest.name)}</b><small>${u.when.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · pickup ${clock(u.when)} · from ${esc(u.pickup.name)}</small></span>
      <button type="button" class="rv-btn rv-btn-ghost" data-cancelup="${i}">Cancel</button></div>`).join('') || `<div class="empty">${icon('calendar', 30)}No upcoming rides.<br><button type="button" class="rv-btn rv-btn-ghost" data-act="schedule" style="margin-top:8px;color:var(--link)">Schedule a ride</button></div>`;
  return `<div class="page"><div class="page-head"><h1 style="padding-left:8px">Trips</h1></div><div class="page-scroll">
    <div class="segrow">${['Past', 'Upcoming'].map((l, i) => `<button type="button" class="chip${S.tripSeg === i ? ' is-on' : ''}" data-seg="${i}">${l}${i && S.upcoming.length ? ` · ${S.upcoming.length}` : ''}</button>`).join('')}</div>
    ${S.tripSeg ? up : past}</div>${tabbar()}</div>`;
}
function miniMap(pts, h = 138) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const pad = 0.25, w0 = Math.max(...xs) - Math.min(...xs), h0 = Math.max(...ys) - Math.min(...ys);
  const aspect = 358 / h;
  let w = Math.max(w0 * (1 + pad * 2), 14), hh = Math.max(h0 * (1 + pad * 2), 14 / aspect);
  if (w / hh < aspect) w = hh * aspect; else hh = w / aspect;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, r = w * 0.022;
  const a = pts[0], b = pts[pts.length - 1];
  return `<svg class="mini" style="height:${h}px" viewBox="${cx - w / 2} ${cy - hh / 2} ${w} ${hh}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    ${MAP.miniURL ? `<image href="${MAP.miniURL}" x="0" y="0" width="${WW}" height="${WH}" preserveAspectRatio="none"/>` : ''}
    <polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" style="stroke:var(--ink);stroke-width:3px;stroke-linejoin:round" vector-effect="non-scaling-stroke"/>
    <circle cx="${b[0]}" cy="${b[1]}" r="${r}" style="fill:var(--ink);stroke:var(--surface-raised);stroke-width:2px" vector-effect="non-scaling-stroke"/>
    <circle cx="${a[0]}" cy="${a[1]}" r="${r * 1.15}" style="fill:var(--route-end);stroke:var(--surface-raised);stroke-width:2.5px" vector-effect="non-scaling-stroke"/></svg>`;
}
function tripCard(t, i) {
  const when = t.at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + clock(t.at);
  return `<button type="button" class="trip" data-receipt="${i}">${miniMap(t.q.pts)}
    <div class="row">${carSide(44)}<div><b>Revel EV ride</b><span>${t.q.tripMin} min ${t.q.miles} mi</span><span>${when}</span></div>
      <span class="amt">${usd(t.q.price + t.tip)} ${icon('chevronRight', 16)}</span></div></button>`;
}
function receipt() {
  const t = S.trips[S.receipt], q = t.q, end = new Date(t.at.getTime() + q.tripMin * 60e3), c = CARDS[0];
  const row = (k, v, cls = '') => `<div class="kv-row ${cls}"><span>${k}</span><span>${v}</span></div>`;
  return `<div class="page"><div class="page-head"><button type="button" class="icon-btn" data-act="closereceipt" aria-label="Back">${icon('chevronLeft', 22)}</button><h1>Receipt</h1></div>
    <div class="page-scroll">${miniMap(q.pts, 190)}
      <h2 style="margin:16px 0 2px;font-size:19px">Revel EV ride</h2>
      <div class="muted" style="font-size:13px;margin-bottom:12px">${t.at.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · with ${esc(t.driver.name)} · ${esc(t.driver.plate)}</div>
      ${legs(t.from, t.to, clock(t.at), clock(end))}
      <div class="sec"><h3>Fare</h3></div>
      ${row(`Trip fare · ${q.tripMin} min, ${q.miles} mi`, usd(q.fare))}${q.airport ? row('Airport access fee', usd(q.airport)) : ''}${q.cbd ? row('Congestion surcharge', usd(q.cbd)) : ''}
      ${row('Booking fee', usd(q.booking))}${q.discount ? row('40% off rides', `<span class="neg">−${usd(q.discount)}</span>`) : ''}${row('Tip', usd(t.tip))}
      ${row('Total', usd(q.price + t.tip), 'total')}
      <button type="button" class="payrow" style="cursor:default">${cardMark(c)}<span>Charged to ···· ${c.last}</span></button>
      <div style="margin-top:14px">${[['help', 'Get help with this ride'], ['download', 'Download receipt']].map(([ic, l]) => `<button type="button" class="rowlink" data-toast="${l === 'Download receipt' ? 'Receipt emailed to you' : 'Support will text you shortly'}">${icon(ic, 20)}${l}<span class="go">${icon('chevronRight', 16)}</span></button>`).join('')}</div>
    </div></div>`;
}

function account() {
  const rows = [['card', 'Payment', `${CARDS.length} cards · ···· ${CARDS[S.card].last} default`, 'pay'], ['home', 'Saved places', 'Home, Work, Storage Unit', 'toast:Editing saved places isn’t in this prototype'],
    ['receipt', 'Receipts', `${S.trips.length} rides`, 'tab:trips'], ['gift', 'Refer a friend', 'Get $20', 'refer'], ['tag', 'Redeem promo code', null, 'tab:discounts'],
    ['help', 'Help', null, 'toast:Support will text you shortly'], ['settings', 'Settings', null, 'toast:Settings aren’t in this prototype']];
  return `<div class="page"><div class="page-head"><h1 style="padding-left:8px">Account</h1></div><div class="page-scroll">
    <div class="me"><span class="addphoto">Add<br>Photo</span><div><b>${esc(RIDER.name)}</b><button type="button" data-toast="Profile editing isn’t in this prototype">View profile</button></div></div>
    ${rows.map(([ic, l, sub, a]) => `<button type="button" class="rowlink" ${a.includes(':') ? `data-${a.split(':')[0]}="${esc(a.split(':')[1])}"` : `data-act="${a}"`}>${icon(ic, 20)}<span>${l}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="go">${icon('chevronRight', 16)}</span></button>`).join('')}
    <a class="rowlink" href="../driver/index.html" style="text-decoration:none;color:inherit">${icon('ride', 20)}<span>Apply to be a revel driver</span><span class="go">${icon('arrow', 16)}</span></a>
    <p class="faint" style="font-size:11.5px;margin-top:16px">${esc(RIDER.phone)} · Version 4.18.0 (prototype)</p>
  </div>${tabbar()}</div>`;
}

/* ---------- search ---------- */
function search() {
  const f = (key, val, ph) => `<div class="infield"><input data-field="${key}" value="${esc(val)}" placeholder="${ph}" autocomplete="off" aria-label="${ph}">
    ${val ? `<button type="button" class="icon-btn clr" data-clear="${key}" aria-label="Clear">${icon('close', 14)}</button>` : ''}</div>`;
  const val = (key) => S.field === key ? S.q : (key === 'pickup' ? (S.pickup ? (S.pickup.current ? 'Current location' : S.pickup.name) : '') : key === 'stop' ? (S.stop?.name || '') : (S.dest?.name || ''));
  return `<div class="page">
    <div class="page-head"><button type="button" class="icon-btn" data-act="closesearch" aria-label="Back">${icon('chevronLeft', 22)}</button></div>
    <div class="route-fields">
      <div class="dots"><i></i><u></u>${S.showStop ? '<i class="stop"></i><u></u>' : ''}<i class="drop"></i></div>
      ${f('pickup', val('pickup'), 'Pickup location')}
      <button type="button" class="add-stop" data-act="addstop" aria-label="Add a stop"${S.showStop || S.editing ? ' disabled' : ''}>${icon('plus', 18)}</button>
      ${S.showStop ? f('stop', val('stop'), 'Add a stop') : ''}
      ${f('dest', val('dest'), 'Destination')}
    </div>
    <div class="chips" style="padding:0 12px;margin:0 0 10px">${['home', 'work', 'storage'].map(k => `<button type="button" class="chip" data-saved="${k}">${icon(SAVED[k].icon, 15)}${SAVED[k].name}</button>`).join('')}</div>
    <div class="search-list" id="slist">${searchList()}</div>
    <button type="button" class="search-foot" data-act="mapselect">${icon('pin', 18)}Select location on map</button>
  </div>`;
}
function searchList() {
  const q = S.q.trim().toLowerCase();
  const row = (p, attr) => `<button type="button" class="place${p.current || p.fuzzy || (!p.saved && !p.recent && !p.airport) ? ' is-cyan' : ''}" ${attr}>${icon(p.recent ? 'history' : placeIcon(p), 19)}<span><b>${esc(p.current ? 'Current location' : p.name)}</b>${p.current ? '' : `<small>${esc(p.addr)}</small>`}</span></button>`;
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
  if (!list.length) return `<div class="noresult">${icon('warning', 30)}<b>We can't find that address</b><span class="muted">Please check the address you entered and try again.</span></div>`;
  return list.map((p, i) => row(p, `data-result="${i}"`)).join('');
}

/* ---------- airline picker (the recorded "Select drop-off" step) ---------- */
function airline() {
  const A = AIRPORTS[S.airportCode];
  const list = S.moreAirlines ? [...A.airlines, ...A.more].sort((a, b) => a[0].localeCompare(b[0])) : A.airlines;
  return `<div class="page"><div class="page-head"><button type="button" class="icon-btn" data-act="closeairline" aria-label="Back">${icon('chevronLeft', 22)}</button>
      <h1>Select drop-off</h1><button type="button" class="skip" data-act="skipairline">SKIP</button></div>
    <div class="page-scroll airlines"><div class="list-title">Popular airlines of ${S.airportCode}</div>
      ${list.map(([n, t]) => `<button type="button" class="place" data-airline="${esc(n)}|${t}">${icon('plane', 18)}<span><b>${esc(n)}</b></span><small class="faint" style="margin-left:auto">${A.fmt(t)}</small></button>`).join('')}
      ${S.moreAirlines ? '' : `<button type="button" class="place is-cyan" data-act="moreairlines">${icon('list', 18)}<span><b>See all airlines</b></span></button>`}</div></div>`;
}

/* ---------- map screens ---------- */
function options() {
  const q = S.quote, sched = S.when;
  if (S.outcome === 'nocars' && S.quoteReady && !sched) {
    return `${topbar({ close: true, editable: true })}${fabs(300)}
      <div class="sheet"><div style="height:8px"></div>
        <div class="demand">${carSide(78)}<span>Demand is high right now. Please check back soon.</span></div>
        ${payRow()}${primary('All drivers busy', null, { disabled: true })}</div>`;
  }
  const vehicle = S.quoteReady
    ? `<button type="button" class="vehicle is-sel" data-toast="Revel EV is the only ride type in New York">${carSide(78)}
        <span class="v-name"><b>Revel EV ${icon('drivers', 13)} 4</b><small>${sched ? 'Pickup ' + clock(sched) : 'Get there by ' + clock(inMin(q.eta + q.tripMin))}</small></span>
        <span class="v-price"><b>${q.discount ? icon('tag', 14) : ''}${usd(q.price)}</b>${q.discount ? `<s>${usd(q.full)}</s>` : ''}</span></button>`
    : `<div class="vehicle">${carSide(78)}<span class="v-name"><b>Revel EV</b></span><span class="v-price"><span class="shim" style="width:64px;height:16px;display:block;margin-bottom:6px"></span><span class="shim" style="width:80px;height:12px;display:block"></span></span></div>`;
  return `${topbar({ close: true, editable: true })}${fabs(300)}
    <div class="sheet"><button type="button" class="handle" data-act="swipe" aria-label="More options"></button>
      <div class="swipe-hint">${sched ? `Scheduled for ${whenLabel()}` : 'Swipe up to see more options'}</div>
      ${vehicle}${S.expanded ? `<p class="muted" style="font-size:13px;margin:12px 2px 0">All-electric Tesla, up to 4 riders. Your price is locked in before you ride${S.promo ? ', with 40% off applied' : ''}.</p>` : ''}
      ${payRow()}${primary(sched ? 'Schedule ride' : 'Continue', 'continue', { disabled: !S.quoteReady })}</div>`;
}
function pickupScreen() {
  const mapsel = S.screen === 'mapselect', edit = S.editing === 'pickup';
  const title = mapsel ? (S.field === 'pickup' ? 'Set pickup location' : 'Set drop-off location') : 'Confirm your pickup location';
  const label = mapsel ? (S.field === 'pickup' ? 'Confirm pickup' : 'Confirm drop-off') : edit ? 'Confirm pickup' : S.when ? 'Schedule ride' : 'Request ride';
  return `${S.farBanner ? `<div class="farbanner">${icon('info', 18)}<span>This pickup location is very far from you.</span><button type="button" class="icon-btn" data-act="closefar" aria-label="Dismiss">${icon('close', 14)}</button></div>` : ''}
    <div class="center-pin" id="cpin">${mapsel ? '' : '<span class="pill">Confirm your pickup location</span>'}<u></u><i></i><b></b></div>
    ${fabs(206, mapsel ? 'closemapsel' : edit ? 'canceledit' : 'backtooptions')}
    <div class="sheet" id="psheet"><h2 style="margin:8px 0 12px">${title}</h2>
      <button type="button" class="searchbar" style="width:100%;cursor:pointer" data-act="${mapsel ? '' : 'pickupsearch'}"><span class="q" style="display:flex;align-items:center;gap:8px;color:var(--ink)">${icon('search', 17).replace('class="rv-icon"', 'class="rv-icon" style="color:var(--primary)"')}${esc(S.draft?.name || '')}</span></button>
      ${primary(label, mapsel ? 'confirmmapsel' : 'request', { disabled: !S.draft })}</div>`;
}
function reprice() {
  const q = S.newQuote;
  return `${fabs(250, 'backtopickup')}<div class="sheet"><h2 style="margin:8px 0 6px">Confirm new price</h2>
    <p><b style="font-size:19px;font-weight:600">${usd(q.price)}</b>&nbsp;&nbsp; <span>(New ETA: ${clock(inMin(q.eta + q.tripMin))})</span></p>
    <p>Your price has been updated to reflect your new pickup location.</p>${primary('Request ride', 'acceptprice')}</div>`;
}
function confirming() {
  const q = S.quote;
  return `${topbar()}<div class="sheet"><div style="display:flex;align-items:center;gap:10px;justify-content:center;margin:10px 0 2px"><h2 style="margin:0">Confirming your ride</h2><span class="spinner"></span></div>
    <div class="sub c">Finding drivers nearby</div>
    ${legs(S.pickup, S.dest, 'Pickup ' + clock(inMin(q.eta)), 'Drop-off ' + clock(inMin(q.eta + q.tripMin)))}</div>`;
}
function matching() {
  return `${topbar()}${fabs(470, null)}<div class="sheet" style="padding-top:18px">
    <h2 class="c" data-live="mtitle">${S.busy ? 'It is busier than usual' : 'See driver details in 1 min'}</h2>
    <div class="sub c" data-live="msub" style="margin:0">${S.busy ? 'Thanks for your patience' : "Hang tight, we'll update you soon"}</div>
    <div class="progress"><i id="prog" style="width:${S.progress * 100}%"></i></div>
    <button type="button" class="promo-card" data-act="schedule"><div class="art"><span class="word">revel</span>${carSide(250)}</div>
      <div class="t"><b>Upcoming travel plans?</b><span>Schedule a ride up to a week in advance</span></div></button></div>`;
}
function driverBlock() {
  const d = S.driver;
  return `<div class="driver-row"><div class="car-avatar">${carSide(120)}${avatar(d.name, 50)}</div>
    <div class="who"><b>${esc(d.plate)}</b><span>${esc(d.model)}</span><em>${icon('check', 14)}${esc(d.name)}</em></div></div>
    <div class="duo">${btn(`${icon('phone', 17)}Call`, { cls: 'soft', act: 'call' })}${btn(`${icon('message', 17)}Text`, { cls: 'soft', act: 'text' })}</div>`;
}
function enroute() {
  const arrived = S.screen === 'arrived', short = S.pickup.name;
  const title = arrived ? 'Your driver is here' : `Pickup in <span data-live="eta">${S.eta}</span> min`;
  const extra = S.expanded ? `
      <div class="legs" style="margin-top:16px">${`<div class="leg is-drop"><span class="dot"></span><div>${esc(S.dest.name)}<small>${esc(S.dest.addr)}</small></div><time>Drop-off <span data-live="drop">${clock(inMin(S.eta + S.quote.tripMin))}</span></time></div>`}</div>
      ${btn(`${icon('edit', 17)}Edit Ride`, { block: true, cls: 'soft', act: 'editride' })}
      <div class="divider"></div>
      <div class="refer-mini"><div><b>Refer a friend</b><span>Get $20 & give your friends $$ too.</span></div><span class="giftblob">${icon('gift', 24)}</span></div>
      ${btn(`${icon('gift', 16)}Refer a friend`, { block: true, cls: 'soft', act: 'refer' })}
      <div class="divider"></div>
      <div class="kv-row"><b>Payment</b><span>${cardMark(CARDS[S.card])} ···· ${CARDS[S.card].last}</span></div>
      <div class="kv-row"><span class="muted">Revel EV${S.quote.discount ? ' · 40% off' : ''}</span><b>${usd(S.quote.price)}</b></div>` : '';
  return `${topbar()}${fabs(S.expanded ? 0 : 300, null)}
    <div class="sheet"><button type="button" class="handle" data-act="expand" aria-label="${S.expanded ? 'Collapse' : 'Expand'}"></button>
      <h2 class="c">${title}</h2><div class="sub c" style="margin-bottom:4px">Meet ${esc(S.driver.name)} at ${esc(short)}</div>
      ${driverBlock()}
      <button type="button" class="chev-toggle${S.expanded ? ' is-up' : ''}" data-act="expand" aria-label="More">${icon('chevronDown', 18)}</button>${extra}</div>`;
}
function ontrip() {
  return `${topbar({ editable: false })}${fabs(290, null)}
    <div class="sheet"><button type="button" class="handle" aria-hidden="true" tabindex="-1"></button>
      <h2 class="c">Arriving at <span data-live="arrive">${clock(inMin(S.eta))}</span></h2>
      <div class="sub c" style="margin-bottom:4px">Heading to ${esc(S.dest.name)}</div>
      ${driverBlock()}
      ${btn(`${icon('edit', 17)}Edit drop-off`, { block: true, cls: 'soft', act: 'editdest' })}</div>`;
}
function complete() {
  const q = S.quote, tips = [0, 2, 5, 10];
  return `<div class="page"><div class="page-scroll" style="padding-top:20px">
    <div class="center-state" style="padding-bottom:8px"><small>YOU'VE ARRIVED</small><b>${esc(S.dest.name)}</b>${carSide(180)}</div>
    <div class="kv-row"><span>Revel EV · ${q.tripMin} min, ${q.miles} mi</span><b>${usd(q.price)}</b></div>
    <div class="kv-row"><span class="muted">Charged to ···· ${CARDS[S.card].last}</span>${q.discount ? `<span class="neg" style="color:var(--money)">Saved ${usd(q.discount)}</span>` : ''}</div>
    <div class="sec" style="justify-content:center"><h3>How was your ride with ${esc(S.driver.name)}?</h3></div>
    <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${S.rating >= n ? 'is-on' : ''}" data-star="${n}" aria-label="${n} stars">${icon('star', 34)}</button>`).join('')}</div>
    <div class="sec"><h3 style="font-size:14.5px">Add a tip</h3><span class="muted" style="font-size:12.5px">100% goes to ${esc(S.driver.name)}</span></div>
    <div class="tips">${tips.map(t => `<button type="button" class="${S.tip === t ? 'is-on' : ''}" data-tip="${t}">${t ? '$' + t : 'No tip'}</button>`).join('')}</div>
    ${primary('Done', 'done')}</div></div>`;
}
function cancelreq() {
  return `${topbar()}<div class="sheet"><div class="center-state"><small>CANCELLATION REQUESTED</small><b>We're working on it...</b><span class="spinner lg"></span></div></div>`;
}

/* ---------- overlays ---------- */
function overlay() {
  switch (S.overlay) {
    case 'drawer': return `<div class="scrim" data-act="closeoverlay"></div><aside class="drawer">
        <div class="me" style="padding:0"><span class="addphoto">Add<br>Photo</span></div>
        <div style="margin-top:12px"><b style="font-size:19px">${esc(RIDER.name)}</b><br><button type="button" class="rv-btn rv-btn-ghost" style="padding:0;height:auto;color:var(--link)" data-tab="account">View profile</button></div>
        <nav>${[['gift', 'Refer a friend', 'refer'], ['tag', 'Redeem promo code', 'tab:discounts'], ['card', 'Payment', 'pay'], ['receipt', 'Receipts', 'tab:trips'], ['help', 'Help', 'toast:Support will text you shortly'], ['settings', 'Settings', 'tab:account']]
          .map(([ic, l, a]) => `<button type="button" ${a.includes(':') ? `data-${a.split(':')[0]}="${a.split(':')[1]}"` : `data-act="${a}"`}>${icon(ic, 19)}${l}</button>`).join('')}</nav>
        <a class="foot" href="../driver/index.html">Apply to be a revel driver ${icon('arrow', 17)}</a></aside>`;
    case 'edit': return `<div class="scrim" data-act="closeoverlay"></div><div class="action-sheet">
        <button type="button" data-act="editpickup">Edit pickup</button><button type="button" data-act="editdest">Add or edit drop-off</button>
        <button type="button" data-act="cancelride">Cancel ride</button><button type="button" data-act="closeoverlay">Close</button></div>`;
    case 'pay': return `<div class="scrim" data-act="closeoverlay"></div><div class="bsheet"><button type="button" class="handle" data-act="closeoverlay" aria-label="Close"></button><h3>Payment</h3>
        ${CARDS.map((c, i) => `<button type="button" class="radio-row" data-card="${i}">${cardMark(c)}<span>···· ${c.last}<small class="faint" style="display:block;font-size:12px">Expires ${c.exp}</small></span>${S.card === i ? `<span class="tick">${icon('check', 20)}</span>` : ''}</button>`).join('')}
        <button type="button" class="radio-row" data-toast="Adding a card isn’t in this prototype">${icon('plus', 20)}<span>Add payment method</span></button></div>`;
    case 'refer': return `<div class="scrim" data-act="closeoverlay"></div><div class="bsheet"><button type="button" class="handle" data-act="closeoverlay" aria-label="Close"></button>
        <div class="refer" style="margin:4px 0 14px;cursor:default"><b>Refer a friend, Get $20</b>${carSide(170)}</div>
        <p>Give friends $20 off their first ride. You get $20 in ride credit when they take it.</p>
        <div class="searchbar" style="justify-content:space-between;padding:0 6px 0 16px"><b style="letter-spacing:.08em">ALEX20</b>${btn('Copy', { cls: 'rv-btn-ghost', act: 'copycode' })}</div>
        ${primary('Share invite link', 'share')}</div>`;
    case 'discount': return `<div class="scrim" data-act="closeoverlay"></div><div class="bsheet"><button type="button" class="handle" data-act="closeoverlay" aria-label="Close"></button>
        <div class="disc-row" style="cursor:default">${icon('tag', 17)}40% off rides</div>
        <p style="margin-top:14px">40% off the fare on every ride, up to $40 per ride. Booking fee, tolls and airport fees aren't discounted.</p>
        <p class="muted" style="font-size:13px">Applied automatically at checkout · Expires Oct 31</p>${primary('Got it', 'closeoverlay')}</div>`;
    case 'text': return `<div class="scrim" data-act="closeoverlay"></div><div class="bsheet"><button type="button" class="handle" data-act="closeoverlay" aria-label="Close"></button>
        <h3>Text ${esc(S.driver.name)}</h3><p class="muted" style="font-size:13px">Your number stays private — texts go through Revel.</p>
        ${["I'm outside", 'On my way down', 'I have luggage', 'Please call me'].map(m => `<button type="button" class="radio-row" data-sendtext="${esc(m)}">${icon('message', 18)}<span>${esc(m)}</span></button>`).join('')}</div>`;
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
  return `<div class="scrim" data-act="closeoverlay"></div><div class="bsheet"><button type="button" class="handle" data-act="closeoverlay" aria-label="Close"></button>
    <h3>Schedule a ride</h3><p class="muted" style="font-size:13px">Reserve up to a week ahead. We'll find you a driver before your pickup time.</p>
    <div class="daychips">${days.map((d, i) => `<button type="button" class="${i === sel ? 'is-on' : ''}" data-day="${i}">${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b></button>`).join('')}</div>
    <label class="field" style="margin-top:14px"><span>Pickup time</span><select id="schedtime">${slots.map((t, i) => `<option value="${t.getTime()}"${i === 4 ? ' selected' : ''}>${clock(t)}</option>`).join('')}</select></label>
    ${primary('Set pickup time', 'setschedule')}${S.when ? btn('Pick up now instead', { block: true, cls: 'soft', act: 'clearschedule' }) : ''}</div>`;
}
function dialog() {
  const d = S.dialog;
  return `<div class="dialog-wrap"><div class="dialog" role="alertdialog" aria-label="${esc(d.title)}"><h3>${esc(d.title)}</h3><p>${esc(d.body)}</p>
    ${d.buttons.map(([label, act, outline]) => btn(label, { variant: outline ? 'secondary' : 'primary', block: true, act, cls: outline ? 'outline' : '' })).join('')}</div></div>`;
}
const DIALOGS = {
  cancel: { title: 'Cancel this ride?', body: 'Your driver is on the way. Are you sure you want to cancel your ride?', buttons: [['Call driver', 'call'], ['Edit pickup', 'editpickup'], ['Yes, cancel', 'yescancel'], ['No, go back', 'closedialog', true]] },
  drivercancel: { title: 'Your ride has been cancelled', body: "Sorry, your driver had to cancel. You won't be charged for this ride.", buttons: [['OK', 'dialoghome']] },
  nomatch: { title: 'Your ride has been canceled', body: "Sorry, demand is high right now and we couldn't match you with a driver. You won't be charged for this ride.", buttons: [['OK', 'dialoghome']] },
  oops: { title: 'Oops!', body: 'There was an issue. Please try again.', buttons: [['OK', 'closedialog']] }
};

/* =====================================================================
   Render
   ===================================================================== */
const ACTIVE = ['confirming', 'matching', 'enroute', 'arrived', 'ontrip', 'cancelreq'];
const MAP_SCREENS = ['options', 'pickup', 'mapselect', 'reprice', 'confirming', 'matching', 'enroute', 'arrived', 'ontrip', 'cancelreq'];
let lastScene = '';
function render(refit = true) {
  const scr = {
    splash: () => '<div class="splash"><span class="wordmark">revel</span></div>',
    home: () => ({ home, discounts, trips, account }[S.tab])(), search, airline, options, pickup: pickupScreen, mapselect: pickupScreen, reprice,
    confirming, matching, enroute, arrived: enroute, ontrip, complete, cancelreq, receipt
  }[S.screen] || home;
  ui.innerHTML = scr() + (S.overlay ? overlay() : '') + (S.dialog ? dialog() : '') +
    (S.notif ? `<div class="notif" data-act="closenotif"><span class="app">r</span><div><b>${esc(S.notif.title)} <small>· now</small></b><span>${esc(S.notif.body)}</span></div></div>` : '') +
    (S.toast ? `<div class="toast-slot">${toastEl(S.toast.msg, S.toast.title)}</div>` : '');
  mapEl.style.visibility = MAP_SCREENS.includes(S.screen) ? '' : 'hidden';
  const key = S.screen + '|' + (S.quoteReady ? 1 : 0) + '|' + (S.dest?.name || '') + '|' + (S.pickup?.name || '') + '|' + S.expanded + '|' + (S.busy ? 1 : 0);
  const sheet = $('#ui .sheet');
  if (sheet) document.querySelectorAll('#ui .fab').forEach(f => { f.style.bottom = Math.min(sheet.offsetHeight + 12, pxH() - 120) + 'px'; });
  placeCenterPin();
  if (MAP.ready && refit && key !== lastScene) { lastScene = key; scene(); }
  if (S.screen === 'search') focusField();
  syncHash(); renderDemo();
}

// map contents + camera for each map screen
function scene() {
  const sheetH = $('#ui .sheet')?.offsetHeight || 260;
  const top = 70, bottom = sheetH;
  const pickRing = (label) => ({ t: 'ring', ll: S.pickup.ll, label });
  const dropRing = (label) => ({ t: 'ring', ll: S.dest.ll, drop: true, label, tone: 'cyan' });
  const trip = () => ({ kind: 'trip', pts: routeW(S.pickup.ll, S.dest.ll, S.stop?.ll) });
  switch (S.screen) {
    case 'options': case 'reprice': {
      const q = S.screen === 'reprice' ? S.newQuote : S.quote;
      if (S.outcome === 'nocars' && S.quoteReady && !S.when) {
        setRoutes([]); setMarks([{ t: 'user', ll: GPS, label: 'No cars available' }]);
        return flyTo(camAt(GPS, 70, (pxH() - bottom) / 2 + 20));
      }
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
      if (waiting !== S.drive.waiting) { S.drive.waiting = waiting; const pill = m.el.querySelector('.pill'); if (pill && !waiting) pill.remove(); }
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
  go('matching', { progress: 0, busy: false });
  const busy = S.outcome === 'busy' || S.outcome === 'nocars';
  let secondRound = false;
  every(300, () => {
    S.progress = Math.min(1, S.progress + (busy ? 0.034 : 0.04));
    const bar = $('#prog'); if (bar) bar.style.width = S.progress * 100 + '%';
    if (S.progress < 1) return;
    if (!busy) { clearTimers(); return matched(); }
    if (!secondRound) {
      secondRound = true; S.busy = true; S.progress = 0.04;
      const t = $('[data-live="mtitle"]'), sub = $('[data-live="msub"]');
      if (t) t.textContent = 'It is busier than usual';
      if (sub) sub.textContent = 'Thanks for your patience';
      return;
    }
    clearTimers();
    notify('Your ride has been canceled', "Sorry, demand is high right now and we couldn't match you with a driver. You won't be charged for this ride.");
    S.dialog = DIALOGS.nomatch; render(false);
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
  if (S.outcome === 'drivercancel') later(5200, () => { clearTimers(); cancelAnimationFrame(carRAF); S.dialog = DIALOGS.drivercancel; render(false); });
}
function tickEta() {
  if (S.screen === 'enroute') {
    S.eta = Math.max(0, S.eta - 1);
    const pill = markById('pk')?.el.querySelector('.pill');
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
  const el = e.target.closest('[data-act],[data-tab],[data-saved],[data-recent],[data-result],[data-airline],[data-clear],[data-card],[data-receipt],[data-toast],[data-star],[data-tip],[data-day],[data-seg],[data-sendtext],[data-cancelup],[data-jump],[data-outcome]');
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
  if (d.outcome) return;

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
    case 'dialoghome': return goHome();
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
    case 'demopanel': S.demoOpen = !S.demoOpen; return renderDemo();
    case 'oops': S.dialog = DIALOGS.oops; return render(false);
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
document.addEventListener('change', (e) => {
  if (e.target.name === 'outcome') { S.outcome = e.target.value; if (S.screen === 'options') { lastScene = ''; render(); } else renderDemo(); }
  if (e.target.name === 'promo') { S.promo = e.target.checked; if (S.dest) S.quote = quote(S.pickup, S.dest, S.stop); lastScene = ''; render(); }
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
  const OUT = [['match', 'Driver found', 'Matched in ~8s'], ['busy', 'Busier than usual', 'No match, ride cancelled'],
    ['drivercancel', 'Driver cancels', 'After matching'], ['nocars', 'No cars available', 'Demand is high']];
  demoEl.classList.toggle('is-open', S.demoOpen);
  demoEl.innerHTML = `<h3>Revel · rider</h3>
    <p>Rebuilt from rider-side screen recordings, Sep 2024 – Feb 2025. Pickup, trip and receipt screens after the driver arrives weren't recorded and are inferred.</p>
    <h4>When you request a ride</h4>
    ${OUT.map(([v, l, s]) => `<label class="opt"><input type="radio" name="outcome" value="${v}"${S.outcome === v ? ' checked' : ''}><span>${l}<small>${s}</small></span></label>`).join('')}
    <label class="opt"><input type="checkbox" name="promo"${S.promo ? ' checked' : ''}><span>40% off rides discount</span></label>
    <h4>Jump to</h4>
    <div class="jumps">${JUMPS.map(([k, l]) => btn(l, { cls: jumpKey() === k ? 'is-on' : '', attrs: { 'data-jump': k } })).join('')}</div>
    <h4>Other</h4>
    <div class="jumps">${btn(S.fast ? 'Fast timers: on' : 'Fast timers: off', { act: 'fast', cls: S.fast ? 'is-on' : '' })}${btn('"Oops!" error', { act: 'oops' })}${btn('Reset', { act: 'reset' })}</div>
    <p style="margin-top:16px">Drag the map on Confirm pickup to move the pin. Scroll to zoom. <a href="../index.html">All prototypes</a></p>`;
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
    const oc = S.outcome; S.outcome = 'match'; matched(); S.outcome = oc;
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
