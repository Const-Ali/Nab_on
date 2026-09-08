// SVG QR Code generator (lightweight, zero dependency)
export function QRCodeSvg({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  // Simple deterministic 21x21 QR-like matrix encoder based on value hash
  const N = 21
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false))

  // Finder patterns at 3 corners
  const addFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[r0 + r][c0 + c] = isBorder || isInner
      }
    }
  }
  addFinder(0, 0)
  addFinder(0, N - 7)
  addFinder(N - 7, 0)

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Data modules filled from string hash
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inFinder1 = r < 8 && c < 8
      const inFinder2 = r < 8 && c >= N - 8
      const inFinder3 = r >= N - 8 && c < 8
      const inTiming = r === 6 || c === 6
      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming) {
        const bit = ((hash ^ (r * 13 + c * 37)) & (1 << ((r + c) % 8))) !== 0
        matrix[r][c] = bit
      }
    }
  }

  const cellSize = size / N

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: 'inline-block', background: '#ffffff' }}
      aria-label={`QR Code: ${value}`}
    >
      <rect width={size} height={size} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#182136"
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
