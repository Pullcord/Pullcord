// Letrero de matriz de puntos LED (5x7). Solo las letras que usamos.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
};

const CELL = 6; // 5 columnas + 1 de espacio entre letras
const ROW = 9; // 7 filas + 2 de espacio entre líneas

/** `lines` se dibujan una bajo otra. Apagado: puntos tenues. Encendido: ámbar con brillo. */
export function LedSign({ lines, lit, label }: { lines: string[]; lit: boolean; label?: string }) {
  const cols = Math.max(...lines.map((l) => l.length)) * CELL - 1;
  const rows = lines.length * ROW - 2;
  const dots: { x: number; y: number; on: boolean }[] = [];
  lines.forEach((line, li) => {
    const offset = Math.floor((cols - (line.length * CELL - 1)) / 2);
    [...line].forEach((ch, ci) => {
      const glyph = FONT[ch];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          dots.push({ x: offset + ci * CELL + c, y: li * ROW + r, on: glyph ? glyph[r][c] === "1" : false });
        }
      }
    });
  });
  return (
    <div role="img" aria-label={label ?? lines.join(" ")} className="inline-block max-w-full rounded-xl border border-line bg-[#07080c] p-3 sm:p-4">
      <svg viewBox={`-1 -1 ${cols + 2} ${rows + 2}`} className="block w-full" style={{ maxWidth: 440 }} aria-hidden="true">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x + 0.5}
            cy={d.y + 0.5}
            r={0.4}
            fill={d.on ? (lit ? "#FFB547" : "#3a3f4d") : "#12151d"}
            style={{ transition: "fill 0.35s", ...(lit && d.on ? { filter: "drop-shadow(0 0 0.35px #FFB547)" } : {}) }}
          />
        ))}
      </svg>
    </div>
  );
}
