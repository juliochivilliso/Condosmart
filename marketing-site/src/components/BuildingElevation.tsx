const COLS = 4
const ROWS = 6
const WIN_W = 34
const WIN_H = 26
const GAP_X = 18
const GAP_Y = 16
const GRID_LEFT = 70
const GRID_TOP = 70
const HIGHLIGHT_COL = 2
const HIGHLIGHT_ROW = 2

export default function BuildingElevation() {
  const windows = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = GRID_LEFT + col * (WIN_W + GAP_X)
      const y = GRID_TOP + row * (WIN_H + GAP_Y)
      const isHighlighted = col === HIGHLIGHT_COL && row === HIGHLIGHT_ROW
      windows.push(
        <rect
          key={`${row}-${col}`}
          x={x}
          y={y}
          width={WIN_W}
          height={WIN_H}
          fill={isHighlighted ? "hsl(var(--primary))" : "none"}
          fillOpacity={isHighlighted ? 0.9 : 1}
          stroke="currentColor"
          strokeWidth={1.5}
        />
      )
    }
  }

  const highlightX = GRID_LEFT + HIGHLIGHT_COL * (WIN_W + GAP_X) + WIN_W
  const highlightY = GRID_TOP + HIGHLIGHT_ROW * (WIN_H + GAP_Y) + WIN_H / 2

  return (
    <svg
      viewBox="0 0 420 480"
      className="blueprint-draw h-auto w-full max-w-md text-foreground"
      role="img"
      aria-label="Plano de fachada de un edificio residencial, con la unidad 302 y la administración señaladas"
    >
      {/* Building outline */}
      <rect
        x="50"
        y="40"
        width={GRID_LEFT - 50 + COLS * (WIN_W + GAP_X) + 20}
        height="380"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />

      {/* Roof parapet ticks */}
      <line x1="50" y1="40" x2="34" y2="24" stroke="currentColor" strokeWidth={1.5} />
      <line x1="342" y1="40" x2="358" y2="24" stroke="currentColor" strokeWidth={1.5} />

      {/* Windows grid */}
      {windows}

      {/* Ground floor entrance */}
      <rect x="176" y="360" width="70" height="60" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <line x1="211" y1="360" x2="211" y2="420" stroke="currentColor" strokeWidth={1} strokeDasharray="3 4" />

      {/* Base measurement ticks */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={i}
          x1={50 + i * 37}
          y1="430"
          x2={50 + i * 37}
          y2="438"
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.5}
        />
      ))}
      <line x1="50" y1="430" x2="392" y2="430" stroke="currentColor" strokeWidth={1} opacity={0.5} />

      {/* Callout: Unidad 302 */}
      <line
        x1={highlightX}
        y1={highlightY}
        x2="400"
        y2={highlightY - 20}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.7}
      />
      <circle cx={highlightX} cy={highlightY} r={2.5} fill="currentColor" />
      <text x="400" y={highlightY - 26} textAnchor="end" className="font-mono" fontSize="11" fill="currentColor" opacity={0.85}>
        UNIDAD 302
      </text>

      {/* Callout: Administración */}
      <line x1="246" y1="385" x2="20" y2="460" stroke="currentColor" strokeWidth={1} opacity={0.7} />
      <circle cx="246" cy="385" r={2.5} fill="currentColor" />
      <text x="20" y="472" textAnchor="start" className="font-mono" fontSize="11" fill="currentColor" opacity={0.85}>
        ADMINISTRACIÓN
      </text>
    </svg>
  )
}
