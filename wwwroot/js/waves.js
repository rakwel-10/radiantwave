/* ============================================================
   Radiant Wave — animated background  [bg2: 3D sound-wave floor]
   A colorful equalizer rendered in perspective: rows of bars
   recede from the bottom toward a horizon, forming a 3D
   "synthwave" floor that ripples like a sound wave. Slow,
   continuous motion. Intensity is adjustable.
   (Dot-grid terrain saved as waves-bg1.js;
    flat sound-wave saved as waves-bg-flat.js.)
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // heavy blur → the 3D floor melts into a calm, soft colour glow (no busy
  // motion to cause dizziness) while keeping the perspective depth underneath.
  canvas.style.filter = "blur(44px) saturate(125%)";
  canvas.style.opacity = "0.5";

  const state = {
    w: 0, h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    t: 0,
    intensity: 1,
    targetIntensity: 1,
    cols: 56,
    rows: 16,
  };

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.cols = Math.max(32, Math.min(76, Math.round(state.w / 22)));
    state.rows = state.w < 640 ? 12 : 16;
  }

  // spectrum height at (nx across 0..1, d depth 0..1, time)
  function ampAt(nx, d, t) {
    const v =
      Math.sin(nx * Math.PI * 5.0 + t * 0.9) * 0.5 +
      Math.sin(nx * Math.PI * 9.0 - t * 0.6 + d * 4.0) * 0.3 +
      Math.sin((nx * 6.0 + d * 7.0) * Math.PI + t * 0.7) * 0.3;
    return Math.max(0.04, Math.min(1, (v + 1.1) / 2.2));
  }

  function frame() {
    state.intensity += (state.targetIntensity - state.intensity) * 0.04;
    state.t += reduceMotion ? 0.003 : 0.009; // slow, calm drift
    const t = state.t;
    const { w, h, cols, rows } = state;
    const I = state.intensity;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    const horizonY = h * 0.62;
    const nearY = h * 1.06;
    const maxBarH = h * 0.14 * I;

    // far rows first → near rows paint on top
    for (let r = 0; r < rows; r++) {
      const d = r / (rows - 1);                       // 0 far … 1 near
      const floorY = horizonY + (nearY - horizonY) * Math.pow(d, 1.85);
      const halfW = w * (0.06 + 0.88 * d);            // converges toward horizon
      const colStep = (2 * halfW) / cols;
      const bw = Math.max(1, colStep * 0.5);
      const scale = 0.25 + 0.75 * d;
      const depthFade = 0.18 + 0.82 * d;              // far rows dimmer

      for (let c = 0; c < cols; c++) {
        const nx = c / (cols - 1);
        const amp = ampAt(nx, d, t);
        const barH = amp * maxBarH * (0.45 + 1.05 * scale);
        const x = w / 2 - halfW + (c + 0.5) * colStep;
        const yTop = floorY - barH;

        const hue = (nx * 300 + t * 12) % 360;
        const a = 0.5 * depthFade;
        ctx.fillStyle = `hsla(${hue}, 90%, 62%, ${a})`;
        ctx.fillRect(x - bw / 2, yTop, bw, barH);
      }
    }

    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }

  // ---- public API (consumed by app.js) ----
  window.RadiantWaves = {
    setIntensity(level) { state.targetIntensity = Math.max(0.2, Math.min(2.2, level)); },
    pulse() {
      state.targetIntensity = Math.min(2.2, state.targetIntensity + 0.5);
      setTimeout(() => { state.targetIntensity = Math.max(0.4, state.targetIntensity - 0.5); }, 1400);
    },
  };

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
