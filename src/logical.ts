/**
 * Physical <-> logical CSS property mapping.
 *
 * CSS logical properties (`margin-inline-start`, `inset-inline-end`, ...) solve
 * direction in the stylesheet. They do not help when a value has to be computed
 * in JavaScript - a drag offset, a popover position, a chart label, a style
 * binding built from props - and that is what this module is for.
 */
import type { Direction } from './types'

/** Physical property name -> logical property name, in camelCase. */
const FLOW_RELATIVE: Readonly<Record<string, string>> = {
  marginLeft: 'marginInlineStart',
  marginRight: 'marginInlineEnd',
  marginTop: 'marginBlockStart',
  marginBottom: 'marginBlockEnd',
  paddingLeft: 'paddingInlineStart',
  paddingRight: 'paddingInlineEnd',
  paddingTop: 'paddingBlockStart',
  paddingBottom: 'paddingBlockEnd',
  borderLeft: 'borderInlineStart',
  borderRight: 'borderInlineEnd',
  borderTop: 'borderBlockStart',
  borderBottom: 'borderBlockEnd',
  borderLeftWidth: 'borderInlineStartWidth',
  borderRightWidth: 'borderInlineEndWidth',
  borderTopWidth: 'borderBlockStartWidth',
  borderBottomWidth: 'borderBlockEndWidth',
  borderLeftStyle: 'borderInlineStartStyle',
  borderRightStyle: 'borderInlineEndStyle',
  borderTopStyle: 'borderBlockStartStyle',
  borderBottomStyle: 'borderBlockEndStyle',
  borderLeftColor: 'borderInlineStartColor',
  borderRightColor: 'borderInlineEndColor',
  borderTopColor: 'borderBlockStartColor',
  borderBottomColor: 'borderBlockEndColor',
  borderTopLeftRadius: 'borderStartStartRadius',
  borderTopRightRadius: 'borderStartEndRadius',
  borderBottomLeftRadius: 'borderEndStartRadius',
  borderBottomRightRadius: 'borderEndEndRadius',
  left: 'insetInlineStart',
  right: 'insetInlineEnd',
  top: 'insetBlockStart',
  bottom: 'insetBlockEnd',
  scrollMarginLeft: 'scrollMarginInlineStart',
  scrollMarginRight: 'scrollMarginInlineEnd',
  scrollMarginTop: 'scrollMarginBlockStart',
  scrollMarginBottom: 'scrollMarginBlockEnd',
  scrollPaddingLeft: 'scrollPaddingInlineStart',
  scrollPaddingRight: 'scrollPaddingInlineEnd',
  scrollPaddingTop: 'scrollPaddingBlockStart',
  scrollPaddingBottom: 'scrollPaddingBlockEnd',
  overflowX: 'overflowInline',
  overflowY: 'overflowBlock',
}

/**
 * Size properties. Identical to their physical twins in horizontal writing
 * modes, so converting them is opt-in via `{ size: true }`.
 */
const SIZE_RELATIVE: Readonly<Record<string, string>> = {
  width: 'inlineSize',
  height: 'blockSize',
  minWidth: 'minInlineSize',
  minHeight: 'minBlockSize',
  maxWidth: 'maxInlineSize',
  maxHeight: 'maxBlockSize',
}

const LOGICAL_TO_PHYSICAL_STATIC: Readonly<Record<string, string>> = {
  overflowInline: 'overflowX',
  overflowBlock: 'overflowY',
  inlineSize: 'width',
  blockSize: 'height',
  minInlineSize: 'minWidth',
  minBlockSize: 'minHeight',
  maxInlineSize: 'maxWidth',
  maxBlockSize: 'maxHeight',
}

/** Property values that are themselves directional. */
const VALUE_MAP: Readonly<Record<string, Record<string, string>>> = {
  textAlign: { left: 'start', right: 'end' },
  float: { left: 'inline-start', right: 'inline-end' },
  clear: { left: 'inline-start', right: 'inline-end' },
  captionSide: { left: 'inline-start', right: 'inline-end' },
  resize: { horizontal: 'inline', vertical: 'block' },
}

const PHYSICAL_TO_LOGICAL = FLOW_RELATIVE

/** Kebab-case a camelCase property name. */
function toKebab(name: string): string {
  return name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
}

/** camelCase a kebab-case property name. */
function toCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

export interface LogicalStyleOptions {
  /** Also map `width`/`height` to `inlineSize`/`blockSize`. Default `false`. */
  size?: boolean
  /** Map directional values such as `textAlign: 'left'`. Default `true`. */
  values?: boolean
}

/**
 * Map one physical CSS property name to its logical equivalent.
 *
 * Accepts and preserves either casing, so it works with both DOM style objects
 * and raw CSS strings. Unknown names are returned untouched.
 *
 * @example
 * logicalProperty('marginLeft') // 'marginInlineStart'
 * logicalProperty('padding-right') // 'padding-inline-end'
 */
export function logicalProperty(property: string, options: LogicalStyleOptions = {}): string {
  const kebab = property.includes('-')
  const camel = kebab ? toCamel(property) : property
  const mapped = PHYSICAL_TO_LOGICAL[camel] ?? (options.size ? SIZE_RELATIVE[camel] : undefined)
  if (!mapped) return property
  return kebab ? toKebab(mapped) : mapped
}

/**
 * A style object, shaped to drop straight into Vue's `:style` binding - which
 * is why `null` is not allowed: `CSSProperties` does not accept it.
 */
export type StyleObject = Record<string, string | number | undefined>

/**
 * Rewrite a style object so every physical property becomes a logical one.
 *
 * Directions are never guessed: the output is direction-agnostic and the
 * browser resolves it, which means the same object is correct in both
 * directions and survives a runtime direction flip with no recompute.
 *
 * @example
 * toLogicalStyle({ marginLeft: '8px', textAlign: 'left' })
 * // => { marginInlineStart: '8px', textAlign: 'start' }
 */
export function toLogicalStyle<T extends StyleObject>(style: T, options: LogicalStyleOptions = {}): StyleObject {
  const mapValues = options.values ?? true
  const out: StyleObject = {}

  for (const [key, value] of Object.entries(style)) {
    const property = logicalProperty(key, options)
    const camel = key.includes('-') ? toCamel(key) : key
    const valueMap = mapValues ? VALUE_MAP[camel] : undefined
    out[property] = valueMap && typeof value === 'string' ? (valueMap[value] ?? value) : value
  }

  return out
}

/**
 * Resolve logical properties back to physical ones for a given direction.
 *
 * The escape hatch for places CSS logical properties never reach: `<canvas>`,
 * inline SVG, PDF and email templates, and the odd legacy WebView.
 *
 * @example
 * toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
 * // => { marginRight: '8px' }
 */
export function toPhysicalStyle<T extends StyleObject>(style: T, dir: Direction): StyleObject {
  const rtl = dir === 'rtl'
  const out: StyleObject = {}

  for (const [key, value] of Object.entries(style)) {
    const kebab = key.includes('-')
    const camel = kebab ? toCamel(key) : key
    let property = camel
    let next = value

    if (LOGICAL_TO_PHYSICAL_STATIC[camel]) {
      property = LOGICAL_TO_PHYSICAL_STATIC[camel]!
    }
    else if (/Inline(Start|End)/.test(camel)) {
      const side = camel.includes('Start') === !rtl ? 'Left' : 'Right'
      property = camel.replace(/Inline(Start|End)/, side).replace(/^inset(Left|Right)$/, m => m.slice(5).toLowerCase())
    }
    else if (/Block(Start|End)/.test(camel)) {
      const side = camel.includes('Start') ? 'Top' : 'Bottom'
      property = camel.replace(/Block(Start|End)/, side).replace(/^inset(Top|Bottom)$/, m => m.slice(5).toLowerCase())
    }
    else if (camel === 'borderStartStartRadius') property = rtl ? 'borderTopRightRadius' : 'borderTopLeftRadius'
    else if (camel === 'borderStartEndRadius') property = rtl ? 'borderTopLeftRadius' : 'borderTopRightRadius'
    else if (camel === 'borderEndStartRadius') property = rtl ? 'borderBottomRightRadius' : 'borderBottomLeftRadius'
    else if (camel === 'borderEndEndRadius') property = rtl ? 'borderBottomLeftRadius' : 'borderBottomRightRadius'

    if (typeof value === 'string' && (camel === 'textAlign' || camel === 'float' || camel === 'clear' || camel === 'captionSide')) {
      const physical = value === 'start' || value === 'inline-start'
        ? (rtl ? 'right' : 'left')
        : value === 'end' || value === 'inline-end'
          ? (rtl ? 'left' : 'right')
          : value
      next = physical
    }
    else if (typeof value === 'string' && camel === 'resize') {
      next = value === 'inline' ? 'horizontal' : value === 'block' ? 'vertical' : value
    }

    out[kebab ? toKebab(property) : property] = next
  }

  return out
}
