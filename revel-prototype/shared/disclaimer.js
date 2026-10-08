// Portfolio disclaimer pill. Visitors arrive by deep link and never see the launcher,
// so every app carries this. Classic script (not a module) so it runs before the app
// renders; drop it in with:
//   <script src="../shared/disclaimer.js" data-pos="bottom-left"></script>
// data-pos is top|bottom-left|right, picked per app to stay clear of its CTAs and toasts.
// A top position drops to the bottom under 820px, where the apps put their nav up top,
// and the body gets bottom padding so the last CTA can scroll clear of the pill.
// The × collapses it to an (i) for the rest of the session; it never fully disappears.
(() => {
  const me = document.currentScript;
  const [edge, side] = (me.dataset.pos || 'bottom-right').split('-');
  const home = new URL('../', me.src).href;
  const KEY = 'rv-disclaimer-min';

  let min = false;
  try { min = sessionStorage.getItem(KEY) === '1'; } catch {}

  const css = `
.rv-disc { position: fixed; ${edge}: 12px; ${side}: 12px; z-index: 50; display: flex; align-items: center; gap: 8px;
  max-width: calc(100vw - 24px); box-sizing: border-box; padding: 5px 6px 5px 12px; border-radius: 999px;
  background: var(--surface-raised); border: 1px solid var(--line); box-shadow: 0 2px 10px rgba(0,0,0,.12);
  color: var(--ink-muted); font: 500 11.5px/1.3 var(--font-sans, system-ui, sans-serif); }
.rv-disc a { color: var(--ink); text-decoration: underline; text-underline-offset: 2px; white-space: nowrap; }
.rv-disc button { flex: none; display: grid; place-items: center; width: 20px; height: 20px; padding: 0; border: 0;
  border-radius: 999px; background: transparent; color: var(--ink-faint); font: inherit; font-size: 14px; cursor: pointer; }
.rv-disc button:hover { background: var(--surface-sunken); color: var(--ink); }
.rv-disc.min { padding: 3px; }
.rv-disc.min span, .rv-disc.min a, .rv-disc:not(.min) .i { display: none; }
.rv-disc:not(.min) .x { display: grid; } .rv-disc.min .x { display: none; }
.rv-disc .i { display: grid; font-weight: 700; font-size: 12px; font-style: italic; font-family: Georgia, serif; }
@media (max-width: 820px) { .rv-disc { top: auto; bottom: 12px; } body { padding-bottom: 64px; } }
@media print { .rv-disc { display: none; } }`;

  const el = document.createElement('aside');
  el.className = 'rv-disc' + (min ? ' min' : '');
  el.setAttribute('aria-label', 'About this prototype');
  el.innerHTML = `<span>Portfolio reconstruction · not affiliated with Revel · all data fabricated</span>
<a href="${home}">About</a>
<button class="x" type="button" aria-label="Minimise notice">×</button>
<button class="i" type="button" aria-label="Show notice">i</button>`;

  const set = (v) => {
    el.classList.toggle('min', v);
    try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch {}
  };
  el.querySelector('.x').onclick = () => set(true);
  el.querySelector('.i').onclick = () => set(false);

  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  const mount = () => document.body.append(el);
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);
})();
