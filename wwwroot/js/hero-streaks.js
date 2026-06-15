/* ============================================================
   Radiant Wave — Hero "light streaks" background
   Soft, blurred vertical light streaks of varying heights with
   drifting bokeh, flowing warm → cool → purple across the width.
   Premium depth-of-field glow on black. Decorative.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d", { alpha: true });
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var host = canvas.parentElement;

  // soft depth-of-field blur for the bokeh / streak glow
  canvas.style.filter = "blur(5px)";

  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5), t = 0;
  var streaks = [], bokeh = [];

  // colour stops across X (warm left → cool centre → purple right)
  var STOPS = [
    [0.00, [255, 150, 70]],
    [0.13, [255, 80, 120]],
    [0.30, [180, 90, 235]],
    [0.50, [70, 120, 255]],
    [0.68, [70, 200, 255]],
    [0.86, [95, 125, 255]],
    [1.00, [190, 90, 235]],
  ];
  function colorAt(p) {
    if (p <= 0) return STOPS[0][1];
    for (var i = 0; i < STOPS.length - 1; i++) {
      var a = STOPS[i], b = STOPS[i + 1];
      if (p >= a[0] && p <= b[0]) {
        var f = (p - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }

  function resize() {
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var spacing = W < 760 ? 9 : 12;
    var count = Math.max(40, Math.floor(W / spacing));
    streaks = [];
    for (var i = 0; i < count; i++) {
      streaks.push({
        nx: i / (count - 1),
        x: i * spacing + spacing * 0.5,
        ph: Math.random() * 6.283,
        sp: 0.6 + Math.random() * 0.9,
        w: 1.2 + Math.random() * 2.4,
      });
    }
    var bc = W < 760 ? 22 : 42;
    bokeh = [];
    for (var j = 0; j < bc; j++) {
      bokeh.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 8 + Math.random() * 44,
        a: 0.05 + Math.random() * 0.18,
        vx: -0.04 - Math.random() * 0.14,
        vy: (Math.random() - 0.5) * 0.16,
      });
    }
  }

  function frame() {
    t += reduce ? 0.003 : 0.01;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    var centerY = H * 0.5;
    var maxH = H * 0.84;

    // bokeh
    for (var j = 0; j < bokeh.length; j++) {
      var b = bokeh[j];
      b.x += b.vx; b.y += b.vy;
      if (b.x < -70) b.x = W + 70;
      if (b.y < -70) b.y = H + 70; else if (b.y > H + 70) b.y = -70;
      var cb = colorAt(b.x / W);
      var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, rgba(cb, b.a));
      g.addColorStop(1, rgba(cb, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
    }

    // streaks
    ctx.lineCap = "round";
    for (var i = 0; i < streaks.length; i++) {
      var s = streaks[i];
      var v = Math.sin(i * 0.22 + t * 1.4 * s.sp + s.ph) +
              Math.sin(i * 0.07 - t * 0.8) * 0.6 +
              Math.sin(i * 0.5 + t * 2.2) * 0.35;
      var amp = Math.max(0.06, Math.min(1, (v + 1.95) / 3.9));
      var hgt = amp * maxH;
      var top = centerY - hgt / 2, bot = centerY + hgt / 2;
      var c = colorAt(s.nx);

      // coloured beam
      var grad = ctx.createLinearGradient(0, top, 0, bot);
      grad.addColorStop(0, rgba(c, 0));
      grad.addColorStop(0.5, rgba(c, 1));
      grad.addColorStop(1, rgba(c, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.w * 1.6;
      ctx.beginPath(); ctx.moveTo(s.x, top); ctx.lineTo(s.x, bot); ctx.stroke();

      // bright inner core for the "light beam" pop
      var core = [Math.min(255, c[0] + 90), Math.min(255, c[1] + 90), Math.min(255, c[2] + 90)];
      var cg = ctx.createLinearGradient(0, top, 0, bot);
      cg.addColorStop(0, rgba(core, 0));
      cg.addColorStop(0.5, rgba(core, 0.9));
      cg.addColorStop(1, rgba(core, 0));
      ctx.strokeStyle = cg;
      ctx.lineWidth = Math.max(0.8, s.w * 0.5);
      ctx.beginPath(); ctx.moveTo(s.x, top); ctx.lineTo(s.x, bot); ctx.stroke();

      // glowing tips
      ctx.fillStyle = rgba(c, 0.7);
      ctx.beginPath(); ctx.arc(s.x, top, s.w * 1.4, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, bot, s.w * 1.4, 0, 6.2832); ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
