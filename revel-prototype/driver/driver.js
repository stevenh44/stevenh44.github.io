import { DB, RESTRICTIONS, fmtTime, day, int, pick } from '../shared/seed.js?v=7';
import { esc, icon, btn, sideNav, banner as bannerEl, step, rideCard, otp as otpEl, actionBar,
         takeover as takeoverEl, toast as toastEl } from '../shared/ui.js?v=7';

const app = document.getElementById('app');
const usd = (n) => '$' + n.toFixed(2);
const clock = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase();

// ---------- session state ----------
const S = {
  screen: 'splash',        // splash | signin | otp | app | step
  page: 'ridehistory',     // ridehistory | onboarding | settings | help | profile | dev
  scenario: 'clear',       // clear | onboarding | restricted | sandbox | resubmit
  dayOffset: 0, openRide: null, takeover: null, toast: null, sheet: false,
  done: new Set(), capture: null, stepKey: null
};

// restriction sets seeded by each dev demo
const SCEN = {
  clear: [],
  onboarding: ['address', 'tlc', 'dmv', 'w9', 'services', 'arb', 'checkr', 'branch', 'leasing'],
  restricted: ['failedinv', 'checkr'],
  sandbox: ['w9', 'branch', 'leasing'],
  resubmit: ['dmv']
};
const openRestrictions = () => SCEN[S.scenario].filter(k => !S.done.has(k));

// ---------- rides (seeded per session) ----------
const RIDES = (() => {
  const days = {};
  for (let o = 0; o > -14; o--) {
    const rides = [];
    const n = int(0, 7);
    for (let i = 0; i < n; i++) {
      const kind = i > 0 && int(0, 99) < 18 ? pick(['Canceled', 'No Show']) : 'Ride';
      const at = day(o); at.setHours(int(7, 21), int(0, 55));
      if (kind === 'Ride') {
        const mins = int(8, 42), miles = +(mins * (0.32 + int(0, 34) / 100)).toFixed(1);
        const perMin = 0.33, perMile = 1.02;
        const fare = +(mins * perMin + miles * perMile).toFixed(2);
        const tip = int(0, 99) < 42 ? +(fare * (0.08 + int(0, 30) / 100)).toFixed(2) : 0;
        const tolls = int(0, 99) < 20 ? +(3 + int(0, 1200) / 100).toFixed(2) : 0;
        rides.push({ kind, at, mins, miles, perMin, perMile, fare, tip, tolls, total: +(fare + tip + tolls).toFixed(2), fee: +(8 + int(0, 90) / 10).toFixed(1) });
      } else rides.push({ kind, at, total: kind === 'Canceled' ? 12 : 15 });
    }
    days[o] = rides.sort((a, b) => a.at - b.at);
  }
  return days;
})();

// ---------- chrome ----------
const NAV = [
  { key: 'ridehistory', label: 'Ride history', icon: 'history' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
  { key: 'help', label: 'Help', icon: 'help' },
  { key: 'dev', label: 'Dev settings', icon: 'dev' }
];

function banner() {
  if (!openRestrictions().length) return '';
  return S.scenario === 'restricted'
    ? bannerEl('warn', 'ACCOUNT RESTRICTED', 'onboarding')
    : bannerEl('alert', 'Onboarding incomplete', 'onboarding');
}

function shell(inner, o = {}) {
  const foot = `<div class="foot-mark"><div><div class="name">revel</div><div class="sub">DRIVER</div></div>
    <a href="../index.html">Exit Demo ${icon('arrow', 13)}</a></div>`;
  return `<div class="shell">
    ${sideNav({ items: NAV, active: S.page, onboarding: openRestrictions().length > 0, version: 'v2.69.2', foot })}
    <div class="body">
      ${o.banner || ''}
      <div class="pagehead"><span>${esc(o.title || '')}</span>${o.close
        ? `<button type="button" class="close-btn" data-act="${o.closeAct || 'back'}" aria-label="Close">${icon('close', 18)}</button>` : ''}</div>
      <div class="scroller"><div class="col ${o.narrow ? 'narrow' : ''}">${inner}</div></div>
      ${o.action || ''}
    </div></div>`;
}
const primary = (label, act, extra = {}) => btn(label, { variant: 'primary', block: true, act, ...extra });
const secondary = (label, act, extra = {}) => btn(label, { block: true, act, ...extra });

// ---------- splash, sign in ----------
function splash() {
  return `<div class="splash">
    <div class="wordmark"><div class="name">revel</div><div class="sub">DRIVER</div></div>
    <div class="road"></div>
    <svg class="car" viewBox="0 0 180 70" width="150" height="58" aria-hidden="true">
      <path class="body" d="M14 50c-5 0-8-3-8-8l1-7c0-3 2-5 5-6l18-4 16-11c4-3 9-4 14-4h32c6 0 11 2 15 6l12 11 24 5c5 1 9 5 9 10v5c0 2-2 3-4 3h-12"/>
      <path class="glass" d="M52 17c3-2 6-3 10-3h28c5 0 9 2 12 5l10 9H44z"/>
      <circle class="tyre" cx="44" cy="50" r="11"/><circle class="hub" cx="44" cy="50" r="4.5"/>
      <circle class="tyre" cx="134" cy="50" r="11"/><circle class="hub" cx="134" cy="50" r="4.5"/>
    </svg>
    <div class="splash-acts">
      <button type="button" class="demo-link" data-act="demo">${icon('play', 15)}Demo mode</button>
      ${btn('Sign up to drive', { block: true, act: 'signin', cls: 'on-brand' })}
      ${btn('Sign in', { block: true, act: 'signin', cls: 'on-brand-solid' })}
    </div>
  </div>
  ${S.sheet ? `<div class="sheet" role="dialog" aria-label="Demo mode">
    <h3>Let's take a look at what it's like to drive for Revel.</h3>
    ${btn('Start demo', { variant: 'primary', block: true, attrs: { 'data-scen': 'clear' } })}
    <h4>Dev only demos</h4>
    ${['onboarding', 'restricted', 'sandbox', 'resubmit'].map(k => btn(
      { onboarding: 'Onboarding', restricted: 'Restricted', sandbox: 'Sandbox', resubmit: 'Resubmit License' }[k],
      { variant: 'danger', block: true, attrs: { 'data-scen': k } })).join('')}
    ${secondary('Dismiss', 'dismiss')}
  </div>` : ''}`;
}

function bare(title, inner, action, closeAct = 'tosplash') {
  return `<div class="shell"><div class="body">
    <div class="pagehead"><span>${title}</span><button type="button" class="close-btn" data-act="${closeAct}" aria-label="Close">${icon('close', 18)}</button></div>
    <div class="scroller"><div class="col narrow">${inner}</div></div>${action}</div></div>`;
}

function signIn() {
  return bare('Driver sign in', `
    <div class="intro"><b>Enter your phone number</b><span class="faint">You will receive a one-time sign in code</span></div>
    <label class="field"><span class="rv-sr">Phone number</span><input id="phone" placeholder="(555) 555-5555" inputmode="tel"></label>
    <label class="field center"><span class="lb faint">Extension (Dev Only)</span><input placeholder="#123"></label>`,
    actionBar(primary('Next', 'otp')));
}

function otpScreen() {
  return bare('Verification', `
    <p class="intro faint">Please enter the verification code we sent to (555) 555-5555</p>
    ${otpEl(6)}
    <div class="stack">${btn('Resend Code', { block: true, icon: 'refresh' })}${secondary('Re-enter phone number', 'signin')}</div>`,
    actionBar(primary('Verify', 'enterapp', { attrs: { id: 'verify' }, disabled: true })));
}

// ---------- ride history ----------
function rideHistory() {
  const rides = RIDES[S.dayOffset] || [];
  const d = day(S.dayOffset);
  const total = rides.reduce((a, r) => a + r.total, 0);
  const list = rides.length ? rides.map((r, i) => {
    const detail = r.kind === 'Ride' && S.openRide === i ? `<div class="ride-detail">
        <div><span>Pickup</span><span>${clock(r.at)}</span></div>
        <div><span>Dropoff</span><span>${clock(new Date(r.at.getTime() + r.mins * 60e3))}</span></div>
        <div><span>Total minutes</span><span>${r.mins}</span></div>
        <div><span>Total miles</span><span>${r.miles}</span></div>
        <div><span>${r.mins} min × ${usd(r.perMin)}</span><span>${usd(r.mins * r.perMin)}</span></div>
        <div><span>${r.miles} mi × ${usd(r.perMile)}</span><span>${usd(r.miles * r.perMile)}</span></div>
        <span class="ride-note">A ${r.fee}% service fee was applied to this fare. The fee varies by ride based on demand, time of day and day of week.</span></div>` : '';
    return rideCard({ kind: r.kind, time: clock(r.at), total: r.total, fare: r.fare, tip: r.tip, tolls: r.tolls, extra: detail, idx: i });
  }).join('') : '<div class="empty-state faint">No rides on this day.</div>';

  return shell(`
    <div class="daynav">
      <button type="button" data-act="prevday" aria-label="Previous day"${S.dayOffset <= -13 ? ' disabled' : ''}>${icon('chevronLeft', 18)}</button>
      <div class="d"><b>${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} &nbsp;${d.toLocaleDateString('en-US', { weekday: 'long' })}</b>
        <div class="tot money">${usd(total)}</div></div>
      <button type="button" data-act="nextday" aria-label="Next day"${S.dayOffset >= 0 ? ' disabled' : ''}>${icon('chevronRight', 18)}</button>
    </div>${list}`, { title: 'Ride history', banner: banner() });
}

// ---------- onboarding ----------
const GROUPS = ['Profile', 'Documents', 'How you get paid', 'Vehicle', 'Rental Terms of Use', 'Payment'];

function onboarding() {
  const mine = RESTRICTIONS.filter(r => SCEN[S.scenario].includes(r.k));
  const body = GROUPS.map(g => {
    const items = mine.filter(r => r.group === g);
    if (!items.length) return '';
    const info = g === 'Vehicle' || g === 'How you get paid' ? icon('info', 16, 'Handled by a partner') : '';
    return `<div class="sec-t">${g}${info}</div>` + items.map(r => r.k === 'checkr'
      ? step({ label: 'Complete background check', sub: 'Look for an email from Checkr', inert: true })
      : step({ label: r.driver, done: S.done.has(r.k), key: r.k })).join('');
  }).join('');
  const empty = `<div class="empty-state">${icon('check', 34)}<b>All steps complete</b><div class="faint">You're an active driver.</div></div>`;
  return shell(body || empty, {
    title: 'Onboarding',
    action: actionBar(primary(`Schedule an appointment ${icon('arrow', 16)}`, 'appointment'), "We'd be happy to help you in person!")
  });
}

// ---------- step screens reached from the checklist ----------
const info = (title, text) => `<div class="card"><div class="card-row"><div><b>${title}</b><small>${text}</small></div></div></div>`;
const finish = (label, k, caption) => actionBar(primary(label, 'finishstep', { attrs: { 'data-k': k } }), caption);

function stepScreen(k) {
  const r = RESTRICTIONS.find(x => x.k === k);
  const o = (title, action) => ({ title, close: true, action });

  if (k === 'address') {
    return shell(`
      <label class="field"><span class="lb">Street Address <span class="req">*</span></span><input value="123 Example St"></label>
      <label class="field"><span class="lb">Apt/Unit</span><input value="Apt 1"></label>
      <label class="field"><span class="lb">City <span class="req">*</span></span><input value="New York"></label>
      <div class="two"><label class="field"><span class="lb">State <span class="req">*</span></span><select><option>New York</option><option>California</option></select></label>
        <label class="field"><span class="lb">Zip Code <span class="req">*</span></span><input value="10001"></label></div>`,
      o('Edit Address', actionBar(secondary('Dismiss', 'back') + primary('Save', 'finishstep', { attrs: { 'data-k': 'address' } }))));
  }

  if (k === 'tlc' || k === 'dmv') {
    const tlc = k === 'tlc', title = tlc ? 'Add TLC license' : "Add driver's license";
    if (S.capture === k) {
      return shell(`<div class="sec-t" style="justify-content:space-between">Photo
          <button type="button" class="rv-btn rv-btn-ghost" data-act="retake">${icon('refresh', 16)}Retake Photo</button></div>
        <div class="example">${licence(tlc)}</div>`,
        o(title, finish('Submit', k, 'Confirm your licence photo is clear and easy to read.')));
    }
    return shell(`
      <p class="muted" style="margin-top:0">Please take a photo of the front of your ${tlc ? 'TLC' : "driver's"} license. Make sure it is in focus, well lit, and easy to read like the example photo below.</p>
      <div class="example">${licence(tlc)}</div>
      ${tlc ? '<label class="check"><input type="checkbox"> I have held a TLC license for at least 12 months</label>' : ''}`,
      o(title, actionBar(secondary('Back', 'back') + primary(`${icon('camera', 17)}Open camera`, 'capture', { attrs: { 'data-k': k } }))));
  }

  if (k === 'w9') {
    return shell(info('Abound', 'Revel uses Abound to collect your W-9 and verify your identity for tax reporting.') +
      '<p class="muted">You\'ll be taken to a secure Abound page to enter your legal name, address and taxpayer identification number. Revel never stores your SSN.</p>',
      o('Complete W9 form', finish(`Continue to Abound ${icon('external', 16)}`, 'w9')));
  }
  if (k === 'services' || k === 'arb' || k === 'tou') {
    const title = { services: 'Review services agreement', arb: 'Review mutual arbitration agreement', tou: 'Agree to Terms of Use' }[k];
    return shell(info(title, 'This agreement is sent to you through DocuSign. Signing is required before you can go online.') +
      `<p class="faint" style="font-size:12.5px">Document ID · REV-${k.toUpperCase()}-2025-0814 · 11 pages</p>
       <p class="muted">Check your email for a message from DocuSign. Once signed, this step clears automatically — it can take a few minutes to update.</p>`,
      o(title, finish(`Open in DocuSign ${icon('external', 16)}`, k)));
  }
  if (k === 'branch') {
    return shell(info('Branch', 'Your earnings are paid into a Branch wallet, usually within minutes of ending a ride.') +
      "<p class=\"muted\">You'll create your wallet on Branch and come back here. You can't take rides until your wallet is active.</p>",
      o('Set up Branch account', finish(`Continue to Branch ${icon('external', 16)}`, 'branch')));
  }
  if (k === 'leasing') {
    return shell(info('Revel Leasing', 'Your weekly rental, insurance and charging are billed through your Revel Leasing account.') +
      "<p class=\"muted\">Setting this up adds a payment method and takes a refundable $500 security deposit. You can't be assigned a vehicle until it's complete.</p>",
      o('Set up Revel Leasing account', finish(`Continue ${icon('arrow', 16)}`, 'leasing')));
  }
  if (k === 'card') {
    return shell(info('Add a payment method', 'Used for your weekly rental, charging, tolls and any violations.') + `
      <label class="field"><span class="lb">Card number</span><input placeholder="4242 4242 4242 4242"></label>
      <div class="two"><label class="field"><span class="lb">Expiry</span><input placeholder="MM/YY"></label>
        <label class="field"><span class="lb">CVC</span><input placeholder="123"></label></div>
      <p class="faint" style="font-size:12px">Prepaid cards are not accepted. At least one card must stay on file for tolls and tickets.</p>`,
      o('Add payment method', finish('Save card', 'card')));
  }
  if (k === 'deposit') {
    return shell(info('Security deposit', 'A refundable deposit is held while you rent from Revel Leasing. It is returned 30 days after you off-board.') +
      '<div class="card"><div class="card-row"><span>Security deposit</span><span class="gap money">$500.00</span></div></div>',
      o('Pay security deposit', finish('Pay $500.00', 'deposit')));
  }
  if (k === 'failedinv') {
    return shell(`<div class="card">
        <div class="card-row"><div><b>Outstanding invoice</b><small>Weekly Rental · Aug 10, 2025</small></div><span class="gap" style="font-weight:700">$544.42</span></div>
        <div class="card-row"><span class="muted">Last attempt</span><span class="gap" style="color:var(--danger)">Visa ending 1944 — declined</span></div></div>
      <p class="muted">You cannot start a reservation until this invoice is paid.</p>`,
      o('Resolve outstanding invoice', finish('Retry payment', 'failedinv')));
  }
  return shell(`<p class="muted">${esc(r?.driver || 'Step')}</p>`, o(r?.driver || 'Step', finish('Continue', k)));
}

function licence(tlc) {
  return `<div class="licence">
    <div class="t">${tlc ? 'TLC DRIVER LICENSE' : 'NEW YORK STATE'}</div>
    <div>${tlc ? 'NYC Taxi and Limousine Commission' : 'DRIVER LICENSE'}</div>
    <div class="face"></div>
    <div class="fields">
      <div><b>${tlc ? 'LICENSE NUMBER' : 'ID 123 456 789'}</b></div>
      <div style="font-weight:800;font-size:13px">${tlc ? '000000' : 'MOTORIST, MICHELLE'}</div>
      <div>${tlc ? 'EXPIRES 00/00/00' : '2345 ANYWHERE STREET'}</div>
      <div>${tlc ? '' : 'ALBANY, NY 12222'}</div>
      <div class="specimen">Specimen — not a real document</div>
    </div></div>`;
}

// ---------- secondary pages ----------
const rowLink = (label, sub, extra = {}) => step({ label, sub, ...extra }).replace('class="rv-step', 'class="rv-step plain');

function settings() {
  const rows = [['Profile', 'Name, photo, contact'], ['Payments', 'Branch wallet · •••• 4471'],
    ['Documents', "Driver's license, TLC license, agreements"], ['Notifications', 'SMS and push'],
    ['Language', 'English'], ['Privacy', 'Data and permissions']];
  return shell(rows.map(([a, b]) => rowLink(a, b)).join('') +
    `<div class="sec-t">Account</div>${rowLink('Off-board and return my deposit', null, { tone: 'danger' })}`,
    { title: 'Settings', banner: banner() });
}

function help() {
  const faqs = ['How do I get paid?', 'When does my weekly rental charge?', 'What happens if I get a ticket?',
    'How do I report an accident?', 'Where can I charge?', 'How do I return my vehicle?'];
  return shell(`<div class="card">
      <div class="card-row">${icon('message', 20)}<div><b>Text support</b><small>Usually replies in under 5 minutes</small></div><span class="gap">${icon('arrow', 16)}</span></div>
      <div class="card-row">${icon('phone', 20)}<div><b>Call the depot</b><small>JACX · 6am – 11pm</small></div><span class="gap">${icon('arrow', 16)}</span></div></div>
    <div class="sec-t">Common questions</div>${faqs.map(f => rowLink(f)).join('')}`,
    { title: 'Help', banner: banner() });
}

function profile() {
  const d = DB.demoDriver;
  const row = (k, v, mono) => `<div class="card-row"><span class="muted">${k}</span><span class="gap${mono ? ' mono' : ''}">${v}</span></div>`;
  return shell(`
    <div class="empty-state" style="padding:10px 0 20px">
      <span class="rv-avatar" style="width:76px;height:76px;margin:0 auto 10px">${icon('drivers', 34)}</span>
      <b style="font-size:17px;display:block">Demo Mode</b><div class="faint">Joined ${d.joined.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div></div>
    <div class="card">${row('Phone', esc(d.phone), true)}${row('Email', 'demo@revel.example')}
      ${row('TLC license', d.tlc ? esc(d.tlc.number) : '—', true)}${row("Driver's license", esc(d.dl.number), true)}${row('Insurance', 'ADIC')}</div>`,
    { title: 'Profile', close: true, closeAct: 'home', banner: banner() });
}

function dev() {
  const scen = Object.keys(SCEN).map(k => rowLink(k === 'clear' ? 'Active driver (no restrictions)' : k[0].toUpperCase() + k.slice(1),
    S.scenario === k ? 'Current scenario' : null).replace('<button', `<button data-scen="${k}"`)).join('');
  return shell(`<div class="sec-t">Scenario</div>${scen}
    <div class="sec-t">Interstitials</div>
    ${rowLink('Account Under Review takeover').replace('<button', '<button data-take="review"')}
    ${rowLink('Resubmit licence takeover').replace('<button', '<button data-take="resubmit"')}
    <div class="sec-t">Reset</div>${rowLink('Clear completed steps', null, { act: 'reset', tone: 'danger' })}`,
    { title: 'Dev settings', banner: banner() });
}

function takeover() {
  return S.takeover === 'review'
    ? takeoverEl({ tone: 'review', title: 'Account Under Review',
        body: "Your account is suspended while we review recent activity. You can't go online or start a reservation until the review is complete. We'll text you when there's an update." })
    : takeoverEl({ tone: 'warning', title: 'Resubmit your licence',
        body: "The photo of your driver's licence couldn't be read. Please retake it — make sure all four corners are visible and the text is in focus." });
}

// ---------- render ----------
function render() {
  document.documentElement.dataset.theme = 'driver';
  const pages = { onboarding, settings, help, profile, dev };
  let html;
  if (S.screen === 'splash') html = splash();
  else if (S.screen === 'signin') html = signIn();
  else if (S.screen === 'otp') html = otpScreen();
  else if (S.screen === 'step') html = stepScreen(S.stepKey);
  else html = (pages[S.page] || rideHistory)();

  app.innerHTML = html + (S.takeover ? takeover() : '') + (S.toast ? `<div class="toast-slot">${toastEl(S.toast)}</div>` : '');
  if (S.screen === 'otp') wireOtp();
  if (S.screen === 'signin') document.getElementById('phone')?.focus();
}

// ---------- OTP: type straight through the six boxes ----------
function wireOtp() {
  const inputs = [...document.querySelectorAll('#otp input')];
  const verify = document.getElementById('verify');
  if (!inputs.length) return;
  const complete = () => {
    const full = inputs.every(i => i.value);
    if (verify) verify.disabled = !full;
    if (full) setTimeout(() => { S.screen = 'app'; S.page = 'ridehistory'; render(); }, 220);
  };
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();
      complete();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) { e.preventDefault(); inputs[i - 1].value = ''; inputs[i - 1].focus(); complete(); }
      if (e.key === 'ArrowLeft' && i > 0) inputs[i - 1].focus();
      if (e.key === 'ArrowRight' && inputs[i + 1]) inputs[i + 1].focus();
    });
    input.addEventListener('paste', (e) => {
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, inputs.length);
      if (!digits) return;
      e.preventDefault();
      digits.split('').forEach((c, k) => { inputs[k].value = c; });
      inputs[Math.min(digits.length, inputs.length - 1)].focus();
      complete();
    });
  });
  inputs[0].focus();
}

// ---------- events ----------
let toastTimer;
function toast(msg) {
  S.toast = msg; render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.toast = null; render(); }, 2400);
}

const DONE_MSG = { address: 'Address updated', tlc: 'License submitted', dmv: 'License submitted', w9: 'W-9 completed',
  services: 'Agreement signed', arb: 'Agreement signed', tou: 'Terms accepted', branch: 'Branch wallet active',
  leasing: 'Revel Leasing account set up', card: 'Payment method added', deposit: 'Deposit paid', failedinv: 'Payment successful' };

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-nav],[data-scen],[data-step],[data-ride],[data-take]');
  if (!el || el.disabled) return;
  const { act, nav, scen, step: stepKey, ride, take } = el.dataset;
  if (el.tagName === 'A') e.preventDefault();

  switch (act) {
    case 'demo': S.sheet = !S.sheet; return render();
    case 'dismiss': S.sheet = false; return render();
    case 'signin': S.screen = 'signin'; return render();
    case 'otp': S.screen = 'otp'; return render();
    case 'enterapp': S.screen = 'app'; S.page = 'ridehistory'; return render();
    case 'tosplash': S.screen = 'splash'; S.sheet = false; return render();
    case 'home': S.screen = 'app'; S.page = 'ridehistory'; return render();
    case 'back': S.screen = 'app'; S.page = 'onboarding'; S.capture = null; return render();
    case 'prevday': S.dayOffset = Math.max(-13, S.dayOffset - 1); S.openRide = null; return render();
    case 'nextday': S.dayOffset = Math.min(0, S.dayOffset + 1); S.openRide = null; return render();
    case 'capture': S.capture = el.dataset.k; return render();
    case 'retake': S.capture = null; return render();
    case 'appointment': return toast('Appointment request sent');
    case 'closetake': S.takeover = null; return render();
    case 'closetoast': S.toast = null; return render();
    case 'reset': S.done.clear(); return toast('Progress cleared');
    case 'finishstep': {
      const k = el.dataset.k;
      S.done.add(k); S.capture = null; S.screen = 'app'; S.page = 'onboarding';
      return toast(DONE_MSG[k] || 'Step complete');
    }
  }
  if (scen) return setScenario(scen);
  if (take) { S.takeover = take; return render(); }
  if (nav) { S.page = nav; S.screen = 'app'; S.openRide = null; return render(); }
  if (stepKey) { S.screen = 'step'; S.stepKey = stepKey; S.capture = null; return render(); }
  if (ride !== undefined) { const i = +ride; S.openRide = S.openRide === i ? null : i; return render(); }
});

function setScenario(k) {
  S.scenario = k; S.done.clear(); S.sheet = false; S.screen = 'app';
  S.page = SCEN[k].length ? 'onboarding' : 'ridehistory';
  render();
}

// deep links — driver/index.html#/onboarding | #/restricted | #/sandbox | #/resubmit | #/rides
// mirror the dev launcher so a scenario can be opened straight from a URL
function boot() {
  const k = location.hash.replace(/^#\/?/, '');
  if (k === 'rides') return setScenario('clear');
  if (SCEN[k]) return setScenario(k);
  render();
}
window.addEventListener('hashchange', boot);
boot();
