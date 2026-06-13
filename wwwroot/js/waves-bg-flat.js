/* ============================================================
   Radiant Wave — animated background  [bg2: sound-wave]
   A colorful audio-equalizer visualizer: mirrored rainbow bars
   that pulse like a live sound wave, with a glowing waveform
   line through the centre. Slow, continuous motion. Intensity
   is adjustable so the atmosphere reacts to the journey.
   (Previous "dot terrain" background saved as waves-bg1.js.)
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  // Soft glow + low opacity so the centred sound-wave sits gently behind text.
  canvas.style.filter = "blur(14px)";
  canvas.style.opacity = "0.5";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    w: 0, h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    t: 0,
    clock: 0,
    intensity: 1,
    targetIntensity: 1,
    bars: [],
    spacing: 16,
  };

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.spacing = state.w < 640 ? 12 : 16;
    const count = Math.max(24, Math.floor(state.w / state.spacing));
    const bars = [];
    for (let i = 0; i < count; i++) {
      bars.push({
        // a few random factors so each bar dances a little differently
        f1: 0.18 + Math.random() * 0.06,
        f2: 0.05 + Math.random() * 0.05,
        ph: Math.random() * Math.PI * 2,
        sp: 0.8 + Math.random() * 0.6,
      });
    }
    state.bars = bars;
  }

  function roundedBar(x, yTop, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, yTop, w, h, radius);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius, yTop);
      ctx.arcTo(x + w, yTop, x + w, yTop + h, radius);
      ctx.arcTo(x + w, yTop + h, x, yTop + h, radius);
      ctx.arcTo(x, yTop + h, x, yTop, radius);
      ctx.arcTo(x, yTop, x + w, yTop, radius);
      ctx.fill();
    }
  }

  function frame() {
    state.intensity += (state.targetIntensity - state.intensity) * 0.04;

    // Slow, steady, gentle motion.
    const dtReal = reduceMotion ? 0.004 : 0.016;
    state.t += dtReal * 0.42;
    const t = state.t;
    const { w, h, bars, spacing } = state;
    const I = state.intensity;

    ctx.clearRect(0, 0, w, h);

    // Centred equalizer: bars mirror around the middle, brightest at the centre
    // line and fading to the tips. CSS blur + low opacity turn it into a soft
    // glowing band that text reads over comfortably.
    const centerY = h * 0.5;
    const maxH = h * 0.34 * I;
    const barW = spacing * 0.5;

    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const nx = i / (bars.length - 1);

      // layered oscillation → lively "spectrum" motion
      let v =
        Math.sin(i * b.f1 + t * 1.8 * b.sp + b.ph) +
        Math.sin(i * b.f2 - t * 1.1) * 0.6 +
        Math.sin(i * 0.5 + t * 3.0) * 0.35;
      let amp = (v + 1.95) / 3.9;           // ~0..1
      amp = Math.max(0.05, Math.min(1, amp));
      const barH = amp * maxH;

      const x = i * spacing + (spacing - barW) / 2;
      const hue = (nx * 320 + t * 14) % 360; // shifting rainbow across x

      // vertical gradient: bright at the centre line, transparent at both tips
      const g = ctx.createLinearGradient(0, centerY - barH, 0, centerY + barH);
      g.addColorStop(0, `hsla(${hue}, 90%, 62%, 0)`);
      g.addColorStop(0.5, `hsla(${hue}, 92%, 64%, 0.85)`);
      g.addColorStop(1, `hsla(${hue}, 90%, 62%, 0)`);
      ctx.fillStyle = g;
      roundedBar(x, centerY - barH, barW, barH * 2, barW / 2);
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
