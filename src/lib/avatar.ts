const PALETTE = [
  ["#f97316", "#ef4444"], ["#3b82f6", "#8b5cf6"], ["#10b981", "#06b6d4"],
  ["#ec4899", "#f43f5e"], ["#a855f7", "#6366f1"], ["#14b8a6", "#0ea5e9"],
  ["#eab308", "#f97316"], ["#84cc16", "#22c55e"],
]

export function avatarGradient(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length] as [string, string]
}

export function initials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
