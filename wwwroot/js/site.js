/* Radiant Wave marketing site — nav toggle + active link + simple form note */
(function () {
  "use strict";

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
})();
