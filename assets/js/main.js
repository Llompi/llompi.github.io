/* Joan Llompart - portfolio interactions
   Plain JavaScript, no dependencies. */

(function () {
  "use strict";

  var docEl = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------
     Theme toggle
     ---------------------------------------------------------------- */

  var THEME_COLORS = { dark: "#0d0d0f", light: "#f1f1ef" };
  var toggle = document.querySelector(".theme-toggle");

  /* Only touches the button, so it is safe to call on load without
     writing a theme choice the visitor never made. */
  function syncToggle(theme) {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("aria-label", theme === "dark" ? "Dark theme" : "Light theme");
  }

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
    syncToggle(theme);
  }

  syncToggle(docEl.getAttribute("data-theme"));

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = docEl.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  /* Follow the system setting as long as the visitor has not chosen one */
  var schemeQuery = window.matchMedia("(prefers-color-scheme: light)");
  var onScheme = function (e) {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (err) {}
    if (stored) return;
    var theme = e.matches ? "light" : "dark";
    docEl.setAttribute("data-theme", theme);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute("content", THEME_COLORS[theme]);
    });
    syncToggle(theme);
  };
  if (schemeQuery.addEventListener) schemeQuery.addEventListener("change", onScheme);

  /* ----------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------- */

  var burger = document.querySelector(".nav-burger");
  var nav = document.getElementById("site-nav");
  var body = document.body;
  var narrow = window.matchMedia("(max-width: 820px)");

  function setNav(open) {
    body.classList.toggle("nav-open", open);
    if (burger) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    /* The panel sits before its own trigger in the DOM, so while it is
       parked off-screen it has to leave the tab order with it. */
    if (nav) nav.inert = !open && narrow.matches;
  }

  function closeNav(restoreFocus) {
    if (!body.classList.contains("nav-open")) return;
    setNav(false);
    if (restoreFocus && burger) burger.focus();
  }

  if (burger && nav) {
    setNav(false);
    if (narrow.addEventListener) {
      narrow.addEventListener("change", function () {
        if (!body.classList.contains("nav-open")) setNav(false);
      });
    }

    burger.addEventListener("click", function () {
      var open = !body.classList.contains("nav-open");
      setNav(open);
      if (open) {
        var first = nav.querySelector("a");
        if (first) first.focus();
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeNav(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav(true);
    });

    /* Tapping the page behind an open menu closes it, which is the gesture
       a phone user reaches for first and the only one Escape cannot cover.
       Capture phase, so the tap that dismisses the menu is spent doing only
       that and does not also open whatever happened to be underneath. */
    document.addEventListener(
      "click",
      function (e) {
        if (!body.classList.contains("nav-open")) return;
        if (nav.contains(e.target) || burger.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        closeNav(false);
      },
      true
    );

    /* Cycle Tab between the panel and the burger so focus cannot land
       on the page behind an open menu */
    nav.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !body.classList.contains("nav-open")) return;
      var links = nav.querySelectorAll("a");
      if (!links.length) return;
      if (e.shiftKey && document.activeElement === links[0]) {
        e.preventDefault();
        burger.focus();
      } else if (!e.shiftKey && document.activeElement === links[links.length - 1]) {
        e.preventDefault();
        burger.focus();
      }
    });

    burger.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !e.shiftKey || !body.classList.contains("nav-open")) return;
      var links = nav.querySelectorAll("a");
      if (!links.length) return;
      e.preventDefault();
      links[links.length - 1].focus();
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
    docEl.classList.add("js-reveal");
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
    var visible = [];
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var i = visible.indexOf(entry.target);
          if (entry.isIntersecting && i === -1) visible.push(entry.target);
          else if (!entry.isIntersecting && i !== -1) visible.splice(i, 1);
        });
        var top = visible.slice().sort(function (a, b) {
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        })[0];
        navLinks.forEach(function (link) {
          if (top && link.getAttribute("href") === "#" + top.id) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
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

  /* The browser must not also try to restore scroll on history moves;
     the modal code below knows the real position and applies it itself. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* Root overflow alone does not hold on iOS Safari, so the body is pinned
     at its current offset and restored on release. */
  var lockedAt = 0;
  /* Set while a popstate is being handled, so the close handler does not
     also rewrite history for a navigation the browser is already doing */
  var poppingBack = false;

  function lockScroll(lock) {
    if (lock) {
      lockedAt = window.scrollY;
      docEl.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = -lockedAt + "px";
      body.style.left = "0";
      body.style.right = "0";
    } else {
      docEl.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, lockedAt);
    }
  }

  document.querySelectorAll("dialog.project-modal").forEach(function (dialog) {
    /* The dialog is the scroll container, so the dismiss drag only arms
       when it is already scrolled to the top */
    var scroller = dialog;
    var gal = dialog.querySelector(".modal-gallery-main");
    var main = dialog.querySelector("[data-gallery-main]");
    var status = dialog.querySelector("[data-gallery-status]");
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
      if (status) {
        status.textContent =
          "Photo " + (index + 1) + " of " + images.length + ": " + images[index].alt;
      }
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
          /* A second finger is a pinch, not a swipe */
          if (e.touches.length !== 1) {
            swiping = false;
            return;
          }
          swipeX = e.touches[0].clientX;
          swipeY = e.touches[0].clientY;
          swiping = true;
        },
        { passive: true }
      );

      gal.addEventListener(
        "touchcancel",
        function () {
          swiping = false;
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
        if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
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

    if (images.length < 2 && thumbs.length) {
      var strip = thumbs[0].parentNode;
      if (strip) strip.hidden = true;
    }

    dialog.addEventListener("close", function () {
      lockScroll(false);
      dialog.style.transform = "";
      dialog.style.opacity = "";
      delete dialog.dataset.drag;
      /* Next open should start at photo one, not wherever the last visit ended */
      show(0);
      /* Drop this dialog's hash without navigating. history.back() would
         hand the browser a previous entry to restore, and it would take the
         scroll position (or the previous #hash target) with it. */
      if (
        !poppingBack &&
        location.hash === "#" + dialog.id &&
        history.state &&
        history.state.modal === dialog.id
      ) {
        history.replaceState(
          { y: lockedAt },
          "",
          location.pathname + location.search
        );
      }
    });

    /* Swipe down to dismiss on touch devices. Only engages when the
       modal content is scrolled to the top and the gesture is clearly
       vertical, so it never fights content scrolling or photo swipes. */
    if ("ontouchstart" in window) {
      var startY = 0;
      var startX = 0;
      var dragging = false;
      var tracking = false;

      var resetDrag = function () {
        tracking = false;
        dragging = false;
        delete dialog.dataset.drag;
        dialog.style.transform = "";
        dialog.style.opacity = "";
      };

      dialog.addEventListener(
        "touchstart",
        function (e) {
          /* A second finger is a pinch, not a dismiss */
          if (e.touches.length !== 1) {
            resetDrag();
            return;
          }
          /* Gestures that begin on the photo belong to the gallery */
          if (gal && gal.contains(e.target)) {
            tracking = false;
            return;
          }
          startY = e.touches[0].clientY;
          startX = e.touches[0].clientX;
          tracking = true;
          dragging = false;
        },
        { passive: true }
      );

      /* An interrupted gesture must not leave the sheet parked half-open */
      dialog.addEventListener("touchcancel", resetDrag, { passive: true });

      dialog.addEventListener(
        "touchmove",
        function (e) {
          if (!tracking) return;
          if (e.touches.length !== 1) {
            resetDrag();
            return;
          }
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
          }, 300);
        } else {
          dialog.style.transform = "";
          dialog.style.opacity = "";
        }
        tracking = false;
        dragging = false;
      });
    }
  });

  /* Projects get a URL, so they can be linked and so the phone Back gesture
     closes the sheet instead of leaving the site. */
  function openModal(dialog, push) {
    if (!dialog || typeof dialog.showModal !== "function" || dialog.open) return;
    dialog.showModal();
    lockScroll(true);
    dialog.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      img.loading = "eager";
    });
    dialog.scrollTop = 0;
    if (push) {
      history.pushState({ modal: dialog.id, y: lockedAt }, "", "#" + dialog.id);
    }
  }

  document.querySelectorAll("[data-modal]").forEach(function (opener) {
    opener.addEventListener("click", function () {
      openModal(document.getElementById(opener.getAttribute("data-modal")), true);
    });
  });

  window.addEventListener("popstate", function (e) {
    var wanted = e.state && e.state.modal;
    var wasOpen = null;
    poppingBack = true;
    document.querySelectorAll("dialog.project-modal").forEach(function (d) {
      if (d.open && d.id !== wanted) {
        wasOpen = d;
        d.close();
      }
    });
    poppingBack = false;

    if (wanted) {
      openModal(document.getElementById(wanted), false);
      return;
    }

    /* Back out of a modal should land on the card it was opened from, not
       wherever the entry behind it happens to point. */
    var y = e.state && typeof e.state.y === "number" ? e.state.y : null;
    if (y === null && wasOpen) y = lockedAt;
    if (y !== null) {
      window.scrollTo(0, y);
      /* A fragment in the restored URL makes the browser scroll after this
         turn of the loop, so re-apply once it has had its go. */
      requestAnimationFrame(function () {
        window.scrollTo(0, y);
      });
    }
  });

  /* A shared link lands straight on the project */
  if (location.hash.indexOf("#modal-") === 0) {
    var deep = document.getElementById(location.hash.slice(1));
    if (deep && deep.classList.contains("project-modal")) {
      history.replaceState({ modal: deep.id }, "", location.hash);
      openModal(deep, false);
    }
  }

  /* ----------------------------------------------------------------
     Whole card is clickable, not just the details link
     ---------------------------------------------------------------- */

  document.querySelectorAll(".case-card, .feature-case").forEach(function (card) {
    var trigger =
      card.querySelector("[data-modal]") || card.querySelector("a.text-link");
    if (!trigger) return;
    card.classList.add("is-clickable");
    /* Movement threshold, so scrolling with a finger on a card never opens it */
    var moved = false;
    var startX = 0;
    var startY = 0;
    card.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        moved = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true }
    );
    card.addEventListener(
      "touchmove",
      function (e) {
        if (moved || e.touches.length !== 1) return;
        if (
          Math.abs(e.touches[0].clientX - startX) > 10 ||
          Math.abs(e.touches[0].clientY - startY) > 10
        ) {
          moved = true;
        }
      },
      { passive: true }
    );

    card.addEventListener("click", function (e) {
      /* Let real links and buttons inside the card do their own thing */
      if (e.target.closest("a, button")) return;
      /* A miss between two chips should do nothing, not open the project */
      if (e.target.closest(".chip-row")) return;
      /* Do not hijack text selection */
      var sel = window.getSelection();
      if (sel && String(sel).length) return;
      /* A finger that scrolled and lifted is not a tap */
      if (moved) return;
      /* Focus the real control first, so the dialog restores focus here on close */
      trigger.focus();
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
    var done = function (e) {
      if (e.target !== el) return;
      el.classList.remove("skill-flash");
      el.removeEventListener("animationend", done);
      el.removeEventListener("animationcancel", done);
    };
    el.addEventListener("animationend", done);
    el.addEventListener("animationcancel", done);
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
      /* The jump is a long one, so record where we are on the entry we are
         leaving, then push a new one, so Back lands where the chip was */
      var here = history.state || {};
      here.y = window.scrollY;
      history.replaceState(here, "");
      history.pushState({ skillJump: true }, "", "#skills");
      scrollTarget.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center"
      });
      if (target) {
        target.tabIndex = -1;
        setTimeout(
          function () {
            target.focus({ preventScroll: true });
            if (!reducedMotion) flash(target);
          },
          reducedMotion ? 0 : 350
        );
      }
    });
  });
})();
