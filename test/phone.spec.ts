import { describe, expect, it } from 'vitest'
import {
  FSI,
  LRI,
  LRM,
  PDI,
  RLI,
  RLM,
  formatPhone,
  normalizePhone,
  validatePhone,
} from '../src'
import type { PhoneRegion, PhoneType } from '../src'

describe('normalizePhone and validatePhone across all eight regions', () => {
  const validCases: Array<{
    label: string
    input: string
    defaultRegion?: PhoneRegion
    e164: string
    region: PhoneRegion
    type: PhoneType
  }> = [
    // Saudi Arabia (SA, +966) — CST NNP
    { label: 'SA mobile +966 (50)', input: '+966 50 123 4567', e164: '+966501234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile 00966 (53)', input: '00966-53-123-4567', e164: '+966531234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile local trunk 0 (54)', input: '054 123 4567', defaultRegion: 'SA', e164: '+966541234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile local no trunk 0 (55)', input: '551234567', defaultRegion: 'SA', e164: '+966551234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile +966 with (0) trunk (56)', input: '+966 (0)56 123 4567', e164: '+966561234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile bare CC (57)', input: '966571234567', e164: '+966571234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile Arabic-Indic local (58)', input: '٠٥٨ ١٢٣ ٤٥٦٧', defaultRegion: 'SA', e164: '+966581234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile Persian +966 (59)', input: '+۹۶۶ ۵۹ ۱۲۳ ۴۵۶۷', e164: '+966591234567', region: 'SA', type: 'mobile' },
    { label: 'SA mobile MVNO (51)', input: '+966 51 123 4567', e164: '+966511234567', region: 'SA', type: 'mobile' },
    { label: 'SA fixed Riyadh (11)', input: '+966 11 234 5678', e164: '+966112345678', region: 'SA', type: 'fixed' },
    { label: 'SA fixed Jeddah local trunk 0 (12)', input: '012-234-5678', defaultRegion: 'SA', e164: '+966122345678', region: 'SA', type: 'fixed' },
    { label: 'SA fixed Eastern (13)', input: '00966 13 234 5678', e164: '+966132345678', region: 'SA', type: 'fixed' },
    { label: 'SA fixed Madinah (14)', input: '+966 14 234 5678', e164: '+966142345678', region: 'SA', type: 'fixed' },
    { label: 'SA fixed Qassim (16)', input: '+966 16 234 5678', e164: '+966162345678', region: 'SA', type: 'fixed' },
    { label: 'SA fixed Asir (17)', input: '+966 17 234 5678', e164: '+966172345678', region: 'SA', type: 'fixed' },

    // United Arab Emirates (AE, +971) — TDRA NNP
    { label: 'AE mobile +971 (50)', input: '+971 50 123 4567', e164: '+971501234567', region: 'AE', type: 'mobile' },
    { label: 'AE mobile 00971 (52)', input: '00971 52 123 4567', e164: '+971521234567', region: 'AE', type: 'mobile' },
    { label: 'AE mobile local trunk 0 (54)', input: '054.123.4567', defaultRegion: 'AE', e164: '+971541234567', region: 'AE', type: 'mobile' },
    { label: 'AE mobile local no trunk 0 (55)', input: '551234567', defaultRegion: 'AE', e164: '+971551234567', region: 'AE', type: 'mobile' },
    { label: 'AE mobile +971 (0) trunk (56)', input: '(+971) (0)56 123-4567', e164: '+971561234567', region: 'AE', type: 'mobile' },
    { label: 'AE mobile Arabic-Indic (58)', input: '+٩٧١ ٥٨ ١٢٣ ٤٥٦٧', e164: '+971581234567', region: 'AE', type: 'mobile' },
    { label: 'AE fixed Abu Dhabi (2)', input: '+971 2 123 4567', e164: '+97121234567', region: 'AE', type: 'fixed' },
    { label: 'AE fixed Al Ain (3)', input: '03 123 4567', defaultRegion: 'AE', e164: '+97131234567', region: 'AE', type: 'fixed' },
    { label: 'AE fixed Dubai (4)', input: '00971 4 123 4567', e164: '+97141234567', region: 'AE', type: 'fixed' },
    { label: 'AE fixed Sharjah (6)', input: '+971 6 123 4567', e164: '+97161234567', region: 'AE', type: 'fixed' },
    { label: 'AE fixed RAK (7)', input: '+971 7 123 4567', e164: '+97171234567', region: 'AE', type: 'fixed' },
    { label: 'AE fixed Fujairah starting with 971 (9)', input: '97123456', defaultRegion: 'AE', e164: '+97197123456', region: 'AE', type: 'fixed' },

    // Kuwait (KW, +965) — CITRA NNP (closed 8-digit plan)
    { label: 'KW mobile +965 (5)', input: '+965 5012 3456', e164: '+96550123456', region: 'KW', type: 'mobile' },
    { label: 'KW mobile 00965 (6)', input: '00965 6012 3456', e164: '+96560123456', region: 'KW', type: 'mobile' },
    { label: 'KW mobile local (9)', input: '9012 3456', defaultRegion: 'KW', e164: '+96590123456', region: 'KW', type: 'mobile' },
    { label: 'KW mobile local starting with 965 (9)', input: '96512345', defaultRegion: 'KW', e164: '+96596512345', region: 'KW', type: 'mobile' },
    { label: 'KW mobile MVNO (41)', input: '+965 4112 3456', e164: '+96541123456', region: 'KW', type: 'mobile' },
    { label: 'KW mobile bare CC', input: '96550123456', e164: '+96550123456', region: 'KW', type: 'mobile' },
    { label: 'KW fixed (2)', input: '+965 2234 5678', e164: '+96522345678', region: 'KW', type: 'fixed' },
    { label: 'KW fixed Arabic-Indic local', input: '٢٢٣٤ ٥٦٧٨', defaultRegion: 'KW', e164: '+96522345678', region: 'KW', type: 'fixed' },

    // Qatar (QA, +974) — CRA NNP (closed 8-digit plan)
    { label: 'QA mobile +974 (3)', input: '+974 3312 3456', e164: '+97433123456', region: 'QA', type: 'mobile' },
    { label: 'QA mobile 00974 (5)', input: '00974-5512-3456', e164: '+97455123456', region: 'QA', type: 'mobile' },
    { label: 'QA mobile local (6)', input: '6612 3456', defaultRegion: 'QA', e164: '+97466123456', region: 'QA', type: 'mobile' },
    { label: 'QA mobile Persian (7)', input: '+۹۷۴ ۷۷۱۲ ۳۴۵۶', e164: '+97477123456', region: 'QA', type: 'mobile' },
    { label: 'QA fixed (4)', input: '+974 4412 3456', e164: '+97444123456', region: 'QA', type: 'fixed' },
    { label: 'QA fixed local', input: '4412.3456', defaultRegion: 'QA', e164: '+97444123456', region: 'QA', type: 'fixed' },

    // Bahrain (BH, +973) — TRA Bahrain NNP (closed 8-digit plan)
    { label: 'BH mobile +973 (3)', input: '+973 3612 3456', e164: '+97336123456', region: 'BH', type: 'mobile' },
    { label: 'BH mobile 00973 (66)', input: '00973 6634 5678', e164: '+97366345678', region: 'BH', type: 'mobile' },
    { label: 'BH mobile local', input: '3912-3456', defaultRegion: 'BH', e164: '+97339123456', region: 'BH', type: 'mobile' },
    { label: 'BH fixed (1)', input: '+973 1712 3456', e164: '+97317123456', region: 'BH', type: 'fixed' },
    { label: 'BH fixed Arabic-Indic 00973', input: '٠٠٩٧٣ ١٦١٢ ٣٤٥٦', e164: '+97316123456', region: 'BH', type: 'fixed' },

    // Oman (OM, +968) — TRA Oman NNP (closed 8-digit plan)
    { label: 'OM mobile +968 (9)', input: '+968 9212 3456', e164: '+96892123456', region: 'OM', type: 'mobile' },
    { label: 'OM mobile 00968 (7)', input: '00968 7912 3456', e164: '+96879123456', region: 'OM', type: 'mobile' },
    { label: 'OM mobile local starting with 968', input: '96812345', defaultRegion: 'OM', e164: '+96896812345', region: 'OM', type: 'mobile' },
    { label: 'OM mobile bare CC with defaultRegion OM', input: '96892123456', defaultRegion: 'OM', e164: '+96892123456', region: 'OM', type: 'mobile' },
    { label: 'OM fixed (2)', input: '+968 2412 3456', e164: '+96824123456', region: 'OM', type: 'fixed' },
    { label: 'OM fixed local', input: '2412 3456', defaultRegion: 'OM', e164: '+96824123456', region: 'OM', type: 'fixed' },

    // Egypt (EG, +20) — NTRA NNP
    { label: 'EG mobile Vodafone +20 (10)', input: '+20 10 1234 5678', e164: '+201012345678', region: 'EG', type: 'mobile' },
    { label: 'EG mobile Etisalat 0020 (11)', input: '0020 11 1234 5678', e164: '+201112345678', region: 'EG', type: 'mobile' },
    { label: 'EG mobile Orange local trunk 0 (12)', input: '012 1234 5678', defaultRegion: 'EG', e164: '+201212345678', region: 'EG', type: 'mobile' },
    { label: 'EG mobile WE Arabic-Indic local (15)', input: '٠١٥ ١٢٣٤ ٥٦٧٨', defaultRegion: 'EG', e164: '+201512345678', region: 'EG', type: 'mobile' },
    { label: 'EG mobile +20 with (0) trunk', input: '+20 (0)10-1234-5678', e164: '+201012345678', region: 'EG', type: 'mobile' },
    { label: 'EG mobile bare CC', input: '201012345678', e164: '+201012345678', region: 'EG', type: 'mobile' },
    { label: 'EG fixed Cairo +20 (2)', input: '+20 2 2345 6789', e164: '+20223456789', region: 'EG', type: 'fixed' },
    { label: 'EG fixed Cairo local starting with 20', input: '201234567', defaultRegion: 'EG', e164: '+20201234567', region: 'EG', type: 'fixed' },
    { label: 'EG fixed Alexandria (3)', input: '03 456 7890', defaultRegion: 'EG', e164: '+2034567890', region: 'EG', type: 'fixed' },
    { label: 'EG fixed Dakahlia regional (50)', input: '+20 50 234 5678', e164: '+20502345678', region: 'EG', type: 'fixed' },
    { label: 'EG fixed Qalyubia regional (13)', input: '013 234 5678', defaultRegion: 'EG', e164: '+20132345678', region: 'EG', type: 'fixed' },
    { label: 'EG fixed 10th of Ramadan 8-digit (15)', input: '+20 15 361 234', e164: '+2015361234', region: 'EG', type: 'fixed' },
    { label: 'EG fixed Aswan (97)', input: '+20 97 234 5678', e164: '+20972345678', region: 'EG', type: 'fixed' },

    // Jordan (JO, +962) — TRC NNP
    { label: 'JO mobile Orange +962 (77)', input: '+962 77 123 4567', e164: '+962771234567', region: 'JO', type: 'mobile' },
    { label: 'JO mobile Umniah 00962 (78)', input: '00962 78 123 4567', e164: '+962781234567', region: 'JO', type: 'mobile' },
    { label: 'JO mobile Zain local trunk 0 (79)', input: '079 123 4567', defaultRegion: 'JO', e164: '+962791234567', region: 'JO', type: 'mobile' },
    { label: 'JO mobile +962 (0) trunk', input: '+962 (0)79 123 4567', e164: '+962791234567', region: 'JO', type: 'mobile' },
    { label: 'JO mobile Persian digits', input: '۰۷۹ ۱۲۳ ۴۵۶۷', defaultRegion: 'JO', e164: '+962791234567', region: 'JO', type: 'mobile' },
    { label: 'JO fixed Irbid (2)', input: '+962 2 712 3456', e164: '+96227123456', region: 'JO', type: 'fixed' },
    { label: 'JO fixed South (3)', input: '03 212 3456', defaultRegion: 'JO', e164: '+96232123456', region: 'JO', type: 'fixed' },
    { label: 'JO fixed Zarqa (5)', input: '+962 5 312 3456', e164: '+96253123456', region: 'JO', type: 'fixed' },
    { label: 'JO fixed Amman (6)', input: '06 512 3456', defaultRegion: 'JO', e164: '+96265123456', region: 'JO', type: 'fixed' },

    // Mixed digits, Unicode dashes, NBSP, and bidi controls
    { label: 'mixed Arabic-Indic, Persian and ASCII digits', input: '+٩6۶ ٥0 ۱۲٣ 4٥6۷', e164: '+966501234567', region: 'SA', type: 'mobile' },
    { label: 'wrapped in LRI/PDI', input: `${LRI}+966 50 123 4567${PDI}`, e164: '+966501234567', region: 'SA', type: 'mobile' },
    { label: 'wrapped in RLI/PDI with LRM and RLM', input: `${RLI}${LRM}+971${RLM} 50 123 4567${PDI}`, e164: '+971501234567', region: 'AE', type: 'mobile' },
    { label: 'contains ALM, FSI, LRE/RLE/PDF/RLO', input: `\u061C${FSI}\u202A+20\u202C 10\u202E 1234\u202C 5678${PDI}`, e164: '+201012345678', region: 'EG', type: 'mobile' },
    { label: 'en dash, em dash, minus sign, NBSP, dots', input: '+966\u00A050\u2013123\u20144567', e164: '+966501234567', region: 'SA', type: 'mobile' },
    { label: 'explicit country code overrides defaultRegion', input: '+971 50 123 4567', defaultRegion: 'EG', e164: '+971501234567', region: 'AE', type: 'mobile' },
  ]

  it.each(validCases)('normalizes and validates: $label', ({ input, defaultRegion, e164, region, type }) => {
    expect(normalizePhone(input, defaultRegion ? { defaultRegion } : undefined)).toBe(e164)
    expect(validatePhone(input, defaultRegion ? { defaultRegion } : undefined)).toEqual({
      valid: true,
      e164,
      region,
      type,
    })
  })
})

describe('invalid phone inputs and failure reasons', () => {
  const invalidCases: Array<{
    label: string
    input: string
    options?: Parameters<typeof validatePhone>[1]
    reason: 'empty' | 'letters' | 'length' | 'prefix' | 'region'
    region?: PhoneRegion
    type?: PhoneType
  }> = [
    // Empty
    { label: 'empty string', input: '', reason: 'empty' },
    { label: 'whitespace only', input: '   \t\n ', reason: 'empty' },
    { label: 'bidi controls and punctuation only', input: `${LRI}${LRM} ( - . ) ${PDI}`, reason: 'empty' },

    // Letters and disallowed characters
    { label: 'Latin letters inside number', input: '+966 50 abc 4567', reason: 'letters' },
    { label: 'extension text', input: '+966 50 123 4567 ext 12', reason: 'letters' },
    { label: 'Arabic label mixed with number', input: 'هاتف +966 50 123 4567', reason: 'letters' },
    { label: 'hash symbol', input: '+966 50 123 #567', reason: 'letters' },
    { label: 'star symbol', input: '*966501234567', reason: 'letters' },
    { label: 'slash separator', input: '050/123/4567', options: { defaultRegion: 'SA' }, reason: 'letters' },

    // Bad length
    { label: 'bare plus sign', input: '+', reason: 'length' },
    { label: 'bare 00', input: '00', reason: 'length' },
    { label: 'country code only', input: '+966', reason: 'length', region: 'SA' },
    { label: 'SA mobile too short', input: '+966 50 123 456', reason: 'length', region: 'SA' },
    { label: 'SA mobile too long', input: '+966 50 123 45678', reason: 'length', region: 'SA' },
    { label: 'SA double trunk zero after CC', input: '+966 00 50 123 4567', reason: 'length', region: 'SA' },
    { label: 'AE mobile with 8 digits (fixed length)', input: '+971 50 123 456', reason: 'length', region: 'AE' },
    { label: 'AE fixed with 9 digits (mobile length)', input: '+971 4 123 45678', reason: 'length', region: 'AE' },
    { label: 'KW too short (7 digits)', input: '+965 5012 345', reason: 'length', region: 'KW' },
    { label: 'KW with trunk zero (9 digits)', input: '050123456', options: { defaultRegion: 'KW' }, reason: 'length', region: 'KW' },
    { label: 'QA too long (9 digits)', input: '+974 5512 34567', reason: 'length', region: 'QA' },
    { label: 'BH too short', input: '+973 3612 345', reason: 'length', region: 'BH' },
    { label: 'OM too long', input: '+968 9212 34567', reason: 'length', region: 'OM' },
    { label: 'EG mobile too short (9 digits)', input: '+20 10 123 4567', reason: 'length', region: 'EG' },
    { label: 'EG Cairo fixed too short (8 digits)', input: '+20 2 234 5678', reason: 'length', region: 'EG' },
    { label: 'EG Alexandria fixed too long (9 digits)', input: '+20 3 4567 8901', reason: 'length', region: 'EG' },
    { label: 'EG 15 prefix with 9 digits (neither 8 nor 10)', input: '+20 15 123 4567', reason: 'length', region: 'EG' },
    { label: 'JO mobile too short (8 digits)', input: '+962 79 123 456', reason: 'length', region: 'JO' },
    { label: 'JO fixed too long (9 digits)', input: '+962 6 5123 4567', reason: 'length', region: 'JO' },

    // Wrong prefix
    { label: 'double plus', input: '++966501234567', reason: 'prefix' },
    { label: 'plus in middle', input: '966+501234567', reason: 'prefix' },
    { label: 'trailing plus', input: '966501234567+', reason: 'prefix' },
    { label: 'SA unallocated mobile prefix 52', input: '+966 52 123 4567', reason: 'prefix', region: 'SA' },
    { label: 'SA unallocated fixed prefix 15', input: '+966 15 234 5678', reason: 'prefix', region: 'SA' },
    { label: 'SA invalid leading digit 4', input: '040 123 4567', options: { defaultRegion: 'SA' }, reason: 'prefix', region: 'SA' },
    { label: 'AE unallocated mobile prefix 51', input: '+971 51 123 4567', reason: 'prefix', region: 'AE' },
    { label: 'AE invalid fixed area code 8', input: '+971 8 123 4567', reason: 'prefix', region: 'AE' },
    { label: 'KW invalid prefix 8', input: '+965 8012 3456', reason: 'prefix', region: 'KW' },
    { label: 'KW invalid 4x prefix 42', input: '+965 4212 3456', reason: 'prefix', region: 'KW' },
    { label: 'KW leading zero 8 digits', input: '05012345', options: { defaultRegion: 'KW' }, reason: 'prefix', region: 'KW' },
    { label: 'QA invalid prefix 1', input: '+974 1234 5678', reason: 'prefix', region: 'QA' },
    { label: 'BH invalid prefix 8', input: '+973 8123 4567', reason: 'prefix', region: 'BH' },
    { label: 'OM invalid prefix 5', input: '+968 5123 4567', reason: 'prefix', region: 'OM' },
    { label: 'EG invalid mobile prefix 14', input: '+20 14 1234 5678', reason: 'prefix', region: 'EG' },
    { label: 'JO invalid mobile prefix 76', input: '+962 76 123 4567', reason: 'prefix', region: 'JO' },
    { label: 'JO invalid fixed area code 4', input: '+962 4 512 3456', reason: 'prefix', region: 'JO' },
    { label: 'SA fixed rejected by mobileOnly', input: '+966 11 234 5678', options: { mobileOnly: true }, reason: 'prefix', region: 'SA', type: 'fixed' },
    { label: 'EG fixed rejected by mobileOnly', input: '+20 2 2345 6789', options: { mobileOnly: true }, reason: 'prefix', region: 'EG', type: 'fixed' },
    { label: 'EG 15 fixed (8 digits) rejected by mobileOnly', input: '+20 15 361 234', options: { mobileOnly: true }, reason: 'prefix', region: 'EG', type: 'fixed' },

    // Region errors
    { label: 'unsupported country code +1', input: '+1 415 555 0199', reason: 'region' },
    { label: 'unsupported country code 0044', input: '0044 7911 123456', reason: 'region' },
    { label: 'triple zero prefix', input: '000966501234567', reason: 'region' },
    { label: 'local SA number with no defaultRegion', input: '050 123 4567', reason: 'region' },
    { label: 'local OM number starting with 968 with no defaultRegion', input: '96812345', reason: 'region' },
    { label: 'local number with multiple allowed regions and no defaultRegion', input: '050 123 4567', options: { regions: ['SA', 'AE'] }, reason: 'region' },
    { label: 'SA number excluded by regions filter', input: '+966 50 123 4567', options: { regions: ['AE', 'EG'] }, reason: 'region', region: 'SA' },
    { label: 'empty regions list rejects valid number', input: '+966 50 123 4567', options: { regions: [] }, reason: 'region', region: 'SA' },
  ]

  it.each(invalidCases)('rejects $label with reason "$reason"', ({ input, options, reason, region, type }) => {
    const result = validatePhone(input, options)
    expect(result.valid).toBe(false)
    expect(result.e164).toBe('')
    expect(result.reason).toBe(reason)
    if (region) expect(result.region).toBe(region)
    if (type) expect(result.type).toBe(type)
    if (!options?.regions && !options?.mobileOnly) {
      expect(normalizePhone(input, options?.defaultRegion ? { defaultRegion: options.defaultRegion } : undefined)).toBe('')
    }
  })

  it('uses the sole regions entry as defaultRegion for local inputs', () => {
    expect(validatePhone('050 123 4567', { regions: ['SA'] })).toEqual({
      valid: true,
      e164: '+966501234567',
      region: 'SA',
      type: 'mobile',
    })
    expect(validatePhone('010 1234 5678', { regions: ['EG'], mobileOnly: true })).toEqual({
      valid: true,
      e164: '+201012345678',
      region: 'EG',
      type: 'mobile',
    })
  })

  it('handles non-string inputs and unknown defaultRegion safely without throwing', () => {
    expect(normalizePhone(null as unknown as string)).toBe('')
    expect(validatePhone(undefined as unknown as string)).toEqual({ valid: false, e164: '', reason: 'empty' })
    expect(normalizePhone('0501234567', { defaultRegion: 'XX' as PhoneRegion })).toBe('')
    expect(validatePhone('0501234567', { defaultRegion: 'XX' as PhoneRegion })).toEqual({
      valid: false,
      e164: '',
      reason: 'region',
    })
  })
})

describe('formatPhone', () => {
  const groupingCases: Array<{ label: string, e164: string, formatted: string }> = [
    { label: 'SA mobile', e164: '+966501234567', formatted: '+966 50 123 4567' },
    { label: 'SA fixed', e164: '+966112345678', formatted: '+966 11 234 5678' },
    { label: 'AE mobile', e164: '+971501234567', formatted: '+971 50 123 4567' },
    { label: 'AE fixed', e164: '+97141234567', formatted: '+971 4 123 4567' },
    { label: 'KW mobile', e164: '+96550123456', formatted: '+965 5012 3456' },
    { label: 'KW fixed', e164: '+96522345678', formatted: '+965 2234 5678' },
    { label: 'QA mobile', e164: '+97455123456', formatted: '+974 5512 3456' },
    { label: 'QA fixed', e164: '+97444123456', formatted: '+974 4412 3456' },
    { label: 'BH mobile', e164: '+97336123456', formatted: '+973 3612 3456' },
    { label: 'BH fixed', e164: '+97317123456', formatted: '+973 1712 3456' },
    { label: 'OM mobile', e164: '+96892123456', formatted: '+968 9212 3456' },
    { label: 'OM fixed', e164: '+96824123456', formatted: '+968 2412 3456' },
    { label: 'EG mobile', e164: '+201012345678', formatted: '+20 10 1234 5678' },
    { label: 'EG Cairo fixed', e164: '+20223456789', formatted: '+20 2 2345 6789' },
    { label: 'EG Alexandria fixed', e164: '+2034567890', formatted: '+20 3 456 7890' },
    { label: 'EG regional fixed', e164: '+20502345678', formatted: '+20 50 234 5678' },
    { label: 'EG 10th of Ramadan fixed', e164: '+2015361234', formatted: '+20 15 361 234' },
    { label: 'JO mobile', e164: '+962791234567', formatted: '+962 79 123 4567' },
    { label: 'JO fixed', e164: '+96265123456', formatted: '+962 6 512 3456' },
  ]

  it.each(groupingCases)('groups $label and isolates with LRI...PDI by default', ({ e164, formatted }) => {
    expect(formatPhone(e164)).toBe(`${LRI}${formatted}${PDI}`)
    expect(formatPhone(e164, { isolate: false })).toBe(formatted)
  })

  it('formats in ar, ar-EG, and en with latn and arab digits and isolate on/off', () => {
    const sa = '+966501234567'
    const eg = '+201012345678'

    // en
    expect(formatPhone(sa, { locale: 'en' })).toBe(`${LRI}+966 50 123 4567${PDI}`)
    expect(formatPhone(sa, { locale: 'en', numberingSystem: 'latn', isolate: false })).toBe('+966 50 123 4567')
    expect(formatPhone(sa, { locale: 'en', numberingSystem: 'arab' })).toBe(`${LRI}+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧${PDI}`)
    expect(formatPhone(sa, { locale: 'en', numberingSystem: 'arab', isolate: false })).toBe('+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧')

    // ar
    expect(formatPhone(sa, { locale: 'ar', numberingSystem: 'latn' })).toBe(`${LRI}+966 50 123 4567${PDI}`)
    expect(formatPhone(sa, { locale: 'ar', numberingSystem: 'latn', isolate: false })).toBe('+966 50 123 4567')
    expect(formatPhone(sa, { locale: 'ar', numberingSystem: 'arab' })).toBe(`${LRI}+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧${PDI}`)
    expect(formatPhone(sa, { locale: 'ar', numberingSystem: 'arab', isolate: false })).toBe('+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧')

    // ar-EG (defaults to arab digits in ICU)
    expect(formatPhone(eg, { locale: 'ar-EG' })).toBe(`${LRI}+٢٠ ١٠ ١٢٣٤ ٥٦٧٨${PDI}`)
    expect(formatPhone(eg, { locale: 'ar-EG', isolate: false })).toBe('+٢٠ ١٠ ١٢٣٤ ٥٦٧٨')
    expect(formatPhone(eg, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe(`${LRI}+٢٠ ١٠ ١٢٣٤ ٥٦٧٨${PDI}`)
    expect(formatPhone(eg, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe(`${LRI}+20 10 1234 5678${PDI}`)
    expect(formatPhone(eg, { locale: 'ar-EG', numberingSystem: 'latn', isolate: false })).toBe('+20 10 1234 5678')
  })

  it('supports Persian arabext, locale -u-nu- extension, underscore tags, and safe fallbacks', () => {
    expect(formatPhone('+966501234567', { locale: 'fa', isolate: false })).toBe('+۹۶۶ ۵۰ ۱۲۳ ۴۵۶۷')
    expect(formatPhone('+966501234567', { locale: 'ar-EG-u-nu-latn', isolate: false })).toBe('+966 50 123 4567')
    expect(formatPhone('+966501234567', { locale: 'ar_EG', isolate: false })).toBe('+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧')
    expect(formatPhone('+966501234567', { locale: 'ar-EG', numberingSystem: 'not-real', isolate: false })).toBe('+966 50 123 4567')
    expect(formatPhone('+966501234567', { locale: '!!!', isolate: false })).toBe('+966 50 123 4567')
  })

  it('round-trips formatted isolated Arabic-Indic output back to E.164', () => {
    const formatted = formatPhone('+201012345678', { locale: 'ar-EG', numberingSystem: 'arab', isolate: true })
    expect(normalizePhone(formatted)).toBe('+201012345678')
  })

  it('returns an empty string for empty or invalid input without wrapping in LRI/PDI', () => {
    expect(formatPhone('')).toBe('')
    expect(formatPhone('invalid')).toBe('')
    expect(formatPhone('+14155550199')).toBe('')
    expect(formatPhone('0501234567')).toBe('')
    expect(formatPhone(null as unknown as string)).toBe('')
  })
})
