import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./pitch.css";

const slides = [...document.querySelectorAll(".slide")];
const total = slides.length;
const bar = document.querySelector(".progress-bar");
const cur = document.querySelector(".counter-cur");
const panel = document.querySelector(".notes-panel");
const meta = panel.querySelector(".notes-meta");
const text = panel.querySelector(".notes-text");
document.querySelector(".counter-total").textContent = String(total);

const secs = slides.map((s) => Number(s.querySelector(".notes")?.dataset.sec || 0));
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const totalSecs = secs.reduce((a, b) => a + b, 0);

let index = 0;

function fromHash() {
  const n = Number.parseInt(location.hash.slice(1), 10);
  return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0;
}

function show(i) {
  index = Math.max(0, Math.min(total - 1, i));
  slides.forEach((s, k) => {
    s.classList.toggle("is-active", k === index);
    s.classList.toggle("is-before", k < index);
    s.setAttribute("aria-hidden", k === index ? "false" : "true");
    s.inert = k !== index;
  });
  bar.style.width = `${((index + 1) / total) * 100}%`;
  cur.textContent = String(index + 1);
  if (location.hash !== `#${index + 1}`) history.replaceState(null, "", `#${index + 1}`);
  const upTo = secs.slice(0, index + 1).reduce((a, b) => a + b, 0);
  meta.textContent = `Diapositiva ${index + 1} de ${total} · ~${secs[index]} s · acumulado ${fmt(upTo)} de ${fmt(totalSecs)}`;
  text.textContent = slides[index].querySelector(".notes")?.textContent.trim() ?? "";
}

const next = () => show(index + 1);
const prev = () => show(index - 1);

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  switch (e.key) {
    case "ArrowRight":
    case "ArrowDown":
    case "PageDown":
      e.preventDefault();
      next();
      break;
    case " ":
      e.preventDefault();
      e.shiftKey ? prev() : next();
      break;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      e.preventDefault();
      prev();
      break;
    case "Home":
      show(0);
      break;
    case "End":
      show(total - 1);
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    case "n":
    case "N":
      panel.hidden = !panel.hidden;
      break;
  }
});

// Click: the left third goes back, the rest goes forward. Links and the notes panel keep their own behavior.
document.addEventListener("click", (e) => {
  if (e.target.closest("a, button, .notes-panel")) return;
  if (window.getSelection()?.toString()) return;
  e.clientX < window.innerWidth / 3 ? prev() : next();
});

let touch = null;
document.addEventListener("touchstart", (e) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    dx < 0 ? next() : prev();
  }
}, { passive: true });

window.addEventListener("hashchange", () => show(fromHash()));
show(fromHash());
