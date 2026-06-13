/* ============================================================
   Radiant Wave — single-page experience state machine
   welcome → video1 → video2/decision → (disqualify | qualify)
            → video3 → final CTA redirect
   ============================================================ */
(function () {
  "use strict";

  const App = {
    config: null,
    players: {},
    selections: { q1: null, q2: null },
  };

  // ---- helpers ----------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function track(type, meta) {
    try {
      fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, meta: meta ?? null }),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  function applyText(cfg) {
    $$("[data-text]").forEach((el) => {
      const key = el.getAttribute("data-text");
      const val = cfg.text && cfg.text[key];
      if (val != null && val !== "") el.textContent = val;
    });
  }

  function attachRipple(btn) {
    btn.addEventListener("click", (e) => {
      const dot = document.createElement("span");
      dot.className = "ripple-dot";
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      dot.style.width = dot.style.height = size + "px";
      dot.style.left = e.clientX - rect.left + "px";
      dot.style.top = e.clientY - rect.top + "px";
      btn.appendChild(dot);
      setTimeout(() => dot.remove(), 600);
    });
  }

  // ---- cinematic screen transition --------------------------
  // Every transition plays a deliberate 3-second loader.
  const TRANSITION_LOADER_MS = 3000;
  let transitioning = false;
  function transitionTo(name, onArrive) {
    if (transitioning) return;
    transitioning = true;

    const loader = $("#loader");
    const label = loader.querySelector(".loader__label");
    if (label) label.textContent = "Energizing…";

    // sweep wipe + intensify the waves, then hold on the loader
    const sweep = $("#sweep");
    sweep.classList.remove("is-active");
    void sweep.offsetWidth; // restart animation
    sweep.classList.add("is-active");
    if (window.RadiantWaves) window.RadiantWaves.pulse();

    loader.classList.remove("is-hidden");

    const current = $(".screen--active");

    setTimeout(() => {
      if (current) current.classList.remove("screen--active");
      const next = $(`[data-screen="${name}"]`);
      if (next) {
        next.classList.add("screen--active");
        next.scrollTop = 0;
      }
      if (onArrive) onArrive();
      // reveal the next screen as the loader fades out
      setTimeout(() => {
        loader.classList.add("is-hidden");
        setTimeout(() => { transitioning = false; }, 500);
      }, 200);
    }, TRANSITION_LOADER_MS);
  }

  function showReveal(name) {
    const el = $(`[data-reveal="${name}"]`);
    if (el) el.classList.add("is-shown");
  }

  // ---- video helpers ----------------------------------------
  function preload(url) {
    try {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.src = url;
      v.load();
    } catch (_) {}
  }

  function makePlayer(mountId, src) {
    const p = new window.RWPlayer(mountId);
    p.load(src);
    return p;
  }

  // ---- state entries ----------------------------------------
  function startVideo1() {
    // Show the teaser (description + video). The user presses play to begin.
    transitionTo("video1", () => preload(videoUrl(2)));
  }

  // Resume directly at the teaser (used when arriving via the GHL post-submit
  // redirect). Switches screens without the welcome flash.
  function jumpToVideo1Immediate() {
    const cur = $(".screen--active");
    if (cur) cur.classList.remove("screen--active");
    const v1 = $('[data-screen="video1"]');
    if (v1) v1.classList.add("screen--active");
    preload(videoUrl(2));
  }

  function enterVideo2() {
    track("video1_complete");
    // Video 2 shows the "The Why" teaser — user presses play (no autoplay).
    transitionTo("video2", () => {
      App.players.v1.pause();
      preload(videoUrl(3));
    });
  }

  function handleOption(num) {
    track("video2_complete");
    track("option" + num);

    // lock + highlight selection
    const cards = $$('[data-screen="video2"] .card');
    cards.forEach((c) => {
      c.classList.add("is-locked");
      if (c.getAttribute("data-option") === String(num)) c.classList.add("is-selected");
      else c.classList.add("is-dim");
    });

    App.players.v2.pause();

    setTimeout(() => {
      if (num === 3) enterQualify();
      else enterDisqualified();
    }, 700);
  }

  function enterDisqualified() {
    document.body.classList.add("atmo-calm");
    document.body.classList.remove("atmo-energized");
    if (window.RadiantWaves) window.RadiantWaves.setIntensity(0.35);
    transitionTo("disqualified");
  }

  function enterQualify() {
    transitionTo("qualify");
  }

  function enterVideo3() {
    track("valuation_q1", App.selections.q1);
    track("valuation_q2", App.selections.q2);
    track("qualification_complete");

    document.body.classList.add("atmo-energized");
    if (window.RadiantWaves) window.RadiantWaves.setIntensity(1.7);

    // Video 3 shows the "The Synergistic Epiphany" teaser — user presses play.
    transitionTo("video3");
  }

  function finalRedirect() {
    track("video3_complete");
    track("final_cta_click");
    const url = (App.config && App.config.redirectUrl) || "https://rhema-wave-website.vercel.app/";
    // allow the event to flush
    setTimeout(() => { window.location.href = url; }, 220);
  }

  function videoUrl(n) {
    // If a remote base is configured (e.g. GitHub Releases / CDN), stream from
    // there; otherwise serve the local /videos folder.
    const base = App.config && App.config.videosBaseUrl;
    if (base) return base.replace(/\/+$/, "") + "/video" + n + ".mp4";
    return `/videos/video${n}.mp4`;
  }

  // ---- wire interactions ------------------------------------
  function wire() {
    // Teasers (video1 + video2): expand the video to fill once the user
    // presses play, hiding the description.
    [App.players.v1, App.players.v2, App.players.v3].forEach((p) => {
      const section = p.video.closest("[data-screen]");
      const t = section ? section.querySelector(".teaser") : null;
      p.video.addEventListener("play", () => { if (t) t.classList.add("is-expanded"); });
    });

    // Video 1: at the trigger, reveal the "Next Video: The Why" button.
    App.players.v1.onTrigger(App.config.timings.video1Trigger, () => { App.players.v1.pause(); showReveal("video1-next"); });
    $("#video1-next").addEventListener("click", enterVideo2);

    // Video 2 trigger -> reveal decision
    App.players.v2.onTrigger(App.config.timings.video2Trigger, () => { App.players.v2.pause(); showReveal("decision"); });
    $$('[data-screen="video2"] .card').forEach((card) => {
      card.addEventListener("click", () => handleOption(Number(card.getAttribute("data-option"))));
    });

    // Valuation questions — auto-advance once both are answered.
    $$(".value-cards").forEach((group) => {
      const q = group.getAttribute("data-value-group");
      group.querySelectorAll(".card").forEach((card) => {
        card.addEventListener("click", () => {
          group.querySelectorAll(".card").forEach((c) => c.classList.remove("is-selected"));
          card.classList.add("is-selected");
          App.selections[q] = card.getAttribute("data-value");
          if (q === "q1") revealQuestion2();
          maybeAdvanceQualify();
        });
      });
    });

    // Video 3 trigger -> reveal final CTA
    App.players.v3.onTrigger(App.config.timings.video3Trigger, () => { App.players.v3.pause(); showReveal("final-cta"); });
    $("#final-cta").addEventListener("click", finalRedirect);

    // Disqualified -> back to home (full reset)
    $("#back-home").addEventListener("click", () => { window.location.href = "/"; });

    // Ripples
    $$(".ripple, .btn--cta").forEach(attachRipple);
  }

  // Reveal the second valuation question once the first has been answered —
  // one question at a time, in the same box.
  function revealQuestion2() {
    const q2 = $('.question[data-question="2"]');
    if (q2 && q2.classList.contains("is-collapsed")) {
      q2.classList.remove("is-collapsed");
      q2.classList.add("q-reveal");
      q2.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // Once both valuation questions are answered, advance automatically (the
  // loader handles the transition — no continue button needed).
  function maybeAdvanceQualify() {
    if (App.selections.q1 && App.selections.q2 && !App._qualifyAdvancing) {
      App._qualifyAdvancing = true;
      setTimeout(() => enterVideo3(), 800);
    }
  }

  // Inject raw embed HTML AND execute any <script> tags it contains
  // (insertAdjacentHTML/innerHTML never run injected scripts).
  function injectEmbed(mount, html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const scripts = [];
    tpl.content.querySelectorAll("script").forEach((s) => { scripts.push(s); s.remove(); });
    mount.appendChild(tpl.content);
    scripts.forEach((old) => {
      const s = document.createElement("script");
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      if (old.textContent) s.textContent = old.textContent;
      document.body.appendChild(s);
    });
  }

  function embedOrigin(embedHtml) {
    const m = (embedHtml || "").match(/src="(https?:\/\/[^"/]+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  // ---- registration / GHL form ------------------------------
  function setupRegistration() {
    const mount = $("#ghl-form");
    const fallback = $("#ghl-fallback");
    const beginBtn = $("#begin-btn");
    const beginLabel = beginBtn.querySelector("span");

    const embed = App.config.ghlEmbed && App.config.ghlEmbed.trim();
    const hasEmbed = !!embed;
    if (hasEmbed) {
      if (fallback) fallback.remove();
      injectEmbed(mount, embed);
    }

    let started = false;
    const begin = (opts) => {
      if (started) return;
      started = true;
      track("registration");
      if (window.RadiantWaves) window.RadiantWaves.pulse();
      if (opts && opts.immediate) jumpToVideo1Immediate(opts.deferPlay);
      else startVideo1();
    };
    beginBtn.addEventListener("click", () => begin());
    App.startExperience = begin; // allow boot() to resume after a form redirect

    if (!hasEmbed) {
      // No form configured (dev/testing): explicit entry button up-front.
      beginBtn.hidden = false;
      beginLabel.textContent = "Begin Experience";
    } else {
      // Form present: the GHL form's submit + redirect drives progression
      // (see /continue). No manual button is shown.
      beginBtn.hidden = true;
    }

    // Auto-detect the GoHighLevel form submission via postMessage. We only
    // trust messages coming from the embed's own origin so unrelated iframe
    // chatter (e.g. height updates) can't trigger a false advance.
    const trusted = embedOrigin(embed);
    window.addEventListener("message", (e) => {
      if (trusted && e.origin && e.origin.toLowerCase() !== trusted) return;
      const d = e.data;
      const s = typeof d === "string" ? d : JSON.stringify(d || "");
      if (/submit|submitted|form[-_ ]?complete|thank[-_ ]?you|on[_-]?form[_-]?submit/i.test(s)) {
        begin();
      }
    });
  }

  // ---- boot -------------------------------------------------
  async function boot() {
    let cfg;
    try {
      const res = await fetch("/api/config", { cache: "no-store" });
      if (!res.ok) throw new Error("no backend");
      cfg = await res.json();
    } catch (_) {
      // No backend (static deploy) → use the baked-in config.
      cfg = window.RW_STATIC_CONFIG || { timings: { video1Trigger: 5, video2Trigger: 7, video3Trigger: 5 }, text: {}, ghlEmbed: "", redirectUrl: "https://rhema-wave-website.vercel.app/" };
    }
    App.config = cfg;

    applyText(cfg);

    // Build players (mounts exist in DOM up-front).
    App.players.v1 = makePlayer("mount-1", videoUrl(1));
    App.players.v2 = makePlayer("mount-2", videoUrl(2));
    App.players.v3 = makePlayer("mount-3", videoUrl(3));

    wire();
    setupRegistration();

    // Resume at Video 1 if we arrived via the GHL post-submit redirect.
    const params = new URLSearchParams(location.search);
    const resuming = params.get("begin") === "1" || location.hash.replace("#", "") === "begin";
    const loader = $("#loader");

    if (resuming) {
      const label = loader.querySelector(".loader__label");
      if (label) label.textContent = "Energizing…";
      App.startExperience && App.startExperience({ immediate: true });
      history.replaceState(null, "", location.pathname); // clean the URL
      // Hold the intentional 3-second loader, then reveal the teaser.
      setTimeout(() => loader.classList.add("is-hidden"), 3000);
    } else {
      setTimeout(() => loader.classList.add("is-hidden"), 350);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
