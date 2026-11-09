import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { logicalProperty, toLogicalStyle, toPhysicalStyle } from '../src/logical'
import { useLogicalStyles } from '../src/composables/useLogicalStyles'
import { createRtl } from '../src/core'

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
})
