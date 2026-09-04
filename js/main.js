/* Arco the Dog — interactive landing */
(function () {
  "use strict";

  const MAINNET_UTC = Date.UTC(2026, 8, 16, 0, 0, 0); // Sep 16, 2026 00:00:00Z
  const CA_PLACEHOLDER = "TBA — Coming Sep 16, 2026";

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function showToast(msg, ms = 1600) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), ms);
  }

  /* ---------- touch / cursor ---------- */
  const isTouch =
    matchMedia("(hover: none), (pointer: coarse)").matches ||
    "ontouchstart" in window;
  if (isTouch) document.body.classList.add("touch-device");

  /* ---------- nav ---------- */
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");

  function onScrollNav() {
    nav?.classList.toggle("scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  navToggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  navLinks?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- countdown ---------- */
  const cdDays = $("#cdDays");
  const cdHours = $("#cdHours");
  const cdMins = $("#cdMins");
  const cdSecs = $("#cdSecs");

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function tickCountdown() {
    const now = Date.now();
    let diff = MAINNET_UTC - now;
    if (diff <= 0) {
      if (cdDays) cdDays.textContent = "00";
      if (cdHours) cdHours.textContent = "00";
      if (cdMins) cdMins.textContent = "00";
      if (cdSecs) cdSecs.textContent = "00";
      const target = $(".cd-target");
      if (target) target.innerHTML = "<strong>🚀 Mainnet is LIVE — UTC</strong>";
      return;
    }
    const days = Math.floor(diff / 86400000);
    diff %= 86400000;
    const hours = Math.floor(diff / 3600000);
    diff %= 3600000;
    const mins = Math.floor(diff / 60000);
    diff %= 60000;
    const secs = Math.floor(diff / 1000);
    if (cdDays) cdDays.textContent = pad(days);
    if (cdHours) cdHours.textContent = pad(hours);
    if (cdMins) cdMins.textContent = pad(mins);
    if (cdSecs) cdSecs.textContent = pad(secs);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------- confetti ---------- */
  const canvas = $("#confettiCanvas");
  const ctx = canvas?.getContext("2d");
  let confettiPieces = [];
  let confettiRaf = null;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function spawnConfetti(count = 120) {
    if (!ctx) return;
    const colors = ["#a78bfa", "#7c6cf6", "#7dd3fc", "#38bdf8", "#ffffff", "#312e81", "#f0abfc"];
    for (let i = 0; i < count; i++) {
      confettiPieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 80,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        vx: -3 + Math.random() * 6,
        vy: 2 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1,
      });
    }
    if (!confettiRaf) confettiRaf = requestAnimationFrame(drawConfetti);
  }

  function drawConfetti() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiPieces = confettiPieces.filter((p) => p.life > 0 && p.y < canvas.height + 40);
    for (const p of confettiPieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.vr;
      p.life -= 0.004;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (confettiPieces.length) {
      confettiRaf = requestAnimationFrame(drawConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiRaf = null;
    }
  }

  /* ---------- dog click → WOOF ---------- */
  const dogHit = $("#dogHit");
  dogHit?.addEventListener("click", () => {
    dogHit.classList.remove("bounce");
    void dogHit.offsetWidth;
    dogHit.classList.add("bounce");
    showToast("WOOF 🐾");
    spawnConfetti(140);
  });

  /* ---------- paw / sparkle cursor trail ---------- */
  const trail = $("#cursorTrail");
  let lastTrail = 0;

  if (!isTouch && trail) {
    document.addEventListener(
      "mousemove",
      (e) => {
        const now = performance.now();
        if (now - lastTrail < 28) return;
        lastTrail = now;
        const dot = document.createElement("span");
        const isPaw = Math.random() > 0.55;
        dot.className = "trail-dot " + (isPaw ? "paw" : "spark");
        if (isPaw) dot.textContent = "🐾";
        dot.style.left = e.clientX + "px";
        dot.style.top = e.clientY + "px";
        trail.appendChild(dot);
        setTimeout(() => dot.remove(), 700);
      },
      { passive: true }
    );
  }

  /* ---------- scroll reveals ---------- */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          revealObs.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => revealObs.observe(el));

  /* ---------- card tilt ---------- */
  function attachTilt(el) {
    const max = 10;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * max;
      const ry = (x - 0.5) * max;
      el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  }
  if (!isTouch) $$(".tilt").forEach(attachTilt);

  /* ---------- copy CA ---------- */
  $("#copyCa")?.addEventListener("click", async () => {
    const text = $("#caText")?.textContent?.trim() || CA_PLACEHOLDER;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied! 📋");
    } catch {
      showToast(text.startsWith("TBA") ? "CA still TBA 🐾" : "Copy failed");
    }
  });

  /* ---------- secret: type ARCO ---------- */
  let secretBuf = "";
  const SECRET = "ARCO";
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toUpperCase() : "";
    if (!key) return;
    secretBuf = (secretBuf + key).slice(-SECRET.length);
    if (secretBuf === SECRET) {
      secretBuf = "";
      showToast("ARCO! 🚀💜", 2200);
      spawnConfetti(220);
    }
  });

  /* ---------- cycle hero dog poses gently on idle ---------- */
  const heroDog = $("#heroDog");
  const poses = [
    "assets/arco-run.png",
    "assets/arco-jump.png",
    "assets/arco-wave.png",
  ];
  let poseIdx = 0;
  if (heroDog) {
    setInterval(() => {
      if (document.hidden) return;
      poseIdx = (poseIdx + 1) % poses.length;
      heroDog.style.opacity = "0.85";
      setTimeout(() => {
        heroDog.src = poses[poseIdx];
        heroDog.style.opacity = "1";
      }, 180);
    }, 7000);
    heroDog.style.transition = "opacity 0.18s ease";
  }
})();
