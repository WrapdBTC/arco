/* =========================================================
   ARCO — global config
   Fill the TBA values before launch. Nothing else needs edits.
   ========================================================= */

/* ---- SOCIAL: replace TBA URLs when the accounts/posts exist ---- */
const SOCIAL = {
  handle: '@ArcoTheDog',

  // Step 1 — follow
  x: 'https://x.com/TBA_ARCO',

  // Steps 2 & 3 — the FIRST launch post (like + retweet point at the same tweet)
  launchPost: 'https://x.com/TBA_ARCO/status/TBA',
  launchPostLike: 'https://x.com/intent/like?tweet_id=TBA',
  launchPostRetweet: 'https://x.com/intent/retweet?tweet_id=TBA',

  telegram: 'https://t.me/TBA_ARCO',
  dexscreener: 'TBA',
  chart: 'TBA',
  buy: 'TBA'
};

/* ---- COLLECT: where submitted wallets go -------------------------------
   Leave the endpoint as 'TBA' and nothing is ever transmitted — addresses stay
   in the visitor's own browser and the UI says so.
   Set a real URL and the site starts POSTing to it, and the wallet step's copy
   changes automatically to tell people their address is submitted.
   Keep those two in sync: never collect while the page claims it does not.  */
const COLLECT = {
  // Your own VPS running server/collect.js, e.g. 'https://api.arco.dog/collect'.
  // MUST be https — the site is served over https and browsers block mixed content.
  endpoint: 'TBA',

  // 'json' talks to server/collect.js and can READ the reply, so the visitor
  // gets their real signup number back (useful for a FCFS list).
  // 'formdata' is the fire-and-forget fallback for endpoints that cannot send
  // CORS headers — it works, but delivery cannot be confirmed.
  mode: 'json'
};

/* ---- LAUNCH ---- */
const LAUNCH = {
  iso: '2026-09-16T00:00:00Z',
  label: 'September 16, 2026 · 00:00 UTC',
  chain: 'Arc L1',
  contract: 'TBA',
  supply: '1,000,000,000',
  tax: 'TBA',
  lp: 'TBA',
  nftSupply: '3,333',
  nftPrice: 'Free mint for $ARCO holders'
};

/* ---- LORE: five chapters, meme-native, no whitepaper ---- */
const LORE = [
  {
    n: '01',
    tag: 'ORIGIN',
    title: 'Found at the edge of the chain',
    body: 'Nobody deployed Arco. He just showed up in the mempool one night, tail wagging, sitting on an unconfirmed block like it was a warm rock. Devs tried to shoo him off. He stayed. The block confirmed anyway.',
    art: 'assets/lore/01.jpg',
    stamp: 'GOOD BOY #0'
  },
  {
    n: '02',
    tag: 'THE NOSE',
    title: 'He can smell a rug from three blocks away',
    body: 'It started as a joke. Then Arco growled at four contracts in a row and all four went to zero by Friday. Now the whole pack checks the dog before they check the chart.',
    art: 'assets/lore/02.jpg',
    stamp: 'CERTIFIED SNIFFER'
  },
  {
    n: '03',
    tag: 'THE FETCH',
    title: 'Threw a ball in 2024. He is still going.',
    body: 'Somebody launched a tennis ball across the timeline and Arco went after it at full sprint. Bear market? Kept running. Chain migration? Kept running. He has not looked back once. That is the whole strategy.',
    art: 'assets/lore/03.jpg',
    stamp: 'STILL RUNNING'
  },
  {
    n: '04',
    tag: 'NIGHT SHIFT',
    title: 'After midnight the collar comes off',
    body: 'Sweet dog by day. But somewhere around 3am the chain gets quiet, the shades come on, and a very different animal starts posting. We do not talk about the night shift. We just hold through it.',
    art: 'assets/lore/04.jpg',
    stamp: 'DEGEN MODE',
    dark: true
  },
  {
    n: '05',
    tag: 'THE PACK',
    title: 'One dog is a meme. A pack is a movement.',
    body: 'He does not want your money, your keys, or your roadmap. He wants everyone in the yard at the same time, making noise, being ridiculous together. Loyalty is the only tokenomic that ever mattered.',
    art: 'assets/lore/05.jpg',
    stamp: 'YOU ARE HERE'
  }
];

/* ---- TICKER ---- */
const TICKER = [
  'OFF THE LEASH',
  '1B SUPPLY',
  '0% TAX',
  'BUILT ON ARC L1',
  'GOOD BOY CERTIFIED',
  'SEPT 16 · 00:00 UTC',
  'NO ROADMAP ONLY ZOOMIES',
  '3,333 NFTS · FREE MINT',
  'HE SMELLS RUGS',
  'WHO LET THE DOG OUT'
];
