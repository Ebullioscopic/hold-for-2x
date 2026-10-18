const MIN = 1.25, MAX = 4, STEP = 0.25, DEFAULT = 2;

const input = document.getElementById("speed");
const dec = document.getElementById("dec");
const inc = document.getElementById("inc");

const hint = document.getElementById("hint");
const HINT = hint.textContent;
let noteTimer;
let speed = DEFAULT;

function note(msg) {
  hint.textContent = msg;
  hint.style.color = "var(--text)";
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { hint.textContent = HINT; hint.style.color = ""; }, 2200);
}

const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
const fmt = (n) => String(+n.toFixed(2));
const fit = () => { input.style.width = Math.max(1, input.value.length) + "ch"; };

function render() {
  input.value = fmt(speed);
  fit();
  dec.disabled = speed <= MIN;
  inc.disabled = speed >= MAX;
}

function commit(n) {
  if (n > MAX) note("Max is " + fmt(MAX) + "x.");
  else if (n < MIN) note("Min is " + fmt(MIN) + "x.");
  speed = clamp(n);
  render();
  chrome.storage.local.set({ holdSpeed: speed });
}

dec.addEventListener("click", () => commit(speed - STEP));
inc.addEventListener("click", () => commit(speed + STEP));

input.addEventListener("input", fit);
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

chrome.storage.local.get("holdSpeed", (r) => {
  if (r.holdSpeed) speed = clamp(r.holdSpeed);
  render();
});

// keep in sync if you change the speed with [ or ] while the popup is open
chrome.storage.onChanged.addListener((c) => {
  if (c.holdSpeed && document.activeElement !== input) {
    speed = clamp(c.holdSpeed.newValue);
    render();
  }
});
