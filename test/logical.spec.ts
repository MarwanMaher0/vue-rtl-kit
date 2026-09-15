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
    const physical = { marginLeft: '8px', paddingRight: '2px', textAlign: 'left' }
    expect(toPhysicalStyle(toLogicalStyle(physical), 'ltr')).toEqual(physical)
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
