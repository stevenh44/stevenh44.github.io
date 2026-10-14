/* Revel prototype — deterministic mock data.
   All names, numbers, licences and addresses are fabricated.
   Same seed → same dataset every load, so screenshots stay stable. */

// ---------- deterministic PRNG ----------
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry(20250825);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pickw = (pairs) => { // [[value, weight], ...]
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
  return pairs[0][0];
};
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const money = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
const chance = (p) => rnd() < p;
const id = (p) => p + Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, '0');

// ---------- name pools (fictional) ----------
const FIRST = [
  'Tashi','Pemba','Ngawang','Dawa','Karma','Sonam','Tenzin','Nima',
  'Amadou','Ousmane','Ibrahima','Mamadou','Moussa','Cheikh','Abdoulaye','Seydou',
  'Rakesh','Harpreet','Gurmeet','Baljit','Manpreet','Navdeep','Jaspreet','Simran',
  'Luis','Rafael','Miguel','Ernesto','Javier','Rosalia','Marisol','Ivan',
  'Dmitri','Vasyl','Andrei','Oleh','Bogdan','Stefan','Milos','Goran',
  'Ahmed','Mahmoud','Youssef','Karim','Samir','Tarek','Nasser','Hicham',
  'Kwame','Kofi','Yaw','Kojo','Abena','Adwoa','Efua','Nana',
  'Dorje','Lhakpa','Phurba','Rinzin','Yangchen','Tsering','Norbu','Chodak',
  'Marcus','Andre','Terrence','Darnell','Jerome','Curtis','Lamar','Desmond',
  'Wei','Jian','Hao','Feng','Li','Ming','Cheng','Bo'
];
const LAST = [
  'Sherpa','Lama','Tamang','Gurung','Bhattarai','Bajracharya','Thapa','Rai',
  'Diallo','Traore','Keita','Sow','Barry','Camara','Sylla','Bah',
  'Singh','Gill','Dhillon','Sandhu','Brar','Grewal','Bains','Sekhon',
  'Reyes','Castillo','Mendoza','Peralta','Guzman','Rosario','Ventura','Almonte',
  'Kovalenko','Petrov','Novak','Horvat','Maric','Ilic','Radev','Popa',
  'El Amrani','Haddad','Nasr','Bouazizi','Ben Salah','Rachid','Khalil','Ziani',
  'Mensah','Boateng','Asante','Owusu','Adjei','Darko','Agyeman','Osei',
  'Dorjee','Wangdu','Tenzing','Palden','Norzin','Lhamo','Gyatso','Choedon',
  'Whitfield','Baptiste','Armah','Coleridge','Prentice','Vaughn','Sealy','Ellison',
  'Zhang','Chen','Huang','Zhao','Xu','Sun','Guo','Luo'
];
const usedNames = new Set();
function name() {
  for (let i = 0; i < 60; i++) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) { usedNames.add(n); return n; }
  }
  return `${pick(FIRST)} ${pick(LAST)} ${usedNames.size}`;
}

const STREETS_NY = ['E 59th St','Ditmars Blvd','Northern Blvd','Roosevelt Ave','Ocean Pkwy','Rockaway Ave','Fresh Pond Rd','Grand Concourse','Utica Ave','Astoria Blvd','Jamaica Ave','Bay Ridge Pkwy','Kissena Blvd','Webster Ave','Flatbush Ave'];
const HOODS_NY = [['Brooklyn','112'],['Queens','113'],['Bronx','104'],['New York','100'],['Elmhurst','113'],['Astoria','111'],['Flushing','113'],['Jamaica','114']];
const STREETS_LA = ['S Figueroa St','Sunset Blvd','Vermont Ave','Pico Blvd','Olympic Blvd','Sepulveda Blvd','Ventura Blvd','Crenshaw Blvd','Wilshire Blvd','Alvarado St'];
const HOODS_LA = [['Los Angeles','900'],['Inglewood','903'],['Van Nuys','914'],['Long Beach','908'],['Pasadena','911'],['Torrance','905']];

function address(market) {
  const [city, zip3] = market === 'ny' ? pick(HOODS_NY) : pick(HOODS_LA);
  const st = market === 'ny' ? pick(STREETS_NY) : pick(STREETS_LA);
  return {
    line1: `${int(20, 4899)} ${st}`,
    city,
    state: market === 'ny' ? 'NY' : 'CA',
    zip: `${zip3}${int(10, 99)}`
  };
}

// ---------- reference data ----------
const DEPOTS = {
  ny: ['Pfizer Building', 'Via', 'Dime', 'JACX'],
  la: ['Pfizer Building', 'Via', 'Dime', 'JACX']
};

const FLEETIO = ['Active','At Bodyshop','At Dealer','Compliance','In Shop','Isolation','New Delivered And Inspected','Out Of Service','Project Vehicles','Ready For Pick Up','Vehicle Prep','Weekly','Unknown'];
const FLEETIO_W = [['Active',34],['Ready For Pick Up',20],['Isolation',14],['At Bodyshop',9],['Project Vehicles',7],['Weekly',5],['In Shop',4],['Compliance',3],['Vehicle Prep',2],['Out Of Service',1],['At Dealer',1],['Unknown',12]];

const MODELS = [
  { make: 'Tesla', model: 'Model 3', colors: ['Blue','White','Black'], w: 55 },
  { make: 'Tesla', model: 'Model Y', colors: ['Blue','White','Grey'], w: 36 },
  { make: 'Kia',   model: 'Niro EV', colors: ['White','Silver'],      w: 9  }
];

// Performance tracks — PRD names, shipped labels
const TRACKS = [
  { key: 'attendance', label: 'Time/Attendance', prd: 'Scheduling & Attendance' },
  { key: 'vehicle',    label: 'Vehicle Usage',   prd: 'Vehicle Usage & Accountability' },
  { key: 'safety',     label: 'Safety/Behavior', prd: 'Driver Safety' },
  { key: 'metrics',    label: 'Metrics',         prd: 'Driver Metrics' }
];

// Incident taxonomy — confirmed point values from the console dropdown,
// remainder drawn from the Performance Management PRD's category list.
const INCIDENT_TYPES = [
  // Time & Attendance
  { t: 'attendance', n: 'No call, no show',              p: 2, days: 90, policy: 'Attendance Reminder: Failing to appear for a scheduled shift without notice. Cancel at least 4 hours ahead if you cannot make your shift.' },
  { t: 'attendance', n: 'Uber availability below target', p: 3, days: 60, policy: 'You must remain online and available on the Uber platform for at least 85% of your scheduled shift, excluding approved breaks.' },
  { t: 'attendance', n: 'Late shift cancellation',        p: 1, days: 30, policy: 'Shifts cancelled fewer than 4 hours before start are recorded as late cancellations.' },
  { t: 'attendance', n: 'Late arrival',                   p: 1, days: 14, policy: 'Attendance Reminder: Arriving over 30 minutes late requires prior approval. Make sure to follow your schedule or request approval in advance for any changes.' },
  { t: 'attendance', n: 'Early departure',                p: 1, days: 14, policy: 'Ending a shift more than 30 minutes early without prior approval.' },
  { t: 'attendance', n: 'Extended rest break',            p: 1, days: 30, policy: 'Rest breaks are 10 minutes. Breaks running long reduce availability for riders.' },
  { t: 'attendance', n: 'Extended meal break',            p: 1, days: 30, policy: 'Meal breaks are 30 minutes and unpaid. Breaks over 60 minutes are recorded.' },
  // Vehicle Usage & Accountability
  { t: 'vehicle', n: 'Unreported vehicle damage',  p: 3, days: 180, policy: 'Any damage must be reported before the end of the shift in which it occurred.' },
  { t: 'vehicle', n: 'Parking ticket',             p: 1, days: 90,  policy: 'Parking violations incurred while the vehicle is assigned to you are your responsibility.' },
  { t: 'vehicle', n: 'Vehicle returned uncharged', p: 1, days: 30,  policy: 'Vehicles must be returned above 30% state of charge.' },
  { t: 'vehicle', n: 'Vehicle cleanliness',        p: 1, days: 30,  policy: 'Vehicles must be returned free of personal items and refuse.' },
  { t: 'vehicle', n: 'Tow or impound',             p: 3, days: 180, policy: 'Vehicles towed or impounded due to driver action.' },
  { t: 'vehicle', n: 'Camera policy violation',    p: 2, days: 90,  policy: 'The in-cabin camera may not be obstructed or disabled at any time, on or off shift.' },
  // Driver Safety
  { t: 'safety', n: 'Distracted driving',            p: 1, days: 30,  policy: 'Handling a mobile device while the vehicle is in motion.' },
  { t: 'safety', n: 'Harsh braking or acceleration', p: 1, days: 30,  policy: 'Telematics-detected events above the safe threshold.' },
  { t: 'safety', n: 'Speeding',                      p: 2, days: 90,  policy: 'Travelling more than 10 mph above the posted limit.' },
  { t: 'safety', n: 'Drowsy driving',                p: 2, days: 90,  policy: 'Telematics-detected fatigue events.' },
  { t: 'safety', n: 'Moving violation',              p: 2, days: 180, policy: 'Citations issued by a law enforcement agency while on shift.' },
  { t: 'safety', n: 'At-fault collision',            p: 3, days: 365, policy: 'Collisions where Revel is determined to be at fault.' },
  { t: 'safety', n: 'Driving under the influence (DUI)', p: 5, days: null, policy: 'Zero tolerance. Operating a Revel vehicle under the influence of drugs or alcohol.' },
  // Driver Metrics
  { t: 'metrics', n: 'Low customer rating',          p: 2, days: 60, policy: 'A rolling rating below 4.6 across your last 50 rated trips.' },
  { t: 'metrics', n: 'High cancellation rate',       p: 2, days: 60, policy: 'Cancelling more than 8% of accepted trips.' },
  { t: 'metrics', n: 'Negative customer complaint',  p: 1, days: 60, policy: 'A substantiated rider complaint about conduct or service.' },
  { t: 'metrics', n: 'High rejection rate',          p: 1, days: 30, policy: 'Declining more than 30% of offered trips while online.' }
];

// Restriction reasons — verbatim from the PRD's restriction table
const RESTRICTIONS = [
  { k: 'phone',     n: 'Verify Phone Number',         svc: 'both',     group: 'Profile',          phase: 0, sys: null,      driver: 'Verify phone number' },
  { k: 'email',     n: 'Verify Email Address',        svc: 'rideshare',group: 'Profile',          phase: 1, sys: null,      driver: 'Verify email address' },
  { k: 'address',   n: 'Address Capture',             svc: 'rideshare',group: 'Profile',          phase: 1, sys: 'Google',  driver: 'Add address' },
  { k: 'tlc',       n: 'Invalid TLC',                 svc: 'rideshare',group: 'Profile',          phase: 1, sys: 'OpenData',driver: 'Add TLC license' },
  { k: 'dmv',       n: 'Invalid DMV',                 svc: 'rideshare',group: 'Profile',          phase: 1, sys: 'OpenData',driver: "Add driver's license" },
  { k: 'w9',        n: 'Abound worker verification',  svc: 'rideshare',group: 'Documents',        phase: 2, sys: 'Abound',  driver: 'Complete W9 form' },
  { k: 'services',  n: 'Sign Legal Documents',        svc: 'rideshare',group: 'Documents',        phase: 2, sys: 'DocuSign',driver: 'Review services agreement' },
  { k: 'arb',       n: 'Sign Legal Documents',        svc: 'rideshare',group: 'Documents',        phase: 2, sys: 'DocuSign',driver: 'Review mutual arbitration agreement' },
  { k: 'checkr',    n: 'Background Check',            svc: 'rideshare',group: 'Documents',        phase: 2, sys: 'Checkr',  driver: 'Complete background check' },
  { k: 'branch',    n: 'Branch wallet activated',     svc: 'rideshare',group: 'How you get paid', phase: 2, sys: 'Branch',  driver: 'Set up Branch account' },
  { k: 'leasing',   n: 'Revel Leasing account',       svc: 'rideshare',group: 'Vehicle',          phase: 3, sys: 'Stripe',  driver: 'Set up Revel Leasing account' },
  { k: 'insurance', n: 'Insurance Approval',          svc: 'rental',   group: 'Rental Terms of Use', phase: 1, sys: 'ADIC', driver: 'Insurance approval' },
  { k: 'tou',       n: 'Sign TOU Agreement',          svc: 'rental',   group: 'Rental Terms of Use', phase: 3, sys: 'DocuSign', driver: 'Agree to Terms of Use' },
  { k: 'card',      n: 'Stripe Payment Method Added', svc: 'rental',   group: 'Payment',          phase: 3, sys: 'Stripe',  driver: 'Add payment method' },
  { k: 'deposit',   n: 'Stripe Security Deposit Paid',svc: 'rental',   group: 'Payment',          phase: 3, sys: 'Stripe',  driver: 'Pay security deposit' },
  { k: 'failedinv', n: 'Stripe Failed Invoice',       svc: 'rental',   group: 'Payment',          phase: null, sys: 'Stripe', driver: 'Resolve outstanding invoice' },
  { k: 'offboard',  n: 'Off-boarding',                svc: 'rental',   group: 'Inactive Account', phase: null, sys: null,   driver: 'Contact support' }
];

const ALERT_TYPES = [
  'Failed to start shift','Extended meal break','Extended rest break',
  'Excessive offline time','Late Clock Out','High rejection rate',
  'Consecutive ride cancellations','Vehicle outside allowed area',
  'Offline in Revel + Online in Uber','Online in Revel + Offline in Uber'
];

const SHIFT_LIVE = ['ACCIDENT','ISSUE','VEHICLE CHECK','AVAILABLE','PICKUP','MIDDLE STOP','DROPOFF','OFFLINE'];
const SHIFT_INACTIVE = ['SCHEDULED','STANDBY','NO SHOW','CANCELED','COMPLETE'];

// fictional ops reviewers — no real colleagues
const OPS_STAFF = ['R. Okonjo','T. Vasquez','M. Ferreira','D. Whitlock','A. Nakamura','P. Brennan'];

// ---------- dates ----------
const TODAY = new Date('2025-08-25T12:00:00');
const day = (offset) => { const d = new Date(TODAY); d.setDate(d.getDate() + offset); return d; };
const iso = (d) => d.toISOString();
const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
const fmtDT = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
const fmtWeekday = (d) => d.toLocaleDateString('en-US', { weekday: 'long' });

// ---------- generators ----------
// Where Revel's cars actually were: weighted clusters over the neighborhoods and airports it
// served, so a map of hundreds of live shifts reads like the real fleet, not noise in a box.
const NY_CLUSTERS = [
  [40.754, -73.984, 0.016, 0.012, 16], // Midtown
  [40.722, -73.998, 0.012, 0.010, 10], // Lower Manhattan / SoHo
  [40.790, -73.960, 0.016, 0.010, 7],  // Upper East & West Side
  [40.690, -73.985, 0.010, 0.010, 9],  // Downtown Brooklyn
  [40.714, -73.955, 0.010, 0.010, 8],  // Williamsburg / Greenpoint
  [40.672, -73.960, 0.016, 0.014, 9],  // Park Slope / Crown Heights
  [40.752, -73.925, 0.012, 0.012, 8],  // Long Island City / Astoria
  [40.749, -73.885, 0.010, 0.012, 5],  // Jackson Heights
  [40.774, -73.872, 0.004, 0.006, 6],  // LaGuardia
  [40.645, -73.785, 0.006, 0.010, 6],  // JFK
  [40.835, -73.915, 0.014, 0.012, 4],  // South Bronx
  [40.630, -74.010, 0.012, 0.012, 4]   // Bay Ridge / Sunset Park
];
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function nyPoint() {
  const c = pickw(NY_CLUSTERS.map(x => [x, x[4]]));
  return { lat: c[0] + gauss() * c[2], lng: c[1] + gauss() * c[3] };
}

function makeVehicles(market, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = pickw(MODELS.map(x => [x, x.w]));
    const plate = market === 'ny'
      ? 'T' + int(100000, 899999) + 'C'
      : ['KIA','TSL','RVL'][int(0,2)] + String(int(1, 9999)).padStart(4, '0');
    out.push({
      id: id('veh_'), market, plate,
      make: m.make, model: m.model, color: pick(m.colors),
      year: int(2020, 2024),
      vin: (m.make === 'Tesla' ? '5YJ' : 'KNDC') + Math.random().toString(36).slice(2, 10).toUpperCase() + int(100000, 999999),
      battery: Math.round((0.35 + rnd() * 0.65) * 100),
      fleetio: pickw(FLEETIO_W),
      assigned: false,
      insurance: market === 'ny' ? pick(['ADIC','UNK']) : pick(['LA Insurance','ADIC']),
      telematics: m.make === 'Tesla' ? 'tesla' : 'smartcar',
      controllable: m.make === 'Tesla',
      tlcBase: market === 'ny' ? pick(['Electric Peppers LLC','Revel Transit Inc','Gotham Fleet LLC']) : null,
      updatedMins: pickw([[int(1,59),40],[int(60,1440),35],[int(1441,90000),25]]),
      ...(market === 'ny' ? nyPoint() : { lat: 33.93 + rnd() * 0.26, lng: -118.50 + rnd() * 0.40 })
    });
  }
  return out;
}

function makeIncidents(driver, count) {
  const out = [];
  let severeUsed = false;
  for (let i = 0; i < count; i++) {
    let type = pick(INCIDENT_TYPES);
    let guard = 0;
    while (type.p === 5 && severeUsed && guard++ < 12) type = pick(INCIDENT_TYPES);
    if (type.p === 5) severeUsed = true;
    const occurred = day(-int(1, 120));
    occurred.setHours(int(6, 22), pick([0, 6, 12, 18, 24, 31, 37, 43, 49, 55]), 0, 0);
    const created = new Date(occurred.getTime() + int(0, 36) * 3600e3);
    const expires = type.days ? new Date(created.getTime() + type.days * 864e5) : null;
    const isExpired = expires && expires < TODAY;
    let state = 'active';
    if (isExpired) state = 'expired';
    else if (chance(0.16)) state = pick(['dispute submitted','dispute approved','dispute denied','appeal submitted']);
    else if (chance(0.05)) state = 'waived';
    out.push({
      id: id('inc_'), driverId: driver.id,
      type: type.n, track: type.t, points: type.p, policy: type.policy,
      occurred, created, expires, state,
      notes: chance(0.3) ? [{ by: pick(OPS_STAFF), at: new Date(created.getTime() + 864e5), text: pick(['Reviewed telematics, event confirmed.','Called driver, left voicemail.','Driver acknowledged on call.','Pulled dashcam clip — inconclusive.','Second occurrence this month.']) }] : [],
      dispute: null
    });
  }
  // attach dispute threads where relevant
  out.forEach(inc => {
    if (['dispute submitted','dispute approved','dispute denied','appeal submitted'].includes(inc.state)) {
      inc.dispute = {
        submitted: new Date(inc.created.getTime() + int(1, 4) * 864e5),
        reason: pick(({
          attendance: [
            'I was on time, the app did not register my clock in.',
            'I took the full break, the timer never started.',
            'I called the depot two hours before my shift to cancel.',
            'The depot queue meant I could not clock in until 09:20.'
          ],
          vehicle: [
            'The vehicle was already damaged when I picked it up. I have photos.',
            'The charger at the depot was out of service, I have a photo of the fault light.',
            'The ticket was issued while the car was parked at the depot overnight.',
            'I returned the car clean — the next driver had it before this was logged.'
          ],
          safety: [
            'I was pulled over but no citation was issued.',
            'I braked hard because a cyclist ran the light in front of me.',
            'My phone was mounted, I never touched it while moving.',
            'The other driver merged into my lane, the dashcam shows it.'
          ],
          metrics: [
            'The rider was upset about the route, which the app chose.',
            'I cancelled those trips because the pickup pins were in a bus lane.',
            'My rating dropped after one rider complained about traffic.',
            'I was rejecting trips because I was on my scheduled meal break.'
          ]
        })[inc.track]),
        photos: chance(0.5) ? int(1, 3) : 0,
        resolution: inc.state === 'dispute approved' ? 'approved' : inc.state === 'dispute denied' ? 'denied' : null,
        rejectionReason: inc.state === 'dispute denied' || inc.state === 'appeal submitted'
          ? pick(['Telematics data confirms the event occurred as recorded.','No supporting evidence was provided within the review window.','Policy applies regardless of citation outcome.'])
          : null,
        appeal: inc.state === 'appeal submitted' ? {
          submitted: new Date(inc.created.getTime() + int(6, 10) * 864e5),
          reason: pick(['Attaching the photos I referenced in my first dispute.','I spoke to my ops manager who said this would be cleared.','Requesting review of the dashcam footage from that shift.']),
          photos: int(1, 2)
        } : null
      };
    }
  });
  return out.sort((a, b) => b.occurred - a.occurred);
}

function trackLevels(incidents) {
  const lv = {};
  TRACKS.forEach(t => lv[t.key] = 0);
  incidents.forEach(i => {
    if (i.state === 'active' || i.state === 'dispute denied') lv[i.track] += i.points;
  });
  TRACKS.forEach(t => lv[t.key] = Math.min(5, lv[t.key]));
  return lv;
}

function makeInvoices(driver, n) {
  const out = [];
  let d = day(-int(0, 6));
  for (let i = 0; i < n; i++) {
    const kind = pickw([['Weekly Rental', 46], ['Charging', 38], ['Traffic Violation', 9], ['Toll', 7]]);
    let charges, total;
    if (kind === 'Weekly Rental') {
      const fee = pick([475, 500, 525]); const ins = 25; const tax = Math.round(fee * 0.03885 * 100) / 100;
      charges = [['Rental Fee', fee], ['Insurance Premium', ins], ['Tax', tax]];
      total = Math.round((fee + ins + tax) * 100) / 100;
    } else if (kind === 'Charging') {
      const fee = money(38, 130); const tax = Math.round(fee * 0.037 * 100) / 100;
      charges = [[`Charging Fee`, fee], ['Tax', tax]];
      total = Math.round((fee + tax) * 100) / 100;
    } else if (kind === 'Toll') {
      const fee = money(6, 48);
      charges = [['Toll', fee]]; total = fee;
    } else {
      const fee = pick([50, 60.37, 115, 65]);
      charges = [['Violation', fee]]; total = fee;
    }
    const status = pickw([['PAID', 88], ['FAILED', 7], ['VOIDED', 5]]);
    out.push({
      id: id('in_'), date: new Date(d), kind, charges, total, status,
      stripeCustomer: 'cus_' + Math.random().toString(36).slice(2, 14),
      attempts: status === 'PAID' ? [{ card: 'Visa ending ' + int(1000, 9999), at: new Date(d), ok: true }]
        : status === 'FAILED' ? [{ card: 'Visa ending ' + int(1000, 9999), at: new Date(d), ok: false }] : []
    });
    d = new Date(d.getTime() - int(2, 6) * 864e5);
  }
  return out;
}

function makeDriver(market, i) {
  const nm = name();
  const joined = day(-int(30, 1500));
  const restrictionKeys = [];
  const statusRoll = pickw([['ACTIVE', 72], ['INACTIVE', 18], ['REVOKED', 10]]);
  if (statusRoll !== 'ACTIVE' || chance(0.12)) {
    const pool = RESTRICTIONS.filter(r => r.k !== 'offboard');
    const k = int(1, 5);
    for (let j = 0; j < k; j++) { const r = pick(pool); if (!restrictionKeys.includes(r.k)) restrictionKeys.push(r.k); }
  }
  const d = {
    id: id('drv_'), market, name: nm,
    email: nm.toLowerCase().replace(/[^a-z]+/g, '.') + pick(['@gmail.com', '@aol.com', '@outlook.com', '@yahoo.com']),
    phone: '+1' + (market === 'ny' ? pick(['917', '347', '646', '718', '929']) : pick(['213', '323', '424', '562', '818'])) + int(2000000, 9999999),
    status: statusRoll,
    type: market === 'ny' ? '1099' : 'W2',
    joined,
    address: address(market),
    dl: { number: String(int(100000000, 999999999)), expires: day(int(100, 1400)) },
    tlc: market === 'ny' ? { number: String(int(5000000, 6999999)), expires: day(int(60, 1200)) } : null,
    externalId: Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 18),
    insurance: market === 'ny' ? pick(['ADIC', 'None']) : 'LA Insurance',
    vehiclePreference: pickw([['Standard', 85], ['Large', 15]]),
    accidentInsurance: pickw([['Declined', 70], ['Enrolled', 30]]),
    subscriptionType: pickw([['None', 62], ['Weekly', 26], ['Daily', 12]]),
    subscriptionVehicle: 'None',
    restrictionKeys,
    hadShift: chance(0.88),
    deviceType: pickw([['ios', 72], ['android', 28]]),
    appVersion: pick(['2.67.0', '2.68.1', '2.69.2']),
    dayforceId: chance(0.4) ? String(int(100000, 999999)) : null
  };
  d.incidents = makeIncidents(d, pickw([[0, 30], [int(1, 2), 34], [int(3, 5), 24], [int(6, 11), 12]]));
  d.levels = trackLevels(d.incidents);
  d.maxLevel = Math.max(...Object.values(d.levels));
  d.perfStatus = d.maxLevel >= 5 ? 'Employment Review' : d.maxLevel >= 4 ? 'Warning' : 'Good';
  d.recurring = chance(0.55) ? (() => {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const startH = pick([5, 6, 9, 12, 16]);
    const dur = pick([6, 8, 8, 10]);
    const depot = pick(DEPOTS[market]);
    const n = int(2, 5);
    const picked = [];
    while (picked.length < n) { const dd = pick(days); if (!picked.includes(dd)) picked.push(dd); }
    return picked
      .sort((a, b) => days.indexOf(a) - days.indexOf(b))
      .map(dayName => ({ day: dayName, startH, dur, depot }));
  })() : [];
  d.invoices = makeInvoices(d, market === 'ny' ? int(6, 60) : 0);
  d.deposits = market === 'ny' && chance(0.6)
    ? [{ date: day(-int(200, 900)), amount: pick([200, 300, 500]), desc: 'Security Deposit' }] : [];
  d.tickets = chance(0.35)
    ? Array.from({ length: int(1, 5) }, () => ({ date: day(-int(30, 1100)), type: 'Moving', amount: pick([50, 65, 115, 138]) }))
      .sort((a, b) => b.date - a.date) : [];
  return d;
}

function makeShift(driver, date, vehicles) {
  const scheduled = pickw([['SCHEDULED', 30], ['COMPLETE', 42], ['CANCELED', 18], ['NO SHOW', 6], ['STANDBY', 4]]);
  const startH = pick([5, 6, 9, 10, 12, 13, 16, 17]);
  const dur = pick([6, 8, 8, 10, 12]);
  const start = new Date(date); start.setHours(startH, 0, 0, 0);
  const end = new Date(start.getTime() + dur * 3600e3);
  const done = scheduled === 'COMPLETE';
  const clockIn = done ? new Date(start.getTime() + int(-8, 40) * 60e3) : null;
  const clockOut = done ? new Date(end.getTime() + int(-30, 25) * 60e3) : null;
  const veh = done || scheduled === 'SCHEDULED' ? (chance(0.55) ? pick(vehicles) : null) : null;
  return {
    id: id('shf_'), driverId: driver.id, driver, date: new Date(date),
    status: scheduled,
    live: scheduled === 'SCHEDULED' && chance(0.62) ? pickw([['AVAILABLE', 44], ['PICKUP', 14], ['DROPOFF', 13], ['MIDDLE STOP', 8], ['OFFLINE', 12], ['VEHICLE CHECK', 6], ['ISSUE', 2], ['ACCIDENT', 1]]) : null,
    depot: pick(DEPOTS[driver.market]),
    start, end, dur,
    arrival: done ? new Date(clockIn.getTime() - int(0, 12) * 60e3) : null,
    clockIn, clockOut,
    vehicle: veh,
    estPay: pick([200, 200, 240, 260, 300, 330]),
    first: chance(0.08),
    note: chance(0.08) ? pick(['Driver called out — family emergency.', 'Swapped vehicle mid-shift.', 'Late due to depot queue.']) : null,
    breaks: done ? {
      meal: chance(0.85) ? { start: new Date(start.getTime() + 4.2 * 3600e3), mins: int(28, 74) } : null,
      rest1: chance(0.7) ? { start: new Date(start.getTime() + 2 * 3600e3), mins: int(9, 22) } : null,
      rest2: chance(0.45) ? { start: new Date(start.getTime() + 6.5 * 3600e3), mins: int(9, 18) } : null
    } : { meal: null, rest1: null, rest2: null }
  };
}

function makeTimeline(shift) {
  const ev = [];
  let t = new Date(shift.clockIn || shift.start);
  const n = int(8, 23);
  for (let i = 0; i < n; i++) {
    const kind = pickw([['Pickup', 44], ['Dropoff', 44], ['Unscheduled Break', 12]]);
    const assigned = new Date(t);
    const ack = kind === 'Pickup' ? new Date(t.getTime() + int(4, 90) * 1000) : null;
    const fin = new Date(t.getTime() + int(4, 26) * 60e3);
    ev.push({
      kind,
      state: chance(0.87) ? 'COMPLETED' : 'CANCELED',
      assigned, ack, fin,
      address: kind === 'Unscheduled Break' ? 'Please Park Safely'
        : `${int(10, 899)} ${pick(STREETS_NY)}, ${pick(['New York','Brooklyn','Queens','Bronx'])}, NY ${pick(['10001','11101','11201','10453','11373'])}`
    });
    t = new Date(fin.getTime() + int(2, 18) * 60e3);
  }
  return ev.reverse();
}

// ---------- assemble ----------
function build() {
  const data = { markets: {} };

  for (const market of ['ny', 'la']) {
    const nDrivers = market === 'ny' ? 1200 : 44;
    const nVeh = market === 'ny' ? 500 : 14;
    const vehicles = makeVehicles(market, nVeh);
    const drivers = Array.from({ length: nDrivers }, (_, i) => makeDriver(market, i));

    // one board per day, so the date picker has somewhere to go
    const boards = {};
    const boardSize = market === 'ny' ? 420 : 18;
    for (let off = -10; off <= 10; off++) {
      const dayShifts = [];
      const n = off > 0 ? Math.round(boardSize * 0.7) : boardSize + int(-6, 6);
      for (let i = 0; i < n; i++) {
        const sh = makeShift(drivers[int(0, drivers.length - 1)], day(off), vehicles);
        if (off > 0) { sh.status = pickw([['SCHEDULED', 86], ['CANCELED', 14]]); sh.live = null; sh.clockIn = null; sh.clockOut = null; sh.arrival = null; }
        // Today in New York is a peak hour: most scheduled drivers are on the road right now.
        if (off === 0 && market === 'ny' && chance(0.62)) {
          sh.status = 'SCHEDULED'; sh.clockOut = null;
          sh.live = pickw([['AVAILABLE', 44], ['PICKUP', 14], ['DROPOFF', 13], ['MIDDLE STOP', 8], ['OFFLINE', 12], ['VEHICLE CHECK', 6], ['ISSUE', 2], ['ACCIDENT', 1]]);
          if (!sh.vehicle) sh.vehicle = pick(vehicles);
        }
        dayShifts.push(sh);
      }
      boards[off] = dayShifts;
    }
    const shifts = boards[0];
    shifts.forEach(s => { if (s.vehicle) s.vehicle.assigned = true; });

    // per-driver shift history
    drivers.forEach(d => {
      d.shifts = Array.from({ length: market === 'ny' ? int(6, 24) : int(6, 40) }, (_, k) => makeShift(d, day(-k - 1), vehicles));
      const complete = d.shifts.find(s => s.status === 'COMPLETE');
      if (complete) complete.timeline = makeTimeline(complete);
    });

    // review queues
    const licenses = drivers.filter(() => chance(0.06)).slice(0, market === 'ny' ? 24 : 4).map(d => ({
      id: id('lic_'), driver: d, kind: pick(['DL', 'TLC']), submitted: day(-int(0, 18)),
      badPhoto: chance(0.12)
    }));
    const applications = Array.from({ length: market === 'la' ? 3 : 0 }, () => {
      const nm = name();
      return {
        id: id('app_'), name: nm, phone: '+1213' + int(2000000, 9999999),
        email: nm.toLowerCase().replace(/[^a-z]+/g, '.') + '@gmail.com',
        submitted: day(-int(1, 40)), hours: pick(['Part time', 'Full time'])
      };
    });
    const timeAdjust = drivers.flatMap(d => d.shifts.filter(s => s.status === 'COMPLETE' && chance(0.05)).slice(0, 1).map(s => ({
      id: id('ta_'), driver: d, shift: s, submitted: new Date(s.end.getTime() + int(1, 40) * 3600e3),
      driverNote: pick([
        'I took all my breaks as required but did not properly record them in the Revel App.',
        'The app would not let me clock out at the depot.',
        'I clocked in late because the vehicle was not ready.',
        'My meal break was interrupted by a ride request.'
      ]),
      issues: pick([['clock'], ['meal'], ['clock', 'meal'], ['meal', 'rest1']])
    }))).slice(0, market === 'la' ? 31 : 12);
    const disputes = drivers.flatMap(d => d.incidents.filter(i => i.dispute && ['dispute submitted', 'appeal submitted'].includes(i.state)).map(i => ({ id: i.id, driver: d, incident: i })))
      .slice(0, market === 'la' ? 9 : 16);
    const employmentReviews = drivers.filter(d => d.maxLevel >= 5).slice(0, market === 'la' ? 6 : 9)
      .map(d => ({ id: id('er_'), driver: d, entered: day(-int(0, 3)), tracks: TRACKS.filter(t => d.levels[t.key] >= 5).map(t => t.prd) }));
    const offboardings = market === 'ny' ? drivers.filter(() => chance(0.16)).slice(0, 41).map(d => ({
      id: id('ob_'), driver: d, requested: day(-int(28, 62)),
      amount: money(180, 520)
    })).map(o => ({ ...o, overdue: Math.max(0, Math.floor((TODAY - o.requested) / 864e5) - 30) })) : [];

    const alerts = drivers.filter(() => chance(0.08)).slice(0, market === 'la' ? 7 : 14).map(d => {
      const s = d.shifts.find(x => x.status === 'COMPLETE') || d.shifts[0];
      return {
        id: id('alr_'), driver: d, shift: s,
        type: pick(ALERT_TYPES),
        driverNotified: new Date(s.end.getTime() - int(10, 90) * 60e3),
        opsNotified: new Date(s.end.getTime() - int(0, 30) * 60e3),
        notes: chance(0.6) ? Array.from({ length: int(1, 4) }, () => ({
          by: pick(OPS_STAFF), at: day(-int(1, 40)),
          text: pick(['Called driver, no answer.', 'Driver says the app froze.', 'Third time this month — escalating.', 'Coached on call, will monitor.'])
        })) : []
      };
    });

    data.markets[market] = {
      key: market,
      name: market === 'ny' ? 'New York' : 'Los Angeles',
      tz: market === 'ny' ? 'EDT' : 'PDT',
      nav: market === 'ny'
        ? ['Shifts', 'Map', 'Vehicles', 'Drivers', 'Invoices', 'Reviews']
        : ['Shifts', 'Alerts', 'Vehicles', 'Drivers', 'Reviews'],
      reviewTabs: market === 'ny'
        ? ['Licenses', 'Offboardings']
        : ['Licenses', 'Applications', 'Time Adjustments', 'Disputes', 'Employment Reviews'],
      depots: DEPOTS[market],
      drivers, vehicles, shifts, boards,
      queues: { licenses, applications, timeAdjust, disputes, employmentReviews, offboardings },
      alerts
    };
  }

  // the demo driver used by the Revel Driver app
  const demo = data.markets.ny.drivers.find(d => d.status === 'ACTIVE' && d.restrictionKeys.length === 0)
            || data.markets.ny.drivers[0];
  data.demoDriver = demo;   // keeps its real name in the console; the driver app shows "Demo Mode"

  data.ref = { TRACKS, INCIDENT_TYPES, RESTRICTIONS, ALERT_TYPES, SHIFT_LIVE, SHIFT_INACTIVE, OPS_STAFF, FLEETIO, DEPOTS };
  data.fmt = { fmtDate, fmtDateShort, fmtTime, fmtDT, fmtWeekday, day, TODAY };
  return data;
}

export const DB = build();
export { TRACKS, INCIDENT_TYPES, RESTRICTIONS, ALERT_TYPES, SHIFT_LIVE, SHIFT_INACTIVE, OPS_STAFF, DEPOTS, FLEETIO,
         fmtDate, fmtDateShort, fmtTime, fmtDT, fmtWeekday, day, TODAY, money, int, pick, chance, id };
