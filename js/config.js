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

/* ---- LAUNCH ---- */
const LAUNCH = {
  iso: '2026-09-16T00:00:00Z',
  label: 'September 16, 2026 · 00:00 UTC',
  chain: 'Arc L1',
  contract: 'TBA',
  supply: '1,000,000,000',
  tax: '0%',
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
    sprite: 'assets/sprites/sit.png',
    stamp: 'GOOD BOY #0'
  },
  {
    n: '02',
    tag: 'THE NOSE',
    title: 'He can smell a rug from three blocks away',
    body: 'It started as a joke. Then Arco growled at four contracts in a row and all four went to zero by Friday. Now the whole pack checks the dog before they check the chart.',
    sprite: 'assets/sprites/run-2.png',
    stamp: 'CERTIFIED SNIFFER'
  },
  {
    n: '03',
    tag: 'THE FETCH',
    title: 'Threw a ball in 2024. He is still going.',
    body: 'Somebody launched a tennis ball across the timeline and Arco went after it at full sprint. Bear market? Kept running. Chain migration? Kept running. He has not looked back once. That is the whole strategy.',
    sprite: 'assets/sprites/leap.png',
    stamp: 'STILL RUNNING'
  },
  {
    n: '04',
    tag: 'NIGHT SHIFT',
    title: 'After midnight the collar comes off',
    body: 'Sweet dog by day. But somewhere around 3am the chain gets quiet, the shades come on, and a very different animal starts posting. We do not talk about the night shift. We just hold through it.',
    sprite: 'assets/nfts/01.jpg',
    stamp: 'DEGEN MODE',
    dark: true
  },
  {
    n: '05',
    tag: 'THE PACK',
    title: 'One dog is a meme. A pack is a movement.',
    body: 'He does not want your money, your keys, or your roadmap. He wants everyone in the yard at the same time, making noise, being ridiculous together. Loyalty is the only tokenomic that ever mattered.',
    sprite: 'assets/sprites/party.png',
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
