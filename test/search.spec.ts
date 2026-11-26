import { describe, expect, it } from 'vitest'
import { FSI, LRI, LRM, PDI, RLI, RLM, isolate, isolateRuns } from '../src/bidi'
import * as entry from '../src/index'
import { findSearchMatches, foldSearchText, matchesSearch } from '../src/search'
import type { SearchMatch, SearchOptions } from '../src/search'

describe('RTL search helpers (src/search.ts)', () => {
  describe('why it exists: plain String.prototype.includes fails', () => {
    it.each([
      { label: 'hamza above', stored: 'أحمد', query: 'احمد' },
      { label: 'hamza below', stored: 'إبراهيم', query: 'ابراهيم' },
      { label: 'madda above', stored: 'آدم', query: 'ادم' },
      { label: 'alef wasla', stored: 'ٱلرحمن', query: 'الرحمن' },
      { label: 'waw with hamza', stored: 'مؤمن', query: 'مومن' },
      { label: 'yeh with hamza', stored: 'رسائل', query: 'رسايل' },
      { label: 'harakat and shadda', stored: 'مُحَمَّدٌ', query: 'محمد' },
      { label: 'tatweel', stored: 'عـبـدالله', query: 'عبدالله' },
      { label: 'ta marbuta vs heh (U+0629 vs U+0647)', stored: 'فاطمة', query: 'فاطمه' },
      { label: 'alef maqsura vs yeh (U+0649 vs U+064A)', stored: 'مصطفى', query: 'مصطفي' },
      { label: 'Persian keheh and yeh', stored: 'کتابخانه علی', query: 'كتابخانه علي' },
      { label: 'Arabic-Indic digits', stored: 'طلب ١٢٣٤', query: 'طلب 1234' },
      { label: 'Persian digits', stored: 'شماره ۵۶۷۸', query: 'شماره 5678' },
      { label: 'Hebrew niqqud points', stored: 'שָׁלוֹם עֲלֵיכֶם', query: 'שלום עליכם' },
      { label: 'lam-alef presentation ligature', stored: 'سﻼم', query: 'سلام' },
    ])('matches $label where stored.includes(query) is false', ({ stored, query }) => {
      expect(stored.includes(query)).toBe(false)
      expect(matchesSearch(stored, query)).toBe(true)
      expect(matchesSearch(query, stored)).toBe(true)
      expect(findSearchMatches(stored, query)).toEqual([{ start: 0, end: stored.length }])
    })
  })

  describe('stripping diacritics, tatweel, Hebrew points, and bidi controls', () => {
    it('strips every Arabic harakat code point in U+064B..U+065F', () => {
      for (let cp = 0x064B; cp <= 0x065F; cp++) {
        const mark = String.fromCodePoint(cp)
        expect(foldSearchText(mark)).toBe('')
        expect(foldSearchText(`ب${mark}ت`)).toBe('بت')
      }
    })

    it('strips superscript alef U+0670', () => {
      expect(foldSearchText('\u0670')).toBe('')
      expect(foldSearchText('هٰذا')).toBe('هذا')
      expect(foldSearchText('ٱلرَّحْمَٰنِ')).toBe('الرحمن')
    })

    it('strips every Quranic annotation code point in U+06D6..U+06ED', () => {
      for (let cp = 0x06D6; cp <= 0x06ED; cp++) {
        const mark = String.fromCodePoint(cp)
        expect(foldSearchText(mark)).toBe('')
        expect(foldSearchText(`ق${mark}ل`)).toBe('قل')
      }
    })

    it('strips tatweel U+0640', () => {
      expect(foldSearchText('\u0640\u0640\u0640')).toBe('')
      expect(foldSearchText('عـبـدالـرحـمـن')).toBe('عبدالرحمن')
    })

    it('strips every Hebrew point code point in U+0591..U+05C7', () => {
      for (let cp = 0x0591; cp <= 0x05C7; cp++) {
        const point = String.fromCodePoint(cp)
        expect(foldSearchText(point)).toBe('')
        expect(foldSearchText(`א${point}ב`)).toBe('אב')
      }
      expect(foldSearchText('דָּוִד הַמֶּלֶךְ')).toBe('דוד המלך')
      expect(foldSearchText('בְּרֵאשִׁית')).toBe('בראשית')
    })

    it('strips every Unicode bidi control character and isolate() output', () => {
      const controls = [
        '\u061C',
        LRM,
        RLM,
        '\u202A',
        '\u202B',
        '\u202C',
        '\u202D',
        '\u202E',
        LRI,
        RLI,
        FSI,
        PDI,
      ]
      for (const ctrl of controls) {
        expect(foldSearchText(ctrl)).toBe('')
        expect(foldSearchText(`أ${ctrl}حمد`)).toBe('احمد')
      }
      const isolated = isolateRuns('آخر تحديث 12-05-2024 بواسطة أَحْمَد', 'rtl')
      expect(matchesSearch(isolated, 'اخر تحديث 12-05-2024 بواسطه احمد')).toBe(true)
    })
  })

  describe('each letter, digit, NFKC, and case mapping', () => {
    it('maps U+0622, U+0623, U+0625, and U+0671 to bare alef U+0627 while keeping U+0621 intact', () => {
      expect(foldSearchText('\u0622\u0623\u0625\u0671')).toBe('\u0627\u0627\u0627\u0627')
      expect(foldSearchText('سماء')).toBe('سماء')
      expect(matchesSearch('سما', 'سماء')).toBe(false)
      expect(matchesSearch('قراءة', 'قراة')).toBe(false)
      expect(matchesSearch('سماء', 'سماا')).toBe(false)
      expect(matchesSearch('سماء', 'سماء')).toBe(true)
    })

    it('maps U+0624 to waw U+0648', () => {
      expect(foldSearchText('\u0624')).toBe('\u0648')
      expect(foldSearchText('مسؤولية')).toBe('مسووليه')
    })

    it('maps U+0626, U+0649, and U+06CC to Arabic yeh U+064A', () => {
      expect(foldSearchText('\u0626\u0649\u06CC')).toBe('\u064A\u064A\u064A')
      expect(foldSearchText('بئر مصطفى علی')).toBe('بير مصطفي علي')
    })

    it('maps Persian keheh U+06A9 to Arabic kaf U+0643', () => {
      expect(foldSearchText('\u06A9')).toBe('\u0643')
      expect(foldSearchText('کریم کتاب')).toBe('كريم كتاب')
    })

    it('maps ta marbuta U+0629 to heh U+0647 by default', () => {
      expect(foldSearchText('\u0629')).toBe('\u0647')
      expect(foldSearchText('القاهرة الجديدة')).toBe('القاهره الجديده')
    })

    it('maps all ten Arabic-Indic and all ten Persian digits to ASCII 0-9 by default', () => {
      expect(foldSearchText('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
      expect(foldSearchText('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
      expect(foldSearchText('١2۳')).toBe('123')
    })

    it('applies NFKC to Arabic and Hebrew presentation forms and NFD sequences', () => {
      // Lam-alef isolated and final forms: madda, hamza above, hamza below, bare alef.
      expect(foldSearchText('\uFEF5\uFEF6\uFEF7\uFEF8\uFEF9\uFEFA\uFEFB\uFEFC')).toBe('لالالالالالالالا')
      // Contextual Arabic presentation forms + word ligature U+FDF2 + medial tashkeel form U+FE77.
      expect(foldSearchText('\uFEE3\uFEA4\uFEE4\uFEAA \uFDF2 \uFE77')).toBe('محمد الله ')
      // Presentation forms for alef wasla, Persian keheh, Persian yeh, ta marbuta, alef maqsura.
      expect(foldSearchText('\uFB50\uFB8E\uFBFC\uFE93\uFEEF')).toBe('اكيهي')
      // Hebrew presentation forms: shin+dagesh (FB49), vav+holam (FB4B), alef-lamed ligature (FB4F).
      expect(foldSearchText('\uFB49\uFB4B \uFB4F')).toBe('שו אל')
      // Decomposed NFD sequences.
      expect(foldSearchText('\u0627\u0654\u0627\u0655\u0627\u0653\u0648\u0654\u064A\u0654')).toBe('اااوي')
      expect(foldSearchText('Cafe\u0301')).toBe('café')
      expect(matchesSearch('Cafe\u0301', 'CAFÉ')).toBe(true)
    })

    it('lowercases Latin text while leaving RTL scripts intact', () => {
      expect(foldSearchText('Vue RTL Kit Édition')).toBe('vue rtl kit édition')
      expect(foldSearchText('أَحْمَد Salah')).toBe('احمد salah')
    })
  })

  describe('options: each option off and combined', () => {
    it('taMarbuta: false keeps U+0629 distinct from U+0647 while leaving other mappings on', () => {
      const opts: SearchOptions = { taMarbuta: false }
      expect(foldSearchText('فَاطِمَةُ ١٢٣', opts)).toBe('فاطمة 123')
      expect(foldSearchText('\uFE93', opts)).toBe('\u0629')
      expect(matchesSearch('فاطمة', 'فاطمه', opts)).toBe(false)
      expect(matchesSearch('فَاطِمَةُ', 'فاطمة', opts)).toBe(true)
      expect(matchesSearch('فاطمة مصطفى', 'فاطمة مصطفي', opts)).toBe(true)
      expect(findSearchMatches('فاطمة وفاطمه', 'فاطمة', opts)).toEqual([{ start: 0, end: 5 }])
      expect(findSearchMatches('فاطمة وفاطمه', 'فاطمه', opts)).toEqual([{ start: 7, end: 12 }])
    })

    it('alefMaqsura: false keeps U+0649 distinct from U+064A while U+0626 and U+06CC still fold to U+064A', () => {
      const opts: SearchOptions = { alefMaqsura: false }
      expect(foldSearchText('مُصْطَفَىٰ', opts)).toBe('مصطفى')
      expect(foldSearchText('\uFEEF', opts)).toBe('\u0649')
      expect(foldSearchText('بئر علی', opts)).toBe('بير علي')
      expect(matchesSearch('مصطفى', 'مصطفي', opts)).toBe(false)
      expect(matchesSearch('مُصْطَفَىٰ', 'مصطفى', opts)).toBe(true)
      expect(matchesSearch('على بئر علی', 'على بير علي', opts)).toBe(true)
      expect(findSearchMatches('على وعلي', 'على', opts)).toEqual([{ start: 0, end: 3 }])
      expect(findSearchMatches('على وعلي', 'علي', opts)).toEqual([{ start: 5, end: 8 }])
    })

    it('digits: false keeps Arabic-Indic and Persian digits distinct from ASCII and each other', () => {
      const opts: SearchOptions = { digits: false }
      expect(foldSearchText('أَحْمَد ١٢٣ و ۱۲۳ و 123', opts)).toBe('احمد ١٢٣ و ۱۲۳ و 123')
      expect(matchesSearch('طلب ١٢٣', '123', opts)).toBe(false)
      expect(matchesSearch('طلب ١٢٣', '۱۲۳', opts)).toBe(false)
      expect(matchesSearch('طَلَبٌ ١٢٣', 'طلب ١٢٣', opts)).toBe(true)
      expect(findSearchMatches('١٢٣ 123 ۱۲۳', '١٢٣', opts)).toEqual([{ start: 0, end: 3 }])
      expect(findSearchMatches('١٢٣ 123 ۱۲۳', '۱۲۳', opts)).toEqual([{ start: 8, end: 11 }])
    })

    it('supports turning all three options off or explicitly passing true / undefined', () => {
      const allOff: SearchOptions = { taMarbuta: false, alefMaqsura: false, digits: false }
      expect(foldSearchText('فَاطِمَةُ مُصْطَفَىٰ ١٢', allOff)).toBe('فاطمة مصطفى ١٢')
      expect(foldSearchText('فاطمة مصطفى ١٢', { taMarbuta: true, alefMaqsura: true, digits: true }))
        .toBe('فاطمه مصطفي 12')
      expect(foldSearchText('فاطمة مصطفى ١٢', { taMarbuta: undefined, alefMaqsura: undefined, digits: undefined }))
        .toBe('فاطمه مصطفي 12')
    })
  })

  describe('whitespace runs', () => {
    it('collapses runs of ASCII and Unicode whitespace to a single ASCII space', () => {
      expect(foldSearchText('   \t\r\n\u00A0\u202F  ')).toBe(' ')
      expect(foldSearchText('أبو   \t\n  بكر\u00A0الصديق')).toBe('ابو بكر الصديق')
      // Stripped controls between spaces still collapse into one space.
      expect(foldSearchText(`أبو ${LRM}  ${RLM} بكر`)).toBe('ابو بكر')
      expect(matchesSearch('أبو    بكر', 'ابو بكر')).toBe(true)
      expect(matchesSearch('أبو بكر', 'ابو    بكر')).toBe(true)
    })

    it('maps collapsed whitespace spans accurately in findSearchMatches', () => {
      const text = 'أبو   \t  بكر'
      expect(findSearchMatches(text, 'ابو بكر')).toEqual([{ start: 0, end: text.length }])
      expect(findSearchMatches(text, '   ')).toEqual([{ start: 3, end: 9 }])
      expect(findSearchMatches('  أَحْمَدُ  ', 'احمد')).toEqual([{ start: 2, end: 10 }])
    })
  })

  describe('findSearchMatches: UTF-16 offsets, trailing marks, ligatures, and emoji', () => {
    it('extends end over trailing harakat and Hebrew points without pulling in preceding marks', () => {
      const arabic = 'بِأَحْمَدَ وَمُحَمَّدٌ!'
      const m1 = findSearchMatches(arabic, 'احمد')
      expect(m1).toEqual([{ start: 2, end: 10 }])
      expect(arabic.slice(0, m1[0]!.start)).toBe('بِ')
      expect(arabic.slice(m1[0]!.start, m1[0]!.end)).toBe('أَحْمَدَ')

      const m2 = findSearchMatches(arabic, 'محم')
      expect(m2).toEqual([{ start: 13, end: 20 }])
      expect(arabic.slice(m2[0]!.start, m2[0]!.end)).toBe('مُحَمَّ')
      expect(arabic.slice(m2[0]!.end)).toBe('دٌ!')

      const m3 = findSearchMatches(arabic, 'محمد')
      expect(m3).toEqual([{ start: 13, end: 22 }])
      expect(arabic.slice(m3[0]!.start, m3[0]!.end)).toBe('مُحَمَّدٌ')

      const hebrew = 'שָׁלוֹם דָּוִד!'
      const hm = findSearchMatches(hebrew, 'דו')
      expect(hm).toEqual([{ start: 8, end: 13 }])
      expect(hebrew.slice(hm[0]!.start, hm[0]!.end)).toBe('דָּוִ')
    })

    it('does not swallow trailing tatweel or bidi isolate controls into end', () => {
      const withIsolate = isolate('مُحَمَّدٌ', 'rtl')
      const matches = findSearchMatches(withIsolate, 'محمد')
      expect(matches).toEqual([{ start: 1, end: withIsolate.length - 1 }])
      expect(withIsolate.slice(matches[0]!.start, matches[0]!.end)).toBe('مُحَمَّدٌ')

      const withTatweel = 'عـبـدـالله'
      const tm = findSearchMatches(withTatweel, 'عبد')
      expect(tm).toEqual([{ start: 0, end: 5 }])
      expect(withTatweel.slice(tm[0]!.start, tm[0]!.end)).toBe('عـبـد')
    })

    it('keeps UTF-16 offsets right across lam-alef and multi-letter presentation ligatures', () => {
      // U+FEFC (ﻼ) and U+FEF7 (ﻷ) are single UTF-16 code units that NFKC unfolds to 2 chars.
      const text = 'سﻼم ﻷَحْمَدَ في ﻻهور'
      const mSalam = findSearchMatches(text, 'سلام')
      expect(mSalam).toEqual([{ start: 0, end: 3 }])
      expect(text.slice(mSalam[0]!.start, mSalam[0]!.end)).toBe('سﻼم')

      const mAhmad = findSearchMatches(text, 'لاحمد')
      expect(mAhmad).toEqual([{ start: 4, end: 12 }])
      expect(text.slice(mAhmad[0]!.start, mAhmad[0]!.end)).toBe('ﻷَحْمَدَ')

      const mLahore = findSearchMatches(text, 'لاهور')
      expect(mLahore).toEqual([{ start: 16, end: 20 }])
      expect(text.slice(mLahore[0]!.start, mLahore[0]!.end)).toBe('ﻻهور')

      // Query itself written with a presentation ligature matches decomposed letters in text.
      const decomposed = 'سَلاَمٌ'
      expect(findSearchMatches(decomposed, 'سﻻم')).toEqual([{ start: 0, end: decomposed.length }])
    })

    it('keeps UTF-16 offsets right across surrogate pairs and ZWJ emoji sequences', () => {
      const text = '😀 أَحْمَدُ 👨‍👩‍👧‍👦 مُحَمَّدٌ 👍🏽 إِبْرَاهِيمُ'
      const ahmad = findSearchMatches(text, 'احمد')
      expect(ahmad).toEqual([{ start: 3, end: 11 }])
      expect(text.slice(ahmad[0]!.start, ahmad[0]!.end)).toBe('أَحْمَدُ')

      const muhammad = findSearchMatches(text, 'محمد')
      expect(muhammad).toEqual([{ start: 24, end: 33 }])
      expect(text.slice(muhammad[0]!.start, muhammad[0]!.end)).toBe('مُحَمَّدٌ')

      const ibrahim = findSearchMatches(text, 'ابراهيم')
      expect(ibrahim).toEqual([{ start: 39, end: 51 }])
      expect(text.slice(ibrahim[0]!.start, ibrahim[0]!.end)).toBe('إِبْرَاهِيمُ')

      const family = findSearchMatches(text, '👨‍👩‍👧‍👦')
      expect(family).toEqual([{ start: 12, end: 23 }])
      expect(text.slice(family[0]!.start, family[0]!.end)).toBe('👨‍👩‍👧‍👦')
    })

    it('returns sorted, strictly non-overlapping ranges even for repeating patterns and ligatures', () => {
      const repeated = 'أَحْمَدُ ثم إِحْمَدٍ ثم آحْمَدٌ'
      const matches = findSearchMatches(repeated, 'احمد')
      expect(matches.map(r => repeated.slice(r.start, r.end))).toEqual([
        'أَحْمَدُ',
        'إِحْمَدٍ',
        'آحْمَدٌ',
      ])
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1]!.end).toBeLessThanOrEqual(matches[i]!.start)
      }

      // Overlapping 'اا' inside 3 folded 'ا's returns only the first [0, 4).
      expect(findSearchMatches('أَأَأَ', 'اا')).toEqual([{ start: 0, end: 4 }])
      expect(findSearchMatches('أَأَأَإِ', 'اا')).toEqual([
        { start: 0, end: 4 },
        { start: 4, end: 8 },
      ])

      // U+FDF2 (ﷲ -> 'الله') has two 'ل's from one code unit; must not emit duplicate [0, 1).
      expect(findSearchMatches('\uFDF2', 'ل')).toEqual([{ start: 0, end: 1 }])
      // U+FEFC repeated 3 times ('ﻼﻼﻼ' -> 'لالالا') with 'ال' must not overlap at index 1.
      expect(findSearchMatches('\uFEFC\uFEFC\uFEFC', 'ال')).toEqual([{ start: 0, end: 2 }])
    })

    it('keeps foldSearchText, matchesSearch, and findSearchMatches on the exact same folded key across jamo, Arabic, Hebrew, ligatures, and emoji', () => {
      const pairs: Array<[string, string]> = [
        // Cross-cluster NFKC boundary cases (conjoining Hangul jamo vs precomposed syllable)
        ['\u1100\u1161', '\uAC00'],
        ['\uAC00', '\u1100\u1161'],
        ['\u1100\u1161', '\u1100\u1161'],
        ['\uAC00', '\uAC00'],
        ['\u304B\uFF9E', '\u304C'],
        // Arabic cases from this suite
        ['أحمد', 'احمد'],
        ['إبراهيم', 'ابراهيم'],
        ['آدم', 'ادم'],
        ['ٱلرحمن', 'الرحمن'],
        ['مؤمن', 'مومن'],
        ['رسائل', 'رسايل'],
        ['مُحَمَّدٌ', 'محمد'],
        ['عـبـدالله', 'عبدالله'],
        ['فاطمة', 'فاطمه'],
        ['مصطفى', 'مصطفي'],
        ['کتابخانه علی', 'كتابخانه علي'],
        ['طلب ١٢٣٤', 'طلب 1234'],
        ['شماره ۵۶۷۸', 'شماره 5678'],
        ['بِأَحْمَدَ وَمُحَمَّدٌ!', 'احمد'],
        ['بِأَحْمَدَ وَمُحَمَّدٌ!', 'محم'],
        ['أبو   \t  بكر', 'ابو بكر'],
        [isolateRuns('آخر تحديث 12-05-2024 بواسطة أَحْمَد', 'rtl'), 'اخر تحديث 12-05-2024 بواسطه احمد'],
        ['أحمد', 'امحد'],
        // Hebrew cases from this suite
        ['שָׁלוֹם עֲלֵיכֶם', 'שלום עליכם'],
        ['שָׁלוֹם דָּוִד!', 'דו'],
        ['שָׁלוֹם דָּוִד!', 'משה'],
        // Presentation ligature cases from this suite
        ['سﻼم ﻷَحْمَدَ في ﻻهور', 'سلام'],
        ['سﻼم ﻷَحْمَدَ في ﻻهور', 'لاحمد'],
        ['سﻼم ﻷَحْمَدَ في ﻻهور', 'لاهور'],
        ['سَلاَمٌ', 'سﻻم'],
        ['\uFDF2', 'الله'],
        ['\uFB49\uFB4B \uFB4F', 'שו אל'],
        // Surrogate-pair and ZWJ emoji cases from this suite
        ['😀 أَحْمَدُ 👨‍👩‍👧‍👦 مُحَمَّدٌ 👍🏽 إِبْرَاهِيمُ', 'احمد'],
        ['😀 أَحْمَدُ 👨‍👩‍👧‍👦 مُحَمَّدٌ 👍🏽 إِبْرَاهِيمُ', 'محمد'],
        ['😀 أَحْمَدُ 👨‍👩‍👧‍👦 مُحَمَّدٌ 👍🏽 إِبْرَاهِيمُ', 'ابراهيم'],
        ['😀 أَحْمَدُ 👨‍👩‍👧‍👦 مُحَمَّدٌ 👍🏽 إِبْرَاهِيمُ', '👨‍👩‍👧‍👦'],
        ['😀 أَحْمَدُ 👨‍👩‍👧‍👦 مُحَمَّدٌ 👍🏽 إِبْرَاهِيمُ', '🚀'],
      ]

      const optionSets: Array<SearchOptions | undefined> = [
        undefined,
        { taMarbuta: false },
        { alefMaqsura: false },
        { digits: false },
        { taMarbuta: false, alefMaqsura: false, digits: false },
      ]

      for (const opts of optionSets) {
        for (const [t, q] of pairs) {
          const foldedT = foldSearchText(t, opts)
          const foldedQ = foldSearchText(q, opts)
          expect(foldedQ.length).toBeGreaterThan(0)

          const matched = matchesSearch(t, q, opts)
          const ranges = findSearchMatches(t, q, opts)

          expect(matched).toBe(ranges.length > 0)
          expect(matched).toBe(foldedT.includes(foldedQ))
          expect(ranges.length > 0).toBe(foldedT.includes(foldedQ))

          // Querying t with its own foldSearchText(t) key searches that exact string
          if (foldedT && foldSearchText(foldedT, opts) === foldedT) {
            expect(matchesSearch(t, foldedT, opts)).toBe(true)
            expect(findSearchMatches(t, foldedT, opts).length).toBeGreaterThan(0)
          }
        }
      }
    })
  })

  describe('edge cases, defensive handling, and documented non-goals', () => {
    it('treats an empty or marks-only query as matching any string while returning [] for ranges', () => {
      for (const emptyOrMarks of ['', '\u064E\u0651', '\u0640', '\u05B8\u05C1', `${LRI}${PDI}`]) {
        expect(foldSearchText(emptyOrMarks)).toBe('')
        expect(matchesSearch('أحمد', emptyOrMarks)).toBe(true)
        expect(matchesSearch('', emptyOrMarks)).toBe(true)
        expect(findSearchMatches('أحمد', emptyOrMarks)).toEqual([])
        expect(findSearchMatches('', emptyOrMarks)).toEqual([])
      }
    })

    it('returns false and [] when text is empty or marks-only and query has content', () => {
      expect(matchesSearch('', 'احمد')).toBe(false)
      expect(findSearchMatches('', 'احمد')).toEqual([])
      expect(matchesSearch('\u064E\u0640', 'ا')).toBe(false)
      expect(findSearchMatches('\u064E\u0640', 'ا')).toEqual([])
      expect(matchesSearch('أب', 'ابجد')).toBe(false)
      expect(findSearchMatches('أب', 'ابجد')).toEqual([])
    })

    it('returns false / [] / "" for null and undefined text, even with an empty query', () => {
      expect(foldSearchText(null)).toBe('')
      expect(foldSearchText(undefined)).toBe('')
      expect(matchesSearch(null, 'احمد')).toBe(false)
      expect(matchesSearch(undefined, 'احمد')).toBe(false)
      expect(matchesSearch(null, '')).toBe(false)
      expect(matchesSearch(undefined, '')).toBe(false)
      expect(matchesSearch(null, '\u064E')).toBe(false)
      expect(findSearchMatches(null, 'احمد')).toEqual([])
      expect(findSearchMatches(undefined, 'احمد')).toEqual([])
      expect(findSearchMatches(null, '')).toEqual([])
      expect(matchesSearch('أحمد', null)).toBe(false)
      expect(findSearchMatches('أحمد', null)).toEqual([])
      expect(matchesSearch('أحمد', undefined)).toBe(false)
      expect(findSearchMatches('أحمد', undefined)).toEqual([])
    })

    it('never throws on non-string values or hostile options objects', () => {
      const badInputs: unknown[] = [
        42,
        Number.NaN,
        true,
        {},
        [],
        Symbol('q'),
        10n,
        () => 'أحمد',
        { toString: () => { throw new Error('boom') } },
      ]
      for (const bad of badInputs) {
        expect(() => foldSearchText(bad as string)).not.toThrow()
        expect(foldSearchText(bad as string)).toBe('')
        expect(matchesSearch(bad as string, 'ا')).toBe(false)
        expect(matchesSearch('ا', bad as string)).toBe(false)
        expect(findSearchMatches(bad as string, 'ا')).toEqual([])
        expect(findSearchMatches('ا', bad as string)).toEqual([])
      }

      expect(foldSearchText('فاطمة', null as never)).toBe('فاطمه')
      expect(foldSearchText('فاطمة', 5 as never)).toBe('فاطمه')

      const throwingOptions = {
        get taMarbuta(): boolean {
          throw new Error('options getter boom')
        },
      }
      expect(foldSearchText('فاطمة', throwingOptions)).toBe('')
      expect(matchesSearch('فاطمة', 'فاطمه', throwingOptions)).toBe(false)
      expect(findSearchMatches('فاطمة', 'فاطمه', throwingOptions)).toEqual([])
    })

    it('performs neither morphological stemming nor fuzzy typo matching', () => {
      // Broken plural / root relatives that do not share the folded substring.
      expect(matchesSearch('كتاب', 'كتب')).toBe(false)
      expect(matchesSearch('مدارس', 'مدرسة')).toBe(false)
      // Transposed letters (typo).
      expect(matchesSearch('أحمد', 'امحد')).toBe(false)
      expect(findSearchMatches('أحمد', 'امحد')).toEqual([])
    })

    it('is re-exported with its types from src/index.ts', () => {
      expect(entry.foldSearchText).toBe(foldSearchText)
      expect(entry.matchesSearch).toBe(matchesSearch)
      expect(entry.findSearchMatches).toBe(findSearchMatches)
      const opts: entry.SearchOptions = { taMarbuta: true, alefMaqsura: true, digits: true }
      const ranges: entry.SearchMatch[] = entry.findSearchMatches('أَحْمَدُ', 'احمد', opts)
      const typedRanges: SearchMatch[] = ranges
      expect(typedRanges).toEqual([{ start: 0, end: 8 }])
    })
  })
})
