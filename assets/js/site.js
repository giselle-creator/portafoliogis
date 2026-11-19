/* Sitio publico: sin dependencias. Revela secciones, filtra reels, reproduce enlaces, formulario y analitica propia. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) { root.classList.add('js'); }

  var meta = function (n) { var m = d.querySelector('meta[name="' + n + '"]'); return m ? m.getAttribute('content') : ''; };
  function track(name) {
    try {
      var url = meta('event-url'); if (!url || !navigator.sendBeacon) { return; }
      navigator.sendBeacon(url, new Blob([JSON.stringify({ name: name, path: location.pathname })], { type: 'application/json' }));
    } catch (e) { /* la analitica nunca rompe el sitio */ }
  }
  function ready(fn) { if (d.readyState !== 'loading') { fn(); } else { d.addEventListener('DOMContentLoaded', fn); } }


  // 0) Reels y marcas: se leen de /data/reels.json y /data/marcas.json
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); }
  function renderData() {
    return Promise.all([getJSON('/data/reels.json'), getJSON('/data/marcas.json')]).then(function (res) {
      var reels = res[0] || [], marcas = res[1] || [];
      var grid = d.querySelector('[data-reels]'), chips = d.querySelector('[data-chips]');
      if (grid) {
        var cats = [];
        grid.innerHTML = reels.map(function (r, i) {
          if (cats.indexOf(r.categoria) === -1) { cats.push(r.categoria); }
          var play = r.video ? '<button type="button" class="play" data-track="reel:' + (i + 1) + '" aria-label="Reproducir reel de ' + esc(r.categoria) + '">▶</button>' : '';
          return '<figure class="reel" data-cat="' + esc(r.categoria) + '"><div class="phone-wrap"><span class="phone-back" aria-hidden="true"></span>' +
            '<div class="phone" data-kind="file" data-embed="" data-src="' + esc(r.video) + '" data-poster="' + esc(r.portada) + '"><span class="notch" aria-hidden="true"></span>' +
            '<img src="' + esc(r.portada) + '" alt="' + esc(r.descripcion) + '" loading="lazy">' + play + '</div></div>' +
            '<figcaption class="serif-up cap">' + esc(r.categoria) + '</figcaption></figure>';
        }).join('');
        if (chips) {
          chips.innerHTML = '<button type="button" class="chip on" data-filter="*" aria-pressed="true">Todos</button>' +
            cats.map(function (c) { return '<button type="button" class="chip" data-filter="' + esc(c) + '" aria-pressed="false">' + esc(c) + '</button>'; }).join('');
          chips.hidden = cats.length < 2;
        }
      }
      var lg = d.querySelector('[data-marcas]');
      if (lg) { lg.innerHTML = marcas.map(function (m) { return '<div class="logo"><img src="' + esc(m.logo) + '" alt="' + esc(m.nombre) + '" loading="lazy"></div>'; }).join(''); }
    });
  }

  // Hosts permitidos para iframes (defensa adicional a la CSP)
  var EMBED_HOSTS = ['www.youtube-nocookie.com', 'www.instagram.com', 'www.tiktok.com', 'player.vimeo.com'];

  ready(function () { renderData().then(init); });

  function init() {
    var solo = d.body.classList.contains('is-solo');

    // 1) Revelar al hacer scroll
    var reveals = d.querySelectorAll('.reveal');
    if (root.classList.contains('js') && 'IntersectionObserver' in window && !solo) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    } else { reveals.forEach(function (el) { el.classList.add('in'); }); }
    if (solo) { return; }

    // 2) Clics medibles (data-track)
    d.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-track]') : null;
      if (el) { track(el.getAttribute('data-track')); }
    });

    // 3) Resaltar el enlace de la seccion visible
    var spy = d.querySelectorAll('[data-spy]');
    function onScroll() {
      var h = window.innerHeight, active = '';
      ['sobre-mi', 'contenido', 'comunidad', 'reels', 'marcas', 'contacto'].forEach(function (id) {
        var s = d.getElementById(id); if (s && s.getBoundingClientRect().top < h * 0.42) { active = id; }
      });
      spy.forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-spy') === active); });
      var top = d.querySelector('[data-to-top]'); if (top) { top.hidden = window.scrollY < h * 0.9; }
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var tt = d.querySelector('[data-to-top]');
    if (tt) { tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }); }

    // 4) Menu flotante
    var mb = d.querySelector('[data-menu-toggle]'), mm = d.getElementById('float-menu');
    function setMenu(open) { if (!mb || !mm) { return; } mm.hidden = !open; mb.setAttribute('aria-expanded', String(open)); mb.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); }
    if (mb) { mb.addEventListener('click', function () { setMenu(mm.hidden); }); }
    d.querySelectorAll('[data-menu-link]').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

    // 5) Filtro de reels
    d.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        d.querySelectorAll('[data-filter]').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
        d.querySelectorAll('.reel').forEach(function (r) { r.hidden = !(f === '*' || r.getAttribute('data-cat') === f); });
      });
    });

    // 6) Reproducir reels: el iframe/video solo se carga al pulsar (privacidad y velocidad)
    d.querySelectorAll('.phone .play').forEach(function (btn) {
      if (btn.tagName !== 'BUTTON') { return; }
      btn.addEventListener('click', function () {
        var phone = btn.closest('.phone'), kind = phone.getAttribute('data-kind'), el;
        if (kind === 'file') {
          var src = phone.getAttribute('data-src');
          if (!src || !(/^https:\/\//i.test(src) || src.charAt(0) === '/')) { return; }
          el = d.createElement('video'); el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.poster = phone.getAttribute('data-poster') || '';
        } else {
          var u; try { u = new URL(phone.getAttribute('data-embed')); } catch (e) { return; }
          if (u.protocol !== 'https:' || EMBED_HOSTS.indexOf(u.hostname) === -1) { return; }
          el = d.createElement('iframe'); el.src = u.href; el.loading = 'lazy'; el.title = 'Reproductor de video';
          el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); el.setAttribute('allowfullscreen', '');
          el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        }
        var img = phone.querySelector('img'); if (img) { img.remove(); }
        btn.remove(); phone.appendChild(el);
      });
    });

    // 7) Formulario de contacto
    var dlg = d.getElementById('contact-dialog');
    var form = d.querySelector('[data-lead-form]');
    // Captcha (Cloudflare Turnstile): el script de Cloudflare se carga solo al abrir el formulario.
    var cap = form ? form.querySelector('[data-turnstile]') : null, capId = null, capLoading = false;
    function capRender() {
      if (!cap || capId !== null || !window.turnstile) { return; }
      capId = window.turnstile.render(cap, { sitekey: cap.getAttribute('data-sitekey'), action: 'lead', language: 'es', theme: 'light', size: cap.clientWidth && cap.clientWidth < 300 ? 'compact' : 'flexible', 'refresh-expired': 'auto' });
    }
    function capLoad() {
      if (!cap) { return; }
      if (window.turnstile) { capRender(); return; }
      if (capLoading) { return; }
      capLoading = true;
      var s = d.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = capRender;
      s.onerror = function () { capLoading = false; };
      d.head.appendChild(s);
    }
    function capReset() { if (capId !== null && window.turnstile) { try { window.turnstile.reset(capId); } catch (e) { /* widget no disponible */ } } }
    if (dlg && typeof dlg.showModal === 'function') {
      d.querySelectorAll('[data-open-form]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); dlg.showModal(); capLoad(); var n = d.getElementById('lf-name'); if (n) { n.focus(); } }); });
      d.querySelectorAll('[data-close-form]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
      var okDlg = d.getElementById('lead-ok-dialog');
      if (okDlg) { d.querySelectorAll('[data-close-ok]').forEach(function (b) { b.addEventListener('click', function () { okDlg.close(); }); }); okDlg.addEventListener('click', function (e) { if (e.target === okDlg) { okDlg.close(); } }); }
    } else {
      d.querySelectorAll('[data-open-form]').forEach(function (b) { b.addEventListener('click', function () { location.href = 'mailto:'; }); });
    }
    if (form) {
      var src = new URLSearchParams(location.search).get('utm_source') || '';
      if (!src && d.referrer) { try { src = new URL(d.referrer).hostname.replace(/^www\./, ''); if (src === location.hostname) { src = ''; } } catch (e) { src = ''; } }
      var hidden = form.querySelector('input[name="source"]'); if (hidden) { hidden.value = src.slice(0, 80); }
      var errBox = form.querySelector('[data-form-errors]');
      function showErrors(list) { errBox.hidden = !list.length; errBox.innerHTML = ''; var ul = d.createElement('ul'); list.forEach(function (t) { var li = d.createElement('li'); li.textContent = t; ul.appendChild(li); }); errBox.appendChild(ul); }
      form.addEventListener('submit', function (e) {
        e.preventDefault(); showErrors([]);
        if (cap) {
          var tok = form.querySelector('input[name="cf-turnstile-response"]');
          if (!tok || !tok.value) { capLoad(); showErrors(['Espera un momento a que termine la verificación anti-spam (o márcala) y vuelve a enviar.']); return; }
        }
        var btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
        fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
          .then(function (res) {
            if (res.s === 200 && res.j.ok) {
              form.reset(); capReset(); track('lead:enviado'); if (dlg.open) { dlg.close(); } var okd = d.getElementById('lead-ok-dialog'); if (okd && typeof okd.showModal === 'function') { okd.showModal(); }
            } else if (res.s === 422 && res.j.errors) {
              var msgs = []; Object.keys(res.j.errors).forEach(function (k) { msgs = msgs.concat(res.j.errors[k]); }); showErrors(msgs);
            } else if (res.s === 429) { showErrors(['Hiciste varios envíos seguidos. Espera unos minutos e inténtalo de nuevo.']);
            } else { showErrors(['No se pudo enviar. Inténtalo de nuevo o escríbeme por WhatsApp.']); }
          })
          .catch(function () { showErrors(['Sin conexión. Revisa tu internet e inténtalo de nuevo.']); })
          .then(function () { btn.disabled = false; if (dlg && dlg.open) { capReset(); } });
      });
    }


    // 9) Sobre de marcas: los logos salen del sobre al llegar a la sección
    (function () {
      var esc = d.querySelector('[data-sobre]'); if (!esc) { return; }
      var sobre = esc.querySelector('.sobre'), logos = esc.querySelectorAll('.logo');
      if (reduced || !('IntersectionObserver' in window) || !logos.length) { esc.classList.add('abierto'); return; }
      function medir() {
        var abierto = esc.classList.contains('abierto');
        esc.classList.remove('listo', 'abierto');
        var r = sobre.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.78;
        logos.forEach(function (l, i) {
          var b = l.getBoundingClientRect();
          l.style.setProperty('--dx', (cx - (b.left + b.width / 2)) + 'px');
          l.style.setProperty('--dy', (cy - (b.top + b.height / 2)) + 'px');
          l.style.setProperty('--i', i);
          l.style.setProperty('--r', ((i % 2 ? 1 : -1) * (4 + (i * 7) % 9)) + 'deg');
        });
        esc.classList.add('listo'); if (abierto) { esc.classList.add('abierto'); }
      }
      medir();
      var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(medir, 200); });
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { esc.classList.add('abierto'); io2.disconnect(); } });
      }, { threshold: 0.2 });
      io2.observe(esc);
      sobre.addEventListener('click', function () {
        esc.classList.remove('abierto'); void esc.offsetWidth;
        setTimeout(function () { esc.classList.add('abierto'); }, 700);
      });
    })();

    // 8) Aviso de cookies tecnicas
    var ck = d.querySelector('[data-cookie]'), ok = d.querySelector('[data-cookie-ok]');
    try { if (ck && !localStorage.getItem('cookie-ok')) { ck.hidden = false; } } catch (e) { if (ck) { ck.hidden = false; } }
    if (ok) { ok.addEventListener('click', function () { ck.hidden = true; try { localStorage.setItem('cookie-ok', '1'); } catch (e) { /* sin almacenamiento */ } }); }
  }
})();
