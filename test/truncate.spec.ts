/**
 * Grapheme-aware truncation. Real Arabic (tashkeel, lam-alef, Arabic-Indic
 * digits, tatweel), Persian, Hebrew (niqqud), emoji ZWJ sequences and flags,
 * mixed Arabic/English, word mode, the no-Intl.Segmenter fallback, and the
 * development/production contract for an invalid maxLength.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FSI, PDI } from '../src/bidi'
import { truncateText } from '../src/truncate'

const ELLIPSIS = '\u2026'

function graphemes(text: string, locale?: string): string[] {
  return Array.from(new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text), part => part.segment)
}

/** Run `fn` with Intl.Segmenter stubbed away, then restore the original. */
function withoutSegmenter(fn: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter')!
  Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true, writable: true })
  try {
    fn()
  }
  finally {
    Object.defineProperty(Intl, 'Segmenter', descriptor)
  }
}

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('truncateText — text that fits', () => {
  it('returns Arabic with tashkeel unchanged when it fits', () => {
    expect(truncateText('مُحَمَّدٌ', 4)).toBe('مُحَمَّدٌ')
    expect(truncateText('مُحَمَّدٌ', 40)).toBe('مُحَمَّدٌ')
  })

  it('returns Hebrew, Persian and emoji unchanged when they fit', () => {
    expect(truncateText('שָׁלוֹם', 4)).toBe('שָׁלוֹם')
    expect(truncateText('سلام دنیا', 9)).toBe('سلام دنیا')
    expect(truncateText('👨‍👩‍👧‍👦🇪🇬', 2)).toBe('👨‍👩‍👧‍👦🇪🇬')
  })

  it('wraps text that fits in FSI ... PDI with isolate: true', () => {
    expect(truncateText('مرحبا', 5, { isolate: true })).toBe(`${FSI}مرحبا${PDI}`)
    expect(truncateText('Hello', 5, { isolate: true })).toBe(`${FSI}Hello${PDI}`)
  })

  it('returns empty text unchanged', () => {
    expect(truncateText('', 5)).toBe('')
    expect(truncateText('', 5, { isolate: true })).toBe('')
  })
})

describe('truncateText — grapheme clusters', () => {
  it('never splits a base letter from its tashkeel', () => {
    // مُحَمَّدٌ is 4 clusters: مُ حَ مَّ دٌ
    expect(truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5)).toBe(`مُحَمَّدٌ${ELLIPSIS}`)
    expect(truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 3)).toBe(`مُحَ${ELLIPSIS}`)
    const cut = truncateText('مُحَمَّدٌ', 3)
    expect(cut.endsWith(`د${ELLIPSIS}`)).toBe(false) // would orphan the dammatan
    expect(graphemes(cut)).toHaveLength(3)
  })

  it('keeps the lam-alef presentation ligature whole', () => {
    expect(truncateText('ﻻ إله إلا الله', 2)).toBe(`ﻻ${ELLIPSIS}`)
  })

  it('counts Arabic-Indic and Persian digits one cluster each', () => {
    expect(truncateText('١٢٣٤٥٦', 4)).toBe(`١٢٣${ELLIPSIS}`)
    expect(truncateText('۱۲۳۴۵', 3)).toBe(`۱۲${ELLIPSIS}`)
  })

  it('never splits an emoji ZWJ sequence or a flag', () => {
    expect(truncateText('👨‍👩‍👧‍👦🇪🇬🎉', 2)).toBe(`👨‍👩‍👧‍👦${ELLIPSIS}`)
    expect(truncateText('👨‍👩‍👧‍👦🇪🇬🎉🎉', 3)).toBe(`👨‍👩‍👧‍👦🇪🇬${ELLIPSIS}`)
    expect(truncateText('🇪🇬🇸🇦🇯🇴', 2)).toBe(`🇪🇬${ELLIPSIS}`)
  })

  it('never splits Hebrew niqqud from its base letter', () => {
    expect(truncateText('שָׁלוֹם עֲלֵיכֶם', 5)).toBe(`שָׁלוֹם${ELLIPSIS}`)
  })

  it('cuts mixed Arabic and English by clusters', () => {
    expect(truncateText('الإصدار v1.2.3 متاح الآن', 10)).toBe(`الإصدار v${ELLIPSIS}`)
  })

  it('keeps the result within maxLength clusters, ellipsis included', () => {
    for (const text of ['مُحَمَّدٌ عَبْدُ اللَّهِ', 'שָׁלוֹם עֲלֵיכֶם', '👨‍👩‍👧‍👦🇪🇬🎉🎉', 'الإصدار v1.2.3 متاح الآن']) {
      for (let max = 1; max <= 12; max++) {
        expect(graphemes(truncateText(text, max)).length).toBeLessThanOrEqual(max)
      }
    }
  })
})

describe('truncateText — trailing whitespace and tatweel', () => {
  it('trims trailing whitespace before the ellipsis', () => {
    expect(truncateText('مرحبا بالعالم', 7)).toBe(`مرحبا${ELLIPSIS}`)
  })

  it('trims trailing tatweel before the ellipsis', () => {
    expect(truncateText('مرحباـــ بالعالم', 8)).toBe(`مرحبا${ELLIPSIS}`)
    expect(truncateText('مرحباـــ بالعالم', 6)).toBe(`مرحبا${ELLIPSIS}`)
  })
})

describe('truncateText — ellipsis options', () => {
  it('counts a custom multi-cluster ellipsis inside maxLength', () => {
    expect(truncateText('abcdefgh', 5, { ellipsis: '...' })).toBe('ab...')
    expect(truncateText('مرحبا بالعالم', 6, { ellipsis: '...' })).toBe(`مرح...`)
  })

  it('supports an empty ellipsis', () => {
    expect(truncateText('abcdef', 3, { ellipsis: '' })).toBe('abc')
  })

  it('returns the ellipsis alone when it fills the whole limit', () => {
    expect(truncateText('مرحبا', 1)).toBe(ELLIPSIS)
    expect(truncateText('abcdef', 3, { ellipsis: '...' })).toBe('...')
    expect(truncateText('abcdef', 2, { ellipsis: '...' })).toBe('...')
  })

  it('isolates the ellipsis-only result with isolate: true', () => {
    expect(truncateText('مرحبا', 1, { isolate: true })).toBe(`${FSI}${ELLIPSIS}${PDI}`)
    expect(truncateText('abcdef', 2, { ellipsis: '...', isolate: true })).toBe(`${FSI}...${PDI}`)
  })
})

describe('truncateText — word mode', () => {
  it('cuts Arabic at the last word boundary that fits', () => {
    expect(truncateText('مرحبا بالعالم يا أصدقاء', 14, { unit: 'word' })).toBe(`مرحبا بالعالم${ELLIPSIS}`)
    expect(truncateText('مرحبا بالعالم يا أصدقاء', 8, { unit: 'word' })).toBe(`مرحبا${ELLIPSIS}`)
  })

  it('cuts mixed Arabic and English at word boundaries', () => {
    expect(truncateText('الإصدار v1.2.3 متاح الآن', 12, { unit: 'word' })).toBe(`الإصدار${ELLIPSIS}`)
    expect(truncateText('الإصدار v1.2.3 متاح الآن', 15, { unit: 'word' })).toBe(`الإصدار v1.2.3${ELLIPSIS}`)
  })

  it('cuts Persian at word boundaries without dragging punctuation along', () => {
    expect(truncateText('سلام دنیا، حال شما چطور است؟', 10, { unit: 'word', locale: 'fa' })).toBe(`سلام دنیا${ELLIPSIS}`)
  })

  it('falls back to a grapheme cut when one word is longer than the limit', () => {
    expect(truncateText('الاستخدامات', 4, { unit: 'word' })).toBe(`الا${ELLIPSIS}`)
    expect(truncateText('Supercalifragilistic', 5, { unit: 'word' })).toBe(`Supe${ELLIPSIS}`)
    expect(truncateText('مُحَمَّدٌعبدالله', 3, { unit: 'word' })).toBe(`مُحَ${ELLIPSIS}`)
  })

  it('uses the locale for word boundaries (Thai has no spaces)', () => {
    expect(truncateText('สวัสดีชาวโลกทุกคน', 7, { unit: 'word', locale: 'th' })).toBe(`สวัสดี${ELLIPSIS}`)
  })

  it('keeps word-mode results within maxLength clusters', () => {
    const text = 'مرحبا بالعالم يا أصدقاء'
    for (let max = 1; max <= 20; max++) {
      expect(graphemes(truncateText(text, max, { unit: 'word' })).length).toBeLessThanOrEqual(max)
    }
  })
})

describe('truncateText — isolate', () => {
  it('wraps truncated RTL text in FSI ... PDI', () => {
    const plain = truncateText('مرحبا بالعالم يا أصدقاء', 8)
    const wrapped = truncateText('مرحبا بالعالم يا أصدقاء', 8, { isolate: true })
    expect(wrapped).toBe(`${FSI}${plain}${PDI}`)
    expect(wrapped.startsWith('\u2068')).toBe(true)
    expect(wrapped.endsWith('\u2069')).toBe(true)
  })

  it('wraps truncated LTR text the same way', () => {
    expect(truncateText('Hello world', 8, { isolate: true })).toBe(`${FSI}Hello w${ELLIPSIS}${PDI}`)
  })

  it('does not count the isolate controls towards maxLength', () => {
    const wrapped = truncateText('مرحبا بالعالم', 8, { isolate: true })
    expect(graphemes(wrapped.slice(1, -1)).length).toBeLessThanOrEqual(8)
  })

  it('wraps every return path for valid input', () => {
    // Fitting text, truncated text, and the ellipsis-only result.
    for (const max of [20, 8, 1]) {
      const wrapped = truncateText('مرحبا بالعالم', max, { isolate: true })
      expect(wrapped.startsWith(FSI)).toBe(true)
      expect(wrapped.endsWith(PDI)).toBe(true)
    }
  })
})

describe('truncateText — invalid maxLength', () => {
  it('throws TypeError in development for 0, negatives, fractions, NaN and Infinity', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => truncateText('مرحبا', bad)).toThrow(TypeError)
    }
  })

  it('returns the ellipsis in production instead of throwing', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(truncateText('مرحبا', 0)).toBe(ELLIPSIS)
    expect(truncateText('مرحبا', -3)).toBe(ELLIPSIS)
    expect(truncateText('مرحبا', 2.5)).toBe(ELLIPSIS)
    expect(truncateText('مرحبا', 0, { ellipsis: '...' })).toBe('...')
  })

  it('isolates the production ellipsis for an invalid maxLength with isolate: true', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(truncateText('مرحبا', 0, { isolate: true })).toBe(`${FSI}${ELLIPSIS}${PDI}`)
    expect(truncateText('مرحبا', 1.5, { ellipsis: '...', isolate: true })).toBe(`${FSI}...${PDI}`)
  })
})

describe('truncateText — invalid locale', () => {
  it('falls back to the runtime default locale for grapheme mode', () => {
    expect(truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5, { locale: '!!' })).toBe(`مُحَمَّدٌ${ELLIPSIS}`)
    expect(truncateText('👨‍👩‍👧‍👦🇪🇬🎉🎉', 3, { locale: 'not a locale' })).toBe(`👨‍👩‍👧‍👦🇪🇬${ELLIPSIS}`)
  })

  it('falls back to the runtime default locale for word mode', () => {
    expect(truncateText('مرحبا بالعالم يا أصدقاء', 8, { unit: 'word', locale: '!!' })).toBe(`مرحبا${ELLIPSIS}`)
    expect(truncateText('Hello world again', 8, { unit: 'word', locale: '!!' })).toBe(`Hello${ELLIPSIS}`)
  })

  it('never throws for a bad locale without Intl.Segmenter either', () => {
    withoutSegmenter(() => {
      expect(truncateText('مرحبا بالعالم', 8, { unit: 'word', locale: '!!' })).toBe(`مرحبا${ELLIPSIS}`)
    })
  })
})

describe('truncateText — fallback without Intl.Segmenter', () => {
  it('counts code points and never splits surrogate pairs', () => {
    withoutSegmenter(() => {
      expect(truncateText('😀😀😀', 2)).toBe(`😀${ELLIPSIS}`)
      expect(truncateText('😀😀😀', 3)).toBe('😀😀😀')
      expect(truncateText('abc😀def', 4)).toBe(`abc${ELLIPSIS}`)
      expect(LONE_SURROGATE.test(truncateText('👨‍👩‍👧‍👦🇪🇬', 3))).toBe(false)
    })
  })

  it('still returns text that fits unchanged', () => {
    withoutSegmenter(() => {
      expect(truncateText('مُحَمَّدٌ', 9)).toBe('مُحَمَّدٌ')
      expect(truncateText('مرحبا', 5)).toBe('مرحبا')
    })
  })

  it('may separate marks in fallback mode but keeps the contract otherwise', () => {
    withoutSegmenter(() => {
      // Code points: مُ ح َ … — the documented fallback trade-off.
      expect(truncateText('مُحَمَّدٌ', 4)).toBe(`مُح${ELLIPSIS}`)
      expect(truncateText('مرحبا بالعالم', 7)).toBe(`مرحبا${ELLIPSIS}`)
    })
  })

  it('cuts word mode at the last whitespace boundary that fits (Arabic)', () => {
    withoutSegmenter(() => {
      expect(truncateText('مرحبا بالعالم', 8, { unit: 'word' })).toBe(`مرحبا${ELLIPSIS}`)
      expect(truncateText('مرحبا بالعالم يا أصدقاء', 14, { unit: 'word' })).toBe(`مرحبا بالعالم${ELLIPSIS}`)
    })
  })

  it('cuts word mode at the last whitespace boundary that fits (Latin)', () => {
    withoutSegmenter(() => {
      expect(truncateText('Hello world again', 8, { unit: 'word' })).toBe(`Hello${ELLIPSIS}`)
      expect(truncateText('Hello world again', 13, { unit: 'word' })).toBe(`Hello world${ELLIPSIS}`)
    })
  })

  it('falls back to code points in word mode when one word is longer than the limit', () => {
    withoutSegmenter(() => {
      expect(truncateText('Supercalifragilistic', 5, { unit: 'word' })).toBe(`Supe${ELLIPSIS}`)
      expect(truncateText('الاستخدامات', 4, { unit: 'word' })).toBe(`الا${ELLIPSIS}`)
    })
  })

  it('never splits a surrogate pair at a fallback word boundary', () => {
    withoutSegmenter(() => {
      expect(truncateText('😀😀 😀😀', 4, { unit: 'word' })).toBe(`😀😀${ELLIPSIS}`)
      expect(LONE_SURROGATE.test(truncateText('👨‍👩‍👧‍👦 🇪🇬', 5, { unit: 'word' }))).toBe(false)
    })
  })

  it('keeps isolate and the production contract working in fallback mode', () => {
    withoutSegmenter(() => {
      expect(truncateText('مرحبا بالعالم', 8, { isolate: true })).toBe(`${FSI}مرحبا ب${ELLIPSIS}${PDI}`)
      expect(truncateText('مرحبا', 5, { isolate: true })).toBe(`${FSI}مرحبا${PDI}`)
      expect(() => truncateText('مرحبا', 0)).toThrow(TypeError)
    })
  })
})