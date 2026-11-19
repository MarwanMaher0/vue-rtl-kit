import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { RtlProvider } from '../src/components'
import { createRtl } from '../src/core'
import { useLogicalStyles } from '../src/composables/useLogicalStyles'
import { logicalArrow as rootLogicalArrow } from '../src/index'
import { logicalArrow, logicalProperty, toLogicalStyle, toPhysicalStyle } from '../src/logical'

describe('logicalProperty', () => {
  it('maps inline-axis properties', () => {
    expect(logicalProperty('marginLeft')).toBe('marginInlineStart')
    expect(logicalProperty('marginRight')).toBe('marginInlineEnd')
    expect(logicalProperty('paddingLeft')).toBe('paddingInlineStart')
    expect(logicalProperty('left')).toBe('insetInlineStart')
    expect(logicalProperty('right')).toBe('insetInlineEnd')
  })

  it('maps block-axis properties', () => {
    expect(logicalProperty('marginTop')).toBe('marginBlockStart')
    expect(logicalProperty('paddingBottom')).toBe('paddingBlockEnd')
    expect(logicalProperty('top')).toBe('insetBlockStart')
  })

  it('maps corner radii to their flow-relative names', () => {
    expect(logicalProperty('borderTopLeftRadius')).toBe('borderStartStartRadius')
    expect(logicalProperty('borderBottomRightRadius')).toBe('borderEndEndRadius')
  })

  it('preserves kebab-case', () => {
    expect(logicalProperty('margin-left')).toBe('margin-inline-start')
    expect(logicalProperty('border-top-left-radius')).toBe('border-start-start-radius')
  })

  it('converts sizes only when asked', () => {
    expect(logicalProperty('width')).toBe('width')
    expect(logicalProperty('width', { size: true })).toBe('inlineSize')
  })

  it('leaves unknown properties alone', () => {
    expect(logicalProperty('color')).toBe('color')
  })

  it('maps overscroll-behavior properties in camelCase and kebab-case', () => {
    expect(logicalProperty('overscrollBehaviorX')).toBe('overscrollBehaviorInline')
    expect(logicalProperty('overscrollBehaviorY')).toBe('overscrollBehaviorBlock')
    expect(logicalProperty('overscroll-behavior-x')).toBe('overscroll-behavior-inline')
    expect(logicalProperty('overscroll-behavior-y')).toBe('overscroll-behavior-block')
  })

  it('maps contain-intrinsic size properties only with { size: true } in camelCase and kebab-case', () => {
    expect(logicalProperty('containIntrinsicWidth')).toBe('containIntrinsicWidth')
    expect(logicalProperty('containIntrinsicHeight')).toBe('containIntrinsicHeight')
    expect(logicalProperty('contain-intrinsic-width')).toBe('contain-intrinsic-width')
    expect(logicalProperty('contain-intrinsic-height')).toBe('contain-intrinsic-height')

    expect(logicalProperty('containIntrinsicWidth', { size: true })).toBe('containIntrinsicInlineSize')
    expect(logicalProperty('containIntrinsicHeight', { size: true })).toBe('containIntrinsicBlockSize')
    expect(logicalProperty('contain-intrinsic-width', { size: true })).toBe('contain-intrinsic-inline-size')
    expect(logicalProperty('contain-intrinsic-height', { size: true })).toBe('contain-intrinsic-block-size')
  })
})

describe('toLogicalStyle', () => {
  it('rewrites a style object', () => {
    expect(toLogicalStyle({ marginLeft: '8px', paddingRight: 4, color: 'red' })).toEqual({
      marginInlineStart: '8px',
      paddingInlineEnd: 4,
      color: 'red',
    })
  })

  it('maps directional values too', () => {
    expect(toLogicalStyle({ textAlign: 'left', float: 'right' })).toEqual({
      textAlign: 'start',
      float: 'inline-end',
    })
  })

  it('can leave values alone', () => {
    expect(toLogicalStyle({ textAlign: 'left' }, { values: false })).toEqual({ textAlign: 'left' })
  })

  it('leaves physical shorthands untouched by default', () => {
    expect(toLogicalStyle({ margin: '1px 2px 3px 4px', borderRadius: '1px 2px' })).toEqual({
      margin: '1px 2px 3px 4px',
      borderRadius: '1px 2px',
    })
  })

  it('expands 4-value physical shorthands into logical longhands when opted in', () => {
    expect(toLogicalStyle({
      margin: '1px 2px 3px 4px',
      padding: '5px 6px 7px 8px',
      inset: '9px 10px 11px 12px',
      borderWidth: '13px 14px 15px 16px',
      borderStyle: 'solid dashed dotted double',
      borderColor: 'red green blue black',
      borderRadius: '17px 18px 19px 20px',
    }, { shorthands: true })).toEqual({
      marginBlockStart: '1px',
      marginInlineEnd: '2px',
      marginBlockEnd: '3px',
      marginInlineStart: '4px',
      paddingBlockStart: '5px',
      paddingInlineEnd: '6px',
      paddingBlockEnd: '7px',
      paddingInlineStart: '8px',
      insetBlockStart: '9px',
      insetInlineEnd: '10px',
      insetBlockEnd: '11px',
      insetInlineStart: '12px',
      borderBlockStartWidth: '13px',
      borderInlineEndWidth: '14px',
      borderBlockEndWidth: '15px',
      borderInlineStartWidth: '16px',
      borderBlockStartStyle: 'solid',
      borderInlineEndStyle: 'dashed',
      borderBlockEndStyle: 'dotted',
      borderInlineStartStyle: 'double',
      borderBlockStartColor: 'red',
      borderInlineEndColor: 'green',
      borderBlockEndColor: 'blue',
      borderInlineStartColor: 'black',
      borderStartStartRadius: '17px',
      borderStartEndRadius: '18px',
      borderEndEndRadius: '19px',
      borderEndStartRadius: '20px',
    })
  })

  it('expands 1-, 2- and 3-value shorthands using CSS box rules', () => {
    expect(toLogicalStyle({ margin: '1px 2px' }, { shorthands: true })).toEqual({
      marginBlockStart: '1px',
      marginInlineEnd: '2px',
      marginBlockEnd: '1px',
      marginInlineStart: '2px',
    })
    expect(toLogicalStyle({ padding: '1px 2px 3px' }, { shorthands: true })).toEqual({
      paddingBlockStart: '1px',
      paddingInlineEnd: '2px',
      paddingBlockEnd: '3px',
      paddingInlineStart: '2px',
    })
    expect(toLogicalStyle({ inset: '4px' }, { shorthands: true })).toEqual({
      insetBlockStart: '4px',
      insetInlineEnd: '4px',
      insetBlockEnd: '4px',
      insetInlineStart: '4px',
    })
  })

  it('expands numeric shorthands into all four longhands', () => {
    expect(toLogicalStyle({ margin: 0, borderRadius: 4 }, { shorthands: true })).toEqual({
      marginBlockStart: 0,
      marginInlineEnd: 0,
      marginBlockEnd: 0,
      marginInlineStart: 0,
      borderStartStartRadius: 4,
      borderStartEndRadius: 4,
      borderEndEndRadius: 4,
      borderEndStartRadius: 4,
    })
  })

  it('preserves kebab-case when expanding shorthands', () => {
    expect(toLogicalStyle({
      borderWidth: '1px 2px 3px 4px',
      'border-radius': '5px 6px 7px 8px',
    }, { shorthands: true })).toEqual({
      borderBlockStartWidth: '1px',
      borderInlineEndWidth: '2px',
      borderBlockEndWidth: '3px',
      borderInlineStartWidth: '4px',
      'border-start-start-radius': '5px',
      'border-start-end-radius': '6px',
      'border-end-end-radius': '7px',
      'border-end-start-radius': '8px',
    })

    expect(toLogicalStyle({ 'border-width': '1px 2px 3px 4px' }, { shorthands: true })).toEqual({
      'border-block-start-width': '1px',
      'border-inline-end-width': '2px',
      'border-block-end-width': '3px',
      'border-inline-start-width': '4px',
    })
  })

  it('leaves var(), calc(), !important and elliptical borderRadius values untouched', () => {
    const style = {
      margin: 'var(--space) 2px',
      padding: 'calc(1px + 2px)',
      borderRadius: '1px 2px / 3px 4px',
      borderWidth: '1px 2px !important',
    }
    expect(toLogicalStyle(style, { shorthands: true })).toEqual(style)
  })

  it('expands function colours in camel and kebab-case shorthands', () => {
    expect(toLogicalStyle({
      borderColor: 'rgb(1, 2, 3) red blue green',
    }, { shorthands: true })).toEqual({
      borderBlockStartColor: 'rgb(1, 2, 3)',
      borderInlineEndColor: 'red',
      borderBlockEndColor: 'blue',
      borderInlineStartColor: 'green',
    })

    expect(toLogicalStyle({
      borderColor: 'rgb(0 0 0 / 50%)',
    }, { shorthands: true })).toEqual({
      borderBlockStartColor: 'rgb(0 0 0 / 50%)',
      borderInlineEndColor: 'rgb(0 0 0 / 50%)',
      borderBlockEndColor: 'rgb(0 0 0 / 50%)',
      borderInlineStartColor: 'rgb(0 0 0 / 50%)',
    })

    expect(toLogicalStyle({
      'border-color': 'hsl(0, 0%, 0%) #fff',
    }, { shorthands: true })).toEqual({
      'border-block-start-color': 'hsl(0, 0%, 0%)',
      'border-inline-end-color': '#fff',
      'border-block-end-color': 'hsl(0, 0%, 0%)',
      'border-inline-start-color': '#fff',
    })
  })

  it('expands other functions such as env() in shorthands', () => {
    expect(toLogicalStyle({
      inset: 'env(safe-area-inset-top) 0',
    }, { shorthands: true })).toEqual({
      insetBlockStart: 'env(safe-area-inset-top)',
      insetInlineEnd: '0',
      insetBlockEnd: 'env(safe-area-inset-top)',
      insetInlineStart: '0',
    })
  })

  it('maps overscroll-behavior properties in camelCase and kebab-case', () => {
    expect(toLogicalStyle({
      overscrollBehaviorX: 'contain',
      overscrollBehaviorY: 'none',
    })).toEqual({
      overscrollBehaviorInline: 'contain',
      overscrollBehaviorBlock: 'none',
    })

    expect(toLogicalStyle({
      'overscroll-behavior-x': 'contain',
      'overscroll-behavior-y': 'none',
    })).toEqual({
      'overscroll-behavior-inline': 'contain',
      'overscroll-behavior-block': 'none',
    })
  })

  it('maps contain-intrinsic size properties only with { size: true } in camelCase and kebab-case', () => {
    const camel = {
      containIntrinsicWidth: '300px',
      containIntrinsicHeight: 'auto 200px',
    }
    const kebab = {
      'contain-intrinsic-width': '300px',
      'contain-intrinsic-height': 'auto 200px',
    }

    expect(toLogicalStyle(camel)).toEqual(camel)
    expect(toLogicalStyle(kebab)).toEqual(kebab)

    expect(toLogicalStyle(camel, { size: true })).toEqual({
      containIntrinsicInlineSize: '300px',
      containIntrinsicBlockSize: 'auto 200px',
    })
    expect(toLogicalStyle(kebab, { size: true })).toEqual({
      'contain-intrinsic-inline-size': '300px',
      'contain-intrinsic-block-size': 'auto 200px',
    })
  })
})

describe('toPhysicalStyle', () => {
  it('resolves inline properties per direction', () => {
    expect(toPhysicalStyle({ marginInlineStart: '8px' }, 'ltr')).toEqual({ marginLeft: '8px' })
    expect(toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')).toEqual({ marginRight: '8px' })
    expect(toPhysicalStyle({ insetInlineEnd: 0 }, 'rtl')).toEqual({ left: 0 })
  })

  it('resolves block properties regardless of direction', () => {
    expect(toPhysicalStyle({ marginBlockStart: '2px' }, 'rtl')).toEqual({ marginTop: '2px' })
    expect(toPhysicalStyle({ insetBlockEnd: '1px' }, 'ltr')).toEqual({ bottom: '1px' })
  })

  it('resolves corner radii and directional values', () => {
    expect(toPhysicalStyle({ borderStartStartRadius: '4px' }, 'rtl')).toEqual({ borderTopRightRadius: '4px' })
    expect(toPhysicalStyle({ textAlign: 'start' }, 'rtl')).toEqual({ textAlign: 'right' })
    expect(toPhysicalStyle({ textAlign: 'start' }, 'ltr')).toEqual({ textAlign: 'left' })
  })

  it('round-trips through toLogicalStyle', () => {
    const physical = {
      marginLeft: '8px',
      paddingRight: '2px',
      scrollMarginTop: '4px',
      scrollPaddingBottom: '6px',
      overflowX: 'auto',
      overflowY: 'hidden',
      width: '120px',
      maxHeight: '240px',
      textAlign: 'left',
      captionSide: 'right',
      resize: 'horizontal',
    }
    expect(toPhysicalStyle(toLogicalStyle(physical, { size: true }), 'ltr')).toEqual(physical)
    expect(toPhysicalStyle(toLogicalStyle(physical, { size: true }), 'rtl')).toEqual({
      marginRight: '8px',
      paddingLeft: '2px',
      scrollMarginTop: '4px',
      scrollPaddingBottom: '6px',
      overflowX: 'auto',
      overflowY: 'hidden',
      width: '120px',
      maxHeight: '240px',
      textAlign: 'right',
      captionSide: 'left',
      resize: 'horizontal',
    })
  })

  it('expands logical inline shorthands to the correct physical sides', () => {
    const style = {
      marginInline: '1px 2px',
      paddingInline: 3,
      insetInline: '4px 5px',
      scrollMarginInline: '6px 7px',
      scrollPaddingInline: '8px 9px',
      borderInlineWidth: '10px 11px',
      borderInlineStyle: 'solid dashed',
      borderInlineColor: 'red blue',
    }

    expect(toPhysicalStyle(style, 'ltr')).toEqual({
      marginLeft: '1px',
      marginRight: '2px',
      paddingLeft: 3,
      paddingRight: 3,
      left: '4px',
      right: '5px',
      scrollMarginLeft: '6px',
      scrollMarginRight: '7px',
      scrollPaddingLeft: '8px',
      scrollPaddingRight: '9px',
      borderLeftWidth: '10px',
      borderRightWidth: '11px',
      borderLeftStyle: 'solid',
      borderRightStyle: 'dashed',
      borderLeftColor: 'red',
      borderRightColor: 'blue',
    })

    expect(toPhysicalStyle(style, 'rtl')).toEqual({
      marginRight: '1px',
      marginLeft: '2px',
      paddingRight: 3,
      paddingLeft: 3,
      right: '4px',
      left: '5px',
      scrollMarginRight: '6px',
      scrollMarginLeft: '7px',
      scrollPaddingRight: '8px',
      scrollPaddingLeft: '9px',
      borderRightWidth: '10px',
      borderLeftWidth: '11px',
      borderRightStyle: 'solid',
      borderLeftStyle: 'dashed',
      borderRightColor: 'red',
      borderLeftColor: 'blue',
    })
  })

  it('expands logical block shorthands and keeps kebab-case', () => {
    expect(toPhysicalStyle({
      marginBlock: '1px 2px',
      paddingBlock: '3px 4px',
      insetBlock: '5px 6px',
      'border-block-width': '7px 8px',
      scrollMarginBlock: '9px 10px',
      scrollPaddingBlock: '11px 12px',
    }, 'rtl')).toEqual({
      marginTop: '1px',
      marginBottom: '2px',
      paddingTop: '3px',
      paddingBottom: '4px',
      top: '5px',
      bottom: '6px',
      'border-top-width': '7px',
      'border-bottom-width': '8px',
      scrollMarginTop: '9px',
      scrollMarginBottom: '10px',
      scrollPaddingTop: '11px',
      scrollPaddingBottom: '12px',
    })

    expect(toPhysicalStyle({ 'margin-inline': '1px 2px', 'inset-inline': '3px 4px' }, 'rtl')).toEqual({
      'margin-right': '1px',
      'margin-left': '2px',
      right: '3px',
      left: '4px',
    })
  })

  it('expands logical shorthands with function colours in both directions', () => {
    expect(toPhysicalStyle({ borderInlineColor: 'rgb(0 0 0)' }, 'rtl')).toEqual({
      borderRightColor: 'rgb(0 0 0)',
      borderLeftColor: 'rgb(0 0 0)',
    })

    const camel = { borderInlineColor: 'rgb(1, 2, 3) hsl(0, 0%, 0%)' }
    expect(toPhysicalStyle(camel, 'ltr')).toEqual({
      borderLeftColor: 'rgb(1, 2, 3)',
      borderRightColor: 'hsl(0, 0%, 0%)',
    })
    expect(toPhysicalStyle(camel, 'rtl')).toEqual({
      borderRightColor: 'rgb(1, 2, 3)',
      borderLeftColor: 'hsl(0, 0%, 0%)',
    })

    const kebab = { 'border-inline-color': 'rgb(0 0 0 / 50%) blue' }
    expect(toPhysicalStyle(kebab, 'ltr')).toEqual({
      'border-left-color': 'rgb(0 0 0 / 50%)',
      'border-right-color': 'blue',
    })
    expect(toPhysicalStyle(kebab, 'rtl')).toEqual({
      'border-right-color': 'rgb(0 0 0 / 50%)',
      'border-left-color': 'blue',
    })
  })

  it('leaves var(), calc() and over-long logical shorthand values untouched', () => {
    const style = {
      marginInline: 'var(--a) var(--b)',
      paddingInline: 'calc(1px + 2px)',
      insetInline: '1px 2px 3px',
    }
    expect(toPhysicalStyle(style, 'rtl')).toEqual(style)
  })

  it('round-trips physical shorthands through logical longhands in both directions', () => {
    const logical = toLogicalStyle({
      margin: '1px 2px 3px 4px',
      padding: '5px 6px',
      inset: '7px 8px 9px 10px',
      borderWidth: '11px 12px 13px 14px',
      borderStyle: 'solid dashed dotted double',
      borderColor: 'red green blue black',
    }, { shorthands: true })

    expect(toPhysicalStyle(logical, 'ltr')).toEqual({
      marginTop: '1px',
      marginRight: '2px',
      marginBottom: '3px',
      marginLeft: '4px',
      paddingTop: '5px',
      paddingRight: '6px',
      paddingBottom: '5px',
      paddingLeft: '6px',
      top: '7px',
      right: '8px',
      bottom: '9px',
      left: '10px',
      borderTopWidth: '11px',
      borderRightWidth: '12px',
      borderBottomWidth: '13px',
      borderLeftWidth: '14px',
      borderTopStyle: 'solid',
      borderRightStyle: 'dashed',
      borderBottomStyle: 'dotted',
      borderLeftStyle: 'double',
      borderTopColor: 'red',
      borderRightColor: 'green',
      borderBottomColor: 'blue',
      borderLeftColor: 'black',
    })

    expect(toPhysicalStyle(logical, 'rtl')).toEqual({
      marginTop: '1px',
      marginLeft: '2px',
      marginBottom: '3px',
      marginRight: '4px',
      paddingTop: '5px',
      paddingLeft: '6px',
      paddingBottom: '5px',
      paddingRight: '6px',
      top: '7px',
      left: '8px',
      bottom: '9px',
      right: '10px',
      borderTopWidth: '11px',
      borderLeftWidth: '12px',
      borderBottomWidth: '13px',
      borderRightWidth: '14px',
      borderTopStyle: 'solid',
      borderLeftStyle: 'dashed',
      borderBottomStyle: 'dotted',
      borderRightStyle: 'double',
      borderTopColor: 'red',
      borderLeftColor: 'green',
      borderBottomColor: 'blue',
      borderRightColor: 'black',
    })
  })

  it('round-trips kebab-case physical shorthands in both directions', () => {
    const logical = toLogicalStyle({
      margin: '1px 2px 3px 4px',
      'border-radius': '5px 6px 7px 8px',
    }, { shorthands: true })

    expect(toPhysicalStyle(logical, 'ltr')).toEqual({
      marginTop: '1px',
      marginRight: '2px',
      marginBottom: '3px',
      marginLeft: '4px',
      'border-top-left-radius': '5px',
      'border-top-right-radius': '6px',
      'border-bottom-right-radius': '7px',
      'border-bottom-left-radius': '8px',
    })

    expect(toPhysicalStyle(logical, 'rtl')).toEqual({
      marginTop: '1px',
      marginLeft: '2px',
      marginBottom: '3px',
      marginRight: '4px',
      'border-top-right-radius': '5px',
      'border-top-left-radius': '6px',
      'border-bottom-left-radius': '7px',
      'border-bottom-right-radius': '8px',
    })
  })

  it('expands logical shorthands the same way as their longhands', () => {
    const logical = {
      marginInline: '1px 2px',
      paddingBlock: '3px 4px',
      insetInline: '5px 6px',
      scrollPaddingInline: '7px 8px',
    }
    const longhands = {
      marginInlineStart: '1px',
      marginInlineEnd: '2px',
      paddingBlockStart: '3px',
      paddingBlockEnd: '4px',
      insetInlineStart: '5px',
      insetInlineEnd: '6px',
      scrollPaddingInlineStart: '7px',
      scrollPaddingInlineEnd: '8px',
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      expect(toPhysicalStyle(logical, dir)).toEqual(toPhysicalStyle(longhands, dir))
    }
  })

  it('resolves overscroll-behavior and contain-intrinsic properties back to physical in ltr and rtl', () => {
    const physicalCamel = {
      overscrollBehaviorX: 'contain',
      overscrollBehaviorY: 'none',
      containIntrinsicWidth: '300px',
      containIntrinsicHeight: 'auto 200px',
    }
    const logicalCamel = {
      overscrollBehaviorInline: 'contain',
      overscrollBehaviorBlock: 'none',
      containIntrinsicInlineSize: '300px',
      containIntrinsicBlockSize: 'auto 200px',
    }
    const physicalKebab = {
      'overscroll-behavior-x': 'contain',
      'overscroll-behavior-y': 'none',
      'contain-intrinsic-width': '300px',
      'contain-intrinsic-height': 'auto 200px',
    }
    const logicalKebab = {
      'overscroll-behavior-inline': 'contain',
      'overscroll-behavior-block': 'none',
      'contain-intrinsic-inline-size': '300px',
      'contain-intrinsic-block-size': 'auto 200px',
    }

    for (const dir of ['ltr', 'rtl'] as const) {
      expect(toPhysicalStyle(logicalCamel, dir)).toEqual(physicalCamel)
      expect(toPhysicalStyle(logicalKebab, dir)).toEqual(physicalKebab)
      expect(toPhysicalStyle(toLogicalStyle(physicalCamel, { size: true }), dir)).toEqual(physicalCamel)
      expect(toPhysicalStyle(toLogicalStyle(physicalKebab, { size: true }), dir)).toEqual(physicalKebab)
    }
  })
})

describe('useLogicalStyles', () => {
  const mountWith = (dir: 'rtl' | 'ltr') => {
    const rtl = createRtl({ dir, syncDocument: false })
    const result: { value?: ReturnType<typeof useLogicalStyles> } = {}
    const Probe = defineComponent({
      setup() {
        result.value = useLogicalStyles()
        return () => h('i')
      },
    })
    mount(Probe, { global: { plugins: [rtl] } })
    rtl.dispose()
    return result.value!
  }

  it('exposes the direction-dependent sides', () => {
    const rtl = mountWith('rtl')
    expect(rtl.startSide.value).toBe('right')
    expect(rtl.endSide.value).toBe('left')
    expect(rtl.sign.value).toBe(-1)
    expect(rtl.mirror(24)).toBe(-24)

    const ltr = mountWith('ltr')
    expect(ltr.startSide.value).toBe('left')
    expect(ltr.mirror(24)).toBe(24)
  })

  it('converts styles through the composable', () => {
    const { toLogical, toPhysical, property } = mountWith('rtl')
    expect(toLogical({ marginLeft: '4px' })).toEqual({ marginInlineStart: '4px' })
    expect(toPhysical({ marginInlineStart: '4px' })).toEqual({ marginRight: '4px' })
    expect(property('paddingLeft')).toBe('paddingInlineStart')
  })

  it('resolves arrow events in both directions and reacts to direction flips', () => {
    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'en', syncDocument: false })
    const result: { value?: ReturnType<typeof useLogicalStyles> } = {}
    const Probe = defineComponent({
      setup() {
        result.value = useLogicalStyles()
        return () => h('i')
      },
    })
    const wrapper = mount(Probe, { global: { plugins: [rtl] } })
    try {
      const { arrow } = result.value!
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe('next')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe('previous')
      expect(arrow(new KeyboardEvent('keydown', { key: 'Home' }))).toBe('first')
      expect(arrow(new KeyboardEvent('keydown', { key: 'End' }))).toBe('last')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe('up')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe('down')
      expect(arrow(new KeyboardEvent('keydown', { key: 'Tab' }))).toBeNull()

      rtl.setLocale('ar')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe('previous')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe('next')
      expect(arrow(new KeyboardEvent('keydown', { key: 'Home' }))).toBe('first')
      expect(arrow(new KeyboardEvent('keydown', { key: 'End' }))).toBe('last')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe('up')
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe('down')
      expect(arrow(new KeyboardEvent('keydown', { key: 'Enter' }))).toBeNull()
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })

  it('returns null from arrow() when Ctrl, Alt or Meta is held, while allowing Shift', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      const { arrow } = mountWith(dir)
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'ArrowUp', 'ArrowDown']) {
        expect(arrow(new KeyboardEvent('keydown', { key, ctrlKey: true }))).toBeNull()
        expect(arrow(new KeyboardEvent('keydown', { key, altKey: true }))).toBeNull()
        expect(arrow(new KeyboardEvent('keydown', { key, metaKey: true }))).toBeNull()
      }
      expect(arrow(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true })))
        .toBe(dir === 'rtl' ? 'previous' : 'next')
    }
  })

  it('resolves arrow() against nested RtlProvider scopes', async () => {
    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    const scopes: Record<string, ReturnType<typeof useLogicalStyles>> = {}

    const ScopeProbe = defineComponent({
      props: { name: { type: String, required: true } },
      setup(props) {
        scopes[props.name] = useLogicalStyles()
        return () => h('span', { class: props.name })
      },
    })

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('div', [
            h(ScopeProbe, { name: 'page' }),
            h(RtlProvider, { dir: 'ltr' }, {
              default: ({ toggleDirection }: { toggleDirection: () => 'rtl' | 'ltr' }) => [
                h('button', { class: 'flip-scope', onClick: toggleDirection }, 'flip'),
                h(ScopeProbe, { name: 'ltrIsland' }),
                h(RtlProvider, { dir: 'rtl' }, () => [
                  h(ScopeProbe, { name: 'nestedRtl' }),
                ]),
              ],
            }),
          ])
        },
      }),
      { global: { plugins: [rtl] } },
    )

    try {
      const right = () => new KeyboardEvent('keydown', { key: 'ArrowRight' })
      const left = () => new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(scopes.page!.arrow(right())).toBe('previous')
      expect(scopes.page!.arrow(left())).toBe('next')

      expect(scopes.ltrIsland!.arrow(right())).toBe('next')
      expect(scopes.ltrIsland!.arrow(left())).toBe('previous')

      expect(scopes.nestedRtl!.arrow(right())).toBe('previous')
      expect(scopes.nestedRtl!.arrow(left())).toBe('next')

      await wrapper.find('.flip-scope').trigger('click')
      expect(scopes.ltrIsland!.arrow(right())).toBe('previous')
      expect(scopes.page!.arrow(right())).toBe('previous')
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })

  it('drives a WAI-ARIA roving-tabindex tab list in RTL, LTR, and nested LTR islands', async () => {
    const labels = ['Overview', 'Settings', 'Activity'] as const

    const RovingTabList = defineComponent({
      name: 'RovingTabList',
      setup() {
        const active = ref(0)
        const buttons: (HTMLButtonElement | null)[] = []
        const { arrow } = useLogicalStyles()

        function onKeydown(event: KeyboardEvent) {
          const move = arrow(event)
          let next = active.value
          if (move === 'next') next = (active.value + 1) % labels.length
          else if (move === 'previous') next = (active.value - 1 + labels.length) % labels.length
          else if (move === 'first') next = 0
          else if (move === 'last') next = labels.length - 1
          else return

          event.preventDefault()
          active.value = next
          buttons[next]?.focus()
        }

        return () => h('div', [
          h(
            'div',
            { role: 'tablist', onKeydown },
            labels.map((label, index) =>
              h(
                'button',
                {
                  type: 'button',
                  role: 'tab',
                  'aria-selected': String(index === active.value),
                  tabindex: index === active.value ? 0 : -1,
                  ref: (el) => { buttons[index] = el as HTMLButtonElement | null },
                },
                label,
              ),
            ),
          ),
          h('div', { role: 'tabpanel' }, labels[active.value]),
        ])
      },
    })

    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('div', [
            h('section', { class: 'rtl-tabs' }, [h(RovingTabList)]),
            h(RtlProvider, { dir: 'ltr', class: 'ltr-island-tabs' }, () => [h(RovingTabList)]),
          ])
        },
      }),
      { global: { plugins: [rtl] }, attachTo: document.body },
    )

    try {
      const rtlButtons = wrapper.findAll('.rtl-tabs [role="tab"]')
      const rtlPanel = wrapper.find('.rtl-tabs [role="tabpanel"]')
      const stateOf = (tabs: typeof rtlButtons) =>
        tabs.map(tab => `${tab.attributes('aria-selected')}:${tab.attributes('tabindex')}`)

      expect(stateOf(rtlButtons)).toEqual(['true:0', 'false:-1', 'false:-1'])
      expect(rtlPanel.text()).toBe('Overview')

      ;(rtlButtons[0]!.element as HTMLButtonElement).focus()
      expect(document.activeElement).toBe(rtlButtons[0]!.element)

      // In RTL, ArrowLeft advances ('next') and prevents default scrolling.
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
      rtlButtons[0]!.element.dispatchEvent(leftEvent)
      await nextTick()
      expect(leftEvent.defaultPrevented).toBe(true)
      expect(stateOf(rtlButtons)).toEqual(['false:-1', 'true:0', 'false:-1'])
      expect(document.activeElement).toBe(rtlButtons[1]!.element)
      expect(rtlPanel.text()).toBe('Settings')

      await rtlButtons[1]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(document.activeElement).toBe(rtlButtons[2]!.element)
      expect(rtlPanel.text()).toBe('Activity')

      // Wraps from last back to first.
      await rtlButtons[2]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(document.activeElement).toBe(rtlButtons[0]!.element)

      // In RTL, ArrowRight moves backwards ('previous'), wrapping from 0 to last.
      await rtlButtons[0]!.trigger('keydown', { key: 'ArrowRight' })
      expect(stateOf(rtlButtons)).toEqual(['false:-1', 'false:-1', 'true:0'])
      expect(document.activeElement).toBe(rtlButtons[2]!.element)

      await rtlButtons[2]!.trigger('keydown', { key: 'ArrowRight' })
      expect(document.activeElement).toBe(rtlButtons[1]!.element)

      // Home and End always target first and last regardless of direction.
      await rtlButtons[1]!.trigger('keydown', { key: 'End' })
      expect(document.activeElement).toBe(rtlButtons[2]!.element)
      await rtlButtons[2]!.trigger('keydown', { key: 'Home' })
      expect(document.activeElement).toBe(rtlButtons[0]!.element)
      expect(stateOf(rtlButtons)).toEqual(['true:0', 'false:-1', 'false:-1'])

      // Modified shortcuts and vertical/non-tab keys are left to the browser.
      for (const init of [
        { key: 'ArrowLeft', altKey: true },
        { key: 'ArrowRight', ctrlKey: true },
        { key: 'ArrowLeft', metaKey: true },
        { key: 'ArrowDown' },
        { key: 'Tab' },
      ]) {
        const untouched = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
        rtlButtons[0]!.element.dispatchEvent(untouched)
        await nextTick()
        expect(untouched.defaultPrevented).toBe(false)
        expect(document.activeElement).toBe(rtlButtons[0]!.element)
        expect(rtlPanel.text()).toBe('Overview')
      }

      // Inside <RtlProvider dir="ltr"> on the same RTL page, ArrowRight advances and ArrowLeft goes back.
      const ltrButtons = wrapper.findAll('.ltr-island-tabs [role="tab"]')
      const ltrPanel = wrapper.find('.ltr-island-tabs [role="tabpanel"]')
      ;(ltrButtons[0]!.element as HTMLButtonElement).focus()

      await ltrButtons[0]!.trigger('keydown', { key: 'ArrowRight' })
      expect(stateOf(ltrButtons)).toEqual(['false:-1', 'true:0', 'false:-1'])
      expect(document.activeElement).toBe(ltrButtons[1]!.element)
      expect(ltrPanel.text()).toBe('Settings')

      await ltrButtons[1]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(document.activeElement).toBe(ltrButtons[0]!.element)
      await ltrButtons[0]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(document.activeElement).toBe(ltrButtons[2]!.element)
      await ltrButtons[2]!.trigger('keydown', { key: 'Home' })
      expect(document.activeElement).toBe(ltrButtons[0]!.element)
      await ltrButtons[0]!.trigger('keydown', { key: 'End' })
      expect(document.activeElement).toBe(ltrButtons[2]!.element)
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })
})

describe('logicalArrow', () => {
  it('is re-exported from the package entry', () => {
    expect(rootLogicalArrow).toBe(logicalArrow)
  })

  it('maps horizontal, vertical, and boundary keys in LTR', () => {
    expect(logicalArrow('ArrowRight', 'ltr')).toBe('next')
    expect(logicalArrow('ArrowLeft', 'ltr')).toBe('previous')
    expect(logicalArrow('Home', 'ltr')).toBe('first')
    expect(logicalArrow('End', 'ltr')).toBe('last')
    expect(logicalArrow('ArrowUp', 'ltr')).toBe('up')
    expect(logicalArrow('ArrowDown', 'ltr')).toBe('down')
  })

  it('swaps ArrowLeft and ArrowRight in RTL while keeping Home/End and vertical arrows', () => {
    expect(logicalArrow('ArrowRight', 'rtl')).toBe('previous')
    expect(logicalArrow('ArrowLeft', 'rtl')).toBe('next')
    expect(logicalArrow('Home', 'rtl')).toBe('first')
    expect(logicalArrow('End', 'rtl')).toBe('last')
    expect(logicalArrow('ArrowUp', 'rtl')).toBe('up')
    expect(logicalArrow('ArrowDown', 'rtl')).toBe('down')
  })

  it('returns null for non-navigation and Object.prototype keys', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const key of ['Enter', ' ', 'Tab', 'Escape', 'PageUp', 'PageDown', 'Left', 'Right', 'a', '', 'toString', 'constructor', '__proto__']) {
        expect(logicalArrow(key, dir)).toBeNull()
      }
    }
  })
})
