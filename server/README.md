# ARCO wallet collector — VPS setup

Static hosting (GitHub Pages) cannot store anything: it serves files and has no
place to write. This little service is the missing half. It runs on your own
VPS, so there is no monthly submission cap and the list stays yours.

It also hands each visitor their **signup number** back, which the site shows as
"You are #47 on the list" — that number is the FCFS order, straight out of the
file order.

- `POST /collect` → `{ok, position, already}` — validates, de-duplicates, appends
- `GET  /export?key=SECRET` → CSV in signup order (add `&format=json` for JSON)
- `GET  /health` → `{ok, count}`

Zero dependencies, Node 18+. Data lands in `wallets.jsonl`, one JSON object per
line — append-only, so the order is the queue.

---

## 1. Put it on the box

```bash
sudo mkdir -p /opt/arco && sudo chown $USER /opt/arco
scp server/collect.js youruser@your-vps:/opt/arco/
```

## 2. Run it as a service

`/etc/systemd/system/arco-collect.service`:

```ini
[Unit]
Description=Arco wallet collector
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/arco
ExecStart=/usr/bin/node /opt/arco/collect.js
Restart=always
Environment=PORT=8787
Environment=ARCO_DATA=/opt/arco/wallets.jsonl
Environment=ARCO_ORIGIN=https://wrapdbtc.github.io
Environment=ARCO_KEY=change-me-to-something-long

[Install]
WantedBy=multi-user.target
```

```bash
sudo touch /opt/arco/wallets.jsonl && sudo chown www-data /opt/arco/wallets.jsonl
sudo systemctl enable --now arco-collect
sudo systemctl status arco-collect
```

**`ARCO_ORIGIN` must be the exact origin the site is served from** — scheme +
host, no trailing slash, no path. If you later move to a custom domain, change
it, or the browser will block the request.

**`ARCO_KEY`** protects `/export`. Make it long and random; it is the only thing
between the public internet and your whole list.

## 3. HTTPS — not optional

The site is served over https, so browsers **block** requests to an http
endpoint. The endpoint needs a real certificate. Easiest is Caddy, which gets
one automatically:

```
api.yourdomain.tld {
    reverse_proxy 127.0.0.1:8787
}
```

nginx equivalent, if you already run it:

```nginx
location /collect { proxy_pass http://127.0.0.1:8787/collect; }
location /export  { proxy_pass http://127.0.0.1:8787/export;  }
```

## 4. Point the site at it

In `js/config.js`:

```js
const COLLECT = {
  endpoint: 'https://api.yourdomain.tld/collect',
  mode: 'json'
};
```

The moment that endpoint is set, the wallet step's own description **changes by
itself** from "stored in your browser only" to "your address is submitted to the
Arco list". Do not defeat that — the page should never claim privacy it is not
keeping.

## 5. Get your FCFS list

```bash
curl -o arco-wallets.csv "https://api.yourdomain.tld/export?key=YOUR_KEY"
```

Columns: `position,wallet,ts,packId,steps,best`. Row order is signup order.

---

## What this does and does not protect against

- **De-duplicates** by address, so one wallet occupies one spot and re-submitting
  returns the original position.
- **Rate limits** to 20 requests per minute per IP.
- **Validates** the address shape (`0x` + 40 hex).

It does **not** prove ownership of an address — anyone can type any wallet, and
one person can submit many different addresses from different IPs. For a list
that decides who gets something valuable, treat it as an *interest list*, not
proof. If a spot has real value, verify with a signature at claim time, or
snapshot holders on-chain instead.

## Backups

```bash
0 * * * * cp /opt/arco/wallets.jsonl /opt/arco/backups/wallets-$(date +\%F-\%H).jsonl
```

The file is append-only plain text, so a copy is a complete backup.
