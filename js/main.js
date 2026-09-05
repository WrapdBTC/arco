/* =========================================================
   ARCO — main.js
   Boot · nav · mode switch · countdown · ticker · lore rail
   parallax · reveals · the ball (fetch easter egg)
   ========================================================= */
(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('arco.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('arco.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k)    { try { localStorage.removeItem('arco.' + k); } catch (e) {} }
  };

  /* ── toast ─────────────────────────────────────────── */
  let toastT;
  const toastEl = $('#toast');
  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), ms || 2600);
  }
  window.ArcoToast = toast;

  /* ── broken images → styled placeholder (never a broken icon) ── */
  function placeholder(img) {
    if (!img.parentNode || img.dataset.ph) return;
    img.dataset.ph = '1';
    const d = document.createElement('div');
    d.className = 'ph';
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', img.alt || 'Arco artwork');
    d.innerHTML =
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<ellipse cx="50" cy="62" rx="26" ry="22"/>' +
      '<ellipse cx="26" cy="34" rx="10" ry="13"/><ellipse cx="42" cy="23" rx="9.5" ry="13"/>' +
      '<ellipse cx="60" cy="23" rx="9.5" ry="13"/><ellipse cx="75" cy="34" rx="10" ry="13"/>' +
      '</svg><span>' + (img.alt || 'Art coming') + '</span>';
    if (img.width)  d.style.aspectRatio = (img.width || 1) + '/' + (img.height || 1);
    img.replaceWith(d);
  }
  document.addEventListener('error', e => {
    if (e.target && e.target.tagName === 'IMG') placeholder(e.target);
  }, true);

  /* ── 1. BOOT ───────────────────────────────────────── */
  (function boot() {
    const el = $('#boot'), bar = $('#bootBar');
    if (!el) return;
    let p = 0;
    const tick = setInterval(() => { p = Math.min(96, p + 11 + Math.random() * 16); bar.style.width = p + '%'; }, 90);
    const finish = () => {
      clearInterval(tick);
      bar.style.width = '100%';
      setTimeout(() => { el.classList.add('done'); document.body.classList.add('ready'); }, 220);
    };
    const hero = $('#heroDog');
    let waited = false;
    const go = () => { if (!waited) { waited = true; finish(); } };
    if (hero && !hero.complete) hero.addEventListener('load', go, { once: true });
    window.addEventListener('load', go, { once: true });
    setTimeout(go, 1600);              // hard cap — never hold the user hostage
  })();

  /* ── 2. NAV ────────────────────────────────────────── */
  const nav = $('#nav');
  const onScrollNav = () => nav && nav.classList.toggle('stuck', window.scrollY > 24);
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  const burger = $('#burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__links a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ── 3. MODE SWITCH (Good Boy ⇄ Degen) ─────────────── */
  const modeBtn = $('#modeBtn'), modeLabel = $('#modeLabel');

  // Night Arco (hoodie) is only fetched when it is actually needed, then idly
  // pre-warmed after load so the first toggle does not flash.
  function ensureNightDog() {
    const n = $('#heroDogNight');
    if (n && !n.getAttribute('src') && n.dataset.src) n.src = n.dataset.src;
  }
  window.addEventListener('load', () => setTimeout(ensureNightDog, 800));

  function setMode(m, announce) {
    if (m === 'night') ensureNightDog();
    document.documentElement.classList.add('mode-anim');
    document.documentElement.dataset.mode = m;
    if (modeLabel) modeLabel.textContent = m === 'night' ? 'DEGEN' : 'GOOD BOY';
    if (modeBtn) modeBtn.setAttribute('aria-pressed', String(m === 'night'));
    const tc = $('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', m === 'night' ? '#07040E' : '#6D4AE0');
    store.set('mode', m);
    setTimeout(() => document.documentElement.classList.remove('mode-anim'), 520);
    if (announce) toast(m === 'night' ? 'Night shift. The collar is off.' : 'Good boy mode restored.');
  }
  setMode(store.get('mode', 'day'), false);
  if (modeBtn) modeBtn.addEventListener('click', () =>
    setMode(document.documentElement.dataset.mode === 'night' ? 'day' : 'night', true));

  /* ── 4. COUNTDOWN ──────────────────────────────────── */
  (function countdown() {
    const target = new Date(LAUNCH.iso).getTime();
    const D = $('#cdD'), H = $('#cdH'), M = $('#cdM'), S = $('#cdS'), dateEl = $('#cdDate');
    if (dateEl) dateEl.textContent = LAUNCH.label;
    const pad = n => String(n).padStart(2, '0');
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        if (D) D.textContent = '00'; if (H) H.textContent = '00';
        if (M) M.textContent = '00'; if (S) S.textContent = '00';
        const lbl = $('.tag__label'); if (lbl) lbl.textContent = 'He is out';
        return;
      }
      const s = Math.floor(diff / 1000);
      if (D) D.textContent = pad(Math.floor(s / 86400));
      if (H) H.textContent = pad(Math.floor(s / 3600) % 24);
      if (M) M.textContent = pad(Math.floor(s / 60) % 60);
      if (S) S.textContent = pad(s % 60);
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ── 5. TICKER ─────────────────────────────────────── */
  (function ticker() {
    const track = $('#tickerTrack');
    if (!track || typeof TICKER === 'undefined') return;
    const one = TICKER.map(t => '<span class="ticker__i">' + t + '</span>').join('');
    track.innerHTML = one + one;               // duplicated for a seamless -50% loop
  })();

  /* ── 6. LORE RAIL ──────────────────────────────────── */
  (function rail() {
    const rail = $('#rail'), track = $('#railTrack');
    if (!rail || !track || typeof LORE === 'undefined') return;

    track.innerHTML = LORE.map(c =>
      '<article class="chapter' + (c.dark ? ' chapter--dark' : '') + '">' +
        '<div class="chapter__art">' +
          '<img src="' + c.sprite + '" alt="Arco — ' + c.tag + '" loading="lazy" width="190" height="190">' +
          '<span class="chapter__stamp">' + c.stamp + '</span>' +
        '</div>' +
        '<div class="chapter__body">' +
          '<div class="chapter__meta">' + c.tag + ' <i>/</i> <i>' + c.n + '</i></div>' +
          '<h3>' + c.title + '</h3><p>' + c.body + '</p>' +
        '</div>' +
      '</article>'
    ).join('');

    const cards = $$('.chapter', track);
    const step = () => (cards[0] ? cards[0].offsetWidth + 24 : 400);

    // arrows
    const prev = $('#railPrev'), next = $('#railNext');
    const nudge = d => rail.scrollBy({ left: d * step(), behavior: RM ? 'auto' : 'smooth' });
    if (prev) prev.addEventListener('click', () => nudge(-1));
    if (next) next.addEventListener('click', () => nudge(1));

    // keyboard
    rail.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge(-1); }
    });

    // pointer drag (mouse — touch already scrolls natively)
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft;
      rail.classList.add('dragging');
    });
    rail.addEventListener('pointermove', e => {
      if (!down) return;
      const d = e.clientX - sx; moved = Math.abs(d);
      rail.scrollLeft = sl - d;
    });
    const up = () => { if (!down) return; down = false; rail.classList.remove('dragging'); };
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
    rail.addEventListener('pointerleave', up);
    rail.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    // progress + arrow state
    const prog = $('#railProg');
    function sync() {
      const max = rail.scrollWidth - rail.clientWidth;
      const p = max > 0 ? rail.scrollLeft / max : 0;
      if (prog) prog.style.width = Math.max(12, (rail.clientWidth / rail.scrollWidth) * 100) + '%',
                prog.style.transform = 'translateX(' + (p * (rail.clientWidth - prog.offsetWidth)) + 'px)';
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = rail.scrollLeft > max - 4;
    }
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    setTimeout(sync, 60);
  })();

  /* ── 7. NFT PACK WALL ──────────────────────────────── */
  (function packwall() {
    const wall = $('#packWall');
    if (!wall) return;
    let html = '';
    for (let i = 1; i <= 8; i++) {
      const id = String(i).padStart(2, '0');
      html += '<figure class="pcard" data-id="ARCO #' + id + '">' +
              '<img src="assets/nfts/' + id + '.jpg" alt="Arco NFT ' + id + '" loading="lazy" width="560" height="560">' +
              '</figure>';
    }
    wall.innerHTML = html;
  })();

  /* ── 8. REVEALS ────────────────────────────────────── */
  (function reveals() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || RM) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (!en.isIntersecting) return;
        setTimeout(() => en.target.classList.add('in'), i * 80);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    els.forEach(e => io.observe(e));
  })();

  /* ── 9. PARALLAX (transform only, rAF-batched) ─────── */
  (function parallax() {
    if (RM) return;
    const items = $$('[data-px]');
    if (!items.length) return;
    let y = window.scrollY, queued = false, mx = 0, my = 0;

    const hero = $('.hero');
    if (hero && window.matchMedia('(pointer:fine)').matches) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - .5;
        my = (e.clientY - r.top) / r.height - .5;
        req();
      });
      hero.addEventListener('pointerleave', () => { mx = my = 0; req(); });
    }

    function draw() {
      queued = false;
      items.forEach(el => {
        const k = parseFloat(el.dataset.px) || 0;
        const isDog = el.classList.contains('hero__dogwrap');
        const base = isDog ? 'translateY(-50%) ' : '';
        const tx = isDog ? mx * 26 : mx * 12;
        const ty = y * k + (isDog ? my * 18 : my * 8);
        el.style.transform = base + 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)' +
                             (isDog ? ' rotate(' + (mx * 3).toFixed(2) + 'deg)' : '');
      });
    }
    function req() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
    window.addEventListener('scroll', () => {
      if (window.scrollY > window.innerHeight * 1.4) return;   // hero only
      y = window.scrollY; req();
    }, { passive: true });
    req();
  })();

  /* ── 10. VIDEO (site film + NFT launch trailer) ────── */
  (function video() {
    function wire(vid, btn, phLabel, phClass) {
      const v = $(vid), b = $(btn);
      if (!v || !b) return;
      b.addEventListener('click', () => {
        v.preload = 'auto';
        v.controls = true;                // only once it is actually playing
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
        b.classList.add('gone');
      });
      v.addEventListener('error', () => {
        b.classList.add('gone');
        const host = v.parentNode;
        if (host) host.innerHTML = '<div class="ph ' + phClass + '"><span>' + phLabel + '</span></div>';
      });
    }
    wire('#arcoVideo', '#filmPlay', 'Arco film — assets/arco.mp4', 'ph--wide');
    wire('#nftVideo', '#nftPlay', 'NFT trailer — assets/nft-trailer.mp4', 'ph--square');
  })();

  /* ── 11. THE BALL (fetch easter egg) ───────────────── */
  (function fetchBall() {
    const layer = $('#fetchLayer'), dog = $('#fetchDog'), ball = $('#fetchBall');
    const btn = $('#ballBtn');
    if (!layer || !dog || !ball) return;

    const RUN = ['assets/sprites/run-1.png', 'assets/sprites/run-2.png',
                 'assets/sprites/run-3.png', 'assets/sprites/run-4.png'];
    RUN.forEach(s => { const i = new Image(); i.src = s; });   // warm the cache

    // Measured transparent padding per frame. Normalising against it keeps his
    // feet on one line and his size constant instead of bobbing frame to frame.
    const MET = [{ t: .184, b: .225 }, { t: .181, b: .228 },
                 { t: .156, b: .181 }, { t: .206, b: .244 }];
    const PARTY = { t: .056, b: .113 };
    const VIS = .60;                                    // target visible height
    const REF = MET[0];
    const refK = VIS / (1 - REF.t - REF.b), refB = REF.b * refK;

    function pose(m, size, x, bob) {
      const k = VIS / (1 - m.t - m.b);
      const off = (m.b * k - refB) * size;
      return 'translate3d(' + x.toFixed(1) + 'px,' + (bob + off).toFixed(1) + 'px,0) scale(' +
             (-k).toFixed(3) + ',' + k.toFixed(3) + ')';
    }

    let busy = false;

    function confettiAt(x) {
      const colors = ['#C9F24D', '#6D4AE0', '#FF5FA2', '#22D3EE', '#FFFFFF'];
      for (let i = 0; i < 16; i++) {
        const p = document.createElement('i');
        p.style.cssText = 'position:absolute;bottom:70px;left:' + x + 'px;width:9px;height:13px;border-radius:2px;' +
          'background:' + colors[i % colors.length] + ';will-change:transform,opacity';
        layer.appendChild(p);
        p.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + (Math.random() * 220 - 110) + 'px,' + (-90 - Math.random() * 110) + 'px) rotate(' + (Math.random() * 620 - 310) + 'deg)', opacity: 1, offset: .55 },
          { transform: 'translate(' + (Math.random() * 300 - 150) + 'px,90px) rotate(' + (Math.random() * 800 - 400) + 'deg)', opacity: 0 }
        ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' })
         .onfinish = () => p.remove();
      }
    }

    function throwBall() {
      if (busy) return;
      busy = true;
      layer.classList.add('live');
      ball.classList.add('live');

      const W = window.innerWidth;
      const dogW = window.innerWidth < 860 ? 92 : 120;

      // ball physics
      let bx = 40, by = 60, vx = 7.5 + Math.random() * 4.5, vy = 13;
      const g = 0.52, damp = 0.55;
      // dog
      let dx = -dogW - 40, frame = 0, ft = 0, caught = false, hold = 0, exiting = false;
      const speed = 8.4;

      if (RM) {   // reduced motion: skip the physics, just celebrate
        ball.classList.remove('live');
        dog.src = 'assets/sprites/party.png';
        dog.style.transform = pose(PARTY, dogW, W * .5 - dogW / 2, 0);
        confettiAt(W * .5);
        done(1200);
        return;
      }

      let raf, last = 0;
      function loop(now) {
        // delta-timed against 60fps — otherwise this whole cameo plays 2.5x
        // too fast on a 144Hz display
        if (!last) last = now;
        const dt = Math.min(3, (now - last) / 16.6667) || 1;
        last = now;
        // --- ball ---
        if (!caught) {
          bx += vx * dt; by += vy * dt; vy -= g * dt;
          if (by <= 0) {
            by = 0; vy = Math.abs(vy) * damp; vx *= Math.pow(.82, dt);
            if (vy < 1.6) { vy = 0; vx *= .7; }
          }
          if (bx > W - 60) { bx = W - 60; vx *= -.5; }
          ball.style.transform = 'translate3d(' + bx + 'px,' + (-by) + 'px,0) rotate(' + (bx * 2.4) + 'deg)';
        }

        // --- dog ---
        if (!caught) {
          dx += speed * dt;
          ft += dt;
          const nf = Math.floor(ft / 5) % RUN.length;
          if (nf !== frame) { frame = nf; dog.src = RUN[frame]; }
          const bob = Math.sin(ft * .38) * 6;
          dog.style.transform = pose(MET[frame], dogW, dx, bob);
          if (dx + dogW * .78 >= bx) {
            caught = true;
            ball.classList.remove('live');
            dog.src = 'assets/sprites/party.png';
            dog.style.transform = pose(PARTY, dogW, dx, 0);
            confettiAt(dx + dogW / 2);
            registerFetch();
          }
        } else if (!exiting) {
          hold += dt;
          if (hold > 52) { exiting = true; ft = 0; }
        } else {
          dx += speed * 1.15 * dt;
          ft += dt;
          const nf2 = Math.floor(ft / 5) % RUN.length;
          if (nf2 !== frame) { frame = nf2; dog.src = RUN[frame]; }
          dog.style.transform = pose(MET[frame], dogW, dx, Math.sin(ft * .38) * 6);
          if (dx > W + 40) { cancelAnimationFrame(raf); done(0); return; }
        }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
    }

    function done(delay) {
      setTimeout(() => {
        layer.classList.remove('live');
        ball.classList.remove('live');
        dog.src = RUN[0];
        dog.style.transform = 'translateX(-160px)';
        busy = false;
      }, delay || 0);
    }

    function registerFetch() {
      const n = store.get('fetches', 0) + 1;
      store.set('fetches', n);
      if (n === 1) toast('Good boy. (Press F to throw again)');
      else if (n === 5 && document.documentElement.dataset.mode !== 'night') {
        setTimeout(() => { setMode('night', false); toast('5 fetches. Night shift unlocked. 🌙'); }, 700);
      } else if (n === 10) toast('Ten fetches. He would do this forever.');
    }

    if (btn) btn.addEventListener('click', throwBall);
    window.addEventListener('keydown', e => {
      if (e.key.toLowerCase() !== 'f') return;
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      throwBall();
    });
    window.ArcoFetch = throwBall;
  })();

  /* ── 12. LINKS FROM CONFIG ─────────────────────────── */
  (function links() {
    const map = { fX: SOCIAL.x, fTg: SOCIAL.telegram };
    Object.keys(map).forEach(id => { const el = $('#' + id); if (el) el.href = map[id]; });
    const s = $('#tSupply'); if (s) s.textContent = LAUNCH.supply;
    const cd = $('#caDate'); if (cd) cd.textContent = LAUNCH.label.replace(' · 00:00 UTC', '');
    const ca = $('#caText');
    if (ca && LAUNCH.contract && LAUNCH.contract !== 'TBA') {
      ca.textContent = LAUNCH.contract;
      const cp = $('#caCopy');
      if (cp) {
        cp.disabled = false;
        cp.addEventListener('click', () => {
          navigator.clipboard.writeText(LAUNCH.contract)
            .then(() => toast('Contract copied.'))
            .catch(() => toast('Copy failed — select it manually.'));
        });
      }
    }
  })();

})();
