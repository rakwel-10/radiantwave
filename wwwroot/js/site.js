/* Radiant Wave marketing site — theme toggle + nav + forms */
(function () {
  "use strict";

  // ---- Light / dark theme ----
  var root = document.documentElement;
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>';
  if (!root.getAttribute("data-theme")) {
    var t0 = "dark";
    try { t0 = localStorage.getItem("rw-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"); } catch (e) {}
    root.setAttribute("data-theme", t0);
  }
  var navcta = document.querySelector(".nav-cta");
  if (navcta) {
    var tbtn = document.createElement("button");
    tbtn.className = "theme-toggle";
    tbtn.type = "button";
    tbtn.setAttribute("aria-label", "Toggle light / dark theme");
    var setIcon = function () { tbtn.innerHTML = root.getAttribute("data-theme") === "light" ? MOON : SUN; };
    setIcon();
    navcta.insertBefore(tbtn, navcta.firstChild);
    tbtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("rw-theme", next); } catch (e) {}
      setIcon();
    });
  }

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("is-open"); });
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") links.classList.remove("is-open"); });
  }

  // Highlight the current page in the nav
  var path = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var href = a.getAttribute("href").replace(/\/$/, "").replace(/\.html$/, "");
    if (href === path || (path === "" && href === "/home")) a.classList.add("is-active");
  });

  // Contact / subscribe forms — graceful client-side acknowledgement
  document.querySelectorAll("form[data-ack]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form__ack") || document.createElement("p");
      note.className = "form__ack form__note";
      note.textContent = form.getAttribute("data-ack") || "Thank you — our concierge will be in touch within 48 hours.";
      note.style.color = "#9fe7c4";
      if (!note.parentNode) form.appendChild(note);
      form.querySelectorAll("input, textarea, button").forEach(function (el) { el.disabled = true; });
    });
  });

  // Stagger reveal-up elements
  document.querySelectorAll(".reveal-up").forEach(function (el, i) {
    el.style.animationDelay = (i % 6) * 0.08 + "s";
  });

  // Count-up numbers when scrolled into view
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var fmt = function (n) {
      var neg = n < 0; n = Math.abs(Math.round(n));
      return (neg ? "−" : "") + n.toLocaleString("en-US");
    };
    var run = function (el) {
      var to = parseFloat(el.getAttribute("data-count")) || 0;
      var dur = 1500, t0 = null;
      var tick = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3); // ease-out
        el.textContent = fmt(to * e);
        if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(to);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { io.unobserve(en.target); run(en.target); }
        });
      }, { threshold: 0.45 });
      counters.forEach(function (c) { c.textContent = "0"; io.observe(c); });
    } else {
      counters.forEach(run);
    }
  }
})();
