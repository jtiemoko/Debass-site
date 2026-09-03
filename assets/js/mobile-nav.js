/**
 * Debass Technologies — menu mobile (hamburger).
 * Chargé sur toutes les pages du site. Ne fait rien si la page ne contient
 * pas les éléments attendus (défensif). Gère un nombre quelconque de
 * sous-menus déroulants (Solutions par catégorie, Actualités, etc.).
 */
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.navlinks');
  if (!toggle || !links) return;

  var dropdowns = Array.prototype.slice.call(links.querySelectorAll('.nav-dropdown'));

  function closeMenu() {
    links.classList.remove('mobile-open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function closeAllDropdowns() {
    dropdowns.forEach(function (d) { d.classList.remove('mobile-expanded'); });
  }

  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('mobile-open');
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Chaque sous-menu s'ouvre au tap plutôt qu'au survol, en mobile —
  // un seul sous-menu ouvert à la fois pour garder le menu lisible.
  dropdowns.forEach(function (dropdown) {
    var trigger = dropdown.querySelector('.nav-dropdown-trigger');
    trigger.addEventListener('click', function (e) {
      if (window.innerWidth > 1140) return; // desktop garde le comportement au survol
      e.preventDefault();
      var wasOpen = dropdown.classList.contains('mobile-expanded');
      closeAllDropdowns();
      if (!wasOpen) dropdown.classList.add('mobile-expanded');
    });
  });

  // Un clic sur un lien référençant une page (pas le déclencheur d'un sous-menu) referme le menu
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      closeMenu();
    });
  });

  // Referme le menu si la fenêtre repasse en format bureau
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1140) {
      closeMenu();
      closeAllDropdowns();
    }
  });
});
