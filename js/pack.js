/* =========================================================
   ARCO — Good Boy Program (social pack funnel)
   Follow · Like · Retweet · Wallet  (+ optional game bonus)
   Progress persists in localStorage. Nothing leaves the browser.
   ========================================================= */
(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const toast = window.ArcoToast || function () {};

  const store = {
    get(k, d) { try { const v = localStorage.getItem('arco.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('arco.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k)    { try { localStorage.removeItem('arco.' + k); } catch (e) {} }
  };

  /* ── where wallets go ──────────────────────────────────────
     Nothing is transmitted unless COLLECT.endpoint is configured. The wallet
     step's own description is rewritten to match whichever is true, so the
     page never promises privacy it is not keeping. */
  const collecting = typeof COLLECT !== 'undefined' && COLLECT.endpoint &&
                     !/TBA/i.test(COLLECT.endpoint);

  // json mode talks to server/collect.js and can read the reply, so we learn the
  // real signup position. formdata mode is fire-and-forget: it works against
  // endpoints that send no CORS headers, but delivery cannot be confirmed.
  function submit(payload) {
    if (!collecting) return Promise.resolve(null);
    if (COLLECT.mode === 'json') {
      return fetch(COLLECT.endpoint, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json().catch(() => ({})).then(d => {
        if (!r.ok || d.ok === false) throw new Error(d.error || ('http ' + r.status));
        return d;
      }));
    }
    const fd = new FormData();
    Object.keys(payload).forEach(k => fd.append(k, payload[k]));
    return fetch(COLLECT.endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, body: fd })
      .then(() => null);
  }

  // If a submission failed (offline, endpoint down) it is queued and retried
  // on the next visit, so an address is not silently lost.
  function queue(payload) {
    const q = store.get('pending', []);
    q.push(payload); store.set('pending', q.slice(-20));
  }
  function flushQueue() {
    if (!collecting) return;
    const q = store.get('pending', []);
    if (!q.length) return;
    store.set('pending', []);
    q.forEach(p => submit(p)
      .then(d => { if (d && d.position) { store.set('position', d.position); showPosition(d.position); } })
      .catch(() => queue(p)));
  }

  // the signup number doubles as the FCFS spot, so it is worth showing off
  function showPosition(n) {
    const el = document.querySelector('#packId');
    if (!el) return;
    const row = el.closest('span');
    if (row && !row.dataset.pos) {
      row.dataset.pos = '1';
      row.insertAdjacentHTML('afterend', '<span>List spot <code>#' + n + '</code></span>');
    }
  }

  const CORE = ['follow', 'like', 'retweet', 'wallet'];
  let done = store.get('steps', {});
  let wallet = store.get('wallet', '');

  /* ── link targets from SOCIAL ──────────────────────── */
  const TARGET = {
    x:       SOCIAL.x,
    like:    SOCIAL.launchPostLike   || SOCIAL.launchPost,
    retweet: SOCIAL.launchPostRetweet || SOCIAL.launchPost
  };
  const isTBA = u => !u || /TBA/i.test(u) || u === '#';

  $$('[data-go]').forEach(a => {
    const url = TARGET[a.dataset.go];
    if (isTBA(url)) {
      a.href = '#loyalty';
      a.removeAttribute('target');
      a.dataset.tba = '1';
    } else {
      a.href = url;
    }
  });

  /* ── progress UI ───────────────────────────────────── */
  const ringFg = $('#ringFg'), ringPct = $('#ringPct'), ringSub = $('#ringSub');
  const CIRC = 327;                      // 2πr with r=52

  function render() {
    CORE.concat('bonus').forEach(k => {
      const li = $('.step[data-step="' + k + '"]');
      if (li) li.classList.toggle('done', !!done[k]);
    });

    const n = CORE.filter(k => done[k]).length;
    const pct = Math.round((n / CORE.length) * 100);
    if (ringFg)  ringFg.style.strokeDashoffset = String(CIRC - (CIRC * n) / CORE.length);
    if (ringPct) ringPct.textContent = pct;
    if (ringSub) ringSub.textContent = n + ' of ' + CORE.length;

    const reward = $('#reward');
    if (reward) {
      if (n === CORE.length) {
        reward.hidden = false;
        $('#packId').textContent = packId();
      } else reward.hidden = true;
    }
  }

  function packId() {
    let id = store.get('packId', '');
    if (id) return id;
    // deterministic from the wallet when there is one, so the same address
    // always gets the same ID — but hashed, so zero-heavy addresses don't
    // produce a zero-heavy ID.
    const seed = (wallet || String(Date.now()) + Math.random());
    const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';        // no I/O/0/1
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < seed.length; i++) {
      h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 + seed.charCodeAt(i) * (i + 7), 2246822519) >>> 0;
    }
    const block = h => { let o = ''; for (let i = 0; i < 4; i++) { o += AB[h % AB.length]; h = Math.floor(h / AB.length); } return o; };
    id = 'ARCO-' + block(h1) + '-' + block(h2);
    store.set('packId', id);
    return id;
  }

  function setDone(k, v) {
    const was = !!done[k];
    done[k] = !!v;
    if (!v) delete done[k];
    store.set('steps', done);
    render();
    if (!was && v && CORE.filter(x => done[x]).length === CORE.length) celebrate();
  }

  /* ── celebration ───────────────────────────────────── */
  function celebrate() {
    toast('You are in the pack. Good boy.', 3400);
    const host = $('#reward') || document.body;
    const r = host.getBoundingClientRect();
    const colors = ['#C9F24D', '#6D4AE0', '#FF5FA2', '#22D3EE'];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('i');
      p.style.cssText = 'position:fixed;z-index:940;pointer-events:none;top:' + (r.top + r.height / 2) +
        'px;left:' + (r.left + r.width / 2) + 'px;width:8px;height:12px;border-radius:2px;background:' +
        colors[i % colors.length];
      document.body.appendChild(p);
      p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + (Math.random() * 460 - 230) + 'px,' + (Math.random() * 320 - 210) + 'px) rotate(' + (Math.random() * 700) + 'deg)', opacity: 0 }
      ], { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }

  /* ── action buttons (honour system — we cannot read X) ── */
  $$('[data-go]').forEach(a => {
    a.addEventListener('click', e => {
      const key = a.dataset.go === 'x' ? 'follow' : a.dataset.go;
      if (a.dataset.tba) {
        e.preventDefault();
        toast('Link goes live at launch — marking it for you.');
      }
      setTimeout(() => setDone(key, true), a.dataset.tba ? 350 : 1200);
    });
  });

  /* ── manual checkboxes ─────────────────────────────── */
  $$('.check').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.check;
      if (k === 'wallet' || k === 'bonus') return;     // driven by their own flow
      setDone(k, !done[k]);
    });
  });

  /* ── wallet ────────────────────────────────────────── */
  const form = $('#walletForm'), input = $('#walletInput'), msg = $('#walletMsg');
  const RE = /^0x[a-fA-F0-9]{40}$/;

  if (input && wallet) input.value = wallet;

  function say(text, kind) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'wallet__msg' + (kind ? ' ' + kind : '');
  }
  if (wallet) say('Saved: ' + short(wallet), 'ok');

  // keep the promise in the copy honest with what the code actually does
  (function walletCopy() {
    const p = document.querySelector('.step[data-step="wallet"] .step__b p');
    if (!p) return;
    p.textContent = collecting
      ? 'For the NFT free mint snapshot later. Your address is submitted to the Arco list — nothing else about you is collected.'
      : 'For the NFT free mint snapshot later. Stored in your browser only — nothing is sent anywhere.';
  })();
  flushQueue();
  const savedPos = store.get('position', 0);
  if (savedPos) showPosition(savedPos);

  function short(a) { return a.slice(0, 6) + '…' + a.slice(-4); }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = (input.value || '').trim();
      if (!v) { input.classList.add('bad'); say('Paste an address starting with 0x.', 'bad'); return; }
      if (!RE.test(v)) {
        input.classList.add('bad');
        if (!/^0x/i.test(v))       say('An EVM address starts with 0x and has 40 hex characters after it.', 'bad');
        else if (v.length !== 42)  say('That is ' + (v.length - 2) + ' characters after 0x — it needs exactly 40.', 'bad');
        else                       say('Those 40 characters are not all hex (only 0-9 and a-f are allowed).', 'bad');
        return;
      }
      input.classList.remove('bad');
      wallet = v;
      store.set('wallet', v);
      setDone('wallet', true);

      if (!collecting) {
        say('Saved: ' + short(v) + ' — kept in this browser only.', 'ok');
      } else {
        say('Sending ' + short(v) + '…');
        const payload = {
          wallet: v, packId: packId(), ts: new Date().toISOString(),
          steps: CORE.filter(k => done[k]).join(','), best: store.get('best', 0)
        };
        submit(payload)
          .then(d => {
            if (d && d.position) {
              store.set('position', d.position);
              say('You are #' + d.position + ' on the list' + (d.already ? ' (already registered).' : '.'), 'ok');
              showPosition(d.position);
            } else say('Saved: ' + short(v) + ' — you are on the list.', 'ok');
          })
          .catch(() => { queue(payload); say('Saved: ' + short(v) + ' — could not reach the list, retrying next visit.', 'ok'); });
      }
    });
  }

  if (input) input.addEventListener('input', () => {
    input.classList.remove('bad');
    if (done.wallet && input.value.trim() !== wallet) { setDone('wallet', false); say('Press Save to confirm the new address.'); }
  });

  /* ── connect (uses an injected wallet if present, otherwise a stub) ── */
  const connect = $('#connectBtn');
  if (connect) {
    connect.addEventListener('click', async () => {
      const eth = window.ethereum;
      if (!eth || !eth.request) {
        say('No browser wallet detected — paste your address above instead.', 'bad');
        toast('No wallet extension found.');
        return;
      }
      try {
        connect.disabled = true;
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        const a = accounts && accounts[0];
        if (a && RE.test(a)) {
          input.value = a;
          wallet = a;
          store.set('wallet', a);
          setDone('wallet', true);
          if (!collecting) say('Connected: ' + short(a) + ' — kept in this browser only.', 'ok');
          else {
            const payload = { wallet: a, packId: packId(), ts: new Date().toISOString(),
                              steps: CORE.filter(k => done[k]).join(','), best: store.get('best', 0) };
            submit(payload)
              .then(d => {
                if (d && d.position) { store.set('position', d.position); showPosition(d.position);
                  say('You are #' + d.position + ' on the list.', 'ok'); }
                else say('Connected: ' + short(a) + ' — you are on the list.', 'ok');
              })
              .catch(() => { queue(payload); say('Connected: ' + short(a) + ' — could not reach the list, retrying next visit.', 'ok'); });
          }
        } else say('Could not read an address from that wallet.', 'bad');
      } catch (err) {
        say('Connection cancelled.', 'bad');
      } finally {
        connect.disabled = false;
      }
    });
  }

  /* ── game bonus hook ───────────────────────────────── */
  window.ArcoBonus = function (score) {
    if (done.bonus) return;
    setDone('bonus', true);
    toast('Bonus paw print earned — ' + score + ' in Fetch Run.', 3200);
  };
  if (store.get('best', 0) >= 600 && !done.bonus) { done.bonus = true; store.set('steps', done); }

  /* ── reset ─────────────────────────────────────────── */
  const reset = $('#resetBtn');
  if (reset) reset.addEventListener('click', () => {
    done = {}; wallet = '';
    store.set('steps', {});
    store.del('wallet'); store.del('packId');
    if (input) input.value = '';
    say('');
    render();
    toast('Progress cleared.');
  });

  render();
})();
