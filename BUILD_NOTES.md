# ARCO — "Off The Leash" · Build Notes

Static site for GitHub Pages. No build step, no dependencies, no framework.
Open `index.html` or serve the folder.

---

## 1. The concept

**Arco has two modes, and so does the site.**

The asset library splits cleanly into two worlds: a soft 3D Pixar-ish puppy
(the transparent cutouts) and a hard degen PFP set (the NFT art). Rather than
picking one, the whole site is built as a **dual-mode character system** you
flip with the collar switch in the nav:

| | GOOD BOY (day) | DEGEN (night) |
|---|---|---|
| Ground | warm cream | near-black violet |
| Structure | 2.5px ink borders, hard offset shadows | 1px neon edges, glow |
| Hero Arco | the plain good boy | **same leap pose, hoodie + shades + chain** |
| Art | 3D puppy cutouts | degen PFPs |
| Game palette | sun, pastel hills | crescent moon, stars, neon |

The hero is **two cutouts of the identical leap pose** cross-fading on the mode
switch (`arco-leap.png` / `arco-leap-night.png`). Their alpha bounds were
measured and match within 1%, so nothing shifts during the fade. The night
image is fetched lazily — day-mode visitors never download it, and it is
pre-warmed 800ms after load so the first toggle does not flash.

The switch persists in `localStorage`, retints the mini-game canvas live, and
is **secretly unlocked** by playing: throw the ball five times and night mode
turns itself on.

**Motion language: horizontal momentum.** Everything on this site runs
left-to-right, because that is what the character does — the ticker, the lore
rail you drag sideways, the endless runner, the dog that sprints across the
bottom of your screen. Vertical scrolling is just how you get between the
things that run.

**Deliberately *not* doing** what the previous version did: no sticky
scroll-scrubbed dog, no pinned chapter sections, no floating orbs, no top
scroll-progress bar.

### Page order
1. **Hero** — kinetic `ARCO` wordmark, leaping cutout, cursor parallax, countdown collar tag
2. **Ticker** — marquee
3. **Good Boy Program** — the social funnel (moved high on purpose: it is the ask)
4. **Five things about the dog** — draggable horizontal lore rail
5. **Fetch Run** — the mini-game
6. **The dog tags** — tokenomics
7. **The night shift** — NFT launch trailer + 3,333 / free mint + the 8-card wall
8. **Film** — click-to-play video
9. **Footer** — required disclaimer

---

## 2. How to play Fetch Run

| | |
|---|---|
| **Jump** | `Space` or `↑` or tap the canvas |
| **Double jump** | press again while airborne (two jumps max) |
| **Start / restart** | the on-canvas button, or `Space` while the game is in view |

- **Jump** the red candles and the fire hydrants. **Dodge** the rug (it is a rug. it rugs you).
- **Collect** tennis balls: +5 each.
- Score also ticks up with distance; speed ramps from 7.2 to 15.5.
- Best score persists in `localStorage`.
- **Beat 600** and the bonus step in the Good Boy Program ticks itself.

`Space` is only intercepted when the game is actually on screen, so the key
still scrolls the page everywhere else.

### The ball (easter egg)
The tennis-ball button in the nav, or the **`F`** key, throws a ball. Arco
sprints in from the left, catches it, celebrates with confetti, and leaves.
Five throws unlocks Degen mode. Ten gets a different message.

---

## 3. Things worth knowing about the code

- **Sprite metrics are measured, not guessed.** The nine pose PNGs have
  different amounts of transparent padding (18%–24% below the dog) and
  different apparent sizes. Both `js/game.js` and `js/main.js` carry a `MET`
  table of the real alpha bounds so every frame plants on the same ground line
  at the same size. Without it the run cycle visibly bobs and resizes.
- **The cutouts face left.** The runner moves right, so sprites are mirrored
  (`ctx.scale(-1,1)` in the game, `scale(-k,k)` in the fetch cameo). If you
  replace a sprite, keep it facing left or flip the sign.
- **Everything is delta-timed.** Both animation loops normalise to 60fps. This
  was verified on a 241Hz display, where the un-normalised version ran ~4x too
  fast.
- **Scrolling decor uses a positive modulo helper.** JS `%` keeps the
  dividend's sign, so `(x - dist) % w` goes negative once `dist` grows and the
  background silently empties out.
- **Missing images never show a broken icon.** A capture-phase `error`
  listener swaps any failed `<img>` for a styled `.ph` paw placeholder, and the
  game canvas draws its own fallback if a sprite fails to load.
- `prefers-reduced-motion` is honoured everywhere *except* the game itself,
  which the user explicitly opts into and which stays static until started.

---

## 4. ⚠️ Fill these in before launch

### `js/config.js` → `SOCIAL`
Every URL containing `TBA` is detected automatically: the button does **not**
navigate to a dead link, it shows "Link goes live at launch" and ticks the
step. Replace and the buttons start opening real URLs — no other change needed.

```js
x:                'https://x.com/TBA_ARCO'              // 1. Follow
launchPost:       'https://x.com/TBA_ARCO/status/TBA'   // the first launch post
launchPostLike:   'https://x.com/intent/like?tweet_id=TBA'      // 2. Like
launchPostRetweet:'https://x.com/intent/retweet?tweet_id=TBA'   // 3. Retweet
telegram:         'https://t.me/TBA_ARCO'
dexscreener / chart / buy: 'TBA'
```
For like/retweet, the `tweet_id` is the long number at the end of the tweet URL.

### `js/config.js` → `LAUNCH`
`contract: 'TBA'` — set the real address and the CA card lights up with a
working **Copy** button automatically. Also `lp` and `tax` (currently `TBA`;
the Tax card text lives in `index.html`, so change it in both places).

### Wallet step
Validates `^0x[a-fA-F0-9]{40}$` with specific error messages (wrong prefix vs.
wrong length vs. non-hex). **Connect** uses `window.ethereum` when a wallet
extension is present and otherwise tells the user to paste an address. Nothing
is ever transmitted — the address is stored in `localStorage` only. If you
later want a real snapshot endpoint, that is the one place to add a `fetch`.

---

## 5. Assets

### On disk and used
```
assets/arco-leap.png              hero, day        (800px RGBA cutout)
assets/arco-leap-night.png        hero, night      (hoodie Arco, same pose)
assets/arco-logo.png              nav / favicon / footer
assets/poses/run-01…09.png        full-res cutouts (source of truth)
assets/sprites/*.png              320px downscales — game + fetch cameo
assets/nfts/01…08.jpg             NFT wall (560px)
assets/scenes/plate-day.jpg       hero parallax plate (no character, no text)
assets/scenes/arco-wide.jpg       spare wide scene
assets/arco.mp4  + video-poster.jpg      the site film   (3.1 MB)
assets/nft-trailer.mp4 + nft-poster.jpg  NFT launch trailer (4.4 MB, 640×640, 10s)
assets/posters/*.png              MARKETING ONLY — text baked in, never used as sprites
```

### Video weight
Both videos are `preload="none"` with a real poster frame, so a page load
fetches **zero video bytes** — they download only when someone presses play.
This was measured: `preload="metadata"` was not enough, the browser pulled the
whole 4.5 MB anyway.

The trailer source was 12.9 MB @ 960×960 (10 Mbps). It was re-encoded with
macOS `avconvert -p Preset640x480` to 640×640 / 4.4 MB, and the poster frame
pulled with `qlmanage -t`. If you install ffmpeg you can halve it again:

```bash
ffmpeg -i nft-trailer.mp4 -vf scale=640:640 -c:v libx264 -crf 28 \
       -preset slow -movflags +faststart -an nft-trailer-small.mp4
```
(`-an` drops the audio track, which nothing on the page uses.)

`arco-jump.png`, `arco-run.png`, `arco-wave.png`, `arco-promo.png` were moved
into `assets/posters/` so nobody accidentally uses them as a moving sprite.
`arco-promo.png` is the OG image (it has baked text, which is correct there).

### Not found on disk
- `assets/memes/` — does not exist. The degen art is served by `assets/nfts/`,
  which covers the same ground. Nothing is broken by this.

### Changed after the first build
- The 8 NFTs were replaced with the newer set; the two "3,325 more" filler
  cards are gone, so the wall is exactly the 8 real pieces.
- **Tax now reads `TBA`**, not `0%` (`js/config.js` → `LAUNCH.tax`, and the
  Tax card in `index.html`).

### What is missing / worth generating

The current run cycle is **four assorted gallop poses**, not a real cycle —
they are close enough that the normalisation hides it, but a proper cycle would
be a visible upgrade. Everything below is optional; the site works without it.

**Paste-ready prompt for an image generator:**

> A 3D Pixar-style puppy mascot named Arco. Periwinkle-violet and white fur,
> big dark friendly eyes, floppy ears, a blue collar with a small violet
> rounded-triangle "A" tag. Soft studio lighting, glossy toy-like render.
> **Full body, side view facing LEFT, centred, on a fully transparent
> background (PNG with alpha), 800×800, no shadow, no ground, no text.**
> Keep the character design, proportions and colours identical across every
> image in this set.

Then request these variants, one per image:

| File to save as | Ask for |
|---|---|
| `poses/run-a…f.png` | a **6-frame run cycle**: contact, down, pass, up, contact-opposite, down-opposite — same camera, same size, feet landing on one line |
| `poses/idle-a…d.png` | a 4-frame idle breathing loop, sitting, tail wagging |
| `poses/jump-up.png` / `jump-air.png` / `jump-land.png` | a 3-pose jump: crouch, airborne stretched, landing squash |
| `poses/dig.png` | digging, front paws down, dirt flying |
| `poses/sleep.png` | curled up asleep (for an idle-timeout easter egg) |
| `bg/parallax-far.png` | wide 1920×600 landscape, **no character, no text**, transparent or flat sky — for a real parallax layer in the game |

**Two rules that matter most:** transparent background (true alpha, not white)
and **no baked-in text**. Anything with text becomes a poster, not an asset.

If you drop new files in, put cutouts in `assets/poses/`, then regenerate the
320px sprites and re-measure the alpha padding into the `MET` tables in
`js/game.js` and `js/main.js`.

---

## 6. Local preview

```bash
cd arco && python3 -m http.server 4173
```
Then open <http://localhost:4173>.

`index.html` links CSS/JS with a `?v=claude1` cache-buster. **Bump it whenever
you edit `css/` or `js/`**, otherwise GitHub Pages (and your own browser) will
happily serve the old file.

## 7. Deploy
Nothing to build — push the folder as-is to the Pages branch.
