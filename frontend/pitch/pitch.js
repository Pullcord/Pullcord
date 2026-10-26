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

// Letrero LED de puntos 5x7, mismos glifos que src/components/LedSign.tsx (más la N).
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
};
const SVG = "http://www.w3.org/2000/svg";

function drawLed(el, lines, lit) {
  const cols = Math.max(...lines.map((l) => l.length)) * 6 - 1;
  const rows = lines.length * 9 - 2;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `-1 -1 ${cols + 2} ${rows + 2}`);
  svg.setAttribute("aria-hidden", "true");
  lines.forEach((line, li) => {
    const offset = Math.floor((cols - (line.length * 6 - 1)) / 2);
    [...line].forEach((ch, ci) => {
      const glyph = FONT[ch];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          const on = glyph ? glyph[r][c] === "1" : false;
          const dot = document.createElementNS(SVG, "circle");
          dot.setAttribute("cx", offset + ci * 6 + c + 0.5);
          dot.setAttribute("cy", li * 9 + r + 0.5);
          dot.setAttribute("r", 0.4);
          dot.setAttribute("fill", on ? (lit ? "#FFB547" : "#3a3f4d") : "#12151d");
          if (lit && on) dot.style.filter = "drop-shadow(0 0 0.35px #FFB547)";
          svg.append(dot);
        }
      }
    });
  });
  el.replaceChildren(svg);
}

const leds = [...document.querySelectorAll(".led")];
for (const el of leds) {
  const lit = el.dataset.lit === "1";
  drawLed(el, (lit ? el.dataset.on : el.dataset.off).split("|"), lit);
}

// La cuerda de la portada: jalarla (o Enter) enciende el letrero, como en el sitio.
const titleLed = document.querySelector(".led-title");
const rope = document.querySelector(".rope");
const ring = document.querySelector(".rope-ring");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let lit = false;

function pullCord() {
  lit = !lit;
  drawLed(titleLed, (lit ? titleLed.dataset.on : titleLed.dataset.off).split("|"), lit);
  titleLed.setAttribute("aria-label", lit ? "Letrero: aviso solicitado" : "Letrero: parada solicitada, apagado");
}

let drag = null;
let dragged = false;
const slideTitle = document.querySelector(".slide-title");
ring.addEventListener("pointerdown", (e) => {
  dragged = false;
  if (reduced) return;
  drag = { y: e.clientY, id: e.pointerId };
  ring.setPointerCapture(e.pointerId);
  rope.classList.remove("is-back");
});
ring.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = Math.max(0, Math.min(160, e.clientY - drag.y));
  if (dy > 4) dragged = true;
  slideTitle.style.setProperty("--pull", `${dy * 0.85}px`);
});
const release = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = e.clientY - drag.y;
  drag = null;
  rope.classList.add("is-back");
  slideTitle.style.setProperty("--pull", "0px");
  if (dy > 50) pullCord();
};
ring.addEventListener("pointerup", release);
ring.addEventListener("pointercancel", release);
ring.addEventListener("click", () => {
  if (!dragged) pullCord();
  dragged = false;
});

// Tema: mismo interruptor y misma clave que el sitio.
document.querySelector(".theme").addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const nextTheme = current === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  try {
    localStorage.setItem("pullcord-theme", nextTheme);
  } catch {}
});

function show(i) {
  index = Math.max(0, Math.min(total - 1, i));
  document.body.dataset.slide = String(index + 1);
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
  // Enter o Espacio sobre un botón o un link hacen lo de ese control, no cambian de diapositiva.
  if ((e.key === " " || e.key === "Enter") && e.target.closest?.("button, a")) return;
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
