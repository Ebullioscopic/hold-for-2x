const MIN = 1.25, MAX = 4, STEP = 0.25, DEFAULT = 2;
const STEPS = Math.round((MAX - MIN) / STEP);
const MAJOR = [1.25, 2, 3, 4];

const input = document.getElementById("speed");
const dec = document.getElementById("dec");
const inc = document.getElementById("inc");
const ruler = document.getElementById("ruler");
const ticks = document.getElementById("ticks");
const fill = document.getElementById("fill");
const knob = document.getElementById("knob");
const hint = document.getElementById("hint");
const HINT = hint.textContent;

let speed = DEFAULT;
let noteTimer, saveTimer;

const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
const snap = (n) => clamp(MIN + Math.round((n - MIN) / STEP) * STEP);
const fmt = (n) => String(+n.toFixed(2));
const frac = (n) => (n - MIN) / (MAX - MIN);


function say(msg, kind) {
  hint.textContent = msg;
  hint.className = "hint " + kind;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { hint.textContent = HINT; hint.className = "hint"; }, 2200);
}

// ruler ticks: one per 0.25x step, numbers on the major ones
for (let i = 0; i <= STEPS; i++) {
  const v = MIN + i * STEP, left = (i / STEPS) * 100 + "%";
  const tk = document.createElement("div");
  tk.className = "tk" + (MAJOR.includes(v) ? " major" : "");
  tk.style.left = left;
  ticks.appendChild(tk);
  if (MAJOR.includes(v)) {
    const l = document.createElement("div");
    l.className = "rl";
    l.style.left = left;
    l.textContent = fmt(v);
    ticks.appendChild(l);
  }
}

function render(animate) {
  if (document.activeElement !== input) input.value = fmt(speed);
  dec.disabled = speed <= MIN;
  inc.disabled = speed >= MAX;
  const pct = frac(speed) * 100 + "%";
  fill.style.width = pct;
  knob.style.left = pct;
  ruler.setAttribute("aria-valuenow", speed);
  ruler.setAttribute("aria-valuetext", fmt(speed) + "x");
  if (animate) {
    input.classList.remove("settle");
    void input.offsetWidth; // restart the animation
    input.classList.add("settle");
  }
}

function commit(n) {
  if (n > MAX) say("Max is " + fmt(MAX) + "x.", "alert");
  else if (n < MIN) say("Min is " + fmt(MIN) + "x.", "alert");
  const next = clamp(n);
  if (next === speed) { render(false); return; }
  speed = next;
  render(true);
  chrome.storage.local.set({ holdSpeed: speed });
  // confirm once the value stops moving, so dragging doesn't flicker the message
  clearTimeout(saveTimer);
  if (n <= MAX && n >= MIN) saveTimer = setTimeout(() => say("Saved. Your next hold plays at " + fmt(speed) + "x.", "saved"), 350);
}

dec.addEventListener("click", () => commit(speed - STEP));
inc.addEventListener("click", () => commit(speed + STEP));

input.addEventListener("focus", () => input.select());
input.addEventListener("change", () => {
  const n = parseFloat(input.value.replace(",", "."));
  commit(Number.isFinite(n) ? n : speed);
});
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { e.preventDefault(); commit(speed + STEP); }
  else if (e.key === "ArrowDown") { e.preventDefault(); commit(speed - STEP); }
  else if (e.key === "Enter") input.blur();
});

// click or drag along the ruler, snapped to 0.25x
function fromPointer(e) {
  const r = ruler.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  commit(snap(MIN + f * (MAX - MIN)));
}
ruler.addEventListener("pointerdown", (e) => {
  ruler.setPointerCapture(e.pointerId);
  fromPointer(e);
  ruler.addEventListener("pointermove", fromPointer);
});
ruler.addEventListener("pointerup", () => ruler.removeEventListener("pointermove", fromPointer));
ruler.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowRight" || k === "ArrowUp") commit(speed + STEP);
  else if (k === "ArrowLeft" || k === "ArrowDown") commit(speed - STEP);
  else if (k === "Home") commit(MIN);
  else if (k === "End") commit(MAX);
  else return;
  e.preventDefault();
});

chrome.storage.local.get("holdSpeed", (r) => {
  if (r.holdSpeed) speed = clamp(r.holdSpeed);
  render(false);
});

// keep in sync if you change the speed with [ or ] while the popup is open
chrome.storage.onChanged.addListener((c) => {
  if (c.holdSpeed && document.activeElement !== input) {
    speed = clamp(c.holdSpeed.newValue);
    render(false);
  }
});
