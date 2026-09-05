# arcokey

Turns white-background JPGs into clean transparent PNGs, normalised so a run
cycle keeps one size and one centre. Written for the v2 Arco art drop, which
arrived as JPGs on white instead of cutouts.

```bash
swiftc -O -o arcokey arcokey.swift
```

It flood-fills the background inward from the image border, so white *inside*
the dog (chest, paws, muzzle) is never touched, then erodes 1px to kill the
JPEG halo and renders premultiplied into a square canvas.

```bash
# a run cycle: one shared scale across every frame
ARCOKEY_MIN=244 ARCOKEY_TOL=8 ./arcokey 320 cycle out/ run in/*.jpg

# a single image, scaled to fit
ARCOKEY_MIN=244 ARCOKEY_TOL=8 ./arcokey 800 each out/ hero in/hero.jpg

# reproduce another image's framing exactly (used to align the day/night heroes
# so the mode switch cross-fades without shifting)
ARCO_BOXW=0.8870 ARCO_CX=0.5225 ARCO_CY=0.4825 \
  ARCOKEY_MIN=244 ARCOKEY_TOL=8 ./arcokey 800 place out/ heronight in/hero.jpg
```

## Choosing the threshold

`ARCOKEY_MIN` / `ARCOKEY_TOL` decide how aggressively near-white counts as
background. **Use `244 / 8`.**

Arco's white paws are literally `255,255,255` — identical to the background.
Only the dark outline around them keeps the two apart, so the fill works only
while that outline holds. Go looser (`196/26`) and it leaks through the soft
anti-aliased outline and eats the paws, leaving the dark rim behind, which
looks like black claws once the sprite sits on a dark background. Go tighter
(`250/6`) and a white halo survives around the edges.

After keying, only the largest connected blob is kept — that removes detached
ground shadows and speckles without touching the character. Shadows that are
*attached* to him, or enclosed white regions, still survive; two of the fifteen
source frames had that and were simply left out of the cycle.


## A trap worth remembering

`CGImage.cropping(to:)` works in the image's own **top-left** coordinate space.
The drawing context uses **bottom-left**. Flipping the y for both — which is the
obvious mistake — silently crops the wrong band: content that is not vertically
centred in the source loses the top of its head and gains empty space at the
bottom. That is exactly what happened to the dark hero (43px off, sliced right
through his skull) and it is invisible until you look at the sprite on a dark
background.
