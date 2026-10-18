(() => {
  const HOLD_MS = 250;       // how long you hold before the speed-up starts
  const MOVE_LIMIT = 10;     // px of mouse movement that cancels a hold (dragging a seek bar)
  const SAFE_BOTTOM = 0.15;  // bottom 15% of a video is left alone, that's where controls live
  const MIN = 1.25, MAX = 4, STEP = 0.25, DEFAULT = 2;

  let holdSpeed = DEFAULT;
  let timer = null, held = false, video = null, prevRate = 1;
  let startX = 0, startY = 0, enforcer = null, swallowClick = false;

  const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
  const fmt = (n) => String(+n.toFixed(2));

  chrome.storage.local.get("holdSpeed", (r) => {
    if (r.holdSpeed) holdSpeed = clamp(r.holdSpeed);
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.holdSpeed) holdSpeed = clamp(c.holdSpeed.newValue);
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

  /* ---------- hold to speed up ---------- */

  function startHold() {
    timer = null;
    if (!video || video.paused) return;
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

  window.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
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
    const was = held;
    release();
    if (was) e.stopPropagation();
  }, true);

  window.addEventListener("click", (e) => {
    if (swallowClick) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  window.addEventListener("blur", () => { release(true); spaceDown = false; });

  /* ---------- hold the space bar, same as holding the mouse ---------- */

  let spaceDown = false;

  const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

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

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (isTyping(e.target)) return;
    if (spaceDown) { e.preventDefault(); e.stopImmediatePropagation(); return; } // key repeat while we own the press
    const v = mainVideo();
    if (!v) return; // no video here, so space scrolls the page as usual
    e.preventDefault();
    e.stopImmediatePropagation();
    spaceDown = true;
    video = v;
    timer = setTimeout(startHold, HOLD_MS);
  }, true);

  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space" || !spaceDown) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const v = video;
    const wasHeld = held;
    release(true);
    spaceDown = false;
    // a quick tap still plays or pauses, like the space bar always did
    if (!wasHeld && v) {
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    }
  }, true);

  /* ---------- keyboard: [ slower, ] faster ---------- */

  window.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key !== "]" && e.key !== "[") return;
    holdSpeed = clamp(holdSpeed + (e.key === "]" ? STEP : -STEP));
    chrome.storage.local.set({ holdSpeed });
    showBadge(fmt(holdSpeed) + "x", held);
  }, true);
})();
