import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, createApp, nextTick, ref } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createRtl, vDigits } from '../src'

const global = { directives: { digits: vDigits } }

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

// A watcher would hide duplicate assignments of the same value. Record every
// call made by the actual v-model listener, including intermediate IME edits.
function mountModel(template = '<input v-model="model" v-digits>') {
  const value = ref<string | number>('')
  const assign = vi.fn((next: string | number) => { value.value = next })
  const model = computed({ get: () => value.value, set: assign })
  const wrapper = mount({ setup: () => ({ model }), template }, { global })
  return { el: wrapper.get('input').element, assign }
}

type Field = HTMLInputElement | HTMLTextAreaElement

function input(el: Field, init?: InputEventInit) {
  el.dispatchEvent(new InputEvent('input', { bubbles: true, ...init }))
}

// jsdom has neither a native paste default action nor a clipboard. Supply
// text/plain when available and assert separately whether default was canceled.
function paste(el: Field, text?: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  if (text !== undefined) {
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => type === 'text/plain' || type === 'text' ? text : '' },
    })
  }
  el.dispatchEvent(event)
  return event
}

describe('v-digits', () => {
  it('registers the public directive by default but respects registerGlobals: false', () => {
    for (const registerGlobals of [undefined, false]) {
      const app = createApp({})
      const rtl = createRtl({ registerGlobals, syncDocument: false })
      app.use(rtl)
      expect(vDigits).toBeDefined()
      expect(app.directive('digits')).toBe(registerGlobals === false ? undefined : vDigits)
      rtl.dispose()
    }
  })

  it('normalizes mixed digit scripts without parsing the value or moving the caret to the end', async () => {
    const { el, assign } = mountModel()
    el.value = 'ID-٠۰٢۴a9'
    el.setSelectionRange(5, 5)
    input(el)
    await nextTick()
    expect(el.value).toBe('ID-0024a9')
    expect([el.selectionStart, el.selectionEnd]).toEqual([5, 5])
    expect(assign.mock.calls).toEqual([['ID-0024a9']])
  })

  it.each([
    ['latn', 'A-012٬3٫4'],
    ['arab', 'A-٠١٢٬٣٫٤'],
    ['arabext', 'A-۰۱۲٬۳٫۴'],
  ])('maps all three input scripts to %s and preserves punctuation when decimal is false', (to, expected) => {
    const wrapper = mount({
      setup: () => ({ options: { to, decimal: false } }),
      template: '<textarea v-digits="options"></textarea>',
    }, { global })
    const el = wrapper.get('textarea').element
    el.value = 'A-٠1۲٬٣٫4'
    input(el)
    expect(el.value).toBe(expected)
  })

  it('uses updated options for the next edit without rewriting the initial value on mount', async () => {
    const wrapper = mount({
      props: ['options'],
      template: '<input value="۱۲٫٥" v-digits="options">',
    }, { props: { options: { to: 'arab' } }, global })
    const el = wrapper.get('input').element
    expect(el.value).toBe('۱۲٫٥')
    input(el)
    expect(el.value).toBe('١٢٫٥')
    await wrapper.setProps({ options: { to: 'latn', decimal: true } })
    el.value = '١٢٫٦'
    input(el)
    expect(el.value).toBe('12.6')
  })

  it.each([
    { start: 5, end: 5, direction: 'none', after: [4, 4] },
    { start: 4, end: 9, direction: 'backward', after: [3, 7] },
  ] as const)('maps a $direction selection through removed Arabic group separators', ({ start, end, direction, after }) => {
    const { el, assign } = mountModel('<input v-model="model" v-digits="{ decimal: true }">')
    el.value = '🔢١٬٢٣٬٤٫٥Z'
    el.setSelectionRange(start, end, direction)
    input(el)
    expect(el.value).toBe('🔢1234.5Z')
    expect([el.selectionStart, el.selectionEnd]).toEqual(after)
    if (start !== end) expect(el.selectionDirection).toBe(direction)
    expect(assign.mock.calls).toEqual([['🔢1234.5Z']])
  })

  it('normalizes supported input values even when the field has no selection API', () => {
    const { el, assign } = mountModel('<input type="email" v-model="model" v-digits>')
    el.value = 'user۰۱@example.test'
    expect(el.selectionStart).toBeNull()
    input(el)
    expect(el.value).toBe('user01@example.test')
    expect(assign.mock.calls).toEqual([['user01@example.test']])
  })

  it.each(['tel', 'search'])('normalizes type=%s while preserving its selection', (type) => {
    const { el, assign } = mountModel(`<input type="${type}" v-model="model" v-digits>`)
    el.value = '٠١۲۳'
    el.setSelectionRange(1, 3)
    input(el)
    expect(assign.mock.calls).toEqual([['0123']])
    expect([el.selectionStart, el.selectionEnd]).toEqual([1, 3])
  })

  it('passes the browser-accepted value of a number input to Vue', () => {
    const { el, assign } = mountModel('<input type="number" v-model="model" v-digits>')
    el.value = '12.3'
    expect(el.selectionStart).toBeNull()
    input(el)
    expect(assign.mock.calls).toEqual([[12.3]])
  })

  it('passes unchanged text through with one model assignment', () => {
    const { el, assign } = mountModel()
    el.value = '+00.5 kg'
    el.setSelectionRange(0, 3, 'backward')
    input(el)
    expect(assign.mock.calls).toEqual([['+00.5 kg']])
    expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([0, 3, 'backward'])
  })

  it('replaces only the selected text on a transformed paste and notifies v-model once', async () => {
    const { el, assign } = mountModel('<input v-model="model" v-digits="{ decimal: true }">')
    const values: string[] = []
    el.parentElement!.addEventListener('input', () => values.push(el.value))
    el.value = 'abXXcd'
    el.setSelectionRange(2, 4, 'backward')
    expect(paste(el, '١٬۲٣٫٤').defaultPrevented).toBe(true)
    await nextTick()
    expect(el.value).toBe('ab123.4cd')
    expect([el.selectionStart, el.selectionEnd]).toEqual([7, 7])
    expect(assign.mock.calls).toEqual([['ab123.4cd']])
    expect(values).toEqual(['ab123.4cd'])
  })

  it.each(['123', undefined])('allows native paste without a model write for clipboard data %j', (text) => {
    const { el, assign } = mountModel()
    el.value = 'aZb'
    el.setSelectionRange(1, 2)
    expect(paste(el, text).defaultPrevented).toBe(false)
    expect(el.value).toBe('aZb')
    expect([el.selectionStart, el.selectionEnd]).toEqual([1, 2])
    expect(assign).not.toHaveBeenCalled()
  })

  it.each([
    '<input v-model="model" v-digits>',
    '<input v-digits v-model="model">',
  ])('commits composition exactly once, already normalized, with %s', async (template) => {
    const { el, assign } = mountModel(template)
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    for (const draft of ['١', '١۲']) {
      el.value = draft
      input(el, { isComposing: true, inputType: 'insertCompositionText' })
      await nextTick()
      expect(el.value).toBe(draft)
      expect(assign).not.toHaveBeenCalled()
    }
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '١۲' }))
    await nextTick()
    expect(el.value).toBe('12')
    expect(assign.mock.calls).toEqual([['12']])

    // Ending composition must also re-enable ordinary editing.
    el.value = '12۳'
    input(el)
    expect(assign.mock.calls).toEqual([['12'], ['123']])
  })

  it('leaves composition drafts and pastes alone until the IME commits', () => {
    const wrapper = mount({ template: '<input v-digits>' }, { global })
    const el = wrapper.get('input').element
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    el.value = '٣'
    // Some composing input events have no isComposing flag. The start/end
    // lifecycle still takes precedence, including over a transforming paste.
    input(el)
    expect(paste(el, '۴').defaultPrevented).toBe(false)
    expect(el.value).toBe('٣')
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    expect(el.value).toBe('3')
  })

  it('commits composed text on a textarea without relying on v-model', () => {
    const wrapper = mount({ template: '<div><textarea v-digits></textarea></div>' }, { global })
    const el = wrapper.get('textarea').element
    const values: string[] = []
    wrapper.element.addEventListener('input', () => values.push(el.value))
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    el.value = 'سطر\n٤۵'
    input(el, { isComposing: true })
    expect(el.value).toBe('سطر\n٤۵')
    values.length = 0
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    expect(el.value).toBe('سطر\n45')
    expect(values).toEqual(['سطر\n45'])
  })

  it('lets v-model.number coerce the normalized text', () => {
    const { el, assign } = mountModel('<input v-model.number="model" v-digits="{ decimal: true }">')
    el.value = '١٬٢٣٤٫٥'
    input(el)
    expect(assign.mock.calls).toEqual([[1234.5]])
    expect(el.value).toBe('1234.5')
  })

  it('normalizes input immediately but leaves v-model.lazy assignments to change', () => {
    const { el, assign } = mountModel('<input v-model.lazy="model" v-digits>')
    el.value = '٠١'
    input(el)
    expect(el.value).toBe('01')
    expect(assign).not.toHaveBeenCalled()
    el.dispatchEvent(new Event('change', { bubbles: true }))
    expect(assign.mock.calls).toEqual([['01']])
  })

  it('stops handling input, paste and composition on the detached element after unmount', async () => {
    const wrapper = mount({
      props: { show: Boolean },
      template: '<input v-if="show" v-digits>',
    }, { props: { show: true }, global })
    const el = wrapper.get('input').element
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    await wrapper.setProps({ show: false })
    const onInput = vi.fn()
    el.addEventListener('input', onInput)
    el.value = '٤'
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    expect(onInput).not.toHaveBeenCalled()
    expect(el.value).toBe('٤')
    expect(paste(el, '۵').defaultPrevented).toBe(false)
    input(el)
    expect(el.value).toBe('٤')
    expect(onInput).toHaveBeenCalledTimes(1)
  })

  it('ignores an unsupported element silently in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount({ template: '<div v-digits>١۲</div>' }, { global })
    wrapper.element.dispatchEvent(new Event('input', { bubbles: true }))
    expect(wrapper.text()).toBe('١۲')
    expect(warn).not.toHaveBeenCalled()
  })

  it('ignores an unsupported element and warns once in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount({
      props: ['options'],
      template: '<section><div v-digits="options">١۲</div><span v-digits>٣</span></section>',
    }, { global })
    await wrapper.setProps({ options: {} })
    wrapper.get('div').element.dispatchEvent(new Event('input', { bubbles: true }))
    expect(wrapper.get('div').text()).toBe('١۲')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0])).toMatch(/digits/i)
  })
})
