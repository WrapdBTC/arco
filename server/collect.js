#!/usr/bin/env node
/* =========================================================
   ARCO — wallet collector
   Zero dependencies. Node 18+.

   POST /collect   {wallet, packId, steps, best}  -> {ok, position, already}
   GET  /export?key=SECRET[&format=csv|json]      -> the list, in signup order
   GET  /health                                   -> {ok, count}

   Signup order IS the file order, so /export gives you a usable FCFS queue.
   ========================================================= */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT       = process.env.PORT        || 8787;
const DATA       = process.env.ARCO_DATA   || path.join(__dirname, 'wallets.jsonl');
const ORIGIN     = process.env.ARCO_ORIGIN || '*';      // set to your real site origin
const EXPORT_KEY = process.env.ARCO_KEY    || '';        // required for /export

const ADDR = /^0x[a-fA-F0-9]{40}$/;
const MAX_BODY = 4 * 1024;

/* ---- in-memory index, rebuilt from disk on boot ---- */
const seen = new Map();                                  // wallet(lowercase) -> position
let count = 0;
if (fs.existsSync(DATA)) {
  for (const line of fs.readFileSync(DATA, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); count++; if (!seen.has(r.wallet)) seen.set(r.wallet, count); }
    catch (e) { /* skip a corrupt line rather than refuse to boot */ }
  }
}
console.log('[arco] loaded ' + count + ' wallets from ' + DATA);

/* ---- crude but effective per-IP rate limit ---- */
const hits = new Map();
function limited(ip, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();                    // keep memory bounded
  return arr.length > max;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip  = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
              req.socket.remoteAddress || '?';
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (url.pathname === '/health') return send(res, 200, { ok: true, count });

  /* ---- export, for the FCFS list ---- */
  if (url.pathname === '/export' && req.method === 'GET') {
    if (!EXPORT_KEY || url.searchParams.get('key') !== EXPORT_KEY)
      return send(res, 401, { ok: false, error: 'bad key' });
    const rows = fs.existsSync(DATA)
      ? fs.readFileSync(DATA, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean)
      : [];
    if (url.searchParams.get('format') === 'json') return send(res, 200, { ok: true, count: rows.length, rows });
    // steps contains commas, so every field gets quoted properly
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = ['position,wallet,ts,packId,steps,best']
      .concat(rows.map((r, i) => [i + 1, q(r.wallet), q(r.ts), q(r.packId), q(r.steps), r.best || 0].join(',')))
      .join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8',
                         'Content-Disposition': 'attachment; filename="arco-wallets.csv"' });
    return res.end(csv);
  }

  /* ---- collect ---- */
  if (url.pathname === '/collect' && req.method === 'POST') {
    if (limited(ip)) return send(res, 429, { ok: false, error: 'slow down' });

    let body = '', tooBig = false;
    req.on('data', c => {
      body += c;
      if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return;
      let d = {};
      try { d = JSON.parse(body); } catch (e) { return send(res, 400, { ok: false, error: 'bad json' }); }

      const wallet = String(d.wallet || '').trim();
      if (!ADDR.test(wallet)) return send(res, 400, { ok: false, error: 'bad address' });

      const key = wallet.toLowerCase();
      if (seen.has(key)) return send(res, 200, { ok: true, position: seen.get(key), already: true });

      const row = {
        wallet,
        ts: new Date().toISOString(),
        packId: String(d.packId || '').slice(0, 32),
        steps:  String(d.steps  || '').slice(0, 64),
        best:   Math.max(0, Math.min(1e7, parseInt(d.best, 10) || 0))
      };
      try {
        fs.appendFileSync(DATA, JSON.stringify(row) + '\n');
      } catch (e) {
        console.error('[arco] write failed', e);
        return send(res, 500, { ok: false, error: 'store failed' });
      }
      count++; seen.set(key, count);
      console.log('[arco] #' + count + ' ' + wallet);
      return send(res, 200, { ok: true, position: count, already: false });
    });
    return;
  }

  send(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, () => console.log('[arco] collector on :' + PORT));
