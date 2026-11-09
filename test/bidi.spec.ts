import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { BidiText } from '../src/components/BidiText'
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

  it('keeps paired brackets together inside an opposite-direction isolate (N0)', () => {
    const runs = splitBidiRuns('السعر (USD) 100', 'rtl')
    const isolated = runs.filter(run => run.isolated)
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.text).toBe('(USD) 100')
    expect(isolated[0]!.dir).toBe('ltr')
    expect(isolated[0]!.hasStrong).toBe(true)
    expect(runs.map(run => run.text).join('')).toBe('السعر (USD) 100')

    const standalone = splitBidiRuns('السعر (USD) فقط', 'rtl')
    expect(standalone.filter(run => run.isolated).map(run => run.text)).toEqual(['(USD)'])
    expect(standalone.map(run => run.text).join('')).toBe('السعر (USD) فقط')

    const square = splitBidiRuns('الوسم [B2B] متاح', 'rtl')
    expect(square.filter(run => run.isolated).map(run => run.text)).toEqual(['[B2B]'])
    expect(square.map(run => run.text).join('')).toBe('الوسم [B2B] متاح')

    const curly = splitBidiRuns('المتغير {userId} مطلوب', 'rtl')
    expect(curly.filter(run => run.isolated).map(run => run.text)).toEqual(['{userId}'])
    expect(curly.map(run => run.text).join('')).toBe('المتغير {userId} مطلوب')
  })

  it('keeps paired brackets outside the isolate when they enclose both directions', () => {
    const rtlFirst = splitBidiRuns('اللغة (العربية English) هنا', 'rtl')
    expect(rtlFirst.filter(run => run.isolated).map(run => run.text)).toEqual(['English'])
    expect(isolateRuns('اللغة (العربية English) هنا', 'rtl')).toBe(`اللغة (العربية ${LRI}English${PDI}) هنا`)
    expect(rtlFirst.map(run => run.text).join('')).toBe('اللغة (العربية English) هنا')

    const ltrFirstInRtl = splitBidiRuns('اللغة (English العربية) هنا', 'rtl')
    expect(ltrFirstInRtl.filter(run => run.isolated).map(run => run.text)).toEqual(['English'])
    expect(isolateRuns('اللغة (English العربية) هنا', 'rtl')).toBe(`اللغة (${LRI}English${PDI} العربية) هنا`)
    expect(ltrFirstInRtl.map(run => run.text).join('')).toBe('اللغة (English العربية) هنا')
  })

  it('leaves unmatched or empty brackets neutral', () => {
    const unclosed = splitBidiRuns('السعر (USD فقط', 'rtl')
    expect(unclosed.filter(run => run.isolated).map(run => run.text)).toEqual(['USD'])
    expect(unclosed.map(run => run.text).join('')).toBe('السعر (USD فقط')

    const unopened = splitBidiRuns('السعر USD) فقط', 'rtl')
    expect(unopened.filter(run => run.isolated).map(run => run.text)).toEqual(['USD'])
    expect(unopened.map(run => run.text).join('')).toBe('السعر USD) فقط')

    const mismatched = splitBidiRuns('السعر (USD] فقط', 'rtl')
    expect(mismatched.filter(run => run.isolated).map(run => run.text)).toEqual(['USD'])
    expect(mismatched.map(run => run.text).join('')).toBe('السعر (USD] فقط')

    const empty = splitBidiRuns('قيمة () فارغة', 'rtl')
    expect(empty.some(run => run.isolated)).toBe(false)
    expect(empty.map(run => run.text).join('')).toBe('قيمة () فارغة')
  })

  it('handles nested brackets and inner/outer directional pairs', () => {
    const nestedMath = splitBidiRuns('النتيجة [(a + b)] النهائية', 'rtl')
    expect(nestedMath.filter(run => run.isolated).map(run => run.text)).toEqual(['[(a + b)]'])
    expect(nestedMath.map(run => run.text).join('')).toBe('النتيجة [(a + b)] النهائية')

    const nestedBraces = splitBidiRuns('المعادلة {[x + 1]} صحيحة', 'rtl')
    expect(nestedBraces.filter(run => run.isolated).map(run => run.text)).toEqual(['{[x + 1]}'])
    expect(nestedBraces.map(run => run.text).join('')).toBe('المعادلة {[x + 1]} صحيحة')

    const outerMixed = splitBidiRuns('نص (عربي [USD]) هنا', 'rtl')
    expect(outerMixed.filter(run => run.isolated).map(run => run.text)).toEqual(['[USD]'])
    expect(isolateRuns('نص (عربي [USD]) هنا', 'rtl')).toBe(`نص (عربي ${LRI}[USD]${PDI}) هنا`)
    expect(outerMixed.map(run => run.text).join('')).toBe('نص (عربي [USD]) هنا')

    const unclosedInner = splitBidiRuns('النتيجة (a [b) هنا', 'rtl')
    expect(unclosedInner.filter(run => run.isolated).map(run => run.text)).toEqual(['(a [b)'])
    expect(unclosedInner.map(run => run.text).join('')).toBe('النتيجة (a [b) هنا')
  })

  it('isolates a URL with a query string, an email address, +20 100 123 4567, and a quoted English title in Arabic', () => {
    const urlInput = 'الرابط https://example.com/search?q=vue&lang=ar&page=1 متاح'
    const urlRuns = splitBidiRuns(urlInput, 'rtl')
    expect(urlRuns.filter(run => run.isolated).map(run => run.text)).toEqual([
      'https://example.com/search?q=vue&lang=ar&page=1',
    ])
    expect(urlRuns.map(run => run.text).join('')).toBe(urlInput)

    const emailInput = 'راسلنا على support.team+rtl@example.co.uk للمساعدة'
    const emailRuns = splitBidiRuns(emailInput, 'rtl')
    expect(emailRuns.filter(run => run.isolated).map(run => run.text)).toEqual([
      'support.team+rtl@example.co.uk',
    ])
    expect(emailRuns.map(run => run.text).join('')).toBe(emailInput)

    const phoneInput = 'اتصل على +20 100 123 4567 الآن'
    const phoneRuns = splitBidiRuns(phoneInput, 'rtl')
    expect(phoneRuns.filter(run => run.isolated)).toEqual([
      { text: '20 100 123 4567', dir: 'ltr', isolated: true, hasStrong: false },
    ])
    expect(phoneRuns.map(run => run.text).join('')).toBe(phoneInput)

    const quotedInput = 'قرأت كتاب "Clean Code" أمس'
    const quotedRuns = splitBidiRuns(quotedInput, 'rtl')
    expect(quotedRuns.filter(run => run.isolated)).toEqual([
      { text: 'Clean Code', dir: 'ltr', isolated: true, hasStrong: true },
    ])
    expect(isolateRuns(quotedInput, 'rtl')).toBe(`قرأت كتاب "${LRI}Clean Code${PDI}" أمس`)
    expect(quotedRuns.map(run => run.text).join('')).toBe(quotedInput)
  })

  it('handles the same cases in an LTR base with Arabic inside', () => {
    const parenthesised = splitBidiRuns('Price (جنيه) ١٠٠', 'ltr')
    expect(parenthesised.filter(run => run.isolated)).toEqual([
      { text: '(جنيه) ١٠٠', dir: 'rtl', isolated: true, hasStrong: true },
    ])
    expect(parenthesised.map(run => run.text).join('')).toBe('Price (جنيه) ١٠٠')

    const brackets = splitBidiRuns('Tag [عربي] and {معرف} here', 'ltr')
    expect(brackets.filter(run => run.isolated).map(run => run.text)).toEqual(['[عربي]', '{معرف}'])
    expect(brackets.map(run => run.text).join('')).toBe('Tag [عربي] and {معرف} here')

    const mixedBrackets = splitBidiRuns('Language (English العربية) here', 'ltr')
    expect(mixedBrackets.filter(run => run.isolated).map(run => run.text)).toEqual(['العربية'])
    expect(isolateRuns('Language (English العربية) here', 'ltr')).toBe(
      `Language (English ${RLI}العربية${PDI}) here`,
    )
    expect(mixedBrackets.map(run => run.text).join('')).toBe('Language (English العربية) here')

    const nestedRtl = splitBidiRuns('Formula [(أ + ب)] and {[س + ١]} done', 'ltr')
    expect(nestedRtl.filter(run => run.isolated).map(run => run.text)).toEqual(['[(أ + ب)]', '{[س + ١]}'])
    expect(nestedRtl.map(run => run.text).join('')).toBe('Formula [(أ + ب)] and {[س + ١]} done')

    const outerMixedLtr = splitBidiRuns('Text (English [عربي]) here', 'ltr')
    expect(outerMixedLtr.filter(run => run.isolated).map(run => run.text)).toEqual(['[عربي]'])
    expect(isolateRuns('Text (English [عربي]) here', 'ltr')).toBe(`Text (English ${RLI}[عربي]${PDI}) here`)
    expect(outerMixedLtr.map(run => run.text).join('')).toBe('Text (English [عربي]) here')

    const urlRtl = splitBidiRuns('Visit مثال.مصر/بحث?طلب=أول&صفحة=١ today', 'ltr')
    expect(urlRtl.filter(run => run.isolated).map(run => run.text)).toEqual([
      'مثال.مصر/بحث?طلب=أول&صفحة=١',
    ])
    expect(urlRtl.map(run => run.text).join('')).toBe('Visit مثال.مصر/بحث?طلب=أول&صفحة=١ today')

    const emailRtl = splitBidiRuns('Email دعم.فني+عربي@مثال.مصر now', 'ltr')
    expect(emailRtl.filter(run => run.isolated).map(run => run.text)).toEqual(['دعم.فني+عربي@مثال.مصر'])
    expect(emailRtl.map(run => run.text).join('')).toBe('Email دعم.فني+عربي@مثال.مصر now')

    const phoneRtl = splitBidiRuns('Call +٢٠ ١٠٠ ١٢٣ ٤٥٦٧ now', 'ltr')
    expect(phoneRtl.filter(run => run.isolated)).toEqual([
      { text: '٢٠ ١٠٠ ١٢٣ ٤٥٦٧', dir: 'rtl', isolated: true, hasStrong: false },
    ])
    expect(phoneRtl.map(run => run.text).join('')).toBe('Call +٢٠ ١٠٠ ١٢٣ ٤٥٦٧ now')

    const quotedRtl = splitBidiRuns('Read "مقدمة ابن خلدون" yesterday', 'ltr')
    expect(quotedRtl.filter(run => run.isolated)).toEqual([
      { text: 'مقدمة ابن خلدون', dir: 'rtl', isolated: true, hasStrong: true },
    ])
    expect(isolateRuns('Read "مقدمة ابن خلدون" yesterday', 'ltr')).toBe(
      `Read "${RLI}مقدمة ابن خلدون${PDI}" yesterday`,
    )
    expect(quotedRtl.map(run => run.text).join('')).toBe('Read "مقدمة ابن خلدون" yesterday')
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

  it('keeps paired brackets together in isolateRuns output', () => {
    expect(isolateRuns('السعر (USD) 100', 'rtl')).toBe(`السعر ${LRI}(USD) 100${PDI}`)
    expect(isolateRuns('Price (جنيه) ١٠٠', 'ltr')).toBe(`Price ${RLI}(جنيه) ١٠٠${PDI}`)
  })
})

describe('BidiText bracket rendering', () => {
  it('renders paired brackets inside <bdi> and Unicode isolates for an RTL sentence', () => {
    const text = 'السعر (USD) 100'
    const elementWrapper = mount(BidiText, {
      props: { text, dir: 'rtl', strategy: 'element' },
    })
    const bdi = elementWrapper.findAll('bdi')
    expect(bdi).toHaveLength(1)
    expect(bdi[0]!.attributes('dir')).toBe('ltr')
    expect(bdi[0]!.text()).toBe('(USD) 100')
    expect(elementWrapper.text()).toBe(text)

    const charsWrapper = mount(BidiText, {
      props: { text, dir: 'rtl', strategy: 'chars' },
    })
    expect(charsWrapper.find('bdi').exists()).toBe(false)
    expect(charsWrapper.text()).toBe(`السعر ${LRI}(USD) 100${PDI}`)
  })

  it('renders nested brackets inside <bdi> and Unicode isolates for an LTR sentence with Arabic', () => {
    const text = 'Formula [(أ + ب)] done'
    const elementWrapper = mount(BidiText, {
      props: { text, dir: 'ltr', strategy: 'element' },
    })
    const bdi = elementWrapper.findAll('bdi')
    expect(bdi).toHaveLength(1)
    expect(bdi[0]!.attributes('dir')).toBe('rtl')
    expect(bdi[0]!.text()).toBe('[(أ + ب)]')
    expect(elementWrapper.text()).toBe(text)

    const charsWrapper = mount(BidiText, {
      props: { text, dir: 'ltr', strategy: 'chars' },
    })
    expect(charsWrapper.find('bdi').exists()).toBe(false)
    expect(charsWrapper.text()).toBe(`Formula ${RLI}[(أ + ب)]${PDI} done`)
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
