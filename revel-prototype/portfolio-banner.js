// Injected into the Revel prototype by scripts/sync-prototype.sh. Not part of the reconstruction.
(function () {
  function banner() {
    var b = document.createElement('div');
    b.setAttribute('role', 'note');
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;font:13px/1.4 ui-sans-serif,system-ui,sans-serif;background:#06402b;color:#f5f2e8;padding:8px 14px;display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 -1px 0 #1c4d38';
    b.innerHTML = '<span>Reconstruction of Revel’s ops platform. <b>Every driver, vehicle, licence and amount is fabricated.</b></span>' +
      '<a href="/revel/" style="color:#cbbe9c;text-decoration:underline">← Back to the case studies</a>' +
      '<button type="button" aria-label="Dismiss" style="background:none;border:0;color:#bcc5b3;font-size:16px;cursor:pointer;padding:0 4px">×</button>';
    b.querySelector('button').onclick = function () { b.remove(); };
    document.body.appendChild(b);
  }
  if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
})();
