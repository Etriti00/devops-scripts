(function () {
  'use strict';

  var store = {
    get: function (k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) {}
    },
  };
  var root = document.documentElement;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- "Fik dritat": cinema dark mode ----
  document.querySelectorAll('[data-lights]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('ks-theme', next);
    });
  });

  // ---- Opening curtain, once per browser session ----
  var curtain = document.querySelector('.curtain');
  var seen = false;
  try { seen = sessionStorage.getItem('ks-curtain') === '1'; sessionStorage.setItem('ks-curtain', '1'); } catch (e) { seen = true; }
  if (curtain && !seen && !reduced) {
    curtain.classList.add('is-playing');
    requestAnimationFrame(function () {
      setTimeout(function () { curtain.classList.add('is-open'); }, 250);
    });
    setTimeout(function () { curtain.remove(); }, 1800);
  }

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---- Recipe page ----
  var recipe = document.querySelector('.recipe[data-slug]');
  if (!recipe) return;
  var slug = recipe.getAttribute('data-slug');
  var key = 'ks-progress-' + slug;
  var progress = {};
  try { progress = JSON.parse(store.get(key) || '{}'); } catch (e) {}
  function saveProgress() { store.set(key, JSON.stringify(progress)); }

  // Ingredients ticked off survive a page refresh while cooking.
  recipe.querySelectorAll('.ingredient-list input[data-remember]').forEach(function (box) {
    var id = box.getAttribute('data-remember');
    box.checked = !!progress[id];
    box.addEventListener('change', function () {
      progress[id] = box.checked;
      saveProgress();
    });
  });

  recipe.querySelectorAll('.steps li[data-remember]').forEach(function (li) {
    var id = li.getAttribute('data-remember');
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    function sync() {
      li.classList.toggle('is-done', !!progress[id]);
      li.setAttribute('aria-pressed', progress[id] ? 'true' : 'false');
    }
    function toggle() {
      progress[id] = !progress[id];
      saveProgress();
      sync();
    }
    sync();
    li.addEventListener('click', toggle);
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // Keep the screen awake while cooking.
  var wake = recipe.querySelector('[data-wake]');
  if (wake && 'wakeLock' in navigator) {
    wake.classList.add('is-supported');
    var lock = null;
    var box = wake.querySelector('input');
    function request() {
      navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { box.checked = false; });
    }
    box.addEventListener('change', function () {
      if (box.checked) request();
      else if (lock) { lock.release(); lock = null; }
    });
    document.addEventListener('visibilitychange', function () {
      if (box.checked && document.visibilityState === 'visible') request();
    });
  }

  // Applause.
  var clap = recipe.querySelector('[data-applause]');
  if (clap) {
    var clapKey = 'ks-clap-' + slug;
    if (store.get(clapKey)) clap.classList.add('is-done');
    clap.addEventListener('click', function () {
      clap.classList.remove('is-clapping');
      void clap.offsetWidth;
      clap.classList.add('is-clapping');
      if (store.get(clapKey)) return;
      store.set(clapKey, '1');
      clap.classList.add('is-done');
      var count = clap.querySelector('[data-count]');
      count.textContent = String(parseInt(count.textContent, 10) + 1);
      fetch('/receta/' + encodeURIComponent(slug) + '/duartrokit', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.ok) count.textContent = d.applause; })
        .catch(function () {});
    });
  }

  var print = recipe.querySelector('[data-print]');
  if (print) print.addEventListener('click', function () { window.print(); });
})();
