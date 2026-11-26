import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Direction, LogicalPlacement, PhysicalPlacement } from '../src'
import { resolvePlacement, toLogicalPlacement } from '../src'

// Each direction column contains every PhysicalPlacement exactly once.
const placements = [
  ['top', 'top', 'top'],
  ['top-start', 'top-start', 'top-end'],
  ['top-end', 'top-end', 'top-start'],
  ['bottom', 'bottom', 'bottom'],
  ['bottom-start', 'bottom-start', 'bottom-end'],
  ['bottom-end', 'bottom-end', 'bottom-start'],
  ['inline-start', 'left', 'right'],
  ['inline-start-start', 'left-start', 'right-start'],
  ['inline-start-end', 'left-end', 'right-end'],
  ['inline-end', 'right', 'left'],
  ['inline-end-start', 'right-start', 'left-start'],
  ['inline-end-end', 'right-end', 'left-end'],
] as const satisfies ReadonlyArray<readonly [LogicalPlacement, PhysicalPlacement, PhysicalPlacement]>

const directions: Direction[] = ['ltr', 'rtl']

afterEach(() => vi.unstubAllEnvs())

describe.each(directions)('placement in %s', (dir) => {
  it.each(placements)('maps %s and round-trips in both directions', (logical, ltr, rtl) => {
    const physical = dir === 'ltr' ? ltr : rtl
    expect(resolvePlacement(logical, dir)).toBe(physical)
    expect(toLogicalPlacement(physical, dir)).toBe(logical)
    expect(toLogicalPlacement(resolvePlacement(logical, dir), dir)).toBe(logical)
    expect(resolvePlacement(toLogicalPlacement(physical, dir), dir)).toBe(physical)
  })

  it.each(['left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'] as const)(
    'passes %s through unchanged',
    physical => expect(resolvePlacement(physical, dir)).toBe(physical),
  )
})

describe('invalid placements', () => {
  const invalid = ['', 'constructor', 'top-middle', 'inline', 'inline-start-center', 'right-start-end', 'left\n']

  it.each(invalid)('throws TypeError in development for %j', (value) => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => resolvePlacement(value as LogicalPlacement, 'rtl')).toThrow(TypeError)
    expect(() => toLogicalPlacement(value as PhysicalPlacement, 'rtl')).toThrow(TypeError)
  })

  it.each(invalid)('falls back to bottom in production for %j', (value) => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(resolvePlacement(value as LogicalPlacement, 'rtl')).toBe('bottom')
    expect(toLogicalPlacement(value as PhysicalPlacement, 'rtl')).toBe('bottom')
  })
})
