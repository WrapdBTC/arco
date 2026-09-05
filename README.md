# ARCO — Off The Leash

Landing site for **$ARCO**, a community memecoin and mascot inspired by **Arc L1**.

- **Launch:** September 16, 2026 · 00:00 UTC
- **Supply:** 1,000,000,000 · **Tax:** TBA · **LP:** TBA · **CA:** TBA
- **NFTs (after the token):** 3,333 · free mint for $ARCO holders

Static HTML / CSS / vanilla JS. No build step, no dependencies.

## What is in here

| | |
|---|---|
| `index.html` | the whole page |
| `css/style.css` | design system, dual light/dark character modes |
| `js/config.js` | **SOCIAL links, launch data and lore — edit this one** |
| `js/main.js` | boot, nav, mode switch, countdown, lore rail, parallax, the ball |
| `js/game.js` | Fetch Run, the mini-game |
| `js/pack.js` | Good Boy Program (follow / like / retweet / wallet) |
| `BUILD_NOTES.md` | concept, how to play, what still needs filling in |

## Local preview

```bash
python3 -m http.server 4173
```
Then open <http://localhost:4173>.

## Before launch

Fill in the `TBA` values in `js/config.js` — see **BUILD_NOTES.md §4**.
Bump the `?v=claude4` cache-buster in `index.html` whenever you edit CSS or JS.

---

$ARCO is a community memecoin inspired by Arc L1. Not affiliated with Circle or Arc. NFA. DYOR.
