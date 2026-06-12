/* ============================================================
   Radiant Wave — custom HTML5 video player
   Premium glass player with play/pause, seek/scrub, and
   playback-speed control. Fires a time-based trigger callback
   (used to reveal CTAs / option cards) and an ended callback.
   ============================================================ */
(function () {
  "use strict";

  const SPEEDS = [1, 1.25, 1.5, 2, 0.5, 0.75];

  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    bigplay: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>',
  };

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  class RWPlayer {
    constructor(mount) {
      this.mount = typeof mount === "string" ? document.getElementById(mount) : mount;
      this.triggerFired = false;
      this._onTrigger = null;
      this._triggerAt = Infinity;
      this._onEnded = null;
      this._endedFired = false;
      this._build();
    }

    _build() {
      const root = document.createElement("div");
      root.className = "rw-player is-paused";
      root.innerHTML = `
        <video class="rw-player__video" playsinline preload="metadata"></video>
        <button class="rw-player__bigplay" type="button" aria-label="Play video">
          <span>${ICON.bigplay}</span>
        </button>
        <div class="rw-player__controls">
          <button class="ctrl-btn ctrl-play" type="button" aria-label="Play/Pause">${ICON.play}</button>
          <span class="time time-current">0:00</span>
          <div class="scrub" role="slider" aria-label="Seek" tabindex="0">
            <div class="scrub__fill"></div>
            <div class="scrub__knob"></div>
          </div>
          <span class="time time-duration">0:00</span>
          <button class="speed" type="button" aria-label="Playback speed">1x</button>
        </div>`;
      this.mount.appendChild(root);

      this.root = root;
      this.video = root.querySelector(".rw-player__video");
      this.bigplay = root.querySelector(".rw-player__bigplay");
      this.playBtn = root.querySelector(".ctrl-play");
      this.scrub = root.querySelector(".scrub");
      this.fill = root.querySelector(".scrub__fill");
      this.knob = root.querySelector(".scrub__knob");
      this.curEl = root.querySelector(".time-current");
      this.durEl = root.querySelector(".time-duration");
      this.speedBtn = root.querySelector(".speed");
      this._speedIdx = 0;

      this._wire();
    }

    _wire() {
      const toggle = () => (this.video.paused ? this.play() : this.pause());
      this.bigplay.addEventListener("click", toggle);
      this.playBtn.addEventListener("click", toggle);
      this.video.addEventListener("click", toggle);

      this.video.addEventListener("play", () => {
        this.root.classList.add("is-playing");
        this.root.classList.remove("is-paused");
        this.playBtn.innerHTML = ICON.pause;
      });
      this.video.addEventListener("pause", () => {
        this.root.classList.remove("is-playing");
        this.root.classList.add("is-paused");
        this.playBtn.innerHTML = ICON.play;
      });

      this.video.addEventListener("loadedmetadata", () => {
        this.durEl.textContent = fmt(this.video.duration);
      });

      this.video.addEventListener("timeupdate", () => this._tick());
      this.video.addEventListener("ended", () => {
        if (this._onEnded && !this._endedFired) { this._endedFired = true; this._onEnded(); }
      });

      // Scrub interactions
      const seekTo = (clientX) => {
        const rect = this.scrub.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        if (isFinite(this.video.duration)) this.video.currentTime = ratio * this.video.duration;
        this._tick();
      };
      let dragging = false;
      this.scrub.addEventListener("pointerdown", (e) => {
        dragging = true;
        this.scrub.setPointerCapture(e.pointerId);
        seekTo(e.clientX);
      });
      this.scrub.addEventListener("pointermove", (e) => { if (dragging) seekTo(e.clientX); });
      this.scrub.addEventListener("pointerup", (e) => { dragging = false; try { this.scrub.releasePointerCapture(e.pointerId); } catch (_) {} });
      this.scrub.addEventListener("keydown", (e) => {
        if (!isFinite(this.video.duration)) return;
        if (e.key === "ArrowRight") this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 5);
        if (e.key === "ArrowLeft") this.video.currentTime = Math.max(0, this.video.currentTime - 5);
      });

      this.speedBtn.addEventListener("click", () => {
        this._speedIdx = (this._speedIdx + 1) % SPEEDS.length;
        const rate = SPEEDS[this._speedIdx];
        this.video.playbackRate = rate;
        this.speedBtn.textContent = `${rate}x`;
      });
    }

    _tick() {
      const d = this.video.duration;
      const c = this.video.currentTime;
      if (isFinite(d) && d > 0) {
        const pct = (c / d) * 100;
        this.fill.style.width = pct + "%";
        this.knob.style.left = pct + "%";
      }
      this.curEl.textContent = fmt(c);

      if (!this.triggerFired && c >= this._triggerAt) {
        this.triggerFired = true;
        if (this._onTrigger) this._onTrigger();
      }
    }

    // ---- Public API ----
    load(src) {
      this.video.src = src;
      this.video.load();
      return this;
    }

    /** Reveal callback when playback time reaches `seconds`. */
    onTrigger(seconds, cb) {
      this._triggerAt = Number(seconds) || 0;
      this._onTrigger = cb;
      this.triggerFired = false;
      // If trigger time is 0, fire as soon as playback begins.
      this.video.addEventListener("play", () => {
        if (this._triggerAt <= 0 && !this.triggerFired) {
          this.triggerFired = true;
          if (this._onTrigger) this._onTrigger();
        }
      }, { once: true });
      return this;
    }

    onEnded(cb) { this._onEnded = cb; this._endedFired = false; return this; }

    play() { const p = this.video.play(); if (p && p.catch) p.catch(() => {}); }
    pause() { this.video.pause(); }
    reset() { this.video.pause(); this.video.currentTime = 0; this.triggerFired = false; this._endedFired = false; }
    destroy() { try { this.video.pause(); this.video.removeAttribute("src"); this.video.load(); } catch (_) {} }
  }

  window.RWPlayer = RWPlayer;
})();
