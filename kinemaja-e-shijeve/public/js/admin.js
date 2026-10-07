(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ---- Flash messages ----
  $$('[data-flash] [data-close]').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('[data-flash]').remove(); });
  });

  // ---- Show / hide password ----
  $$('[data-pw-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = btn.parentNode.querySelector('input');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈 Fshihe' : '👁 Shfaqe';
    });
  });

  // ---- Friendly confirm dialog instead of the browser's tiny one ----
  var dialog = $('[data-dialog]');
  function confirmBox(opts, onYes) {
    if (!dialog) { if (window.confirm(opts.text)) onYes(); return; }
    $('[data-dialog-title]', dialog).textContent = opts.title || 'A je e sigurt?';
    $('[data-dialog-text]', dialog).textContent = opts.text || '';
    var yes = $('[data-dialog-yes]', dialog);
    var no = $('[data-dialog-no]', dialog);
    yes.textContent = opts.yes || 'Po, fshije';
    dialog.hidden = false;
    no.focus();
    function close() {
      dialog.hidden = true;
      yes.removeEventListener('click', ok);
      no.removeEventListener('click', close);
      document.removeEventListener('keydown', esc);
    }
    function ok() { close(); onYes(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    yes.addEventListener('click', ok);
    no.addEventListener('click', close);
    document.addEventListener('keydown', esc);
  }
  $$('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (form.dataset.confirmed) return;
      e.preventDefault();
      confirmBox(
        { text: form.dataset.confirm, title: form.dataset.confirmTitle, yes: form.dataset.confirmYes },
        function () { form.dataset.confirmed = '1'; form.submit(); }
      );
    });
  });

  // ---- Photo picker with preview and in-browser resizing ----
  // Phone photos are often 5–10 MB; shrinking them here keeps uploads fast
  // on a slow connection and the blog quick to load.
  function resizeImage(file, maxSide, done) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.DataTransfer) return done(file);
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 1.5e6) return done(file);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (!blob) return done(file);
        done(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.86);
    };
    img.onerror = function () { URL.revokeObjectURL(url); done(file); };
    img.src = url;
  }

  $$('[data-photo-input]').forEach(function (input) {
    var form = input.closest('form');
    var zone = $('[data-photo-zone]', form);
    var preview = $('[data-photo-preview]', form);
    var previewImg = $('[data-photo-img]', form);
    var actions = $('[data-photo-actions]', form);
    var removeFlag = $('[data-remove-photo]', form);

    function showPreview(src) {
      previewImg.src = src;
      preview.hidden = false;
      actions.hidden = false;
      zone.hidden = true;
    }

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        alert('Ky skedar nuk është foto. Zgjidh një foto (JPG ose PNG).');
        input.value = '';
        return;
      }
      resizeImage(file, 1800, function (out) {
        if (out !== file) {
          var dt = new DataTransfer();
          dt.items.add(out);
          input.files = dt.files;
        }
        removeFlag.value = '';
        showPreview(URL.createObjectURL(out));
        form.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function () { zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function () { zone.classList.remove('is-over'); });
    });

    var change = $('[data-photo-change]', form);
    if (change) change.addEventListener('click', function () { input.click(); });
    var remove = $('[data-photo-remove]', form);
    if (remove) remove.addEventListener('click', function () {
      input.value = '';
      removeFlag.value = '1';
      preview.hidden = true;
      actions.hidden = true;
      zone.hidden = false;
      form.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  // ---- Recipe editor (wizard) ----
  var editor = $('[data-editor]');
  if (editor) initEditor(editor);

  function initEditor(form) {
    var panels = $$('[data-step]', form);
    var progress = $('[data-progress]');
    var prev = $('[data-prev]', form);
    var next = $('[data-next]', form);
    var current = 0;
    var dirty = false;
    var submitting = false;
    progress.hidden = false;

    function go(i) {
      current = Math.max(0, Math.min(panels.length - 1, i));
      panels.forEach(function (p, j) { p.classList.toggle('is-current', j === current); });
      $$('li', progress).forEach(function (li, j) {
        li.classList.toggle('is-current', j === current);
        li.classList.toggle('is-done', j < current);
      });
      prev.style.visibility = current === 0 ? 'hidden' : 'visible';
      next.style.display = current === panels.length - 1 ? 'none' : '';
      if (current === panels.length - 1) buildReview();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    next.addEventListener('click', function () {
      if (current === 0) {
        var title = form.elements.title;
        if (!title.value.trim()) {
          title.focus();
          title.setAttribute('placeholder', 'Shkruaj emrin e recetës këtu, të lutem 🙂');
          title.style.borderColor = 'var(--terracotta)';
          return;
        }
        title.style.borderColor = '';
      }
      go(current + 1);
    });
    prev.addEventListener('click', function () { go(current - 1); });
    $$('[data-goto]', progress).forEach(function (b) {
      b.addEventListener('click', function () { go(parseInt(b.dataset.goto, 10)); });
    });

    // Repeating lists
    function renumber(list) {
      $$('.list-item', list).forEach(function (item, i) {
        $('.num', item).textContent = i + 1;
        var field = $('input, textarea', item);
        item.classList.toggle('is-heading', field.tagName === 'INPUT' && /:\s*$/.test(field.value));
      });
    }
    function addRow(name, afterItem, value) {
      var list = $('[data-list="' + name + '"]', form);
      var tpl = $('template[data-template="' + name + '"]');
      var node = tpl.content.firstElementChild.cloneNode(true);
      var field = $('input, textarea', node);
      if (value) field.value = value;
      if (afterItem && afterItem.nextSibling) list.insertBefore(node, afterItem.nextSibling);
      else list.appendChild(node);
      renumber(list);
      return field;
    }
    $$('[data-add]', form).forEach(function (btn) {
      btn.addEventListener('click', function () { addRow(btn.dataset.add).focus(); dirty = true; });
    });
    form.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-remove]');
      if (!rm) return;
      var item = rm.closest('.list-item');
      var list = item.parentNode;
      var field = $('input, textarea', item);
      if ($$('.list-item', list).length === 1) field.value = '';
      else item.remove();
      renumber(list);
      dirty = true;
    });
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      e.preventDefault();
      var item = e.target.closest('[data-list="ingredients"] .list-item');
      if (item && e.target.value.trim()) addRow('ingredients', item).focus();
    });
    // Pasting a whole list at once splits it into rows.
    form.addEventListener('paste', function (e) {
      var item = e.target.closest('[data-list="ingredients"] .list-item');
      if (!item) return;
      var text = (e.clipboardData || window.clipboardData).getData('text');
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length < 2) return;
      e.preventDefault();
      e.target.value = lines[0];
      var after = item;
      lines.slice(1).forEach(function (l) { after = addRow('ingredients', after, l).closest('.list-item'); });
      renumber(item.parentNode);
    });
    form.addEventListener('input', function (e) {
      dirty = true;
      var list = e.target.closest('[data-list]');
      if (list) renumber(list);
      scheduleAutosave();
    });

    // Review
    function filled(name) {
      return $$('[name="' + name + '"]', form).filter(function (f) { return f.value.trim(); }).length;
    }
    function buildReview() {
      var hasPhoto = !$('[data-photo-preview]', form).hidden;
      var cat = $('[name="category"]:checked', form);
      var items = [
        ['Emri', form.elements.title.value.trim() || null, 0],
        ['Fotoja', hasPhoto ? 'E shtuar' : null, 0],
        ['Zhanri', cat ? cat.parentNode.textContent.trim() : null, 0],
        ['Përbërësit', filled('ingredients') ? filled('ingredients') + ' rreshta' : null, 1],
        ['Hapat e përgatitjes', filled('steps') ? filled('steps') + ' hapa' : null, 2],
        ['Kujtimi', form.elements.story.value.trim() ? 'I shkruar' : null, 3],
        ['Filmi', form.elements.filmTitle.value.trim() || null, 3],
      ];
      var box = $('[data-review]', form);
      box.innerHTML = '';
      items.forEach(function (it) {
        var row = document.createElement('div');
        row.className = 'review-item ' + (it[1] ? 'ok' : 'miss');
        var label = document.createElement('span');
        label.innerHTML = '<b></b><br><span class="state"></span>';
        label.querySelector('b').textContent = it[0];
        label.querySelector('.state').textContent = it[1] ? '✓ ' + it[1] : 'Ende bosh';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = it[1] ? 'Ndrysho' : 'Plotëso';
        btn.addEventListener('click', function () { go(it[2]); });
        row.appendChild(label);
        row.appendChild(btn);
        box.appendChild(row);
      });
    }

    // Autosave of unfinished new recipes, so nothing is lost if the
    // browser is closed by mistake.
    var key = form.dataset.key;
    var status = $('[data-autosave]', form);
    var timer = null;
    function snapshot() {
      var data = {};
      ['title', 'summary', 'servings', 'prepMinutes', 'cookMinutes', 'difficulty', 'story', 'filmTitle', 'filmYear', 'filmNote'].forEach(function (n) {
        data[n] = form.elements[n].value;
      });
      var cat = $('[name="category"]:checked', form);
      data.category = cat ? cat.value : '';
      data.ingredients = $$('[name="ingredients"]', form).map(function (f) { return f.value; });
      data.steps = $$('[name="steps"]', form).map(function (f) { return f.value; });
      data.at = Date.now();
      return data;
    }
    function scheduleAutosave() {
      if (!form.dataset.new) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        store.set(key, JSON.stringify(snapshot()));
        var d = new Date();
        status.textContent = '✓ Ruajtur automatikisht në ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }, 800);
    }
    function restore(data) {
      Object.keys(data).forEach(function (n) {
        if (form.elements[n] && typeof data[n] === 'string' && n !== 'category') form.elements[n].value = data[n];
      });
      if (data.category) {
        var r = $('[name="category"][value="' + data.category + '"]', form);
        if (r) r.checked = true;
      }
      ['ingredients', 'steps'].forEach(function (name) {
        var list = $('[data-list="' + name + '"]', form);
        var values = (data[name] || []).filter(Boolean);
        if (!values.length) return;
        list.innerHTML = '';
        values.forEach(function (v) { addRow(name, null, v); });
      });
    }
    if (form.dataset.new) {
      var saved = null;
      try { saved = JSON.parse(store.get(key) || 'null'); } catch (e) {}
      if (saved && (saved.title || (saved.ingredients || []).some(Boolean))) {
        var banner = $('[data-restore]');
        banner.hidden = false;
        $('[data-restore-yes]', banner).addEventListener('click', function () { restore(saved); banner.remove(); });
        $('[data-restore-no]', banner).addEventListener('click', function () { store.del(key); banner.remove(); });
      }
    }

    form.addEventListener('submit', function () {
      submitting = true;
      store.del(key);
    });
    window.addEventListener('beforeunload', function (e) {
      if (dirty && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    go(0);
  }

  // ---- After publishing: share link + confetti ----
  var share = $('[data-share-url]');
  if (share) {
    share.value = location.origin + share.dataset.shareUrl;
    var copy = $('[data-copy]');
    copy.addEventListener('click', function () {
      share.select();
      var ok = function () { copy.textContent = '✓ U kopjua!'; setTimeout(function () { copy.textContent = '📋 Kopjo'; }, 2500); };
      if (navigator.clipboard) navigator.clipboard.writeText(share.value).then(ok, function () { document.execCommand('copy'); ok(); });
      else { document.execCommand('copy'); ok(); }
    });
  }
  if ($('[data-confetti]') && !matchMedia('(prefers-reduced-motion: reduce)').matches) confetti();

  function confetti() {
    var canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = (canvas.width = innerWidth);
    var H = (canvas.height = innerHeight);
    var colors = ['#d29a35', '#7a1e2c', '#b4502d', '#5f6a33', '#f6e3b0'];
    var bits = [];
    for (var i = 0; i < 160; i++) {
      bits.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
        vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3,
        r: Math.random() * Math.PI, vr: -0.15 + Math.random() * 0.3,
        c: colors[i % colors.length],
      });
    }
    var start = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      bits.forEach(function (b) {
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
      if (t - start < 4500) requestAnimationFrame(frame);
      else canvas.remove();
    })(start);
  }

  // ---- Smoke-free page ----
  var dateIn = $('[data-now-date]');
  if (dateIn) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    dateIn.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var timeIn = $('[data-now-time]');
    timeIn.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
    dateIn.form.addEventListener('submit', function () {
      var d = new Date(dateIn.value + 'T' + (timeIn.value || '08:00'));
      if (!isNaN(d)) $('[data-quit-iso]').value = d.toISOString();
    });
  }

  var clock = $('[data-live-clock]');
  var daysEl = $('[data-live-days]');
  if (clock && daysEl) {
    var since = new Date(daysEl.dataset.since).getTime();
    var tick = function () {
      var s = Math.max(0, Math.floor((Date.now() - since) / 1000));
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      daysEl.textContent = d;
      clock.textContent = 'dhe ' + h + ' orë, ' + m + ' minuta, ' + sec + ' sekonda';
    };
    tick();
    setInterval(tick, 1000);
  }

  var cravingBtn = $('[data-craving]');
  var breathe = $('[data-breathe]');
  if (cravingBtn && breathe) {
    var circle = $('[data-circle]', breathe);
    var timerEl = $('[data-timer]', breathe);
    var after = $('[data-after]', breathe);
    var phaseTimer = null;
    var countdown = null;
    var csrf = $('input[name="_csrf"]').value;

    var phases = [
      ['in', 'Merr frymë…', 4000],
      ['hold', 'Mbaje…', 4000],
      ['out', 'Lëshoje ngadalë…', 6000],
    ];
    function cycle(i) {
      var p = phases[i % phases.length];
      circle.className = 'breathe-circle ' + p[0];
      circle.textContent = p[1];
      phaseTimer = setTimeout(function () { cycle(i + 1); }, p[2]);
    }
    function stop() {
      clearTimeout(phaseTimer);
      clearInterval(countdown);
    }
    cravingBtn.addEventListener('click', function () {
      breathe.hidden = false;
      after.hidden = true;
      circle.hidden = false;
      timerEl.hidden = false;
      var left = 120;
      timerEl.textContent = '2:00';
      cycle(0);
      countdown = setInterval(function () {
        left -= 1;
        timerEl.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        if (left <= 0) {
          stop();
          circle.hidden = true;
          timerEl.hidden = true;
          after.hidden = false;
          fetch('/paneli/pa-duhan/deshira', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: '_csrf=' + encodeURIComponent(csrf),
          })
            .then(function (r) { return r.json(); })
            .then(function (d) { var el = $('[data-cravings]'); if (el && d.ok) el.textContent = d.count; })
            .catch(function () {});
        }
      }, 1000);
    });
    $('[data-breathe-close]', breathe).addEventListener('click', function () {
      stop();
      breathe.hidden = true;
    });
  }
})();
