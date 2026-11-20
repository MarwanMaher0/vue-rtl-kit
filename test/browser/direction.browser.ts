import { afterEach, describe, expect, it } from 'vitest'
import type { VNode } from 'vue'
import { defineComponent, h, nextTick, reactive, ref, withDirectives } from 'vue'
import { mount } from '@vue/test-utils'
import type { Direction } from '../../src'
import type { RtlDirectiveValue } from '../../src/directives/vRtl'
import { RtlProvider, createRtl, useDirection, vRtl } from '../../src'
import '../../src/styles/logical.css'
import { attachHost, removeHosts } from './hosts'

function computedDir(el: Element): string {
  return window.getComputedStyle(el).direction
}

function computedBidi(el: Element): string {
  return window.getComputedStyle(el).unicodeBidi
}

/** Render-function form of `v-rtl[:arg][.modifiers]="value"`. */
function withRtl(
  vnode: VNode,
  value?: RtlDirectiveValue,
  arg?: string,
  modifiers: Partial<Record<string, boolean>> = {},
): VNode {
  return withDirectives(vnode, [[vRtl, value, arg, modifiers]])
}

describe('v-rtl and nested RtlProvider computed direction in real Chromium', () => {
  afterEach(() => {
    removeHosts()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('gives the expected computed direction and unicode-bidi for v-rtl bindings, including dir="auto"', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const host = document.createElement('div')
    attachHost(host)

    const dynamicDir = ref<Direction>('ltr')
    const showRestorable = ref(true)
    const reactiveBox = reactive<{ dir: Direction, isolate: boolean }>({
      dir: 'ltr',
      isolate: true,
    })

    const wrapper = mount(
      defineComponent({
        setup: () => () => h('div', [
          h('div', { class: 'ltr-parent', dir: 'ltr' }, [
            withRtl(h('p', { class: 'dir-default' }, 'Hello world')),
            showRestorable.value
              ? withRtl(h('p', { class: 'dir-restorable', dir: 'rtl' }, 'Hello world'), undefined, 'ltr')
              : null,
          ]),
          withRtl(h('pre', { class: 'dir-arg-ltr' }, 'مرحبا بالعالم'), undefined, 'ltr'),
          withRtl(h('span', { class: 'dir-mod-ltr-isolate' }, 'مرحبا'), undefined, undefined, { ltr: true, isolate: true }),
          withRtl(h('p', { class: 'dir-auto-ar' }, 'مرحبا world'), undefined, undefined, { auto: true }),
          withRtl(h('p', { class: 'dir-auto-en' }, 'Hello مرحبا'), undefined, undefined, { auto: true }),
          withRtl(h('div', { class: 'dir-ref' }, 'مرحبا'), dynamicDir.value),
          withRtl(h('div', { class: 'dir-reactive-obj' }, 'مرحبا'), reactiveBox),
        ]),
      }),
      { attachTo: host },
    )

    try {
      expect(computedDir(host.querySelector('.dir-default')!)).toBe('rtl')
      expect(computedDir(host.querySelector('.dir-arg-ltr')!)).toBe('ltr')

      const modIsolate = host.querySelector('.dir-mod-ltr-isolate')!
      expect(computedDir(modIsolate)).toBe('ltr')
      expect(computedBidi(modIsolate)).toBe('isolate')

      // Real Chromium resolves dir="auto" from first strong character into computed `direction`.
      expect(computedDir(host.querySelector('.dir-auto-ar')!)).toBe('rtl')
      expect(computedDir(host.querySelector('.dir-auto-en')!)).toBe('ltr')

      const refEl = host.querySelector('.dir-ref')!
      const objEl = host.querySelector('.dir-reactive-obj')!
      const ltrParent = host.querySelector('.ltr-parent')!
      const restorableEl = host.querySelector('.dir-restorable')!

      expect(computedDir(refEl)).toBe('ltr')
      expect(computedDir(objEl)).toBe('ltr')
      expect(computedBidi(objEl)).toBe('isolate')
      expect(computedDir(restorableEl)).toBe('ltr')

      dynamicDir.value = 'rtl'
      reactiveBox.dir = 'rtl'
      reactiveBox.isolate = false
      showRestorable.value = false
      await nextTick()

      expect(computedDir(refEl)).toBe('rtl')
      expect(computedDir(objEl)).toBe('rtl')
      expect(objEl.getAttribute('style')).toBeNull()

      // Unbinding `v-rtl:ltr` restored the element's original `dir="rtl"`, overriding `.ltr-parent`.
      ltrParent.appendChild(restorableEl)
      expect(computedDir(restorableEl)).toBe('rtl')
    }
    finally {
      wrapper.unmount()
      host.remove()
    }
  })

  it('gives the expected computed direction across nested RtlProvider scopes and reactive scope updates', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl', he: 'rtl', fr: 'ltr' },
      defaultLocale: 'ar',
    })

    const ScopeLeaf = defineComponent({
      name: 'ScopeLeaf',
      props: { id: { type: String, required: true }, text: { type: String, required: true } },
      setup(props) {
        const { dir, locale } = useDirection()
        return () => h('p', { id: props.id, 'data-ctx': `${dir.value}:${locale.value}` }, props.text)
      },
    })

    const host = document.createElement('div')
    attachHost(host)

    const wrapper = mount(
      defineComponent({
        setup: () => () => h('div', [
          h(ScopeLeaf, { id: 'leaf-root', text: 'Root English text on Arabic page' }),
          h(RtlProvider, { id: 'scope-l1', dir: 'ltr' }, {
            default: ({ toggleDirection }: { toggleDirection: () => Direction }) => [
              h('button', { id: 'toggle-l1', type: 'button', onClick: () => toggleDirection() }, 'toggle'),
              h(ScopeLeaf, { id: 'leaf-l1', text: 'نص عربي داخل جزيرة LTR' }),
              h(RtlProvider, { id: 'scope-l2-follow' }, () => [
                h(ScopeLeaf, { id: 'leaf-l2-follow', text: 'مرحبا' }),
              ]),
              h(RtlProvider, { id: 'scope-l2-he', locale: 'he' }, () => [
                h(ScopeLeaf, { id: 'leaf-l2-he', text: 'English inside Hebrew scope' }),
                h(RtlProvider, { id: 'scope-l3-fr', locale: 'fr' }, () => [
                  h(ScopeLeaf, { id: 'leaf-l3-fr', text: 'مرحبا داخل نطاق فرنسي' }),
                ]),
              ]),
            ],
          }),
        ]),
      }),
      {
        global: { plugins: [rtl] },
        attachTo: host,
      },
    )

    try {
      await nextTick()

      expect(computedDir(document.documentElement)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-root')!)).toBe('rtl')

      expect(computedDir(host.querySelector('#scope-l1')!)).toBe('ltr')
      expect(computedBidi(host.querySelector('#scope-l1')!)).toBe('isolate')
      expect(computedDir(host.querySelector('#leaf-l1')!)).toBe('ltr')
      expect(computedDir(host.querySelector('#leaf-l2-follow')!)).toBe('ltr')

      expect(computedDir(host.querySelector('#scope-l2-he')!)).toBe('rtl')
      expect(computedBidi(host.querySelector('#scope-l2-he')!)).toBe('isolate')
      expect(computedDir(host.querySelector('#leaf-l2-he')!)).toBe('rtl')

      expect(computedDir(host.querySelector('#scope-l3-fr')!)).toBe('ltr')
      expect(computedDir(host.querySelector('#leaf-l3-fr')!)).toBe('ltr')

      // Toggling Level 1 flips Level 1 and its unpinned child to rtl while keeping root and pinned Level 3 intact.
      await wrapper.find('#toggle-l1').trigger('click')
      await nextTick()

      expect(computedDir(document.documentElement)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-l1')!)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-l2-follow')!)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-l2-he')!)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-l3-fr')!)).toBe('ltr')

      // Switching root locale to English flips root to ltr while pinned scopes keep their own direction.
      rtl.setLocale('en')
      await nextTick()

      expect(computedDir(document.documentElement)).toBe('ltr')
      expect(computedDir(host.querySelector('#leaf-root')!)).toBe('ltr')
      expect(computedDir(host.querySelector('#leaf-l1')!)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-l2-he')!)).toBe('rtl')
      expect(computedDir(host.querySelector('#leaf-l3-fr')!)).toBe('ltr')
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
      host.remove()
    }
  })
})
