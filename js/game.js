/* =========================================================
   ARCO — FETCH RUN  (v2)
   Endless runner. Jump red candles, dodge the rug, catch balls.
   Keyboard (Space / ↑) + touch. Logical space is a fixed 960×360.

   v2 feel work:
   · 8-frame gallop, animation speed tied to running speed
   · variable jump height (hold = higher), coyote time, jump buffering
   · ball magnetism + combo multiplier with floating score
   · speed lines, landing dust, squash & stretch, air tilt
   · everything delta-timed to 60fps
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
    run: [1, 2, 3, 4, 5, 6, 7, 8].map(n => 'assets/sprites/run-' + n + '.png'),
    air: 'assets/sprites/air.png'
  };
  // The v2 frames are pre-normalised by the keying tool: one shared scale,
  // bbox-centred, already facing right — so no per-frame metrics, no mirroring.
  // FOOT is the median gap from the sprite's bottom edge to his paws across the
  // cycle; anchoring on it turns the gallop's natural bounce into motion
  // instead of jitter.
  const FOOT = 0.219;

  const img = { run: [], air: null, ok: false };
  let loaded = 0; const need = SRC.run.length + 1;
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
      candle: '#FF3D6E', rug: '#8B5CF6', hydrant: '#22D3EE', ball: '#C9F24D',
      text: '#EFEAFF', speed: 'rgba(201,242,77,.5)'
    } : {
      sky1: '#A9B0F6', sky2: '#EFECFF', disc: '#FFF6D8', discGlow: 'rgba(255,232,150,.55)',
      star: 'rgba(255,255,255,.85)', far: '#C3C7F8', mid: '#9DA3EE', near: '#7C83E2',
      ground: '#E4E0F5', line: '#17132A', dust: 'rgba(23,19,42,.22)',
      candle: '#E5385C', rug: '#6D4AE0', hydrant: '#2AB6C9', ball: '#9ECB1E',
      text: '#17132A', speed: 'rgba(23,19,42,.28)'
    };
  }

  /* ── state ───────────────────────────────────────── */
  let state = 'idle';                       // idle | run | dead
  let dog, obs, balls, parts, dust, pops, lines;
  let speed, dist, score, ballCount, combo, comboT, t, nextSpawn, shake, flash;
  let best = store.get('best', 0);
  if (el.best) el.best.textContent = best;

  // jump feel
  const JUMP_V = -13.2, JUMP2_V = -11.2, GRAV = 0.66, CUT = 0.45;
  const COYOTE = 7, BUFFER = 8;             // frames of grace, at 60fps
  let held = false, coyote = 0, buffered = 0;

  function reset() {
    dog = { x: 132, y: GROUND, vy: 0, h: 140, jumps: 0, frame: 0, anim: 0, squash: 1, tilt: 0 };
    obs = []; balls = []; parts = []; dust = []; pops = []; lines = [];
    speed = 7.0; dist = 0; score = 0; ballCount = 0; combo = 0; comboT = 0;
    t = 0; shake = 0; flash = 0; nextSpawn = 110; coyote = 0; buffered = 0; held = false;
    last = 0;
    paint();
  }

  function paint() {
    if (el.score) el.score.textContent = Math.floor(score);
    if (el.balls) el.balls.textContent = ballCount;
    if (el.best)  el.best.textContent = best;
  }

  /* ── input ───────────────────────────────────────── */
  function tryJump() {
    if (state === 'idle') { start(); return; }
    if (state !== 'run') return;
    buffered = BUFFER;                       // remembered for a few frames
  }
  function doJump() {
    const grounded = dog.y >= GROUND - 0.5 || coyote > 0;
    if (grounded && dog.jumps === 0) {
      dog.vy = JUMP_V; dog.jumps = 1; dog.squash = 1.18; coyote = 0;
      for (let i = 0; i < 6; i++) dust.push({ x: dog.x - 12, y: GROUND, vx: -1.4 - Math.random() * 2.2, vy: -Math.random() * 2, l: 20 });
      return true;
    }
    if (dog.jumps === 1) {                   // double jump — a little flip
      dog.vy = JUMP2_V; dog.jumps = 2; dog.squash = 1.12;
      for (let i = 0; i < 8; i++) parts.push({ x: dog.x, y: dog.y - 46, vx: (Math.random() - .5) * 4, vy: 1 + Math.random() * 2, l: 20 });
      return true;
    }
    return false;
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
    if (state === 'run' || inView()) {
      e.preventDefault();                    // only steal Space when the game is the target
      if (!e.repeat) { held = true; tryJump(); }
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === 'ArrowUp') held = false;
  });

  canvas.addEventListener('pointerdown', e => { e.preventDefault(); held = true; tryJump(); });
  window.addEventListener('pointerup', () => { held = false; });
  window.addEventListener('pointercancel', () => { held = false; });

  document.getElementById('gStartBtn').addEventListener('click', start);
  document.getElementById('gAgainBtn').addEventListener('click', start);

  function start() {
    reset();
    state = 'run';
    el.start.classList.add('overlay--hide');
    el.over.classList.add('overlay--hide');
  }

  function die() {
    state = 'dead';
    shake = 14;
    const sc = Math.floor(score);
    if (sc > best) { best = sc; store.set('best', best); }
    paint();

    let title = 'He tripped.';
    if (sc >= 1500) title = 'Absolute unit.';
    else if (sc >= 600) title = 'Certified good boy.';
    else if (sc >= 250) title = 'Not bad at all.';
    el.overT.textContent = title;
    el.overX.textContent = 'Score ' + sc + ' · ' + ballCount + ' balls' + (sc >= best && sc > 0 ? ' — new best!' : '');
    el.overI.src = sc >= 600 ? 'assets/sprites/catch.png' : 'assets/sprites/sit.png';
    el.over.classList.remove('overlay--hide');

    if (sc >= 600 && typeof window.ArcoBonus === 'function') window.ArcoBonus(sc);
  }

  /* ── spawning ────────────────────────────────────── */
  function spawn() {
    const roll = Math.random();
    if (roll < 0.32)      obs.push({ type: 'candle',  x: W + 40, w: 26, h: 62, y: GROUND });
    else if (roll < 0.58) obs.push({ type: 'hydrant', x: W + 40, w: 30, h: 46, y: GROUND });
    else if (roll < 0.80) obs.push({ type: 'rug',     x: W + 40, w: 92, h: 26, y: GROUND });
    else {
      obs.push({ type: 'candle', x: W + 40,  w: 24, h: 54, y: GROUND });
      obs.push({ type: 'candle', x: W + 118, w: 24, h: 66, y: GROUND });
    }
    if (Math.random() < 0.78) {              // an arc of balls to chase
      const n = 3 + (Math.random() < .35 ? 2 : 0);
      const h = 66 + Math.random() * 62;
      for (let i = 0; i < n; i++) {
        const p = i / (n - 1);
        balls.push({ x: W + 150 + i * 44, y: GROUND - h - Math.sin(p * Math.PI) * 28, r: 11 });
      }
    }
  }

  /* ── drawing helpers ─────────────────────────────── */
  const mod = (n, m) => ((n % m) + m) % m;   // JS % is signed; scrolling decor needs wrap

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
      ctx.fillStyle = c.rug;                 // it is a rug. obviously.
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
    const airborne = dog.y < GROUND - 3;
    const im = airborne ? img.air : img.run[dog.frame];

    const dh = dog.h / dog.squash, dw = dog.h * dog.squash;   // squash preserves volume
    const cy = dog.y - dh * (1 - FOOT) + dh / 2;

    ctx.save();
    const lift = Math.max(0, (GROUND - dog.y) / 130);
    ctx.globalAlpha = .24 * (1 - lift * .75);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(dog.x, GROUND + 5, 33 * (1 - lift * .4), 6.5, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;

    if (img.ok && im && im.naturalWidth) {
      ctx.translate(dog.x, cy);
      if (dog.tilt) ctx.rotate(dog.tilt);
      ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.fillStyle = c.mid;
      roundRect(dog.x - 30, dog.y - 62, 60, 58, 16); ctx.fill();
      ctx.fillStyle = c.text; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('ARCO', dog.x, dog.y - 28); ctx.textAlign = 'left';
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

    ctx.fillStyle = c.discGlow;
    ctx.beginPath(); ctx.arc(782, 84, 62, 0, 7); ctx.fill();
    ctx.fillStyle = c.disc;
    ctx.beginPath(); ctx.arc(782, 84, 34, 0, 7); ctx.fill();
    if (night) { ctx.fillStyle = c.sky1; ctx.beginPath(); ctx.arc(766, 74, 30, 0, 7); ctx.fill(); }

    ctx.fillStyle = c.star;
    for (let i = 0; i < 22; i++) {
      const x = mod(i * 271, W) + Math.sin(i) * 12;
      const y = 18 + ((i * 97) % 150);
      const tw = .35 + Math.abs(Math.sin((t + i * 30) / 55)) * .65;
      ctx.globalAlpha = (night ? .8 : .5) * tw;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2.2 : 1.3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 10; i++) {           // floating Arc cubes
      const x = mod(i * 143 - dist * .16, W + 200) - 100;
      const y = 46 + ((i * 61) % 96);
      const sz = 11 + (i % 3) * 7;
      ctx.save();
      ctx.translate(x, y + Math.sin((t + i * 40) / 58) * 6);
      ctx.rotate(i % 2 ? .32 : -.24);
      ctx.globalAlpha = .55; ctx.fillStyle = c.far;
      roundRect(-sz / 2, -sz / 2, sz, sz, 4); ctx.fill();
      ctx.strokeStyle = c.line; ctx.globalAlpha = .16; ctx.lineWidth = 1.4;
      roundRect(-sz / 2, -sz / 2, sz, sz, 4); ctx.stroke();
      ctx.restore();
    }

    hills(206, 20, 128, .30, c.far);
    hills(236, 15,  86, .52, c.mid);
    hills(268, 10,  58, .78, c.near);

    ctx.fillStyle = c.ground;
    ctx.fillRect(0, GROUND + 6, W, H - GROUND);
    ctx.strokeStyle = c.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 6); ctx.lineTo(W, GROUND + 6); ctx.stroke();

    ctx.fillStyle = c.dust; ctx.globalAlpha = .5;
    for (let i = 0; i < 13; i++) {
      const x = mod(i * 108 - dist * .6, W + 140) - 70;
      const y = GROUND + 22 + (i % 2) * 15;
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
    yOff   = canvas.height - H * scale;
    skyTop = -yOff / scale;
  }
  window.addEventListener('resize', fit);
  fit();

  // Delta-timed against 60fps: without this the game runs several times too
  // fast on a high-refresh display.
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!canvas.width || !canvas.height) fit();
    if (!last) last = now;
    const dt = Math.min(3, (now - last) / 16.6667) || 1;
    last = now;

    const c = pal();
    ctx.setTransform(scale, 0, 0, scale, 0, yOff);

    if (shake > 0) {
      ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      shake *= Math.pow(.86, dt);
      if (shake < .4) shake = 0;
    }

    // Attract mode: while nobody is playing he keeps trotting behind the
    // start card, so the idle state is alive instead of a frozen frame.
    if (state === 'idle') {
      t += dt;
      speed = 5.4;
      dist += speed * dt;
      dog.anim += dt * (speed / 7.6);
      dog.frame = Math.floor(dog.anim / 2.6) % img.run.length;
      dog.y = GROUND; dog.vy = 0; dog.tilt = 0; dog.squash = 1;
    }

    if (state === 'run') {
      t += dt;
      speed = Math.min(16.5, 7.0 + Math.sqrt(dist) / 26);   // smoother ramp
      dist  += speed * dt;
      score += speed * 0.055 * dt;

      // --- jump: buffering + coyote time + variable height ---
      if (buffered > 0) { buffered -= dt; if (doJump()) buffered = 0; }
      if (dog.y >= GROUND - 0.5) coyote = COYOTE; else coyote -= dt;
      if (!held && dog.vy < 0) dog.vy += GRAV * CUT * dt * 2.2;  // release = shorter hop

      dog.vy += GRAV * dt;
      dog.y  += dog.vy * dt;
      if (dog.y >= GROUND) {
        if (dog.vy > 7) {
          dog.squash = 0.80; shake = Math.min(6, dog.vy * .5);
          for (let i = 0; i < 6; i++) dust.push({ x: dog.x - 8, y: GROUND, vx: -1 - Math.random() * 2.4, vy: -Math.random() * 2.2, l: 22 });
        }
        dog.y = GROUND; dog.vy = 0; dog.jumps = 0;
      }
      dog.squash += (1 - dog.squash) * (1 - Math.pow(1 - .17, dt));

      // air tilt: nose down as he falls, up as he rises
      const wantTilt = dog.y < GROUND - 3 ? Math.max(-.22, Math.min(.3, dog.vy * .018)) : 0;
      dog.tilt += (wantTilt - dog.tilt) * (1 - Math.pow(1 - .18, dt));

      // --- run cycle, paced by actual speed ---
      dog.anim += dt * (speed / 7.6);
      dog.frame = Math.floor(dog.anim / 2.6) % img.run.length;

      // --- spawning ---
      nextSpawn -= dt;
      if (nextSpawn <= 0) { spawn(); nextSpawn = Math.max(44, 78 - dist / 500) + Math.random() * 38; }

      // --- obstacles ---
      const hb = { x: dog.x - 30, y: dog.y - 62, w: 60, h: 60 };
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i];
        o.x -= speed * dt;
        if (o.x + o.w < -60) { obs.splice(i, 1); continue; }
        if (state === 'run' && hb.x < o.x + o.w && hb.x + hb.w > o.x &&
            hb.y < o.y && hb.y + hb.h > o.y - o.h) die();
      }

      // --- balls: slight magnetism, then combo ---
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.x -= speed * dt;
        if (b.x < -40) { balls.splice(i, 1); combo = 0; continue; }
        const cx = dog.x, cy = dog.y - 42;
        const dx = b.x - cx, dy = b.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 124 * 124) {                       // magnet
          const pull = (1 - Math.sqrt(d2) / 124) * 2.1 * dt;
          b.x -= dx * pull * .5; b.y -= dy * pull * .5;
        }
        if (d2 < 48 * 48) {
          balls.splice(i, 1);
          ballCount++; combo++; comboT = 70;
          const gain = 5 * Math.min(5, combo);
          score += gain;
          pops.push({ x: b.x, y: b.y, txt: '+' + gain, l: 42, vy: -1.1 });
          for (let k = 0; k < 9; k++) parts.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 5.5, vy: -Math.random() * 4 - 1, l: 26 });
        }
      }
      comboT -= dt; if (comboT <= 0) combo = 0;

      // --- speed lines once he is really moving ---
      if (speed > 10 && Math.random() < .35 * dt) {
        lines.push({ x: W + 20, y: 60 + Math.random() * (GROUND - 90), len: 40 + Math.random() * 70, l: 26 });
      }
      paint();
    }

    drawBg(c);

    // speed lines sit behind the action
    ctx.strokeStyle = c.speed; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = lines.length - 1; i >= 0; i--) {
      const L = lines[i];
      L.x -= (speed * 2.4) * dt; L.l -= dt;
      if (L.l <= 0 || L.x + L.len < -20) { lines.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, L.l / 26) * .8;
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x + L.len, L.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

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

    // floating score pops, and the combo badge
    ctx.textAlign = 'center';
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.y += p.vy * dt; p.l -= dt;
      if (p.l <= 0) { pops.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.l / 22);
      ctx.fillStyle = c.ball;
      ctx.font = '800 20px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(p.txt, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    if (combo > 1 && state === 'run') {
      ctx.fillStyle = c.ball;
      ctx.font = '800 26px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.globalAlpha = Math.min(1, comboT / 24);
      ctx.fillText('x' + Math.min(5, combo), dog.x, dog.y - 108);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  reset();
  // The game is explicitly opted into, so it runs even under reduced-motion —
  // nothing moves until the player presses start, and the idle frame is static.
  requestAnimationFrame(frame);
})();
