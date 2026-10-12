/** Marca: cuerda que cuelga, aro al final y ondas de señal. Legible a 16 y a 64 px. */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M26 0V38" stroke="var(--text)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="26" cy="47" r="9" stroke="var(--signal-text)" strokeWidth="5" />
      <path d="M42 36c4 3.5 4 11.5 0 15" stroke="var(--signal-text)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M50 30c7 7 7 21 0 27" stroke="var(--signal-text)" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={32} />
      <span className="font-display text-xl font-bold tracking-tight">pullcord</span>
    </span>
  );
}
