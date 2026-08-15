export type WindowBounds = { x: number; y: number; width: number; height: number }
export type SavedWindowBounds = Partial<WindowBounds>
export type WorkAreaDisplay = { workArea: WindowBounds }

export const MIN_WINDOW_WIDTH = 420
export const MIN_WINDOW_HEIGHT = 600
const VISIBLE_TITLEBAR = 64

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function intersectionArea(left: WindowBounds, right: WindowBounds): number {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y))
  return width * height
}

function distanceSquared(left: WindowBounds, right: WindowBounds): number {
  const dx = left.x + left.width < right.x
    ? right.x - (left.x + left.width)
    : right.x + right.width < left.x ? left.x - (right.x + right.width) : 0
  const dy = left.y + left.height < right.y
    ? right.y - (left.y + left.height)
    : right.y + right.height < left.y ? left.y - (right.y + right.height) : 0
  return dx * dx + dy * dy
}

export function matchingDisplay(saved: SavedWindowBounds, displays: WorkAreaDisplay[]): WorkAreaDisplay {
  if (displays.length === 0) throw new Error("No display is available")
  const savedBounds = finite(saved.x) && finite(saved.y) && finite(saved.width) && finite(saved.height)
    ? { x: saved.x, y: saved.y, width: Math.max(1, saved.width), height: Math.max(1, saved.height) }
    : undefined
  if (!savedBounds) return displays[0]
  return displays.reduce((best, candidate) => {
    const bestOverlap = intersectionArea(savedBounds, best.workArea)
    const candidateOverlap = intersectionArea(savedBounds, candidate.workArea)
    if (candidateOverlap > bestOverlap) return candidate
    if (candidateOverlap < bestOverlap) return best
    return distanceSquared(savedBounds, candidate.workArea) < distanceSquared(savedBounds, best.workArea) ? candidate : best
  })
}

export function restoredBounds(state: SavedWindowBounds, displays: WorkAreaDisplay[]): WindowBounds {
  const display = matchingDisplay(state, displays)
  const workArea = display.workArea
  const width = finite(state.width)
    ? Math.min(workArea.width, Math.max(MIN_WINDOW_WIDTH, Math.round(state.width)))
    : Math.min(workArea.width, 1280)
  const height = finite(state.height)
    ? Math.min(workArea.height, Math.max(MIN_WINDOW_HEIGHT, Math.round(state.height)))
    : Math.min(workArea.height, 820)
  const x = finite(state.x)
    ? Math.min(workArea.x + workArea.width - VISIBLE_TITLEBAR, Math.max(workArea.x - width + VISIBLE_TITLEBAR, Math.round(state.x)))
    : workArea.x + Math.round((workArea.width - width) / 2)
  const y = finite(state.y)
    ? Math.min(workArea.y + workArea.height - VISIBLE_TITLEBAR, Math.max(workArea.y - height + VISIBLE_TITLEBAR, Math.round(state.y)))
    : workArea.y + Math.round((workArea.height - height) / 2)
  return { x, y, width, height }
}
