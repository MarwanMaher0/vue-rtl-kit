import type { Direction } from './types'

type Placement<Side extends string> = Side | `${Side}-${'start' | 'end'}`

/** Placement relative to the inline direction in a horizontal writing mode. */
export type LogicalPlacement = Placement<'top' | 'bottom' | 'inline-start' | 'inline-end'>

/** Placement with physical sides and alignment, in Floating UI string syntax. */
export type PhysicalPlacement = Placement<'top' | 'bottom' | 'left' | 'right'>

const PLACEMENT = /^(top|bottom|left|right|inline-start|inline-end)(-start|-end)?$/

function invalidPlacement(placement: string): 'bottom' {
  try {
    // Keep NODE_ENV available to Node and to the consuming bundler.
    if (process.env.NODE_ENV === 'production') return 'bottom'
  }
  catch {
    // The standalone browser build has no process global.
    return 'bottom'
  }
  throw new TypeError(`[vue-rtl-kit] Invalid placement: ${JSON.stringify(placement)}`)
}

function physicalAlignment(alignment: string, dir: Direction): string {
  if (!alignment || dir === 'ltr') return alignment
  return alignment === '-start' ? '-end' : '-start'
}

/** Resolve a logical placement. Explicit `left` and `right` placements pass through. */
export function resolvePlacement(placement: LogicalPlacement | PhysicalPlacement, dir: Direction): PhysicalPlacement {
  const match = PLACEMENT.exec(placement)
  if (!match) return invalidPlacement(placement)
  const [, side, alignment = ''] = match
  switch (side) {
    case 'inline-start': return `${dir === 'rtl' ? 'right' : 'left'}${alignment}` as PhysicalPlacement
    case 'inline-end': return `${dir === 'rtl' ? 'left' : 'right'}${alignment}` as PhysicalPlacement
    case 'top':
    case 'bottom': return `${side}${physicalAlignment(alignment, dir)}` as PhysicalPlacement
    default: return placement as PhysicalPlacement
  }
}

/** Convert a physical placement to the logical placement that resolves to it in `dir`. */
export function toLogicalPlacement(physical: PhysicalPlacement, dir: Direction): LogicalPlacement {
  const match = PLACEMENT.exec(physical)
  if (!match) return invalidPlacement(physical)
  const [, side, alignment = ''] = match
  switch (side) {
    case 'left': return `inline-${dir === 'rtl' ? 'end' : 'start'}${alignment}` as LogicalPlacement
    case 'right': return `inline-${dir === 'rtl' ? 'start' : 'end'}${alignment}` as LogicalPlacement
    case 'top':
    case 'bottom': return `${side}${physicalAlignment(alignment, dir)}` as LogicalPlacement
    default: return invalidPlacement(physical)
  }
}
