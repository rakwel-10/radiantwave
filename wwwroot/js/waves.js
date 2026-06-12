/* ============================================================
   Radiant Wave — animated dot-grid wave terrain
   A perspective grid of glowing dots that rolls like hills,
   coloured blue → purple → pink over black. Slow continuous
   motion. Intensity is adjustable so the atmosphere reacts to
   the journey (calm → energized).
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TWO_PI = Math.PI * 2;

  const state = {
    w: 0, h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.25),
    t: 0,
    intensity: 1,
    targetIntensity: 1,
    cols: 0,
    rows: 46,
  };

  // Gradient colours (blue → purple → pink).
  const BLUE = [72, 112, 236];
  const PURPLE = [150, 72, 214];
  const PINK = [240, 84, 156];

  function mix(a, b, f) {
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.cols = Math.max(48, Math.min(120, Math.round(state.w / 13)));
    state.rows = state.w < 640 ? 38 : 48;
  }

  // Rolling wave-surface height at grid coords (nx, nz) in 0..1.
  function heightAt(nx, nz, t) {
    return (
      Math.sin(nx * Math.PI * 3.0 + t * 0.55) * 0.55 +
      Math.sin(nz * Math.PI * 2.4 - t * 0.38) * 0.5 +
      Math.sin((nx * 2.2 + nz * 3.6) * Math.PI + t * 0.45) * 0.4 +
      Math.sin((nx * 5.0 - nz * 1.6) * Math.PI - t * 0.28) * 0.18
    );
  }
  const HSPAN = 1.63; // approximate |height| range for normalisation

  function frame() {
    state.intensity += (state.targetIntensity - state.intensity) * 0.04;
    state.t += reduceMotion ? 0.0025 : 0.01;
    const t = state.t;
    const { w, h, cols, rows } = state;
    const I = state.intensity;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    const horizonY = h * 0.30;
    const nearY = h * 0.99;
    const amp = h * 0.14 * I;

    // Draw far rows first so nearer dots layer on top.
    for (let r = 0; r < rows; r++) {
      const nz = r / (rows - 1);
      const d = nz;                              // 0 far (top) → 1 near (bottom)
      const persp = Math.pow(d, 1.45);
      const baseY = horizonY + (nearY - horizonY) * persp;
      const scale = 0.28 + 0.72 * d;
      const halfSpan = w * (0.30 + 0.64 * d);
      const radius = 0.5 + 2.3 * d;

      for (let c = 0; c < cols; c++) {
        const nx = c / (cols - 1);
        const gx = nx - 0.5;
        const wave = heightAt(nx, nz, t);
        const hNorm = clamp01((wave + HSPAN) / (2 * HSPAN));

        const x = w * 0.5 + gx * 2 * halfSpan;
        const y = baseY - wave * amp * scale;

        // horizontal edge fade
        let fade = 1 - clamp01((Math.abs(gx) * 2 - 0.74) / 0.26);
        if (fade <= 0) continue;

        const a = (0.06 + 0.34 * d) * (0.45 + 0.55 * hNorm) * fade * I;
        if (a <= 0.01) continue;

        // colour: blend across position + height
        const cp = clamp01(0.5 * nx + 0.5 * hNorm);
        const col = cp < 0.5 ? mix(BLUE, PURPLE, cp / 0.5) : mix(PURPLE, PINK, (cp - 0.5) / 0.5);

        ctx.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TWO_PI);
        ctx.fill();
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
