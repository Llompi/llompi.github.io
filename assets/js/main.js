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

      var step = function () {
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
      };

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
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var current = entry.target.id;
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
     Project dialogs: galleries, gestures, dismissal
     ---------------------------------------------------------------- */

  function lockScroll(lock) {
    docEl.style.overflow = lock ? "hidden" : "";
  }

  document.querySelectorAll("dialog.project-modal").forEach(function (dialog) {
    var scroller = dialog.querySelector(".modal-scroll");
    var gal = dialog.querySelector(".modal-gallery-main");
    var main = dialog.querySelector("[data-gallery-main]");
    var thumbs = Array.prototype.slice.call(
      dialog.querySelectorAll(".modal-thumbs button")
    );
    var images = thumbs.map(function (t) {
      var img = t.querySelector("img");
      return { src: img.getAttribute("src"), alt: img.getAttribute("alt") };
    });
    var index = 0;

    function show(i) {
      if (!images.length || !main) return;
      index = ((i % images.length) + images.length) % images.length;
      main.src = images[index].src;
      main.alt = images[index].alt;
      thumbs.forEach(function (t, j) {
        t.setAttribute("aria-current", j === index ? "true" : "false");
      });
    }

    thumbs.forEach(function (t, j) {
      t.addEventListener("click", function () {
        show(j);
      });
    });

    /* Prev/next arrows, tap-to-advance, swipe, and arrow keys,
       only when there is more than one photo */
    if (images.length > 1 && gal && main) {
      gal.classList.add("has-multi");

      var makeArrow = function (dir, label, path) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "gal-nav " + dir;
        b.setAttribute("aria-label", label);
        b.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
          path +
          '"/></svg>';
        gal.appendChild(b);
        return b;
      };
      makeArrow("prev", "Previous photo", "M15 18l-6-6 6-6").addEventListener(
        "click",
        function () {
          show(index - 1);
        }
      );
      makeArrow("next", "Next photo", "M9 18l6-6-6-6").addEventListener(
        "click",
        function () {
          show(index + 1);
        }
      );

      main.addEventListener("click", function () {
        show(index + 1);
      });

      var swipeX = 0;
      var swipeY = 0;
      var swiping = false;
      gal.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length !== 1) return;
          swipeX = e.touches[0].clientX;
          swipeY = e.touches[0].clientY;
          swiping = true;
        },
        { passive: true }
      );
      gal.addEventListener(
        "touchend",
        function (e) {
          if (!swiping) return;
          swiping = false;
          var dx = e.changedTouches[0].clientX - swipeX;
          var dy = e.changedTouches[0].clientY - swipeY;
          if (Math.abs(dx) > 44 && Math.abs(dx) > 1.4 * Math.abs(dy)) {
            show(index + (dx < 0 ? 1 : -1));
          }
        },
        { passive: true }
      );

      dialog.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          show(index + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          show(index - 1);
        }
      });
    }

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
      dialog.style.transform = "";
      dialog.style.opacity = "";
      delete dialog.dataset.drag;
    });

    /* Swipe down to dismiss on touch devices. Only engages when the
       modal content is scrolled to the top and the gesture is clearly
       vertical, so it never fights content scrolling or photo swipes. */
    if ("ontouchstart" in window) {
      var startY = 0;
      var startX = 0;
      var dragging = false;
      var tracking = false;

      dialog.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length !== 1) return;
          startY = e.touches[0].clientY;
          startX = e.touches[0].clientX;
          tracking = true;
          dragging = false;
        },
        { passive: true }
      );

      dialog.addEventListener(
        "touchmove",
        function (e) {
          if (!tracking) return;
          if (scroller && scroller.scrollTop > 0) {
            tracking = false;
            return;
          }
          var dy = e.touches[0].clientY - startY;
          var dx = e.touches[0].clientX - startX;
          if (!dragging) {
            if (dy > 16 && dy > 1.4 * Math.abs(dx)) {
              dragging = true;
              dialog.dataset.drag = "1";
            } else if (Math.abs(dx) > 24 || dy < -24) {
              tracking = false;
              return;
            }
          }
          if (dragging) {
            e.preventDefault();
            var ty = Math.min(dy * 0.85, 320);
            dialog.style.transform = "translateY(" + ty.toFixed(1) + "px)";
            dialog.style.opacity = String(Math.max(1 - ty / 480, 0.5));
          }
        },
        { passive: false }
      );

      dialog.addEventListener("touchend", function (e) {
        if (!dragging) {
          tracking = false;
          return;
        }
        var dy = e.changedTouches[0].clientY - startY;
        delete dialog.dataset.drag;
        if (dy > 120) {
          dialog.style.transform = "translateY(64%)";
          dialog.style.opacity = "0";
          setTimeout(function () {
            dialog.close();
          }, 200);
        } else {
          dialog.style.transform = "";
          dialog.style.opacity = "";
        }
        tracking = false;
        dragging = false;
      });
    }
  });

  document.querySelectorAll("[data-modal]").forEach(function (opener) {
    opener.addEventListener("click", function () {
      var dialog = document.getElementById(opener.getAttribute("data-modal"));
      if (!dialog || typeof dialog.showModal !== "function") return;
      dialog.showModal();
      lockScroll(true);
    });
  });

  /* ----------------------------------------------------------------
     Whole card is clickable, not just the details link
     ---------------------------------------------------------------- */

  document.querySelectorAll(".case-card, .feature-case").forEach(function (card) {
    var trigger =
      card.querySelector("[data-modal]") || card.querySelector("a.text-link");
    if (!trigger) return;
    card.classList.add("is-clickable");
    card.addEventListener("click", function (e) {
      /* Let real links and buttons inside the card do their own thing */
      if (e.target.closest("a, button")) return;
      /* Do not hijack text selection */
      var sel = window.getSelection();
      if (sel && String(sel).length) return;
      trigger.click();
    });
  });

  /* ----------------------------------------------------------------
     Technology chips jump to the matching skill
     ---------------------------------------------------------------- */

  var skillItems = Array.prototype.slice.call(
    document.querySelectorAll("#skills .skill-group li")
  );
  var skillGroups = Array.prototype.slice.call(
    document.querySelectorAll("#skills .skill-group")
  );

  function flash(el) {
    el.classList.remove("skill-flash");
    void el.offsetWidth;
    el.classList.add("skill-flash");
    el.addEventListener("animationend", function handler() {
      el.classList.remove("skill-flash");
      el.removeEventListener("animationend", handler);
    });
  }

  document.querySelectorAll("button.chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var target = null;
      var wantSkill = (chip.getAttribute("data-skill") || "").toLowerCase();
      var wantGroup = (chip.getAttribute("data-group") || "").toLowerCase();

      if (wantSkill) {
        for (var i = 0; i < skillItems.length; i++) {
          if (skillItems[i].textContent.toLowerCase().indexOf(wantSkill) !== -1) {
            target = skillItems[i];
            break;
          }
        }
      }
      if (!target && wantGroup) {
        for (var j = 0; j < skillGroups.length; j++) {
          var h3 = skillGroups[j].querySelector("h3");
          if (h3 && h3.textContent.toLowerCase().indexOf(wantGroup) !== -1) {
            target = skillGroups[j];
            break;
          }
        }
      }

      var scrollTarget = target || document.getElementById("skills");
      if (!scrollTarget) return;
      scrollTarget.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center"
      });
      if (target) {
        setTimeout(
          function () {
            flash(target);
          },
          reducedMotion ? 0 : 350
        );
      }
    });
  });
})();
