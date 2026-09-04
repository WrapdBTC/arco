(() => {
  const LAUNCH = Date.parse("2026-09-16T00:00:00Z");
  const dog = document.getElementById("stickyDog");
  const dogImg = document.getElementById("dogImg");
  const progress = document.getElementById("scrollProgress");
  const toast = document.getElementById("toast");
  const muteBtn = document.getElementById("muteBtn");
  const woofBtn = document.getElementById("woofBtn");
  const poses = {
    wave: "assets/arco-wave.png",
    run: "assets/arco-run.png",
    jump: "assets/arco-jump.png",
  };
  let muted = localStorage.getItem("arco-muted") !== "0";
  let audioCtx = null;
  let ambient = null;

  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1600);
  };

  const ensureAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  const setMuteUI = () => {
    if (!muteBtn) return;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    localStorage.setItem("arco-muted", muted ? "1" : "0");
  };

  const startAmbient = () => {
    if (muted || ambient) return;
    const ctx = ensureAudio();
    const master = ctx.createGain();
    master.gain.value = 0.03;
    master.connect(ctx.destination);
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = "sine"; b.type = "triangle";
    a.frequency.value = 86; b.frequency.value = 129;
    a.connect(master); b.connect(master);
    a.start(); b.start();
    ambient = { a, b, master };
  };

  const stopAmbient = () => {
    if (!ambient) return;
    try { ambient.a.stop(); ambient.b.stop(); } catch (e) {}
    ambient = null;
  };

  const burst = () => {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const parts = Array.from({ length: 50 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 14,
      vy: -4 - Math.random() * 12,
      life: 1,
      c: ["#7b6cf6", "#ff6bcb", "#c4b5fd", "#fff"][(Math.random() * 4) | 0],
      s: 3 + Math.random() * 5,
    }));
    let n = 0;
    const tick = () => {
      n++;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.life -= 0.018;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      });
      if (n < 70) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    tick();
  };

  const woof = () => {
    if (muted) { showToast("Unmute for WOOF"); return; }
    const ctx = ensureAudio();
    startAmbient();
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(190, t0);
    o.frequency.exponentialRampToValueAtTime(68, t0 + 0.2);
    f.type = "lowpass"; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    o.connect(f); f.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + 0.3);
    burst();
    if (dog) {
      dog.classList.add("pose-jump");
      setTimeout(() => dog.classList.remove("pose-jump"), 700);
    }
    showToast("WOOF!");
  };

  const setPose = (name) => {
    if (!dog || !dogImg) return;
    const src = poses[name] || poses.wave;
    if (dogImg.getAttribute("src") !== src) {
      dogImg.style.opacity = "0.45";
      dogImg.setAttribute("src", src);
      requestAnimationFrame(() => { dogImg.style.opacity = "1"; });
    }
    dog.classList.remove("pose-wave", "pose-run", "pose-jump");
    dog.classList.add("pose-" + (name || "wave"));
  };

  const updateCountdown = () => {
    const el = {
      d: document.getElementById("cdDays"),
      h: document.getElementById("cdHours"),
      m: document.getElementById("cdMins"),
      s: document.getElementById("cdSecs"),
    };
    if (!el.d) return;
    let diff = Math.max(0, LAUNCH - Date.now());
    const days = Math.floor(diff / 86400000); diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000); diff -= mins * 60000;
    const secs = Math.floor(diff / 1000);
    const pad = (n) => String(n).padStart(2, "0");
    el.d.textContent = pad(days);
    el.h.textContent = pad(hours);
    el.m.textContent = pad(mins);
    el.s.textContent = pad(secs);
  };

  const chapters = [...document.querySelectorAll(".chapter")];
  const dots = [...document.querySelectorAll(".chapter-dots .dot")];

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (max > 0 ? Math.min(100, (scrollY / max) * 100) : 0) + "%";
    let active = chapters[0];
    let best = Infinity;
    chapters.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height * 0.2 - innerHeight * 0.35);
      if (dist < best) { best = dist; active = sec; }
      sec.querySelectorAll(".chapter-body p, .highlight-line, .chapter-title").forEach((el) => {
        if (el.getBoundingClientRect().top < innerHeight * 0.85) el.classList.add("is-on");
      });
    });
    if (active) {
      setPose(active.dataset.pose || "wave");
      dots.forEach((d) => d.classList.toggle("active", d.dataset.chapter === active.id));
    }
  };

  muteBtn && muteBtn.addEventListener("click", () => {
    muted = !muted;
    setMuteUI();
    if (muted) stopAmbient();
    else { ensureAudio(); startAmbient(); showToast("Sound on"); }
  });
  woofBtn && woofBtn.addEventListener("click", woof);
  const launchWoof = document.getElementById("launchWoof");
  launchWoof && launchWoof.addEventListener("click", woof);

  const copyCa = document.getElementById("copyCa");
  copyCa && copyCa.addEventListener("click", async () => {
    const v = (document.getElementById("caText") || {}).textContent || "TBA";
    try {
      await navigator.clipboard.writeText(v.trim());
      showToast(v.trim() === "TBA" ? "CA still TBA" : "Copied");
    } catch (e) { showToast("Copy failed"); }
  });

  const initGsap = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray(".chapter-title, .display").forEach((el) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 80%" },
        y: 36, opacity: 0, duration: 0.75, ease: "power3.out",
      });
    });
    gsap.to(".promo-peek", { y: -24, scrollTrigger: { trigger: "#intro", scrub: true } });
    gsap.to("#stickyDog", { y: -36, scrollTrigger: { scrub: 0.35, trigger: "body" } });
  };

  let buf = "";
  window.addEventListener("keydown", (e) => {
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toUpperCase()).slice(-4);
    if (buf === "ARCO") { muted = false; setMuteUI(); woof(); showToast("Good dog. $ARCO"); }
  });

  setMuteUI();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", initGsap);
  if (document.readyState === "complete") initGsap();
})();
