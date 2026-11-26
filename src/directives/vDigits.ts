import type { ObjectDirective } from 'vue'
import { transliterateDigits } from '../format'

/** Options for `v-digits`. A bare directive converts to Western digits. */
export type DigitsDirectiveValue = {
  to?: 'latn' | 'arab' | 'arabext'
  decimal?: boolean
} | undefined

type Field = HTMLInputElement | HTMLTextAreaElement
interface State {
  options: DigitsDirectiveValue
  stop: () => void
}

const fields = new WeakMap<HTMLElement, State>()
let warned = false

function warnUnsupported(): void {
  // Keep NODE_ENV replaceable by the consumer, like the placement helpers.
  try {
    if (process.env.NODE_ENV === 'production' || warned) return
  }
  catch { return } // Standalone browser build without a process global.
  warned = true
  console.warn('[vue-rtl-kit] v-digits requires an input or textarea.')
}

function isField(el: HTMLElement): el is Field {
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
}

function convert(text: string, options: DigitsDirectiveValue): string {
  const digits = transliterateDigits(text, options?.to ?? 'latn')
  return options?.decimal ? digits.replace(/\u066B/g, '.').replace(/\u066C/g, '') : digits
}

function normalize(el: Field, options: DigitsDirectiveValue): void {
  const raw = el.value
  const next = convert(raw, options)
  if (next === raw) return

  const { selectionStart: start, selectionEnd: end, selectionDirection } = el
  el.value = next
  if (start === null || end === null) return // e.g. type="number"
  // DOM offsets are UTF-16 offsets. All replacements are one-for-one except
  // removed group separators; count only those strictly before each endpoint.
  const offset = (i: number) => options?.decimal ? raw.slice(0, i).replace(/\u066C/g, '').length : i
  el.setSelectionRange(offset(start), offset(end), selectionDirection ?? undefined)
}

function listen(el: Field, options: DigitsDirectiveValue): State {
  let composing = false
  let needsCommit = false
  const emitInput = () => el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

  // Capture runs before v-model's listener regardless of directive order.
  // Reuse the input already in flight: dispatching another would assign twice.
  const input = (event: Event) => {
    if (composing || (event as InputEvent).isComposing) return
    needsCommit = false
    normalize(el, state.options)
  }
  const start = () => { composing = true }
  const end = () => {
    needsCommit = composing
    composing = false
  }
  const commit = () => {
    // Non-lazy v-model dispatches its own input during compositionend. This
    // bubble listener runs after Vue's; only supply an event if Vue didn't.
    if (needsCommit) emitInput()
  }
  const paste = (event: Event) => {
    // Let native paste enforce maxlength and trigger change-on-blur (.lazy).
    // Its input event handles conversion. Synthetic paste has no default edit.
    if (event.isTrusted || composing || event.defaultPrevented || !event.cancelable || el.readOnly || el.disabled) return
    const text = (event as ClipboardEvent).clipboardData?.getData('text/plain')
    const { selectionStart: start, selectionEnd: end } = el
    if (!text || start === null || end === null || convert(text, state.options) === text) return
    event.preventDefault()
    // Match the field's newline handling before computing the new caret.
    const insert = el.tagName === 'TEXTAREA' ? text.replace(/\r\n?/g, '\n') : text.replace(/[\r\n]/g, '')
    el.setRangeText(insert, start, end, 'end')
    emitInput()
  }

  el.addEventListener('input', input, true)
  el.addEventListener('paste', paste)
  el.addEventListener('compositionstart', start, true)
  el.addEventListener('compositionend', end, true)
  el.addEventListener('compositionend', commit)
  const state = {
    options,
    stop() {
      el.removeEventListener('input', input, true)
      el.removeEventListener('paste', paste)
      el.removeEventListener('compositionstart', start, true)
      el.removeEventListener('compositionend', end, true)
      el.removeEventListener('compositionend', commit)
    },
  }
  return state
}

/** Normalize digits as the user edits, without parsing or formatting the field. */
export const vDigits: ObjectDirective<HTMLElement, DigitsDirectiveValue> = {
  mounted(el, { value }) {
    if (isField(el)) fields.set(el, listen(el, value))
    else warnUnsupported()
  },
  updated(el, { value }) {
    const state = fields.get(el)
    if (state) state.options = value
  },
  unmounted(el) {
    fields.get(el)?.stop()
    fields.delete(el)
  },
}

/** Alias for `app.directive('digits', vDigits)`. */
export const digitsDirective: ObjectDirective<HTMLElement, DigitsDirectiveValue> = vDigits
