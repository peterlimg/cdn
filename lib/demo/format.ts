export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%"
  }

  const rounded = Math.round(value * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

export function formatBytes(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} MB`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} KB`
  }
  return `${value} B`
}
