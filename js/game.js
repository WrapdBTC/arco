/* =========================================================
   ARCO — FETCH RUN
   Endless runner. Jump red candles, dodge the rug, get balls.
   Keyboard (Space / ↑) + touch (tap, double-tap = double jump).
   Logical canvas space is a fixed 960×360; everything scales.
   ========================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = 960, H = 360, GROUND = 296;

  const el = {
    score: document.getElementById('gScore'),
    best:  document.getElementById('gBest'),
    balls: document.getElementById('gBalls'),
    start: document.getElementById('gStart'),
    over:  document.getElementById('gOver'),
    overT: document.getElementById('gOverTitle'),
    overX: document.getElementById('gOverText'),
    overI: document.getElementById('gOverImg'),
    stage: document.getElementById('stage')
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('arco.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('arco.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ── sprites ─────────────────────────────────────── */
  const SRC = {
    run: ['assets/sprites/run-1.png', 'assets/sprites/run-2.png', 'assets/sprites/run-3.png', 'assets/sprites/run-4.png'],
    air: 'assets/sprites/air.png'
  };
  // Measured transparent padding per sprite (fraction of the 320px frame).
  // Without this the run frames jitter vertically and change size mid-stride.
  const MET = {
    'run-1': { t: .184, b: .225 }, 'run-2': { t: .181, b: .228 },
    'run-3': { t: .156, b: .181 }, 'run-4': { t: .206, b: .244 },
    'air':   { t: .125, b: .153 }
  };
  const KEY = ['run-1', 'run-2', 'run-3', 'run-4'];
  const img = { run: [], air: null, ok: false };
  let loaded = 0, need = SRC.run.length + 1;
  const bump = () => { if (++loaded >= need) img.ok = true; };
  SRC.run.forEach((s, i) => { const im = new Image(); im.onload = bump; im.onerror = bump; im.src = s; img.run[i] = im; });
  (function () { const im = new Image(); im.onload = bump; im.onerror = bump; im.src = SRC.air; img.air = im; })();

  /* ── palette follows the site mode ───────────────── */
  function pal() {
    const night = document.documentElement.dataset.mode === 'night';
    return night ? {
      sky1: '#1B0B3D', sky2: '#0A0518', disc: '#F3ECFF', discGlow: 'rgba(168,85,247,.30)',
      star: 'rgba(233,224,255,.9)', far: '#3B1C72', mid: '#2A1055', near: '#1A0838',
      ground: '#14082A', line: '#A855F7', dust: 'rgba(168,85,247,.55)',
      candle: '#FF3D6E', rug: '#8B5CF6', hydrant: '#22D3EE', ball: '#C9F24D', text: '#EFEAFF'
    } : {
      sky1: '#A9B0F6', sky2: '#EFECFF', disc: '#FFF6D8', discGlow: 'rgba(255,232,150,.55)',
      star: 'rgba(255,255,255,.85)', far: '#C3C7F8', mid: '#9DA3EE', near: '#7C83E2',
      ground: '#E4E0F5', line: '#17132A', dust: 'rgba(23,19,42,.22)',
      candle: '#E5385C', rug: '#6D4AE0', hydrant: '#2AB6C9', ball: '#9ECB1E', text: '#17132A'
    };
  }

  /* ── state ───────────────────────────────────────── */
  let state = 'idle';               // idle | run | dead
  let dog, obs, balls, parts, dust;
  let speed, dist, score, ballCount, t, spawnGap, nextSpawn, shake;
  let best = store.get('best', 0);
  if (el.best) el.best.textContent = best;

  function reset() {
    dog = { x: 130, y: GROUND, vy: 0, w: 84, h: 84, jumps: 0, frame: 0, ft: 0, squash: 1 };
    obs = []; balls = []; parts = []; dust = [];
    speed = 7.2; dist = 0; score = 0; ballCount = 0; t = 0; shake = 0;
    spawnGap = 78; nextSpawn = 60; last = 0;
    paint();
  }

  function paint() {
    if (el.score) el.score.textContent = Math.floor(score);
    if (el.balls) el.balls.textContent = ballCount;
    if (el.best)  el.best.textContent = best;
  }

  /* ── input ───────────────────────────────────────── */
  function jump() {
    if (state === 'idle') { start(); return; }
    if (state !== 'run') return;
    if (dog.jumps >= 2) return;
    dog.vy = dog.jumps === 0 ? -13.6 : -11.4;
    dog.jumps++;
    dog.squash = 0.82;
  }

  function inView() {
    if (!el.stage) return false;
    const r = el.stage.getBoundingClientRect();
    return r.top < window.innerHeight * .85 && r.bottom > window.innerHeight * .15;
  }

  window.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code !== 'Space' && e.key !== 'ArrowUp') return;
    if (state === 'run' || (inView() && state !== 'run')) {
      e.preventDefault();          // only steal Space when the game is the obvious target
      jump();
    }
  });

  canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  document.getElementById('gStartBtn').addEventListener('click', start);
  document.getElementById('gAgainBtn').addEventListener('click', start);

  function start() {
    reset();
    state = 'run';
    el.start.classList.add('overlay--hide');
    el.over.classList.add('overlay--hide');
    canvas.focus && canvas.focus();
  }

  function die() {
    state = 'dead';
    shake = 12;
    const s = Math.floor(score);
    if (s > best) { best = s; store.set('best', best); }
    paint();

    let title = 'He tripped.', line = 'Score ' + s + ' · ' + ballCount + ' balls';
    if (s >= 1200) title = 'Absolute unit.';
    else if (s >= 600) title = 'Certified good boy.';
    else if (s >= 250) title = 'Not bad at all.';
    el.overT.textContent = title;
    el.overX.textContent = line + (s >= best && s > 0 ? ' — new best!' : '');
    el.overI.src = s >= 600 ? 'assets/sprites/party.png' : 'assets/sprites/sit.png';
    el.over.classList.remove('overlay--hide');

    if (s >= 600 && typeof window.ArcoBonus === 'function') window.ArcoBonus(s);
  }

  /* ── spawning ────────────────────────────────────── */
  function spawn() {
    const roll = Math.random();
    if (roll < 0.34)      obs.push({ type: 'candle',  x: W + 40, w: 26, h: 62, y: GROUND });
    else if (roll < 0.62) obs.push({ type: 'hydrant', x: W + 40, w: 30, h: 46, y: GROUND });
    else if (roll < 0.84) obs.push({ type: 'rug',     x: W + 40, w: 92, h: 26, y: GROUND });
    else {
      obs.push({ type: 'candle', x: W + 40,  w: 24, h: 54, y: GROUND });
      obs.push({ type: 'candle', x: W + 106, w: 24, h: 74, y: GROUND });
    }
    // a ball arc to chase
    if (Math.random() < 0.72) {
      const h = 90 + Math.random() * 90;
      for (let i = 0; i < 3; i++) balls.push({ x: W + 150 + i * 46, y: GROUND - h - Math.sin(i) * 12, r: 11, got: false });
    }
  }

  /* ── drawing helpers ─────────────────────────────── */
  const mod = (n, m) => ((n % m) + m) % m;      // JS % is signed; scrolling decor needs wrap

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawObstacle(o, c) {
    const top = o.y - o.h;
    if (o.type === 'candle') {
      ctx.strokeStyle = c.candle; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, top - 14); ctx.lineTo(o.x + o.w / 2, o.y + 8); ctx.stroke();
      ctx.fillStyle = c.candle;
      roundRect(o.x, top, o.w, o.h, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      roundRect(o.x + 4, top + 5, 6, o.h - 12, 3); ctx.fill();
    } else if (o.type === 'hydrant') {
      ctx.fillStyle = c.hydrant;
      roundRect(o.x + 4, top + 10, o.w - 8, o.h - 10, 6); ctx.fill();
      roundRect(o.x, top + 16, o.w, 9, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(o.x + o.w / 2, top + 10, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      roundRect(o.x + o.w - 12, top + 12, 6, o.h - 14, 3); ctx.fill();
    } else {
      // the rug — rolled up, obviously
      ctx.fillStyle = c.rug;
      roundRect(o.x, top, o.w, o.h, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2.5;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(o.x + (o.w / 4) * i, top + 3); ctx.lineTo(o.x + (o.w / 4) * i, top + o.h - 3); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath(); ctx.ellipse(o.x + 9, top + o.h / 2, 5, o.h / 2 - 3, 0, 0, 7); ctx.fill();
    }
  }

  function drawDog(c) {
    const airborne = dog.y < GROUND - 2;
    const im  = airborne ? img.air : img.run[dog.frame];
    const met = airborne ? MET.air : MET[KEY[dog.frame]];
    const sq  = dog.squash;

    // normalise: every frame gets the same visible height and sits exactly on dog.y
    const vf = 1 - met.t - met.b;
    const dh = (dog.h * sq) / vf;
    const dw = dh;
    const dy = dog.y - dh * (1 - met.b);

    ctx.save();
    // ground shadow — shrinks and fades as he lifts off
    const lift = Math.max(0, (GROUND - dog.y) / 130);
    ctx.globalAlpha = .24 * (1 - lift * .75);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(dog.x, GROUND + 5, 32 * (1 - lift * .4), 6.5, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;

    if (img.ok && im && im.naturalWidth) {
      // Source cutouts face LEFT; the runner moves right, so mirror them.
      ctx.translate(dog.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, -dw / 2, dy, dw, dh);
    } else {                                    // sprite missing -> readable placeholder
      ctx.fillStyle = c.mid;
      roundRect(dog.x - 30, dog.y - 62, 60, 58, 16); ctx.fill();
      ctx.fillStyle = c.text; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('ARCO', dog.x, dog.y - 28);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  /* ── background ──────────────────────────────────── */
  function hills(yBase, amp, freq, par, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 24; x += 22) {
      const y = yBase + Math.sin((x + dist * par) / freq) * amp
                      + Math.sin((x + dist * par) / (freq * .38)) * (amp * .3);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  function drawBg(c) {
    const night = document.documentElement.dataset.mode === 'night';

    const g = ctx.createLinearGradient(0, skyTop, 0, H);
    g.addColorStop(0, c.sky1); g.addColorStop(1, c.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, skyTop, W, H - skyTop);

    // moon / sun
    ctx.fillStyle = c.discGlow;
    ctx.beginPath(); ctx.arc(782, 84, 62, 0, 7); ctx.fill();
    ctx.fillStyle = c.disc;
    ctx.beginPath(); ctx.arc(782, 84, 34, 0, 7); ctx.fill();
    if (night) {                       // crescent bite
      ctx.fillStyle = c.sky1;
      ctx.beginPath(); ctx.arc(766, 74, 30, 0, 7); ctx.fill();
    }

    // stars / sparkles
    ctx.fillStyle = c.star;
    for (let i = 0; i < 22; i++) {
      const x = mod(i * 271, W) + Math.sin(i) * 12;
      const y = 18 + ((i * 97) % 150);
      const tw = .35 + Math.abs(Math.sin((t + i * 30) / 55)) * .65;
      ctx.globalAlpha = (night ? .8 : .5) * tw;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2.2 : 1.3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // floating Arc cubes
    for (let i = 0; i < 10; i++) {
      const x = mod(i * 143 - dist * .16, W + 200) - 100;
      const y = 46 + ((i * 61) % 96);
      const sz = 11 + (i % 3) * 7;
      ctx.save();
      ctx.translate(x, y + Math.sin((t + i * 40) / 58) * 6);
      ctx.rotate(i % 2 ? .32 : -.24);
      ctx.globalAlpha = .55;
      ctx.fillStyle = c.far;
      roundRect(-sz / 2, -sz / 2, sz, sz, 4); ctx.fill();
      ctx.strokeStyle = c.line; ctx.globalAlpha = .16; ctx.lineWidth = 1.4;
      roundRect(-sz / 2, -sz / 2, sz, sz, 4); ctx.stroke();
      ctx.restore();
    }

    hills(206, 20, 128, .30, c.far);   // far ridge
    hills(236, 15,  86, .52, c.mid);   // mid ridge
    hills(268, 10,  58, .78, c.near);  // near ridge

    // ground slab
    ctx.fillStyle = c.ground;
    ctx.fillRect(0, GROUND + 6, W, H - GROUND);
    ctx.strokeStyle = c.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 6); ctx.lineTo(W, GROUND + 6); ctx.stroke();

    // paw prints trailing past
    ctx.fillStyle = c.dust;
    ctx.globalAlpha = .5;
    for (let i = 0; i < 13; i++) {
      const x = mod(i * 108 - dist * .6, W + 140) - 70;
      const y = GROUND + 22 + (i % 2) * 15;         // stagger like an actual gait
      ctx.beginPath(); ctx.ellipse(x, y + 6, 4.6, 3.6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - 3.6, y, 1.7, 2.1, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 0.7, y - 2, 1.7, 2.1, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 5, y, 1.7, 2.1, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ── loop ────────────────────────────────────────── */
  let scale = 1, yOff = 0, skyTop = 0;
  function fit() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    scale  = canvas.width / W;
    yOff   = canvas.height - H * scale;   // spare device px above the 960x360 world
    skyTop = -yOff / scale;               // ...expressed in logical units
  }
  window.addEventListener('resize', fit);
  fit();

  // Everything below is delta-timed against 60fps. Without this the game runs
  // ~2.5x too fast on a 144Hz display and slow-motion on a throttled tab.
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!canvas.width || !canvas.height) fit();
    if (!last) last = now;
    const dt = Math.min(3, (now - last) / 16.6667) || 1;   // clamp tab-switch jumps
    last = now;

    const c = pal();
    ctx.setTransform(scale, 0, 0, scale, 0, yOff);

    if (shake > 0) {
      ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      shake *= Math.pow(.86, dt);
      if (shake < .4) shake = 0;
    }

    if (state === 'run') {
      t += dt;
      speed = Math.min(15.5, 7.2 + dist / 1900);
      dist  += speed * dt;
      score += speed * 0.055 * dt;

      // dog physics
      dog.vy += 0.66 * dt;
      dog.y  += dog.vy * dt;
      if (dog.y >= GROUND) {
        if (dog.vy > 6) {
          dog.squash = 0.78;
          for (let i = 0; i < 5; i++) dust.push({ x: dog.x - 10, y: GROUND, vx: -1 - Math.random() * 2, vy: -Math.random() * 2, l: 22 });
        }
        dog.y = GROUND; dog.vy = 0; dog.jumps = 0;
      }
      dog.squash += (1 - dog.squash) * (1 - Math.pow(1 - .16, dt));

      // run cycle: a time accumulator, not a frame counter
      dog.ft += dt;
      const per = Math.max(3, 8 - speed / 3);
      dog.frame = Math.floor(dog.ft / per) % img.run.length;

      // spawn
      nextSpawn -= dt;
      if (nextSpawn <= 0) { spawn(); nextSpawn = Math.max(46, spawnGap - dist / 420) + Math.random() * 40; }

      // move + collide
      const hb = { x: dog.x - 26, y: dog.y - 58, w: 52, h: 56 };
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i];
        o.x -= speed * dt;
        if (o.x + o.w < -60) { obs.splice(i, 1); continue; }
        if (state === 'run' && hb.x < o.x + o.w && hb.x + hb.w > o.x &&
            hb.y < o.y && hb.y + hb.h > o.y - o.h) die();
      }
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.x -= speed * dt;
        if (b.x < -40) { balls.splice(i, 1); continue; }
        const dx = b.x - dog.x, dy = b.y - (dog.y - 40);
        if (dx * dx + dy * dy < 46 * 46) {
          balls.splice(i, 1); ballCount++; score += 5;
          for (let k = 0; k < 8; k++) parts.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4 - 1, l: 26 });
        }
      }
      paint();
    }

    drawBg(c);

    obs.forEach(o => drawObstacle(o, c));
    balls.forEach(b => {
      const by = b.y + Math.sin((t + b.x) / 22) * 4;
      ctx.fillStyle = c.ball;
      ctx.beginPath(); ctx.arc(b.x, by, b.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(b.x - 3, by, b.r, -0.7, 0.9); ctx.stroke();
    });

    ctx.fillStyle = c.ball;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .22 * dt; p.l -= dt;
      if (p.l <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.l / 26);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = c.dust;
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .12 * dt; p.l -= dt;
      if (p.l <= 0) { dust.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.l / 22);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawDog(c);
  }

  reset();
  // The game is explicitly opted into, so it runs even under reduced-motion —
  // nothing moves until the player presses start, and the idle frame is static.
  requestAnimationFrame(frame);
})();
