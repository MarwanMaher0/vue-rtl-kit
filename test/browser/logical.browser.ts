import { afterEach, describe, expect, it } from 'vitest'
import { computed, defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { Direction } from '../../src'
import { RtlProvider, createRtl, toLogicalStyle, useLogicalStyles } from '../../src'
import '../../src/styles/logical.css'

interface BoxOffsets {
  left: number
  right: number
  top: number
  bottom: number
  width: number
}

interface CornerRadii {
  topLeft: string
  topRight: string
  bottomRight: string
  bottomLeft: string
}

function measureOffsets(child: Element, container: Element): BoxOffsets {
  const c = container.getBoundingClientRect()
  const b = child.getBoundingClientRect()
  return {
    left: b.left - c.left,
    right: c.right - b.right,
    top: b.top - c.top,
    bottom: c.bottom - b.bottom,
    width: b.width,
  }
}

function measureTextNodeOffsets(container: Element): BoxOffsets {
  const textNode = container.firstChild as Text
  const range = document.createRange()
  range.selectNodeContents(textNode)
  const c = container.getBoundingClientRect()
  const b = range.getBoundingClientRect()
  return {
    left: b.left - c.left,
    right: c.right - b.right,
    top: b.top - c.top,
    bottom: c.bottom - b.bottom,
    width: b.width,
  }
}

function readCornerRadii(el: Element): CornerRadii {
  const cs = window.getComputedStyle(el)
  return {
    topLeft: cs.borderTopLeftRadius,
    topRight: cs.borderTopRightRadius,
    bottomRight: cs.borderBottomRightRadius,
    bottomLeft: cs.borderBottomLeftRadius,
  }
}

function expectMirroredOffsets(ltr: BoxOffsets, rtl: BoxOffsets): void {
  expect(ltr.left).toBeCloseTo(rtl.right, 1)
  expect(ltr.right).toBeCloseTo(rtl.left, 1)
  expect(ltr.top).toBeCloseTo(rtl.top, 1)
  expect(ltr.bottom).toBeCloseTo(rtl.bottom, 1)
  expect(ltr.width).toBeCloseTo(rtl.width, 1)
}

function expectMirroredRadii(ltr: CornerRadii, rtl: CornerRadii): void {
  expect(ltr.topLeft).toBe(rtl.topRight)
  expect(ltr.topRight).toBe(rtl.topLeft)
  expect(ltr.bottomLeft).toBe(rtl.bottomRight)
  expect(ltr.bottomRight).toBe(rtl.bottomLeft)
}

describe('toLogicalStyle and useLogicalStyles layout mirroring in real Chromium', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('mirrors margin, padding, inset, border-radius and text-align: start rects between dir="ltr" and dir="rtl" with toLogicalStyle', () => {
    const marginStyle = toLogicalStyle({
      marginLeft: '28px',
      marginRight: '12px',
      marginTop: '6px',
      marginBottom: '10px',
      height: '20px',
    })
    const paddingStyle = toLogicalStyle({
      paddingLeft: '34px',
      paddingRight: '10px',
      paddingTop: '8px',
      paddingBottom: '12px',
      width: '240px',
      boxSizing: 'border-box',
    })
    const insetStyle = toLogicalStyle({
      position: 'absolute',
      left: '22px',
      top: '7px',
      width: '64px',
      height: '24px',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '4px',
      borderBottomRightRadius: '14px',
      borderBottomLeftRadius: '2px',
      background: 'rgb(30, 64, 175)',
    })
    const textAlignStyle = toLogicalStyle({
      width: '240px',
      textAlign: 'left',
    })

    expect(textAlignStyle.textAlign).toBe('start')

    const measureInDirection = (dir: Direction) => {
      const host = document.createElement('div')
      host.setAttribute('dir', dir)
      document.body.appendChild(host)

      const wrapper = mount(
        defineComponent({
          setup() {
            return () => h('div', [
              h('div', { class: 'margin-frame', style: { width: '240px', overflow: 'hidden' } }, [
                h('div', { class: 'margin-box', style: marginStyle }),
              ]),
              h('div', { class: 'padding-frame', style: paddingStyle }, [
                h('div', { class: 'padding-inner', style: { height: '18px' } }),
              ]),
              h('div', { class: 'inset-frame', style: { position: 'relative', width: '240px', height: '56px' } }, [
                h('div', { class: 'inset-box', style: insetStyle }),
              ]),
              h('div', { class: 'align-frame', style: textAlignStyle }, [
                h('span', { class: 'align-chip', style: { display: 'inline-block', width: '52px', height: '16px' } }, 'مرحبا'),
              ]),
              h('div', { class: 'align-text-frame', style: { ...textAlignStyle, fontFamily: 'monospace', fontSize: '16px' } }, 'badge'),
            ])
          },
        }),
        { attachTo: host },
      )

      const marginOffsets = measureOffsets(
        wrapper.find('.margin-box').element,
        wrapper.find('.margin-frame').element,
      )
      const paddingOffsets = measureOffsets(
        wrapper.find('.padding-inner').element,
        wrapper.find('.padding-frame').element,
      )
      const insetEl = wrapper.find('.inset-box').element
      const insetOffsets = measureOffsets(
        insetEl,
        wrapper.find('.inset-frame').element,
      )
      const radii = readCornerRadii(insetEl)
      const insetRect = insetEl.getBoundingClientRect()
      const hitTopLeft = document.elementFromPoint(insetRect.left + 2, insetRect.top + 2) === insetEl
      const hitTopRight = document.elementFromPoint(insetRect.right - 2, insetRect.top + 2) === insetEl
      const alignOffsets = measureOffsets(
        wrapper.find('.align-chip').element,
        wrapper.find('.align-frame').element,
      )
      const alignTextOffsets = measureTextNodeOffsets(wrapper.find('.align-text-frame').element)

      wrapper.unmount()
      host.remove()

      return { marginOffsets, paddingOffsets, insetOffsets, radii, hitTopLeft, hitTopRight, alignOffsets, alignTextOffsets }
    }

    const ltr = measureInDirection('ltr')
    const rtl = measureInDirection('rtl')

    // Concrete LTR measurements prove real browser layout ran (not zeroed jsdom rects).
    expect(ltr.marginOffsets.left).toBeCloseTo(28, 1)
    expect(ltr.marginOffsets.right).toBeCloseTo(12, 1)
    expect(ltr.paddingOffsets.left).toBeCloseTo(34, 1)
    expect(ltr.paddingOffsets.right).toBeCloseTo(10, 1)
    expect(ltr.insetOffsets.left).toBeCloseTo(22, 1)
    expect(ltr.insetOffsets.right).toBeCloseTo(240 - 22 - 64, 1)
    expect(ltr.alignOffsets.left).toBeCloseTo(0, 1)
    expect(ltr.alignOffsets.right).toBeCloseTo(240 - 52, 1)
    expect(ltr.alignTextOffsets.left).toBeCloseTo(0, 1)
    expect(ltr.alignTextOffsets.width).toBeGreaterThan(20)
    expect(ltr.radii).toEqual({
      topLeft: '20px',
      topRight: '4px',
      bottomRight: '14px',
      bottomLeft: '2px',
    })
    // A 20px radius clips (left+2, top+2) while a 4px radius keeps (right-2, top+2) inside the box.
    expect(ltr.hitTopLeft).toBe(false)
    expect(ltr.hitTopRight).toBe(true)
    expect(rtl.hitTopLeft).toBe(true)
    expect(rtl.hitTopRight).toBe(false)

    expectMirroredOffsets(ltr.marginOffsets, rtl.marginOffsets)
    expectMirroredOffsets(ltr.paddingOffsets, rtl.paddingOffsets)
    expectMirroredOffsets(ltr.insetOffsets, rtl.insetOffsets)
    expectMirroredOffsets(ltr.alignOffsets, rtl.alignOffsets)
    expectMirroredOffsets(ltr.alignTextOffsets, rtl.alignTextOffsets)
    expectMirroredRadii(ltr.radii, rtl.radii)
  })

  it('mirrors expanded box shorthands and reactive useLogicalStyles bindings across runtime direction switches and RtlProvider islands', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
    })

    const BoxProbe = defineComponent({
      name: 'BoxProbe',
      setup() {
        const { toLogical, toPhysical, mirror } = useLogicalStyles()

        const marginBoxStyle = computed(() =>
          toLogical({ margin: '4px 14px 8px 30px', height: '18px' }, { shorthands: true }),
        )
        const paddingFrameStyle = computed(() => ({
          ...toLogical({ padding: '6px 12px 10px 36px' }, { shorthands: true }),
          width: '240px',
          boxSizing: 'border-box' as const,
        }))
        const insetBoxStyle = computed(() => ({
          position: 'absolute' as const,
          ...toLogical({
            inset: '6px 42px 10px 18px',
            borderRadius: '16px 2px 12px 6px',
          }, { shorthands: true }),
        }))
        const alignFrameStyle = computed(() => ({
          width: '240px',
          ...toLogical({ textAlign: 'left' }),
        }))
        const physicalBadgeStyle = computed(() => ({
          position: 'absolute' as const,
          width: '40px',
          height: '16px',
          ...toPhysical({ insetInlineStart: '26px', insetBlockStart: '4px' }),
        }))
        const translatedOffset = computed(() => `translateX(${mirror(20)}px)`)

        return () => h('div', { class: 'probe-root' }, [
          h('div', { class: 'u-margin-frame', style: { width: '240px', overflow: 'hidden' } }, [
            h('div', { class: 'u-margin-box', style: marginBoxStyle.value }),
          ]),
          h('div', { class: 'u-padding-frame', style: paddingFrameStyle.value }, [
            h('div', { class: 'u-padding-inner', style: { height: '16px' } }),
          ]),
          h('div', { class: 'u-inset-frame', style: { position: 'relative', width: '240px', height: '48px' } }, [
            h('div', { class: 'u-inset-box', style: insetBoxStyle.value }),
            h('div', { class: 'u-physical-badge', style: physicalBadgeStyle.value }),
          ]),
          h('div', { class: 'u-align-frame', style: alignFrameStyle.value }, [
            h('span', { class: 'u-align-chip', style: { display: 'inline-block', width: '48px', height: '14px' } }, 'text'),
          ]),
          h('div', { class: 'u-translate-frame', style: { width: '240px', display: 'flex', justifyContent: 'center' } }, [
            h('div', { class: 'u-translate-box', style: { width: '40px', height: '14px', transform: translatedOffset.value } }),
          ]),
        ])
      },
    })

    const host = document.createElement('div')
    document.body.appendChild(host)

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('div', [
            h('section', { class: 'page-probe' }, [h(BoxProbe)]),
            h(RtlProvider, { dir: 'rtl', class: 'island-probe' }, () => [h(BoxProbe)]),
          ])
        },
      }),
      {
        global: { plugins: [rtl] },
        attachTo: host,
      },
    )

    try {
      await nextTick()

      const snapshot = (scopeSelector: string) => {
        const scope = host.querySelector(scopeSelector)!
        const margin = measureOffsets(scope.querySelector('.u-margin-box')!, scope.querySelector('.u-margin-frame')!)
        const padding = measureOffsets(scope.querySelector('.u-padding-inner')!, scope.querySelector('.u-padding-frame')!)
        const insetEl = scope.querySelector('.u-inset-box')!
        const inset = measureOffsets(insetEl, scope.querySelector('.u-inset-frame')!)
        const physical = measureOffsets(scope.querySelector('.u-physical-badge')!, scope.querySelector('.u-inset-frame')!)
        const radii = readCornerRadii(insetEl)
        const align = measureOffsets(scope.querySelector('.u-align-chip')!, scope.querySelector('.u-align-frame')!)
        const translated = measureOffsets(scope.querySelector('.u-translate-box')!, scope.querySelector('.u-translate-frame')!)
        return { margin, padding, inset, physical, radii, align, translated }
      }

      const pageLtr = snapshot('.page-probe')
      const islandRtl = snapshot('.island-probe')

      expect(pageLtr.margin.left).toBeCloseTo(30, 1)
      expect(pageLtr.margin.right).toBeCloseTo(14, 1)
      expect(pageLtr.padding.left).toBeCloseTo(36, 1)
      expect(pageLtr.padding.right).toBeCloseTo(12, 1)
      expect(pageLtr.inset.left).toBeCloseTo(18, 1)
      expect(pageLtr.inset.right).toBeCloseTo(42, 1)
      expect(pageLtr.physical.left).toBeCloseTo(26, 1)
      expect(pageLtr.align.left).toBeCloseTo(0, 1)

      // The RTL RtlProvider island already mirrors the LTR page simultaneously.
      expectMirroredOffsets(pageLtr.margin, islandRtl.margin)
      expectMirroredOffsets(pageLtr.padding, islandRtl.padding)
      expectMirroredOffsets(pageLtr.inset, islandRtl.inset)
      expectMirroredOffsets(pageLtr.physical, islandRtl.physical)
      expectMirroredOffsets(pageLtr.align, islandRtl.align)
      expectMirroredOffsets(pageLtr.translated, islandRtl.translated)
      expectMirroredRadii(pageLtr.radii, islandRtl.radii)

      // Flipping the root locale to Arabic updates <html dir="rtl"> and mirrors the page boxes in place.
      rtl.setLocale('ar')
      await nextTick()
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')

      const pageRtl = snapshot('.page-probe')
      expectMirroredOffsets(pageLtr.margin, pageRtl.margin)
      expectMirroredOffsets(pageLtr.padding, pageRtl.padding)
      expectMirroredOffsets(pageLtr.inset, pageRtl.inset)
      expectMirroredOffsets(pageLtr.physical, pageRtl.physical)
      expectMirroredOffsets(pageLtr.align, pageRtl.align)
      expectMirroredOffsets(pageLtr.translated, pageRtl.translated)
      expectMirroredRadii(pageLtr.radii, pageRtl.radii)
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
      host.remove()
    }
  })
})
