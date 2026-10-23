/*
 * Debass Technologies — bandeau de consentement aux cookies.
 * Choix conservé 12 mois dans le navigateur (localStorage). Aucun outil de suivi n'est chargé tant que
 * l'utilisateur n'a pas accepté la catégorie correspondante.
 *
 * Pour ajouter plus tard un outil (ex. Google Analytics), l'enregistrer ainsi :
 *   DebassConsent.on('analytics', function () { /* charger le script ici *\/ });
 * Il ne s'exécutera que si la catégorie « analytics » est acceptée.
 */
(function () {
  var KEY = 'debass_cookie_consent_v1', MONTHS = 12;
  var CATS = { analytics: 'Mesure d\'audience', thirdparty: 'Services tiers (vidéos YouTube)' };
  var listeners = {};

  function read() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.exp > Date.now()) return d;
    } catch (e) {}
    return null;
  }
  function save(c) {
    var d = { analytics: !!c.analytics, thirdparty: !!c.thirdparty, exp: Date.now() + MONTHS * 30 * 864e5 };
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    run(d);
    return d;
  }
  function run(d) {
    Object.keys(listeners).forEach(function (cat) {
      if (d[cat]) { listeners[cat].forEach(function (fn) { try { fn(); } catch (e) {} }); listeners[cat] = []; }
    });
  }
  window.DebassConsent = {
    get: read,
    on: function (cat, fn) {
      var d = read();
      if (d && d[cat]) { try { fn(); } catch (e) {} return; }
      (listeners[cat] = listeners[cat] || []).push(fn);
    },
    open: function () { show(true); }
  };

  var css = '.dc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:10000;max-width:760px;margin:0 auto;background:#fff;color:#12161C;border:1px solid #D8DCE2;border-radius:14px;box-shadow:0 18px 50px -12px rgba(10,42,77,.35);padding:20px 22px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55}' +
    '.dc-banner h2{font:700 16px Sora,Inter,sans-serif;margin:0 0 6px;color:#0A2A4D}.dc-banner p{margin:0;color:#5B6472}.dc-banner a{color:#1B5FD1;text-decoration:underline}' +
    '.dc-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}' +
    '.dc-btn{font:600 14px Inter,system-ui,sans-serif;border-radius:999px;padding:10px 18px;cursor:pointer;border:1.5px solid #0A2A4D;background:#fff;color:#0A2A4D}' +
    '.dc-btn.dc-primary{background:#F5811F;border-color:#F5811F;color:#fff}.dc-btn:focus-visible{outline:3px solid #1B5FD1;outline-offset:2px}' +
    '.dc-prefs{display:none;margin-top:14px;border-top:1px solid #E5E8EC;padding-top:12px}.dc-prefs.open{display:block}' +
    '.dc-row{display:flex;gap:12px;align-items:flex-start;padding:8px 0}.dc-row input{margin-top:4px;width:18px;height:18px;accent-color:#F5811F;flex-shrink:0}' +
    '.dc-row b{display:block;color:#12161C}.dc-row span{color:#5B6472;font-size:13px}' +
    '@media(max-width:520px){.dc-banner{left:10px;right:10px;bottom:10px;padding:16px}.dc-btn{flex:1 1 100%;text-align:center}}';

  function show(forced) {
    if (document.getElementById('dc-banner')) { document.getElementById('dc-banner').hidden = false; return; }
    var cur = read() || {};
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement('div');
    b.id = 'dc-banner'; b.className = 'dc-banner'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-labelledby', 'dc-title');
    b.innerHTML =
      '<h2 id="dc-title">Votre vie privée</h2>' +
      '<p>Ce site utilise uniquement les cookies nécessaires à son fonctionnement. Avec votre accord, nous pouvons aussi activer des services tiers (vidéos YouTube) et, à l\'avenir, la mesure d\'audience. Vous pouvez modifier votre choix à tout moment. <a href="' + base() + 'entreprise/politique-confidentialite.html#cookies">En savoir plus</a></p>' +
      '<div class="dc-prefs" id="dc-prefs">' +
        '<label class="dc-row"><input type="checkbox" checked disabled><div><b>Nécessaires</b><span>Fonctionnement du site et mémorisation de ce choix. Toujours actifs.</span></div></label>' +
        '<label class="dc-row"><input type="checkbox" id="dc-thirdparty"' + (cur.thirdparty ? ' checked' : '') + '><div><b>' + CATS.thirdparty + '</b><span>Lecture des vidéos YouTube intégrées ; YouTube peut déposer ses propres cookies.</span></div></label>' +
        '<label class="dc-row"><input type="checkbox" id="dc-analytics"' + (cur.analytics ? ' checked' : '') + '><div><b>' + CATS.analytics + '</b><span>Statistiques de fréquentation anonymisées. Aucun outil actif actuellement.</span></div></label>' +
      '</div>' +
      '<div class="dc-actions">' +
        '<button type="button" class="dc-btn dc-primary" id="dc-accept">Tout accepter</button>' +
        '<button type="button" class="dc-btn" id="dc-refuse">Tout refuser</button>' +
        '<button type="button" class="dc-btn" id="dc-custom">Personnaliser</button>' +
      '</div>';
    document.body.appendChild(b);
    function close() { b.hidden = true; }
    document.getElementById('dc-accept').onclick = function () { save({ analytics: true, thirdparty: true }); close(); };
    document.getElementById('dc-refuse').onclick = function () { save({}); close(); };
    var custom = document.getElementById('dc-custom'), prefs = document.getElementById('dc-prefs');
    custom.onclick = function () {
      if (!prefs.classList.contains('open')) { prefs.classList.add('open'); custom.textContent = 'Enregistrer mon choix'; return; }
      save({ analytics: document.getElementById('dc-analytics').checked, thirdparty: document.getElementById('dc-thirdparty').checked }); close();
    };
    if (forced) { prefs.classList.add('open'); custom.textContent = 'Enregistrer mon choix'; }
    document.getElementById('dc-accept').focus();
  }

  // Préfixe relatif vers la racine du site (pages à 1 niveau de profondeur ou à la racine).
  function base() {
    var s = document.currentScript || document.querySelector('script[src*="cookie-consent.js"]');
    var src = s ? s.getAttribute('src') : 'assets/js/cookie-consent.js';
    return src.replace('assets/js/cookie-consent.js', '');
  }

  function addFooterLink() {
    var link = document.querySelector('.footer-bottom a[href*="politique-confidentialite"]');
    var a = document.createElement('a');
    a.href = '#'; a.textContent = 'Gérer mes cookies';
    a.addEventListener('click', function (e) { e.preventDefault(); show(true); });
    if (link && link.parentNode) { link.parentNode.insertBefore(a, link.nextSibling); link.parentNode.insertBefore(document.createTextNode(' '), a); }
    else { var fb = document.querySelector('.footer-bottom'); if (fb) fb.appendChild(a); }
  }

  function init() {
    addFooterLink();
    var d = read();
    if (d) run(d); else show(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
