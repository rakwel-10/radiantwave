/* ============================================================
   Radiant Wave — animated background  [bg2: blurred spiral]
   A slow, soft, blurred multi-arm spiral of pastel colour that
   rotates gently behind the frosted glass. Calm motion, heavy
   blur → dreamy swirling glow. Intensity is adjustable.
   (Other backgrounds saved as waves-bg1.js / waves-bg-flat.js.)
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TWO_PI = Math.PI * 2;

  // blur enough to feel dreamy, but keep the spiral arms readable
  canvas.style.filter = "blur(11px) saturate(130%)";
  canvas.style.opacity = "0.8";

  const state = {
    w: 0, h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    rot: 0,
    intensity: 1,
    targetIntensity: 1,
  };

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  // pastel palette hues (blue · purple · pink · teal) to match the glass mesh
  const ARM_HUES = [212, 268, 320, 168];

  function frame() {
    state.intensity += (state.targetIntensity - state.intensity) * 0.04;
    state.rot += (reduceMotion ? 0.0005 : 0.0014) * state.intensity; // slow swirl
    const { w, h } = state;
    const I = state.intensity;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    const cx = w * 0.5;
    const cy = h * 0.48;
    const maxR = Math.hypot(w, h) * 0.55;
    const ARMS = 3;
    const POINTS = 180;
    const turns = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let arm = 0; arm < ARMS; arm++) {
      const armOff = (arm / ARMS) * TWO_PI;
      const hue = ARM_HUES[arm % ARM_HUES.length];
      ctx.beginPath();
      for (let i = 0; i < POINTS; i++) {
        const f = i / (POINTS - 1);            // 0 center … 1 outer
        const theta = f * turns * TWO_PI + armOff + state.rot;
        const r = Math.pow(f, 0.9) * maxR;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${hue}, 82%, 66%, ${0.5 * I})`;
      ctx.lineWidth = 12;
      ctx.stroke();
      // brighter inner core line
      ctx.strokeStyle = `hsla(${hue}, 90%, 78%, ${0.35 * I})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }

  // ---- public API (consumed by app.js) ----
  window.RadiantWaves = {
    setIntensity(level) { state.targetIntensity = Math.max(0.2, Math.min(2.2, level)); },
    pulse() {
      state.targetIntensity = Math.min(2.2, state.targetIntensity + 0.4);
      setTimeout(() => { state.targetIntensity = Math.max(0.4, state.targetIntensity - 0.4); }, 1400);
    },
  };

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
