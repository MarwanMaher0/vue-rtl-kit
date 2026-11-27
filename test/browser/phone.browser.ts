import { userEvent } from '@vitest/browser/context'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { computed, defineComponent, h, nextTick, ref, vModelText, withDirectives } from 'vue'
import { LRI, PDI, formatPhone, normalizePhone, vDigits } from '../../src'
import { attachHost, removeHosts } from './hosts'

const BIDI_CONTROL = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/u

interface CharRect {
  char: string
  rect: DOMRect
}

function measurePhoneChars(element: Element, phoneText: string): CharRect[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const textNode = walker.nextNode() as Text | null
  expect(textNode).not.toBeNull()
  const content = textNode!.data
  const start = content.indexOf(phoneText)
  expect(start).toBeGreaterThanOrEqual(0)

  const chars: CharRect[] = []
  let offset = start
  const end = start + phoneText.length
  while (offset < end) {
    const ch = content[offset]!
    const nextOffset = offset + ch.length
    if (!BIDI_CONTROL.test(ch)) {
      const range = document.createRange()
      range.setStart(textNode!, offset)
      range.setEnd(textNode!, nextOffset)
      chars.push({ char: ch, rect: range.getBoundingClientRect() })
    }
    offset = nextOffset
  }
  return chars
}

describe('phone helpers with v-digits in an RTL form in real Chromium', () => {
  afterEach(removeHosts)

  it('normalizes an Arabic-Indic phone typed into a v-digits input and keeps the plus sign on the visual left inside RTL text', async () => {
    const raw = ref('')
    const e164 = computed(() => normalizePhone(raw.value, { defaultRegion: 'SA' }))
    const formattedLatn = computed(() => formatPhone(e164.value, { locale: 'ar', numberingSystem: 'latn' }))
    const unisolatedLatn = computed(() => formatPhone(e164.value, { locale: 'ar', numberingSystem: 'latn', isolate: false }))
    const formattedArab = computed(() => formatPhone(e164.value, { locale: 'ar-EG', numberingSystem: 'arab' }))
    const unisolatedArab = computed(() => formatPhone(e164.value, { locale: 'ar-EG', numberingSystem: 'arab', isolate: false }))

    const host = attachHost(document.createElement('div'))
    host.style.cssText = 'white-space: pre; font-family: monospace, sans-serif; font-size: 20px; line-height: 1.5;'

    const wrapper = mount(defineComponent({
      setup: () => () => h('form', { dir: 'rtl', lang: 'ar' }, [
        withDirectives(h('input', {
          type: 'text',
          inputmode: 'tel',
          'onUpdate:modelValue': (value: string) => {
            raw.value = value
          },
        }), [[vModelText, raw.value], [vDigits]]),
        h('p', { class: 'formatted-latn', dir: 'rtl' }, `رقم الهاتف: ${formattedLatn.value} للتواصل`),
        h('p', { class: 'unisolated-latn', dir: 'rtl' }, `رقم الهاتف: ${unisolatedLatn.value} للتواصل`),
        h('p', { class: 'formatted-arab', dir: 'rtl' }, `رقم الهاتف: ${formattedArab.value} للتواصل`),
        h('p', { class: 'unisolated-arab', dir: 'rtl' }, `رقم الهاتف: ${unisolatedArab.value} للتواصل`),
      ]),
    }), { attachTo: host })

    try {
      const input = wrapper.get('input').element
      expect(getComputedStyle(input).direction).toBe('rtl')

      input.focus()
      await userEvent.keyboard('٠٥٠ ١٢٣ ٤٥٦٧')
      await nextTick()

      expect(input.value).toBe('050 123 4567')
      expect(raw.value).toBe('050 123 4567')
      expect(e164.value).toBe('+966501234567')
      expect(formattedLatn.value).toBe(`${LRI}+966 50 123 4567${PDI}`)
      expect(formattedArab.value).toBe(`${LRI}+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧${PDI}`)

      // With LRI...PDI and Western digits, '+' stays strictly on the visual left
      // and every character advances strictly left to right inside the RTL form.
      const latnChars = measurePhoneChars(wrapper.get('.formatted-latn').element, '+966 50 123 4567')
      expect(latnChars[0]!.char).toBe('+')
      expect(latnChars[0]!.rect.width).toBeGreaterThan(0)
      for (let i = 1; i < latnChars.length; i++) {
        expect(latnChars[0]!.rect.left).toBeLessThan(latnChars[i]!.rect.left)
        expect(latnChars[i - 1]!.rect.left).toBeLessThan(latnChars[i]!.rect.left)
      }

      // With LRI...PDI and Arabic-Indic digits, '+' also stays strictly on the
      // visual left of every digit.
      const arabChars = measurePhoneChars(wrapper.get('.formatted-arab').element, '+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧')
      expect(arabChars[0]!.char).toBe('+')
      for (let i = 1; i < arabChars.length; i++) {
        expect(arabChars[0]!.rect.left).toBeLessThan(arabChars[i]!.rect.left)
      }

      // Control cases: without LRI...PDI, Chromium moves '+' to the visual right
      // of the phone number inside the RTL Arabic sentence.
      const brokenLatn = measurePhoneChars(wrapper.get('.unisolated-latn').element, '+966 50 123 4567')
      expect(brokenLatn[0]!.rect.left).toBeGreaterThan(brokenLatn[1]!.rect.left)

      const brokenArab = measurePhoneChars(wrapper.get('.unisolated-arab').element, '+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧')
      expect(brokenArab[0]!.rect.left).toBeGreaterThan(brokenArab[1]!.rect.left)
    }
    finally {
      wrapper.unmount()
    }
  })
})
