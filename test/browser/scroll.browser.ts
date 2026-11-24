import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue'
import { mount } from '@vue/test-utils'
import {
  RtlProvider,
  createRtl,
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
  useInlineScroll,
  vRtl,
} from '../../src'
import { attachHost, removeHosts } from './hosts'

function createScrollerDom(options: { dir?: 'ltr' | 'rtl', width?: number, contentWidth?: number } = {}): HTMLDivElement {
  const scroller = document.createElement('div')
  if (options.dir) scroller.setAttribute('dir', options.dir)
  Object.assign(scroller.style, {
    width: `${options.width ?? 200}px`,
    height: '48px',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
  })

  const inner = document.createElement('div')
  Object.assign(inner.style, {
    width: `${options.contentWidth ?? 600}px`,
    height: '32px',
  })
  scroller.appendChild(inner)
  return scroller
}

describe('inline scroll helpers and useInlineScroll in real Chromium', () => {
  afterEach(() => {
    removeHosts()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('reads and controls an LTR scroller in 0..max coordinates', () => {
    const host = attachHost(document.createElement('div'))
    host.setAttribute('dir', 'ltr')
    const scroller = createScrollerDom({ width: 200, contentWidth: 600 })
    host.appendChild(scroller)

    const max = getScrollInlineMax(scroller)
    expect(max).toBe(400)
    expect(getScrollInline(scroller)).toBe(0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: true, atEnd: false })

    scrollByInline(scroller, 150)
    expect(scroller.scrollLeft).toBeCloseTo(150, 0)
    expect(getScrollInline(scroller)).toBeCloseTo(150, 0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: false, atEnd: false })

    scrollToInline(scroller, 9999)
    expect(scroller.scrollLeft).toBeCloseTo(400, 0)
    expect(getScrollInline(scroller)).toBeCloseTo(400, 0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: false, atEnd: true })

    scrollByInline(scroller, -100)
    expect(getScrollInline(scroller)).toBeCloseTo(300, 0)

    scrollToInline(scroller, -50)
    expect(getScrollInline(scroller)).toBe(0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: true, atEnd: false })
  })

  it('normalises Chromium negative scrollLeft in RTL to the same 0..max scale', () => {
    const host = attachHost(document.createElement('div'))
    host.setAttribute('dir', 'rtl')
    const scroller = createScrollerDom({ width: 200, contentWidth: 600 })
    host.appendChild(scroller)

    expect(window.getComputedStyle(scroller).direction).toBe('rtl')
    expect(getScrollInlineMax(scroller)).toBe(400)
    expect(getScrollInline(scroller)).toBe(0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: true, atEnd: false })

    scrollByInline(scroller, 150)
    expect(scroller.scrollLeft).toBeLessThan(0)
    expect(scroller.scrollLeft).toBeCloseTo(-150, 0)
    expect(getScrollInline(scroller)).toBeCloseTo(150, 0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: false, atEnd: false })

    scrollToInline(scroller, 400)
    expect(scroller.scrollLeft).toBeCloseTo(-400, 0)
    expect(getScrollInline(scroller)).toBeCloseTo(400, 0)
    expect(scrollInlineEdges(scroller)).toEqual({ atStart: false, atEnd: true })

    scrollByInline(scroller, -120)
    expect(scroller.scrollLeft).toBeCloseTo(-280, 0)
    expect(getScrollInline(scroller)).toBeCloseTo(280, 0)

    // Non-overflowing RTL scroller reports 0 and both edges true.
    const noOverflow = createScrollerDom({ width: 200, contentWidth: 160 })
    host.appendChild(noOverflow)
    expect(getScrollInlineMax(noOverflow)).toBe(0)
    expect(getScrollInline(noOverflow)).toBe(0)
    expect(scrollInlineEdges(noOverflow)).toEqual({ atStart: true, atEnd: true })
  })

  it('resolves an LTR island (dir="ltr" and v-rtl:ltr) inside an RTL container', () => {
    const host = attachHost(document.createElement('div'))
    host.setAttribute('dir', 'rtl')

    const rtlScroller = createScrollerDom({ width: 200, contentWidth: 600 })
    const ltrIsland = createScrollerDom({ dir: 'ltr', width: 200, contentWidth: 600 })
    host.append(rtlScroller, ltrIsland)

    scrollToInline(rtlScroller, 180)
    scrollToInline(ltrIsland, 180)

    expect(rtlScroller.scrollLeft).toBeCloseTo(-180, 0)
    expect(ltrIsland.scrollLeft).toBeCloseTo(180, 0)
    expect(getScrollInline(rtlScroller)).toBeCloseTo(180, 0)
    expect(getScrollInline(ltrIsland)).toBeCloseTo(180, 0)

    const vRtlHost = attachHost(document.createElement('div'))
    vRtlHost.setAttribute('dir', 'rtl')
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => withDirectives(
            h('div', {
              class: 'vrtl-scroller',
              style: { width: '200px', height: '48px', overflowX: 'auto', overflowY: 'hidden' },
            }, [h('div', { style: { width: '600px', height: '32px' } })]),
            [[vRtl, undefined, 'ltr']],
          )
        },
      }),
      { attachTo: vRtlHost },
    )

    try {
      const el = wrapper.find('.vrtl-scroller').element
      expect(window.getComputedStyle(el).direction).toBe('ltr')
      scrollToInline(el, 160)
      expect(el.scrollLeft).toBeCloseTo(160, 0)
      expect(getScrollInline(el)).toBeCloseTo(160, 0)
    }
    finally {
      wrapper.unmount()
    }
  })

  it('works with RtlProvider and useInlineScroll: scrollToEnd sets atEnd in both RTL and nested LTR', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'ar',
    })

    const states: Record<string, ReturnType<typeof useInlineScroll>> = {}
    const elements: Record<string, HTMLElement> = {}

    const Track = defineComponent({
      props: { id: { type: String, required: true } },
      setup(props) {
        const track = ref<HTMLElement | null>(null)
        const scroll = useInlineScroll(track)
        states[props.id] = scroll
        return () => h(
          'div',
          {
            ref: (el) => {
              track.value = el as HTMLElement | null
              if (el) elements[props.id] = el as HTMLElement
            },
            style: { width: '200px', height: '48px', overflowX: 'auto', overflowY: 'hidden' },
          },
          [h('div', { style: { width: '600px', height: '32px' } })],
        )
      },
    })

    const host = attachHost(document.createElement('div'))
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('div', [
            h(Track, { id: 'page-rtl' }),
            h(RtlProvider, { dir: 'ltr' }, () => [h(Track, { id: 'island-ltr' })]),
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

      const pageScroll = states['page-rtl']!
      const islandScroll = states['island-ltr']!

      expect(pageScroll.max.value).toBe(400)
      expect(islandScroll.max.value).toBe(400)
      expect(pageScroll.atStart.value).toBe(true)
      expect(pageScroll.atEnd.value).toBe(false)
      expect(islandScroll.atStart.value).toBe(true)
      expect(islandScroll.atEnd.value).toBe(false)

      pageScroll.scrollToEnd()
      islandScroll.scrollToEnd()

      expect(elements['page-rtl']!.scrollLeft).toBeCloseTo(-400, 0)
      expect(elements['island-ltr']!.scrollLeft).toBeCloseTo(400, 0)
      expect(pageScroll.atEnd.value).toBe(true)
      expect(pageScroll.atStart.value).toBe(false)
      expect(pageScroll.offset.value).toBeCloseTo(400, 0)
      expect(islandScroll.atEnd.value).toBe(true)
      expect(islandScroll.atStart.value).toBe(false)
      expect(islandScroll.offset.value).toBeCloseTo(400, 0)

      pageScroll.scrollToStart()
      islandScroll.scrollToStart()
      expect(pageScroll.atStart.value).toBe(true)
      expect(pageScroll.offset.value).toBe(0)
      expect(islandScroll.atStart.value).toBe(true)
      expect(islandScroll.offset.value).toBe(0)
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })

  it('tracks live direction toggles and settles smooth scrolling in RTL', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
    })

    const track = ref<HTMLElement | null>(null)
    let scroll!: ReturnType<typeof useInlineScroll>

    const host = attachHost(document.createElement('div'))
    const wrapper = mount(
      defineComponent({
        setup() {
          scroll = useInlineScroll(track)
          return () => h(
            'div',
            {
              ref: track,
              style: { width: '200px', height: '48px', overflowX: 'auto', overflowY: 'hidden' },
            },
            [h('div', { style: { width: '600px', height: '32px' } })],
          )
        },
      }),
      {
        global: { plugins: [rtl] },
        attachTo: host,
      },
    )

    try {
      await nextTick()
      expect(scroll.max.value).toBe(400)

      // Scroll in LTR.
      scroll.scrollBy(180)
      expect(track.value!.scrollLeft).toBeCloseTo(180, 0)
      expect(scroll.offset.value).toBeCloseTo(180, 0)

      // Flip live to Arabic (RTL).
      rtl.setLocale('ar')
      await nextTick()
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      expect(window.getComputedStyle(track.value!).direction).toBe('rtl')

      // Smooth scroll toward inline-end in RTL and verify it settles at atEnd.
      scroll.scrollToEnd({ behavior: 'smooth' })
      await vi.waitFor(
        () => {
          expect(scroll.atEnd.value).toBe(true)
          expect(scroll.offset.value).toBeCloseTo(400, 0)
        },
        { timeout: 4000, interval: 25 },
      )
      expect(track.value!.scrollLeft).toBeCloseTo(-400, 0)
      expect(scroll.atStart.value).toBe(false)

      // Smooth scroll back to inline-start and verify it settles at atStart.
      scroll.scrollToStart({ behavior: 'smooth' })
      await vi.waitFor(
        () => {
          expect(scroll.atStart.value).toBe(true)
          expect(scroll.offset.value).toBeCloseTo(0, 0)
        },
        { timeout: 4000, interval: 25 },
      )

      // Flip back to English (LTR) and confirm positive scrollLeft resumes.
      rtl.setLocale('en')
      await nextTick()
      expect(window.getComputedStyle(track.value!).direction).toBe('ltr')
      scroll.scrollBy(120)
      expect(track.value!.scrollLeft).toBeCloseTo(120, 0)
      expect(scroll.offset.value).toBeCloseTo(120, 0)
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })
})
