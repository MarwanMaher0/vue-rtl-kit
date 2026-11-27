/**
 * Normalization, validation, and bidi-safe formatting for Arab-region phone
 * numbers.
 *
 * The bug this file exists for: Arabic checkout forms receive phone numbers
 * typed with Arabic-Indic (`٠١٢٣`) or Persian (`۰۱۲۳`) digits, spaces, dashes,
 * dots, parentheses, stray Unicode bidi controls, `00` or `+` prefixes, and
 * local trunk zeros — and when an international number like `+966 50 123 4567`
 * is interpolated into an Arabic paragraph without a left-to-right isolate,
 * the Unicode Bidirectional Algorithm moves the `+` to the visual right and
 * reverses the digit groups.
 *
 * Built-in rules cover eight regulators' National Numbering Plans (NNP) with
 * zero dependencies and zero Vue imports:
 * - SA (+966): CST (formerly CITC) National Numbering Plan
 * - AE (+971): TDRA National Numbering Plan
 * - KW (+965): CITRA National Numbering Plan
 * - QA (+974): CRA National Numbering Plan
 * - BH (+973): TRA Bahrain National Numbering Plan
 * - OM (+968): TRA Oman National Numbering Plan
 * - EG (+20):  NTRA National Numbering Plan
 * - JO (+962): TRC National Numbering Plan
 */
import { LRI, PDI, stripBidiControls } from './bidi'
import { transliterateDigits, withNumberingSystem } from './format'

/** Supported ISO 3166-1 alpha-2 region codes. */
export type PhoneRegion = 'SA' | 'AE' | 'KW' | 'QA' | 'BH' | 'OM' | 'EG' | 'JO'

/** Line classification reported by {@link validatePhone}. */
export type PhoneType = 'mobile' | 'fixed'

/** Failure reason reported by {@link validatePhone}. */
export type PhoneInvalidReason = 'empty' | 'letters' | 'length' | 'prefix' | 'region'

/** Options for {@link normalizePhone}. */
export interface NormalizePhoneOptions {
  /** Region assumed when `value` has no international `+` or `00` prefix. */
  defaultRegion?: PhoneRegion
}

/** Options for {@link validatePhone}. */
export interface ValidatePhoneOptions {
  /**
   * Restrict accepted numbers to these regions. When omitted, all eight
   * regions are accepted. If exactly one region is listed and `defaultRegion`
   * is omitted, that region is also used as the default for local numbers.
   */
  regions?: readonly PhoneRegion[]
  /** Reject fixed-line numbers when `true` (default `false`). */
  mobileOnly?: boolean
  /** Region assumed when `value` has no international `+` or `00` prefix. */
  defaultRegion?: PhoneRegion
}

/** Result returned by {@link validatePhone}. */
export interface PhoneValidationResult {
  valid: boolean
  /** Canonical E.164 string when valid (e.g. `'+966501234567'`), or `''`. */
  e164: string
  /** Matched region when one could be determined. */
  region?: PhoneRegion
  /** Line type when the number matches a regional mobile or fixed rule. */
  type?: PhoneType
  /** Why validation failed. Present only when `valid` is `false`. */
  reason?: PhoneInvalidReason
}

/** Options for {@link formatPhone}. */
export interface FormatPhoneOptions {
  /** BCP-47 locale tag used to pick the default digit shape when `numberingSystem` is omitted. Defaults to `'en'`. */
  locale?: string
  /** Digits to use: `'latn'` for `0123`, `'arab'` for `٠١٢٣`, `'arabext'` for `۰۱۲۳`, or any CLDR numbering system. */
  numberingSystem?: string
  /**
   * Wrap the formatted number in `U+2066 LRI` ... `U+2069 PDI` so the leading
   * `+` stays on the left and digit groups read left to right inside Arabic
   * text. Defaults to `true`.
   */
  isolate?: boolean
}

interface PhoneRule {
  readonly type: PhoneType
  readonly prefix: RegExp
  readonly length: number
  readonly groups: readonly number[]
}

interface RegionSpec {
  readonly cc: string
  readonly trunkZero: boolean
  readonly rules: readonly PhoneRule[]
}

const REGION_SPECS: Record<PhoneRegion, RegionSpec> = {
  // CST (formerly CITC) Saudi Arabia National Numbering Plan:
  // +966, trunk 0, 9-digit NSN; mobile 50/51/53-59, geographic 11/12/13/14/16/17.
  SA: {
    cc: '966',
    trunkZero: true,
    rules: [
      { type: 'mobile', prefix: /^5[013-9]/, length: 9, groups: [2, 3, 4] },
      { type: 'fixed', prefix: /^1[1-467]/, length: 9, groups: [2, 3, 4] },
    ],
  },
  // TDRA UAE National Numbering Plan:
  // +971, trunk 0; 9-digit mobile 50/52/54/55/56/58, 8-digit geographic 2/3/4/6/7/9.
  AE: {
    cc: '971',
    trunkZero: true,
    rules: [
      { type: 'mobile', prefix: /^5[024568]/, length: 9, groups: [2, 3, 4] },
      { type: 'fixed', prefix: /^[234679]/, length: 8, groups: [1, 3, 4] },
    ],
  },
  // CITRA Kuwait National Numbering Plan:
  // +965, closed 8-digit plan (no trunk 0); mobile 5/6/9 and 41 (MVNO), fixed 2.
  KW: {
    cc: '965',
    trunkZero: false,
    rules: [
      { type: 'mobile', prefix: /^(?:[569]|41)/, length: 8, groups: [4, 4] },
      { type: 'fixed', prefix: /^2/, length: 8, groups: [4, 4] },
    ],
  },
  // CRA Qatar National Numbering Plan:
  // +974, closed 8-digit plan (no trunk 0); mobile 3/5/6/7, fixed 4.
  QA: {
    cc: '974',
    trunkZero: false,
    rules: [
      { type: 'mobile', prefix: /^[3567]/, length: 8, groups: [4, 4] },
      { type: 'fixed', prefix: /^4/, length: 8, groups: [4, 4] },
    ],
  },
  // TRA Bahrain National Numbering Plan:
  // +973, closed 8-digit plan (no trunk 0); mobile 3 and 66, fixed 1.
  BH: {
    cc: '973',
    trunkZero: false,
    rules: [
      { type: 'mobile', prefix: /^(?:3|66)/, length: 8, groups: [4, 4] },
      { type: 'fixed', prefix: /^1/, length: 8, groups: [4, 4] },
    ],
  },
  // TRA Oman National Numbering Plan:
  // +968, closed 8-digit plan (no trunk 0); mobile 7/9, fixed 2.
  OM: {
    cc: '968',
    trunkZero: false,
    rules: [
      { type: 'mobile', prefix: /^[79]/, length: 8, groups: [4, 4] },
      { type: 'fixed', prefix: /^2/, length: 8, groups: [4, 4] },
    ],
  },
  // NTRA Egypt National Numbering Plan:
  // +20, trunk 0; 10-digit mobile 10/11/12/15, 9-digit Cairo/Giza (2) and
  // regional governorates, 8-digit Alexandria (3) and 10th of Ramadan (15).
  EG: {
    cc: '20',
    trunkZero: true,
    rules: [
      { type: 'mobile', prefix: /^1[0125]/, length: 10, groups: [2, 4, 4] },
      { type: 'fixed', prefix: /^2/, length: 9, groups: [1, 4, 4] },
      { type: 'fixed', prefix: /^3/, length: 8, groups: [1, 3, 4] },
      { type: 'fixed', prefix: /^(?:13|4[05-8]|5[057]|6[24-689]|8[2468]|9[235-7])/, length: 9, groups: [2, 3, 4] },
      { type: 'fixed', prefix: /^15/, length: 8, groups: [2, 3, 3] },
    ],
  },
  // TRC Jordan National Numbering Plan:
  // +962, trunk 0; 9-digit mobile 77/78/79, 8-digit geographic 2/3/5/6.
  JO: {
    cc: '962',
    trunkZero: true,
    rules: [
      { type: 'mobile', prefix: /^7[789]/, length: 9, groups: [2, 3, 4] },
      { type: 'fixed', prefix: /^[2356]/, length: 8, groups: [1, 3, 4] },
    ],
  },
}

const REGION_ENTRIES = /*#__PURE__*/ Object.entries(REGION_SPECS) as [PhoneRegion, RegionSpec][]

/** Spaces, parentheses, dots, and ASCII/Unicode hyphens and dashes stripped during normalization. */
const SEPARATORS = /[\s().\-\u2010-\u2014\u2212]/g
const LETTER = /\p{L}/u

/** Cached digit-script lookup per resolved locale tag (LRU bounded to 32). */
const DIGIT_CACHE_LIMIT = 32
const digitCache = /*#__PURE__*/ new Map<string, string | string[]>()

function hasRegion(region: unknown): region is PhoneRegion {
  return typeof region === 'string' && Object.prototype.hasOwnProperty.call(REGION_SPECS, region)
}

function stripTrunkZero(spec: RegionSpec, national: string): string {
  return spec.trunkZero && national.startsWith('0') ? national.slice(1) : national
}

function hasValidLength(spec: RegionSpec, length: number): boolean {
  return spec.rules.some(rule => rule.length === length)
}

function matchCountryCode(digits: string): [PhoneRegion, RegionSpec] | undefined {
  return REGION_ENTRIES.find(([, spec]) => digits.startsWith(spec.cc))
}

interface ParsedPhone {
  valid: boolean
  e164: string
  region?: PhoneRegion
  type?: PhoneType
  reason?: PhoneInvalidReason
  national?: string
  rule?: PhoneRule
}

function evaluateRegional(region: PhoneRegion, spec: RegionSpec, national: string): ParsedPhone {
  const matched = spec.rules.find(rule => rule.length === national.length && rule.prefix.test(national))
  if (matched) {
    return {
      valid: true,
      e164: `+${spec.cc}${national}`,
      region,
      type: matched.type,
      national,
      rule: matched,
    }
  }
  if (spec.rules.some(rule => rule.prefix.test(national))) {
    return { valid: false, e164: '', region, reason: 'length' }
  }
  return {
    valid: false,
    e164: '',
    region,
    reason: hasValidLength(spec, national.length) ? 'prefix' : 'length',
  }
}

function parsePhone(value: string, defaultRegion?: PhoneRegion): ParsedPhone {
  if (typeof value !== 'string') return { valid: false, e164: '', reason: 'empty' }
  const compact = transliterateDigits(stripBidiControls(value), 'latn').replace(SEPARATORS, '')
  if (!compact) return { valid: false, e164: '', reason: 'empty' }
  if (LETTER.test(compact)) return { valid: false, e164: '', reason: 'letters' }
  if (/[^0-9+]/.test(compact)) return { valid: false, e164: '', reason: 'letters' }
  if (compact.indexOf('+', 1) !== -1) return { valid: false, e164: '', reason: 'prefix' }

  const hasIntl = compact.startsWith('+') || compact.startsWith('00')
  if (hasIntl) {
    const digits = compact.startsWith('+') ? compact.slice(1) : compact.slice(2)
    if (!digits) return { valid: false, e164: '', reason: 'length' }
    const hit = matchCountryCode(digits)
    if (!hit) return { valid: false, e164: '', reason: 'region' }
    const [region, spec] = hit
    return evaluateRegional(region, spec, stripTrunkZero(spec, digits.slice(spec.cc.length)))
  }

  if (defaultRegion !== undefined) {
    if (!hasRegion(defaultRegion)) return { valid: false, e164: '', reason: 'region' }
    const spec = REGION_SPECS[defaultRegion]
    const localNational = stripTrunkZero(spec, compact)
    if (hasValidLength(spec, localNational.length)) {
      return evaluateRegional(defaultRegion, spec, localNational)
    }
    const bare = matchCountryCode(compact)
    if (bare) {
      const [region, bareSpec] = bare
      const bareNational = stripTrunkZero(bareSpec, compact.slice(bareSpec.cc.length))
      if (hasValidLength(bareSpec, bareNational.length)) {
        return evaluateRegional(region, bareSpec, bareNational)
      }
    }
    return evaluateRegional(defaultRegion, spec, localNational)
  }

  const bare = matchCountryCode(compact)
  if (bare) {
    const [region, bareSpec] = bare
    const bareNational = stripTrunkZero(bareSpec, compact.slice(bareSpec.cc.length))
    if (hasValidLength(bareSpec, bareNational.length)) {
      return evaluateRegional(region, bareSpec, bareNational)
    }
  }
  return { valid: false, e164: '', reason: 'region' }
}

/**
 * Normalize a user-typed phone number for SA, AE, KW, QA, BH, OM, EG, or JO
 * into canonical E.164 format (e.g. `'+966501234567'`), or `''` if invalid.
 *
 * Maps Arabic-Indic (`٠-٩`) and Persian (`۰-۹`) digits to ASCII, strips bidi
 * controls, spaces, dashes, dots, and parentheses, accepts `+`, `00`, and the
 * regional trunk `0`, and rejects letters.
 */
export function normalizePhone(value: string, options?: NormalizePhoneOptions): string {
  const parsed = parsePhone(value, options?.defaultRegion)
  return parsed.valid ? parsed.e164 : ''
}

/**
 * Validate a phone number against the built-in regulator numbering plans for
 * SA, AE, KW, QA, BH, OM, EG, and JO.
 */
export function validatePhone(value: string, options?: ValidatePhoneOptions): PhoneValidationResult {
  const allowed = options?.regions
  const defaultRegion = options?.defaultRegion ?? (allowed?.length === 1 ? allowed[0] : undefined)
  const parsed = parsePhone(value, defaultRegion)

  if (parsed.region && allowed && !allowed.includes(parsed.region)) {
    return { valid: false, e164: '', region: parsed.region, reason: 'region' }
  }
  if (!parsed.valid) {
    const result: PhoneValidationResult = { valid: false, e164: '', reason: parsed.reason }
    if (parsed.region) result.region = parsed.region
    return result
  }
  if (options?.mobileOnly && parsed.type !== 'mobile') {
    return { valid: false, e164: '', region: parsed.region, type: parsed.type, reason: 'prefix' }
  }
  return {
    valid: true,
    e164: parsed.e164,
    region: parsed.region,
    type: parsed.type,
  }
}

function resolveDigitSystem(locale: string, numberingSystem?: string): string | string[] {
  const base = locale.replace(/_/g, '-')
  const key = withNumberingSystem(base, numberingSystem)
  let cached = digitCache.get(key)
  if (cached !== undefined) {
    digitCache.delete(key)
    digitCache.set(key, cached)
    return cached
  }

  let formatter: Intl.NumberFormat | undefined
  for (const candidate of [base, base.split('-')[0]!]) {
    try {
      formatter = new Intl.NumberFormat(withNumberingSystem(candidate, numberingSystem), { useGrouping: false })
      break
    }
    catch {
      continue
    }
  }
  formatter ??= new Intl.NumberFormat(withNumberingSystem('en', numberingSystem), { useGrouping: false })
  const system = formatter.resolvedOptions().numberingSystem
  if (system === 'latn' || system === 'arab' || system === 'arabext') {
    cached = system
  }
  else {
    cached = Array.from({ length: 10 }, (_, d) => formatter.format(d))
  }

  if (digitCache.size >= DIGIT_CACHE_LIMIT) {
    digitCache.delete(digitCache.keys().next().value!)
  }
  digitCache.set(key, cached)
  return cached
}

function groupDigits(national: string, groups: readonly number[]): string {
  const parts: string[] = []
  let offset = 0
  for (const size of groups) {
    parts.push(national.slice(offset, offset + size))
    offset += size
  }
  return parts.join(' ')
}

/**
 * Format an E.164 phone number according to its region's documented grouping
 * convention, apply the locale's (or requested) digit script, and wrap the
 * result in `U+2066 LRI` ... `U+2069 PDI` by default so the leading `+` stays
 * on the left inside Arabic/RTL text.
 *
 * Returns `''` if `e164` is empty or does not match a supported region.
 */
export function formatPhone(e164: string, options: FormatPhoneOptions = {}): string {
  const parsed = parsePhone(e164)
  if (!parsed.valid || !parsed.region || !parsed.national || !parsed.rule) return ''

  const { locale = 'en', numberingSystem, isolate = true } = options
  const spec = REGION_SPECS[parsed.region]
  const grouped = `+${spec.cc} ${groupDigits(parsed.national, parsed.rule.groups)}`

  let text = grouped
  if (numberingSystem !== undefined || locale !== 'en') {
    const system = resolveDigitSystem(locale, numberingSystem)
    if (system === 'arab' || system === 'arabext') {
      text = transliterateDigits(grouped, system)
    }
    else if (Array.isArray(system)) {
      text = grouped.replace(/[0-9]/g, d => system[Number(d)]!)
    }
  }

  return isolate ? `${LRI}${text}${PDI}` : text
}
