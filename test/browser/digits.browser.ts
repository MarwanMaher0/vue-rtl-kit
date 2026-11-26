import { userEvent } from '@vitest/browser/context'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, vModelText, withDirectives } from 'vue'
import { vDigits } from '../../src'
import { attachHost, removeHosts } from './hosts'

describe('v-digits in an RTL form in real Chromium', () => {
  afterEach(removeHosts)

  it('normalizes each typed digit before v-model sees it and keeps the caret before the suffix', async () => {
    const model = ref('14')
    const updates: string[] = []
    const wrapper = mount(defineComponent({
      setup: () => () => h('form', { dir: 'rtl' }, [
        // Render <input v-model="model" v-digits>, recording every model assignment.
        withDirectives(h('input', {
          type: 'text',
          'onUpdate:modelValue': (value: string) => {
            updates.push(value)
            model.value = value
          },
        }), [[vModelText, model.value], [vDigits]]),
      ]),
    }), { attachTo: attachHost(document.createElement('div')) })

    try {
      const input = wrapper.get('input').element
      expect(getComputedStyle(input).direction).toBe('rtl')
      input.focus()
      input.setSelectionRange(1, 1) // 1|4

      await userEvent.keyboard('٢') // Arabic-Indic two
      await nextTick()
      expect(input.value).toBe('124')
      expect(model.value).toBe('124')
      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2])

      await userEvent.keyboard('۳') // Persian three, without repositioning the caret
      await nextTick()
      expect(input.value).toBe('1234')
      expect(model.value).toBe('1234')
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3])
      expect(updates).toEqual(['124', '1234'])
    }
    finally {
      wrapper.unmount()
    }
  })
})
