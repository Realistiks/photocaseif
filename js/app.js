(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var header = doc.getElementById("header");
  var progress = doc.querySelector(".progress span");
  var burger = doc.querySelector(".burger");
  var mobileMenu = doc.getElementById("mobileMenu");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.remove("no-js");

  /* ---------------------------------------------------------
     header, progress, active navigation
     --------------------------------------------------------- */

  var navLinks = Array.prototype.slice.call(doc.querySelectorAll(".nav a"));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      var section = id && id.length > 1 ? doc.querySelector(id) : null;
      return section ? { link: link, section: section } : null;
    })
    .filter(Boolean);

  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
    }
    if (progress) {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      progress.style.width = (ratio * 100).toFixed(2) + "%";
    }
    ticking = false;
  }

  function requestScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  onScroll();

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var match = sections.find(function (item) {
            return item.section === entry.target;
          });
          if (!match) return;
          navLinks.forEach(function (link) {
            link.classList.toggle("is-active", link === match.link);
          });
        });
      },
      { rootMargin: "-38% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach(function (item) {
      navObserver.observe(item.section);
    });
  }

  /* ---------------------------------------------------------
     reveal on scroll
     --------------------------------------------------------- */

  var revealItems = Array.prototype.slice.call(doc.querySelectorAll(".reveal"));

  if (!reduceMotion && "IntersectionObserver" in window && revealItems.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-in");
    });
  }

  /* ---------------------------------------------------------
     mobile menu
     --------------------------------------------------------- */

  function setMenu(open) {
    if (!mobileMenu || !burger) return;
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    body.classList.toggle("no-scroll", open);
    if (open) {
      var first = mobileMenu.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    }
  }

  if (burger) {
    burger.addEventListener("click", function () {
      setMenu(burger.getAttribute("aria-expanded") !== "true");
    });
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
  }

  doc.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && mobileMenu && mobileMenu.classList.contains("is-open")) {
      setMenu(false);
      if (burger) burger.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1020 && mobileMenu && mobileMenu.classList.contains("is-open")) {
      setMenu(false);
    }
  });

  /* ---------------------------------------------------------
     lightbox
     --------------------------------------------------------- */

  var dialog = doc.getElementById("lightbox");
  var lbImage = doc.getElementById("lbImage");
  var lbCaption = doc.getElementById("lbCaption");
  var lbCount = doc.getElementById("lbCount");
  var lbStage = doc.getElementById("lbStage");
  var lbPrev = doc.querySelector("[data-lb-prev]");
  var lbNext = doc.querySelector("[data-lb-next]");
  var lbClose = doc.querySelector("[data-lb-close]");

  var gallery = [];
  var index = 0;
  var lastTrigger = null;
  var loadToken = 0;

  function collectGallery(name) {
    return Array.prototype.slice.call(
      doc.querySelectorAll('[data-gallery="' + name + '"]')
    );
  }

  function preload(i) {
    if (!gallery.length) return;
    var item = gallery[(i + gallery.length) % gallery.length];
    var url = item.getAttribute("data-full");
    if (!url) return;
    var img = new Image();
    img.src = url;
  }

  function showItem(i) {
    if (!dialog || !lbImage || !gallery.length) return;
    index = (i + gallery.length) % gallery.length;
    var item = gallery[index];
    var full = item.getAttribute("data-full");
    var cap = item.getAttribute("data-caption") || "";
    var inner = item.querySelector("img");
    var alt = inner ? inner.getAttribute("alt") || "" : cap;
    var token = ++loadToken;

    lbImage.classList.add("is-loading");
    lbImage.alt = alt;
    if (lbCaption) lbCaption.textContent = cap;
    if (lbCount) {
      lbCount.textContent =
        String(index + 1).padStart(2, "0") +
        " / " +
        String(gallery.length).padStart(2, "0");
    }

    var done = function () {
      if (token !== loadToken) return;
      lbImage.classList.remove("is-loading");
    };

    lbImage.onload = done;
    lbImage.onerror = done;
    lbImage.src = full;

    if (lbImage.complete && lbImage.naturalWidth) {
      done();
    }

    preload(index + 1);
    preload(index - 1);
  }

  function openGallery(name, startIndex, trigger) {
    if (!dialog || !lbImage) return;
    gallery = collectGallery(name);
    if (!gallery.length) return;
    lastTrigger = trigger || null;
    if (!dialog.open) {
      dialog.showModal();
      body.classList.add("no-scroll");
    }
    showItem(startIndex);
    var closeBtn = lbClose || dialog.querySelector("button");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeGallery() {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  doc.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-gallery]");
    if (trigger) {
      var name = trigger.getAttribute("data-gallery");
      var group = collectGallery(name);
      openGallery(name, group.indexOf(trigger), trigger);
      return;
    }
    var opener = event.target.closest("[data-open]");
    if (opener) {
      openGallery(opener.getAttribute("data-open"), 0, opener);
    }
  });

  if (dialog) {
    dialog.addEventListener("close", function () {
      body.classList.remove("no-scroll");
      if (lbImage) {
        lbImage.removeAttribute("src");
        lbImage.alt = "";
      }
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    });

    dialog.addEventListener("cancel", function () {
      body.classList.remove("no-scroll");
    });

    if (lbClose) {
      lbClose.addEventListener("click", closeGallery);
    }

    if (lbPrev) {
      lbPrev.addEventListener("click", function () {
        showItem(index - 1);
      });
    }

    if (lbNext) {
      lbNext.addEventListener("click", function () {
        showItem(index + 1);
      });
    }

    if (lbStage) {
      lbStage.addEventListener("click", function (event) {
        if (event.target === lbStage) closeGallery();
      });
    }

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showItem(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showItem(index + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        showItem(0);
      } else if (event.key === "End") {
        event.preventDefault();
        showItem(gallery.length - 1);
      }
    });

    if (lbStage) {
      var startX = null;
      var startY = null;

      lbStage.addEventListener(
        "touchstart",
        function (event) {
          if (event.touches.length !== 1) return;
          startX = event.touches[0].clientX;
          startY = event.touches[0].clientY;
        },
        { passive: true }
      );

      lbStage.addEventListener(
        "touchend",
        function (event) {
          if (startX === null || !event.changedTouches.length) return;
          var dx = event.changedTouches[0].clientX - startX;
          var dy = event.changedTouches[0].clientY - startY;
          startX = null;
          startY = null;
          if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy)) return;
          showItem(index + (dx < 0 ? 1 : -1));
        },
        { passive: true }
      );
    }
  }

  /* ---------------------------------------------------------
     graceful image fade (only when the browser has the image)
     --------------------------------------------------------- */

  var images = Array.prototype.slice.call(doc.querySelectorAll("main img, .footer img"));
  images.forEach(function (img) {
    if (img.complete && img.naturalWidth) {
      img.classList.add("is-loaded");
    } else {
      img.addEventListener("load", function () {
        img.classList.add("is-loaded");
      });
      img.addEventListener("error", function () {
        img.classList.add("is-loaded");
      });
    }
  });
})();
