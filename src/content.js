(() => {
  const HOLD_MS = 250;       // how long you hold before the speed-up starts
  const MOVE_LIMIT = 10;     // px of mouse movement that cancels a hold (dragging a seek bar)
  const SAFE_BOTTOM = 0.15;  // bottom 15% of a video is left alone, that's where controls live
  const MIN = 1.25, MAX = 4, STEP = 0.25, DEFAULT = 2;
  const MSG = "hold-for-2x"; // tag on messages between frames

  let holdSpeed = DEFAULT;
  let timer = null, held = false, video = null, prevRate = 1;
  let startX = 0, startY = 0, enforcer = null, swallowClick = false;

  const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
  const fmt = (n) => String(+n.toFixed(2));

  /* ---------- on/off per site ---------- */

  // the site in the address bar, even when this script runs inside an embedded player frame
  const origins = location.ancestorOrigins;
  let topHost = location.hostname;
  try { if (origins && origins.length) topHost = new URL(origins[origins.length - 1]).hostname; } catch (e) {}
  topHost = topHost.replace(/^www\./, "");

  let remembered = false; // "Remember for this site" is on and the site is switched off
  let offThisTab = false; // switched off from the popup until the tab reloads
  const enabled = () => !remembered && !offThisTab;

  chrome.storage.local.get(["holdSpeed", "disabledSites"], (r) => {
    if (r.holdSpeed) holdSpeed = clamp(r.holdSpeed);
    remembered = (r.disabledSites || []).includes(topHost);
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.holdSpeed) holdSpeed = clamp(c.holdSpeed.newValue);
    if (c.disabledSites) {
      remembered = (c.disabledSites.newValue || []).includes(topHost);
      if (!enabled()) stopAll();
    }
  });

  /* ---------- on-screen badge (lives in a shadow root so site CSS can't touch it) ---------- */

  let host = null, pill = null, label = null, hideTimer = null, removeTimer = null;

  function buildBadge() {
    host = document.createElement("div");
    host.style.cssText =
      "all:initial;position:fixed;top:24px;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;pointer-events:none;";
    const root = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent =
      ".pill{display:flex;align-items:center;gap:8px;padding:8px 14px 8px 12px;border-radius:999px;" +
      "background:rgba(20,23,29,.85);color:#fff;font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "font-variant-numeric:tabular-nums;opacity:0;transition:opacity .12s ease}" +
      ".pill.on{opacity:1}" +
      "svg{width:14px;height:14px;fill:#fff;flex:none}" +
      "@media (prefers-reduced-motion:reduce){.pill{transition:none}}";

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M1 2.5v11l7-5.5zM8 2.5v11l7-5.5z");
    svg.appendChild(path);

    label = document.createElement("span");
    pill = document.createElement("div");
    pill.className = "pill";
    pill.append(svg, label);
    root.append(style, pill);
  }

  function showBadge(text, sticky) {
    if (!host) buildBadge();
    label.textContent = text;
    clearTimeout(hideTimer);
    clearTimeout(removeTimer);
    const fs = document.fullscreenElement;
    const parent = fs && fs.tagName !== "VIDEO" ? fs : document.documentElement;
    if (host.parentNode !== parent) parent.appendChild(host);
    requestAnimationFrame(() => pill.classList.add("on"));
    if (!sticky) hideTimer = setTimeout(hideBadge, 900);
  }

  function hideBadge() {
    if (!host) return;
    clearTimeout(hideTimer);
    pill.classList.remove("on");
    removeTimer = setTimeout(() => host.remove(), 160);
  }

  /* ---------- finding the video ---------- */

  function findVideos(root, out) {
    root.querySelectorAll("video").forEach((v) => out.push(v));
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) findVideos(el.shadowRoot, out);
    });
    return out;
  }

  // the video under the cursor, even when an overlay sits on top of it
  function videoAt(x, y) {
    let best = null, bestArea = 0;
    for (const v of findVideos(document, [])) {
      const r = v.getBoundingClientRect();
      if (r.width < 100 || r.height < 100) continue;
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      if (y > r.bottom - r.height * SAFE_BOTTOM) continue;
      const area = r.width * r.height;
      if (area > bestArea) { best = v; bestArea = area; }
    }
    // fallback: a big playing video that covers most of the page
    if (!best && y < window.innerHeight * (1 - SAFE_BOTTOM)) {
      for (const v of findVideos(document, [])) {
        const r = v.getBoundingClientRect();
        const area = r.width * r.height;
        if (!v.paused && area > window.innerWidth * window.innerHeight * 0.4 && area > bestArea) {
          best = v; bestArea = area;
        }
      }
    }
    return best;
  }

  // the biggest video currently on screen
  function mainVideo() {
    let best = null, bestArea = 0;
    for (const v of findVideos(document, [])) {
      const r = v.getBoundingClientRect();
      const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (w < 100 || h < 100) continue;
      if (w * h > bestArea) { best = v; bestArea = w * h; }
    }
    return best;
  }

  // a real video (loaded or loading), not an empty placeholder element
  const hasRealVideo = () => findVideos(document, []).some((v) => v.readyState > 0 || v.currentSrc);

  /* ---------- hold to speed up ---------- */

  function startHold() {
    timer = null;
    if (!video || video.paused || !enabled()) return;
    held = true;
    prevRate = video.playbackRate;
    video.playbackRate = holdSpeed;
    // players sometimes reset the speed on their own, so keep it pinned while held
    enforcer = setInterval(() => {
      if (video && video.playbackRate !== holdSpeed) video.playbackRate = holdSpeed;
    }, 150);
    showBadge(fmt(holdSpeed) + "x", true);
  }

  function release(skipSwallow) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (held) {
      clearInterval(enforcer);
      if (video) video.playbackRate = prevRate;
      hideBadge();
      held = false;
      if (!skipSwallow) {
        swallowClick = true; // the release shouldn't count as a click (it would pause the video)
        setTimeout(() => { swallowClick = false; }, 300);
      }
    }
    video = null;
  }

  function stopAll() {
    release(true);
    spaceDown = false;
    relayTargets = [];
  }

  window.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !enabled()) return;
    if (e.target.closest && e.target.closest("input,select,textarea,[role=slider]")) return;
    const v = videoAt(e.clientX, e.clientY);
    if (!v || v.paused) return;
    video = v;
    startX = e.clientX; startY = e.clientY;
    timer = setTimeout(startHold, HOLD_MS);
  }, true);

  window.addEventListener("mousemove", (e) => {
    if (timer && Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_LIMIT) {
      clearTimeout(timer); timer = null; video = null;
    }
  }, true);

  window.addEventListener("pointerup", (e) => {
    if (held) e.stopPropagation();
  }, true);

  window.addEventListener("mouseup", (e) => {
    if (spaceDown) return; // a click during a space hold shouldn't end it
    const was = held;
    release();
    if (was) e.stopPropagation();
  }, true);

  window.addEventListener("click", (e) => {
    if (swallowClick) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  window.addEventListener("blur", stopAll);

  /* ---------- hold the space bar, same as holding the mouse ---------- */

  let spaceDown = false;
  let relayTargets = []; // child frames the current space press was handed to

  const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  // Embedded players live in iframes. Each frame tells its parent whether it has a video,
  // so the parent can hand the space bar down when the key lands outside the player frame.
  const childFrames = new Map(); // child window -> has a video
  function framesWithVideo() {
    const out = [];
    for (const [win, has] of childFrames) if (has && !win.closed) out.push(win);
    return out;
  }

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.tag !== MSG) return;
    if (d.kind === "video" && e.source && e.source !== window) {
      childFrames.set(e.source, !!d.has);
      reportUp();
    } else if (d.kind === "space" && e.source === window.parent && enabled()) {
      if (d.phase === "down") spaceStart();
      else spaceEnd();
    }
  });

  let lastReported = null;
  function reportUp() {
    if (window === window.top) return;
    const has = !!mainVideo() || framesWithVideo().length > 0;
    if (has === lastReported) return;
    lastReported = has;
    window.parent.postMessage({ tag: MSG, kind: "video", has }, "*");
  }
  if (window !== window.top) {
    setInterval(reportUp, 1500);
    window.addEventListener("load", reportUp);
  }

  // returns true if this frame (or a child frame) took the press
  function spaceStart() {
    const v = mainVideo();
    if (v) {
      spaceDown = true;
      video = v;
      timer = setTimeout(startHold, HOLD_MS);
      return true;
    }
    const kids = framesWithVideo();
    if (!kids.length) return false;
    spaceDown = true;
    relayTargets = kids;
    kids.forEach((w) => w.postMessage({ tag: MSG, kind: "space", phase: "down" }, "*"));
    return true;
  }

  function spaceEnd() {
    if (!spaceDown) return;
    spaceDown = false;
    if (relayTargets.length) {
      relayTargets.forEach((w) => w.postMessage({ tag: MSG, kind: "space", phase: "up" }, "*"));
      relayTargets = [];
      return;
    }
    const v = video;
    const wasHeld = held;
    release(true);
    // a quick tap still plays or pauses, like the space bar always did
    if (!wasHeld && v) {
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (isTyping(e.target) || !enabled()) return;
    if (spaceDown) { e.preventDefault(); e.stopImmediatePropagation(); return; } // key repeat while we own the press
    if (!spaceStart()) return; // no video here, so space scrolls the page as usual
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space" || !spaceDown) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    spaceEnd();
  }, true);

  /* ---------- keyboard: [ slower, ] faster ---------- */

  window.addEventListener("keydown", (e) => {
    const t = e.target;
    if (isTyping(t) || !enabled()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key !== "]" && e.key !== "[") return;
    holdSpeed = clamp(holdSpeed + (e.key === "]" ? STEP : -STEP));
    chrome.storage.local.set({ holdSpeed });
    showBadge(fmt(holdSpeed) + "x", held);
  }, true);

  /* ---------- popup asks about this tab ---------- */

  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (!msg || msg.tag !== MSG) return;
    if (msg.kind === "status") {
      // only frames with a real video answer, so the popup shows the switch on video sites only
      if (!hasRealVideo()) return;
      reply({ host: topHost, offThisTab, remembered });
    } else if (msg.kind === "set-tab") {
      offThisTab = !msg.on;
      if (!enabled()) stopAll();
    }
  });
})();
