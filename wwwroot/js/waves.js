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
  canvas.style.filter = "blur(13px) saturate(135%)";
  canvas.style.opacity = "0.78";

  const state = {
    w: 0, h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    rot: 0,
    flow: 0,
    intensity: 1,
    targetIntensity: 1,
  };

  function ss(e0, e1, x) { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  // rich multi-colour arm hues (blue · indigo · purple · pink · coral · teal)
  const ARM_HUES = [208, 250, 292, 328, 12, 162];

  function frame() {
    state.intensity += (state.targetIntensity - state.intensity) * 0.04;
    state.rot += (reduceMotion ? 0.0003 : 0.0008) * state.intensity;       // gentle swirl
    state.flow += (reduceMotion ? 0.0006 : 0.0019) * state.intensity;      // outward stream
    const { w, h } = state;
    const I = state.intensity;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    const cx = w * 0.5;
    const cy = h * 0.48;
    const maxR = Math.hypot(w, h) * 0.58;
    const ARMS = 6;
    const COUNT = 100;
    const turns = 2.3;

    // Particles continuously travel center → edge along each arm (outward flow),
    // fading in near the core and out at the rim to hide the wrap.
    for (let arm = 0; arm < ARMS; arm++) {
      const armOff = (arm / ARMS) * TWO_PI;
      const baseHue = ARM_HUES[arm % ARM_HUES.length];
      for (let i = 0; i < COUNT; i++) {
        const f = ((i / COUNT) + state.flow) % 1;          // 0 center … 1 outer
        const theta = f * turns * TWO_PI + armOff + state.rot;
        const r = Math.pow(f, 0.85) * maxR;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;

        const fade = ss(0, 0.14, f) * (1 - ss(0.78, 1, f));
        if (fade <= 0.01) continue;
        const size = 5 + f * 22;                            // thicker toward the rim
        const hue = (baseHue + f * 46) % 360;               // colour shifts along the arm
        const a = 0.26 * fade * I;
        ctx.fillStyle = `hsla(${hue}, 85%, 66%, ${a})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TWO_PI);
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
      state.targetIntensity = Math.min(2.2, state.targetIntensity + 0.4);
      setTimeout(() => { state.targetIntensity = Math.max(0.4, state.targetIntensity - 0.4); }, 1400);
    },
  };

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
