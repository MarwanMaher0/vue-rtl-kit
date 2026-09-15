import { describe, expect, it } from 'vitest'
import {
  LRI,
  PDI,
  RLI,
  classifyChar,
  detectDirection,
  hasRtlCharacters,
  isMixedDirection,
  isolate,
  isolateRuns,
  splitBidiRuns,
  stripBidiControls,
} from '../src/bidi'

describe('classifyChar', () => {
  it('separates Arabic letters from Arabic-Indic digits', () => {
    expect(classifyChar('م')).toBe('R')
    expect(classifyChar('٥')).toBe('AN')
    expect(classifyChar('5')).toBe('EN')
    expect(classifyChar('a')).toBe('L')
    expect(classifyChar('-')).toBe('N')
  })
})

describe('detectDirection', () => {
  it('uses the first strong character, like dir="auto"', () => {
    expect(detectDirection('مرحبا world')).toBe('rtl')
    expect(detectDirection('Hello عالم')).toBe('ltr')
  })

  it('ignores leading digits and punctuation', () => {
    expect(detectDirection('2024 - مرحبا')).toBe('rtl')
  })

  it('falls back when there is no strong character', () => {
    expect(detectDirection('123 -- 456')).toBe('ltr')
    expect(detectDirection('123', 'rtl')).toBe('rtl')
  })
})

describe('splitBidiRuns', () => {
  it('isolates a hyphenated date inside Arabic', () => {
    const runs = splitBidiRuns('آخر تحديث 12-05-2024', 'rtl')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.text).toBe('12-05-2024')
    expect(isolated[0]!.dir).toBe('ltr')
  })

  it('keeps a bare number unisolated - it reads the same either way', () => {
    const runs = splitBidiRuns('عام 2024', 'rtl')
    expect(runs.some(run => run.isolated)).toBe(false)
  })

  it('isolates a space-separated number group, which does reorder', () => {
    const runs = splitBidiRuns('الهاتف 100 123 4567', 'rtl')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.text).toBe('100 123 4567')
  })

  it('merges neutral characters between same-direction runs', () => {
    const runs = splitBidiRuns('المطور John Smith هنا', 'rtl')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.text).toBe('John Smith')
  })

  it('leaves boundary punctuation in the base direction', () => {
    const runs = splitBidiRuns('زر GitHub، ثم عد', 'rtl')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated[0]!.text).toBe('GitHub')
    expect(runs.map(run => run.text).join('')).toBe('زر GitHub، ثم عد')
  })

  it('isolates Arabic inside an LTR paragraph', () => {
    const runs = splitBidiRuns('The word مرحبا means hello', 'ltr')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.dir).toBe('rtl')
    expect(isolated[0]!.hasStrong).toBe(true)
  })

  it('reproduces the input exactly when runs are concatenated', () => {
    const input = 'رقم الطلب #4821-B صدر في 12/05/2024 عبر api.example.com/orders'
    expect(splitBidiRuns(input, 'rtl').map(run => run.text).join('')).toBe(input)
  })

  it('returns no runs for an empty string', () => {
    expect(splitBidiRuns('', 'rtl')).toEqual([])
  })

  it('isolates a URL as a single run', () => {
    const runs = splitBidiRuns('زوروا example.com/ar/pricing اليوم', 'rtl')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.text).toBe('example.com/ar/pricing')
  })
})

describe('isolate', () => {
  it('wraps with FSI by default', () => {
    expect(isolate('مرحبا')).toBe(`⁨مرحبا${PDI}`)
  })

  it('wraps with an explicit direction', () => {
    expect(isolate('abc', 'ltr')).toBe(`${LRI}abc${PDI}`)
    expect(isolate('abc', 'rtl')).toBe(`${RLI}abc${PDI}`)
  })

  it('leaves an empty string empty', () => {
    expect(isolate('')).toBe('')
  })
})

describe('isolateRuns', () => {
  it('inserts LRI/PDI around the reordering run only', () => {
    expect(isolateRuns('تم في 12-05-2024', 'rtl')).toBe(`تم في ${LRI}12-05-2024${PDI}`)
  })

  it('is idempotent - existing controls are stripped first', () => {
    const once = isolateRuns('تم في 12-05-2024', 'rtl')
    expect(isolateRuns(once, 'rtl')).toBe(once)
  })

  it('leaves single-direction text untouched', () => {
    expect(isolateRuns('نص عربي خالص', 'rtl')).toBe('نص عربي خالص')
  })
})

describe('helpers', () => {
  it('detects RTL characters and mixed direction', () => {
    expect(hasRtlCharacters('مرحبا')).toBe(true)
    expect(hasRtlCharacters('hello')).toBe(false)
    expect(isMixedDirection('مرحبا world')).toBe(true)
    expect(isMixedDirection('مرحبا 2024')).toBe(false)
  })

  it('strips every bidi control character', () => {
    expect(stripBidiControls(`‎‪abc‬${RLI}د${PDI}`)).toBe('abcد')
  })
})
