# Arco the Dog — $ARCO

Interactive memecoin landing site for **Arco the Dog** on **Arc L1** (Circle).  
Public mainnet target: **September 16, 2026 · 00:00 UTC**.

> Curious. Loyal. Always exploring.  
> Arco is here. The mainnet era begins.  
> Let's build the future—together.

**Disclaimer:** Community mascot project — **not** an official Circle / Arc product. Learn more at [arc.xyz](https://www.arc.xyz/).

## Stack

- Static HTML / CSS / Vanilla JS (no build step)
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) via Google Fonts CDN
- Assets in `assets/` (logo, poses, promo, video)

## Local preview

```bash
cd arco-the-dog
# any static server, e.g.:
python3 -m http.server 8080
# then open http://localhost:8080
```

Or open `index.html` directly in a browser.

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `arco-the-dog` or `yourname.github.io`).
2. Push this folder as the repo root (or put site files on `main`):

   ```bash
   git init
   git add .
   git commit -m "Launch Arco the Dog landing"
   git branch -M main
   git remote add origin https://github.com/<USER>/<REPO>.git
   git push -u origin main
   ```

3. In the repo on GitHub: **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Branch: **main** · Folder: **/ (root)** → **Save**.
6. Wait a minute; your site will be at:

   `https://<USER>.github.io/<REPO>/`

   (or `https://<USER>.github.io/` if the repo is named `<USER>.github.io`)

### Optional: custom domain

Add a `CNAME` file in the root with your domain, then configure DNS per [GitHub Pages docs](https://docs.github.com/en/pages).

## Project layout

```
arco-the-dog/
├── index.html
├── css/style.css
├── js/main.js
├── assets/
│   ├── arco-logo.png
│   ├── arco-promo.png
│   ├── arco-run.png
│   ├── arco-jump.png
│   ├── arco-wave.png
│   └── arco.mp4
└── README.md
```

## Features

- Live countdown to Arc public mainnet (`2026-09-16T00:00:00Z`)
- Paw / sparkle cursor trail
- Click Arco → bounce + “WOOF” toast + confetti
- Type **ARCO** anywhere → secret confetti
- Scroll reveals, 3D card tilt, floating cubes & paws
- Gallery (all images + video), tokenomics / roadmap / CA placeholders
- Mobile responsive nav

## License / note

Mascot art and branding for community use around $ARCO. Not affiliated with Circle Internet Financial or the Arc Network team.
