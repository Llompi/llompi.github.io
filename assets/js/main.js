/* Joan Llompart - portfolio interactions
   Plain JavaScript, no dependencies. */

(function () {
  "use strict";

  var docEl = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------
     Theme toggle
     ---------------------------------------------------------------- */

  var THEME_COLORS = { dark: "#0d0d0f", light: "#f5f3ee" };

  function applyTheme(theme) {
    docEl.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* Storage may be unavailable in private windows. The toggle still works. */
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute("content", THEME_COLORS[theme]);
    });
  }

  var toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = docEl.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  /* ----------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------- */

  var burger = document.querySelector(".nav-burger");
  var body = document.body;

  function closeNav() {
    body.classList.remove("nav-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }

  if (burger) {
    burger.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".site-nav a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ----------------------------------------------------------------
     Hero circuit: draw-in trigger and pointer parallax
     ---------------------------------------------------------------- */

  var hero = document.querySelector(".hero");
  if (hero) {
    /* Kick off the trace animation once the page has painted. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        body.classList.add("hero-loaded");
      });
    });

    var canParallax =
      !reducedMotion && window.matchMedia("(pointer: fine)").matches;

    if (canParallax) {
      var layers = hero.querySelectorAll("[data-depth]");
      var targetX = 0;
      var targetY = 0;
      var curX = 0;
      var curY = 0;
      var ticking = false;

      function step() {
        curX += (targetX - curX) * 0.06;
        curY += (targetY - curY) * 0.06;
        layers.forEach(function (layer) {
          var depth = parseFloat(layer.getAttribute("data-depth")) || 10;
          layer.style.transform =
            "translate(" + (curX * depth).toFixed(2) + "px, " + (curY * depth).toFixed(2) + "px)";
        });
        if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
          requestAnimationFrame(step);
        } else {
          ticking = false;
        }
      }

      hero.addEventListener("pointermove", function (e) {
        var rect = hero.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width - 0.5) * -1;
        targetY = ((e.clientY - rect.top) / rect.height - 0.5) * -1;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(step);
        }
      });
    }
  }

  /* ----------------------------------------------------------------
     Reveal on scroll
     ---------------------------------------------------------------- */

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ----------------------------------------------------------------
     Active section in the nav
     ---------------------------------------------------------------- */

  var navLinks = document.querySelectorAll(".site-nav a.nav-link");
  var sections = [];
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href");
    if (id && id.charAt(0) === "#") {
      var section = document.querySelector(id);
      if (section) sections.push({ el: section, link: link });
    }
  });

  if ("IntersectionObserver" in window && sections.length) {
    var current = null;
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            current = entry.target.id;
            navLinks.forEach(function (link) {
              link.setAttribute(
                "aria-current",
                link.getAttribute("href") === "#" + current ? "true" : "false"
              );
            });
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(function (item) {
      sectionObserver.observe(item.el);
    });
  }

  /* ----------------------------------------------------------------
     Project dialogs
     ---------------------------------------------------------------- */

  function lockScroll(lock) {
    docEl.style.overflow = lock ? "hidden" : "";
  }

  document.querySelectorAll("[data-modal]").forEach(function (opener) {
    opener.addEventListener("click", function () {
      var dialog = document.getElementById(opener.getAttribute("data-modal"));
      if (!dialog || typeof dialog.showModal !== "function") return;
      dialog.showModal();
      lockScroll(true);
    });
  });

  document.querySelectorAll("dialog.project-modal").forEach(function (dialog) {
    /* Close button */
    dialog.querySelectorAll("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dialog.close();
      });
    });

    /* Click on the backdrop closes the dialog */
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      lockScroll(false);
    });

    /* Gallery thumbnails */
    var main = dialog.querySelector("[data-gallery-main]");
    var thumbs = dialog.querySelectorAll(".modal-thumbs button");
    thumbs.forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        var img = thumb.querySelector("img");
        if (!img || !main) return;
        main.src = img.src;
        main.alt = img.alt;
        thumbs.forEach(function (t) {
          t.setAttribute("aria-current", t === thumb ? "true" : "false");
        });
      });
    });
  });
})();
