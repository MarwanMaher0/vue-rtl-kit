import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createRtl } from '../src/core'
import { useInlineScroll } from '../src/composables/useInlineScroll'
import {
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
} from '../src/scroll'

interface StubScrollerOptions {
  dir?: 'ltr' | 'rtl'
  scrollWidth?: number
  clientWidth?: number
  scrollLeft?: number
  withScrollTo?: boolean
}

interface StubScroller {
  el: HTMLDivElement
  scrollToSpy: ReturnType<typeof vi.fn>
  setSize: (scrollWidth: number, clientWidth: number) => void
  setDirection: (dir: 'ltr' | 'rtl') => void
}

function createStubScroller(options: StubScrollerOptions = {}): StubScroller {
  const el = document.createElement('div')
  let scrollWidth = options.scrollWidth ?? 500
  let clientWidth = options.clientWidth ?? 200
  let scrollLeft = options.scrollLeft ?? 0
  el.style.direction = options.dir ?? 'ltr'

  Object.defineProperty(el, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  })
  Object.defineProperty(el, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  })
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value
    },
  })

  const scrollToSpy = vi.fn((arg?: ScrollToOptions | number) => {
    if (typeof arg === 'number') {
      scrollLeft = arg
    }
    else if (arg && typeof arg.left === 'number') {
      scrollLeft = arg.left
    }
  })

  if (options.withScrollTo !== false) {
    Object.defineProperty(el, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollToSpy,
    })
  }
  else {
    Object.defineProperty(el, 'scrollTo', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  }

  document.body.appendChild(el)

  return {
    el,
    scrollToSpy,
    setSize: (nextScrollWidth: number, nextClientWidth: number) => {
      scrollWidth = nextScrollWidth
      clientWidth = nextClientWidth
    },
    setDirection: (dir: 'ltr' | 'rtl') => {
      el.style.direction = dir
    },
  }
}

describe('pure inline scroll helpers (src/scroll.ts)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('getScrollInlineMax', () => {
    it('computes max(0, scrollWidth - clientWidth)', () => {
      const { el, setSize } = createStubScroller({ scrollWidth: 500, clientWidth: 200 })
      expect(getScrollInlineMax(el)).toBe(300)

      setSize(200, 200)
      expect(getScrollInlineMax(el)).toBe(0)

      setSize(120, 200)
      expect(getScrollInlineMax(el)).toBe(0)
    })

    it('returns 0 for null, undefined, and non-finite layout dimensions', () => {
      expect(getScrollInlineMax(null)).toBe(0)
      expect(getScrollInlineMax(undefined)).toBe(0)

      const { el, setSize } = createStubScroller({ scrollWidth: Number.NaN, clientWidth: 200 })
      expect(getScrollInlineMax(el)).toBe(0)

      setSize(500, Number.POSITIVE_INFINITY)
      expect(getScrollInlineMax(el)).toBe(0)
    })
  })

  describe('getScrollInline', () => {
    it('reads inline-start distance with positive sign in LTR and clamps to 0..max', () => {
      const { el } = createStubScroller({ dir: 'ltr', scrollWidth: 500, clientWidth: 200, scrollLeft: 0 })
      expect(Object.is(getScrollInline(el), 0)).toBe(true)

      el.scrollLeft = 120
      expect(getScrollInline(el)).toBe(120)

      el.scrollLeft = 300
      expect(getScrollInline(el)).toBe(300)

      // Overscroll clamping on both ends.
      el.scrollLeft = -25
      expect(Object.is(getScrollInline(el), 0)).toBe(true)

      el.scrollLeft = 420
      expect(getScrollInline(el)).toBe(300)
    })

    it('negates negative scrollLeft in RTL, avoids -0, and clamps to 0..max', () => {
      const { el } = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200, scrollLeft: 0 })
      expect(Object.is(getScrollInline(el), 0)).toBe(true)

      el.scrollLeft = -120
      expect(getScrollInline(el)).toBe(120)

      el.scrollLeft = -300
      expect(getScrollInline(el)).toBe(300)

      // Overscroll past inline-end or inline-start.
      el.scrollLeft = -380
      expect(getScrollInline(el)).toBe(300)

      el.scrollLeft = 20
      expect(Object.is(getScrollInline(el), 0)).toBe(true)
    })

    it('returns 0 when there is no overflow, for null/undefined, or for non-finite scrollLeft', () => {
      expect(getScrollInline(null)).toBe(0)
      expect(getScrollInline(undefined)).toBe(0)

      const noOverflow = createStubScroller({ dir: 'rtl', scrollWidth: 200, clientWidth: 200, scrollLeft: -50 })
      expect(getScrollInline(noOverflow.el)).toBe(0)

      const { el } = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200 })
      el.scrollLeft = Number.NaN
      expect(getScrollInline(el)).toBe(0)

      el.scrollLeft = Number.NEGATIVE_INFINITY
      expect(getScrollInline(el)).toBe(0)
    })

    it('never throws if getComputedStyle throws', () => {
      const { el } = createStubScroller({ dir: 'ltr', scrollWidth: 500, clientWidth: 200, scrollLeft: 40 })
      vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
        throw new Error('style error')
      })
      expect(getScrollInline(el)).toBe(40)
    })
  })

  describe('scrollToInline and scrollByInline', () => {
    it('clamps and calls el.scrollTo with positive physical left in LTR', () => {
      const { el, scrollToSpy } = createStubScroller({ dir: 'ltr', scrollWidth: 500, clientWidth: 200 })

      scrollToInline(el, 140)
      expect(scrollToSpy).toHaveBeenLastCalledWith({ left: 140 })

      scrollToInline(el, 999, { behavior: 'smooth' })
      expect(scrollToSpy).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' })

      scrollToInline(el, -50, { behavior: 'instant' })
      expect(scrollToSpy).toHaveBeenLastCalledWith({ left: 0, behavior: 'instant' })
    })

    it('clamps and calls el.scrollTo with negative physical left in RTL and avoids -0', () => {
      const { el, scrollToSpy } = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200 })

      scrollToInline(el, 140)
      expect(scrollToSpy).toHaveBeenLastCalledWith({ left: -140 })

      scrollToInline(el, 999, { behavior: 'smooth' })
      expect(scrollToSpy).toHaveBeenLastCalledWith({ left: -300, behavior: 'smooth' })

      scrollToInline(el, -20)
      const lastArg = scrollToSpy.mock.calls.at(-1)?.[0] as ScrollToOptions
      expect(Object.is(lastArg.left, 0)).toBe(true)
    })

    it('moves toward inline-end on positive delta in both LTR and RTL', () => {
      const ltr = createStubScroller({ dir: 'ltr', scrollWidth: 500, clientWidth: 200, scrollLeft: 50 })
      scrollByInline(ltr.el, 80)
      expect(ltr.scrollToSpy).toHaveBeenLastCalledWith({ left: 130 })
      scrollByInline(ltr.el, -200, { behavior: 'smooth' })
      expect(ltr.scrollToSpy).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })

      const rtl = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200, scrollLeft: -50 })
      scrollByInline(rtl.el, 80)
      expect(rtl.scrollToSpy).toHaveBeenLastCalledWith({ left: -130 })
      scrollByInline(rtl.el, 500)
      expect(rtl.scrollToSpy).toHaveBeenLastCalledWith({ left: -300 })
      scrollByInline(rtl.el, -120, { behavior: 'auto' })
      expect(rtl.scrollToSpy).toHaveBeenLastCalledWith({ left: -180, behavior: 'auto' })
    })

    it('falls back to scrollLeft assignment when el.scrollTo is absent and never throws', () => {
      const { el } = createStubScroller({
        dir: 'rtl',
        scrollWidth: 500,
        clientWidth: 200,
        withScrollTo: false,
      })

      scrollToInline(el, 90)
      expect(el.scrollLeft).toBe(-90)

      scrollByInline(el, 60)
      expect(el.scrollLeft).toBe(-150)

      const throwing = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200 })
      throwing.scrollToSpy.mockImplementation(() => {
        throw new Error('scrollTo failed')
      })
      expect(() => scrollToInline(throwing.el, 50)).not.toThrow()
    })

    it('is a no-op for null, undefined, NaN, and Infinity', () => {
      const { el, scrollToSpy } = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200 })

      expect(() => {
        scrollToInline(null, 50)
        scrollToInline(undefined, 50)
        scrollToInline(el, Number.NaN)
        scrollToInline(el, Number.POSITIVE_INFINITY)
        scrollToInline(el, Number.NEGATIVE_INFINITY)
        scrollByInline(null, 50)
        scrollByInline(undefined, 50)
        scrollByInline(el, Number.NaN)
        scrollByInline(el, Number.POSITIVE_INFINITY)
        scrollByInline(el, Number.NEGATIVE_INFINITY)
      }).not.toThrow()

      expect(scrollToSpy).not.toHaveBeenCalled()
    })
  })

  describe('scrollInlineEdges', () => {
    it('reports edges with default 1px tolerance in LTR and RTL', () => {
      const { el, setDirection } = createStubScroller({ dir: 'ltr', scrollWidth: 500, clientWidth: 200, scrollLeft: 0 })
      expect(scrollInlineEdges(el)).toEqual({ atStart: true, atEnd: false })

      el.scrollLeft = 0.8
      expect(scrollInlineEdges(el)).toEqual({ atStart: true, atEnd: false })

      el.scrollLeft = 150
      expect(scrollInlineEdges(el)).toEqual({ atStart: false, atEnd: false })

      el.scrollLeft = 299.2
      expect(scrollInlineEdges(el)).toEqual({ atStart: false, atEnd: true })

      setDirection('rtl')
      el.scrollLeft = -0.5
      expect(scrollInlineEdges(el)).toEqual({ atStart: true, atEnd: false })

      el.scrollLeft = -150
      expect(scrollInlineEdges(el)).toEqual({ atStart: false, atEnd: false })

      el.scrollLeft = -299.5
      expect(scrollInlineEdges(el)).toEqual({ atStart: false, atEnd: true })
    })

    it('honours custom tolerance and sanitises non-finite or negative tolerance', () => {
      const { el } = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200, scrollLeft: -4 })
      expect(scrollInlineEdges(el, 0)).toEqual({ atStart: false, atEnd: false })
      expect(scrollInlineEdges(el, 5)).toEqual({ atStart: true, atEnd: false })

      el.scrollLeft = -150
      expect(scrollInlineEdges(el, Number.NaN)).toEqual({ atStart: false, atEnd: false })
      expect(scrollInlineEdges(el, Number.POSITIVE_INFINITY)).toEqual({ atStart: false, atEnd: false })
      expect(scrollInlineEdges(el, -10)).toEqual({ atStart: false, atEnd: false })
    })

    it('returns both edges true when there is no overflow or el is null', () => {
      expect(scrollInlineEdges(null)).toEqual({ atStart: true, atEnd: true })
      expect(scrollInlineEdges(undefined)).toEqual({ atStart: true, atEnd: true })

      const { el } = createStubScroller({ dir: 'rtl', scrollWidth: 200, clientWidth: 200 })
      expect(scrollInlineEdges(el)).toEqual({ atStart: true, atEnd: true })
    })
  })
})

describe('useInlineScroll composable', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
    if (originalResizeObserver === undefined) {
      delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
    }
    else {
      globalThis.ResizeObserver = originalResizeObserver
    }
    vi.restoreAllMocks()
  })

  function installResizeObserverStub() {
    const instances: Array<{
      callback: ResizeObserverCallback
      observed: Element[]
      disconnected: boolean
      trigger: () => void
    }> = []

    class FakeResizeObserver {
      private record: (typeof instances)[number]

      constructor(callback: ResizeObserverCallback) {
        this.record = {
          callback,
          observed: [],
          disconnected: false,
          trigger: () => callback([], this as unknown as ResizeObserver),
        }
        instances.push(this.record)
      }

      observe(target: Element) {
        this.record.observed.push(target)
      }

      unobserve() {}

      disconnect() {
        this.record.disconnected = true
      }
    }

    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
    return instances
  }

  it('tracks scroll events passively, ResizeObserver changes, and scroll actions in RTL', async () => {
    const observers = installResizeObserverStub()
    const stub = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200, scrollLeft: 0 })
    const addSpy = vi.spyOn(stub.el, 'addEventListener')
    const removeSpy = vi.spyOn(stub.el, 'removeEventListener')

    const scope = effectScope()
    const target = ref<HTMLElement | null>(stub.el)
    const state = scope.run(() => useInlineScroll(target))!

    expect(state.offset.value).toBe(0)
    expect(state.max.value).toBe(300)
    expect(state.atStart.value).toBe(true)
    expect(state.atEnd.value).toBe(false)

    // Passive scroll listener and ResizeObserver were attached.
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
    expect(observers).toHaveLength(1)
    expect(observers[0]!.observed).toEqual([stub.el])

    // Native scroll event updates reactive state.
    stub.el.scrollLeft = -120
    stub.el.dispatchEvent(new Event('scroll'))
    expect(state.offset.value).toBe(120)
    expect(state.atStart.value).toBe(false)
    expect(state.atEnd.value).toBe(false)

    // Actions scroll in logical coordinates and update state.
    state.scrollBy(80, { behavior: 'smooth' })
    expect(stub.scrollToSpy).toHaveBeenLastCalledWith({ left: -200, behavior: 'smooth' })
    expect(state.offset.value).toBe(200)

    state.scrollToEnd()
    expect(stub.scrollToSpy).toHaveBeenLastCalledWith({ left: -300 })
    expect(state.offset.value).toBe(300)
    expect(state.atEnd.value).toBe(true)

    state.scrollToStart()
    expect(state.offset.value).toBe(0)
    expect(state.atStart.value).toBe(true)

    state.scrollTo(150)
    expect(state.offset.value).toBe(150)

    // ResizeObserver updates max and edge flags when overflow disappears.
    stub.setSize(200, 200)
    observers[0]!.trigger()
    expect(state.max.value).toBe(0)
    expect(state.offset.value).toBe(0)
    expect(state.atStart.value).toBe(true)
    expect(state.atEnd.value).toBe(true)

    // Disposing removes the scroll listener and disconnects ResizeObserver.
    scope.stop()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(observers[0]!.disconnected).toBe(true)

    // Subsequent scroll events no longer update state.
    stub.setSize(500, 200)
    stub.el.scrollLeft = -100
    stub.el.dispatchEvent(new Event('scroll'))
    expect(state.offset.value).toBe(0)
  })

  it('re-reads and swaps listeners when target changes or becomes null', async () => {
    const observers = installResizeObserverStub()
    const first = createStubScroller({ dir: 'ltr', scrollWidth: 400, clientWidth: 200, scrollLeft: 60 })
    const second = createStubScroller({ dir: 'rtl', scrollWidth: 600, clientWidth: 200, scrollLeft: -250 })

    const firstRemove = vi.spyOn(first.el, 'removeEventListener')
    const secondRemove = vi.spyOn(second.el, 'removeEventListener')

    const scope = effectScope()
    const target = ref<HTMLElement | null>(null)
    const state = scope.run(() => useInlineScroll(target))!

    expect(state.offset.value).toBe(0)
    expect(state.max.value).toBe(0)
    expect(state.atStart.value).toBe(true)
    expect(state.atEnd.value).toBe(true)
    expect(observers).toHaveLength(0)

    target.value = first.el
    await nextTick()
    expect(state.offset.value).toBe(60)
    expect(state.max.value).toBe(200)
    expect(observers).toHaveLength(1)

    target.value = second.el
    await nextTick()
    expect(firstRemove).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(observers[0]!.disconnected).toBe(true)
    expect(state.offset.value).toBe(250)
    expect(state.max.value).toBe(400)
    expect(observers).toHaveLength(2)

    target.value = null
    await nextTick()
    expect(secondRemove).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(observers[1]!.disconnected).toBe(true)
    expect(state.offset.value).toBe(0)
    expect(state.max.value).toBe(0)
    expect(state.atStart.value).toBe(true)
    expect(state.atEnd.value).toBe(true)

    scope.stop()
  })

  it('re-reads when useDirection().dir changes and cleans up on unmount', async () => {
    const observers = installResizeObserverStub()
    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'en' })
    const stub = createStubScroller({ dir: 'ltr', scrollWidth: 500, clientWidth: 200, scrollLeft: 100 })
    const removeSpy = vi.spyOn(stub.el, 'removeEventListener')

    let captured!: ReturnType<typeof useInlineScroll>

    const Comp = defineComponent({
      setup() {
        captured = useInlineScroll(() => stub.el, { tolerance: 2 })
        return () => h('div', `${captured.offset.value}:${captured.atStart.value}:${captured.atEnd.value}`)
      },
    })

    const wrapper = mount(Comp, { global: { plugins: [rtl] } })
    expect(captured.offset.value).toBe(100)

    // Switch to RTL: update element direction & scrollLeft, then flip store direction.
    stub.setDirection('rtl')
    stub.el.scrollLeft = -298.5
    rtl.setLocale('ar')
    await nextTick()

    expect(captured.offset.value).toBe(298.5)
    expect(captured.atEnd.value).toBe(true)
    expect(captured.atStart.value).toBe(false)

    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(observers[0]!.disconnected).toBe(true)
    rtl.dispose()
  })

  it('works cleanly when ResizeObserver is unavailable and tolerance is non-finite', () => {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
    const stub = createStubScroller({ dir: 'rtl', scrollWidth: 500, clientWidth: 200, scrollLeft: -10 })

    const scope = effectScope()
    const state = scope.run(() => useInlineScroll(stub.el, { tolerance: Number.NaN }))!
    expect(state.offset.value).toBe(10)
    expect(state.atStart.value).toBe(false)
    expect(state.atEnd.value).toBe(false)
    scope.stop()
  })
})
