import { afterEach, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { Direction, LogicalPlacement } from '../../src'
import { RtlProvider, useLogicalPlacement } from '../../src'
import { attachHost, removeHosts } from './hosts'

afterEach(removeHosts)

it('positions tooltips on the inline side of their anchors in an RTL provider and a local LTR island', async () => {
  const dir = ref<Direction>('rtl')
  const placement = ref<LogicalPlacement>('inline-start')

  const Tooltip = defineComponent({
    props: { id: { type: String, required: true } },
    setup(props) {
      const anchor = ref<HTMLElement | null>(null)
      const side = useLogicalPlacement(() => placement.value, anchor)
      return () => h('div', { style: { position: 'relative', width: 'max-content', margin: '16px auto' } }, [
        h('button', { ref: anchor, type: 'button', 'aria-describedby': props.id }, 'مساعدة'),
        // The fixture positions by physical sides, as a positioning engine would.
        h('span', {
          id: props.id,
          role: 'tooltip',
          style: {
            position: 'absolute',
            top: '0',
            whiteSpace: 'nowrap',
            [side.value === 'left' ? 'right' : 'left']: 'calc(100% + 8px)',
          },
        }, 'مزيد من المعلومات'),
      ])
    },
  })

  const App = defineComponent({
    setup: () => () => h(RtlProvider, { dir: dir.value }, () => [
      h('button', {
        id: 'toggle-direction',
        type: 'button',
        onClick: () => { dir.value = dir.value === 'rtl' ? 'ltr' : 'rtl' },
      }, 'بدّل الاتجاه'),
      h(Tooltip, { id: 'provider-help' }),
      h('div', { id: 'island', dir: 'ltr' }, [h(Tooltip, { id: 'island-help' })]),
    ]),
  })
  const wrapper = mount(App, { attachTo: attachHost(document.createElement('div')) })

  function gap(id: string, side: 'left' | 'right'): number {
    const anchor = wrapper.get(`[aria-describedby="${id}"]`).element.getBoundingClientRect()
    const tooltip = wrapper.get(`#${id}`).element.getBoundingClientRect()
    return side === 'left' ? anchor.left - tooltip.right : tooltip.left - anchor.right
  }

  try {
    await expect.poll(() => gap('provider-help', 'right')).toBeCloseTo(8)
    await expect.poll(() => gap('island-help', 'left')).toBeCloseTo(8)

    await wrapper.get('#toggle-direction').trigger('click')
    await expect.poll(() => gap('provider-help', 'left')).toBeCloseTo(8)
    expect(gap('island-help', 'left')).toBeCloseTo(8)

    // A computed CSS override wins over both the HTML attribute and Vue context.
    wrapper.get<HTMLElement>('#island').element.style.direction = 'rtl'
    await expect.poll(() => gap('island-help', 'right')).toBeCloseTo(8)

    placement.value = 'inline-end'
    await expect.poll(() => gap('provider-help', 'right')).toBeCloseTo(8)
    await expect.poll(() => gap('island-help', 'left')).toBeCloseTo(8)
  }
  finally {
    wrapper.unmount()
  }
})

it('follows dir="auto" on an ancestor when its text direction changes', async () => {
  const text = ref('مرحبا بالعالم')
  let side!: ReturnType<typeof useLogicalPlacement>

  const App = defineComponent({
    setup() {
      const anchor = ref<HTMLElement | null>(null)
      side = useLogicalPlacement('inline-start', anchor)
      return () => h('div', { dir: 'auto' }, [
        h('span', text.value),
        h('button', { ref: anchor, type: 'button' }, '?'),
      ])
    },
  })
  const wrapper = mount(App, { attachTo: attachHost(document.createElement('div')) })

  try {
    await expect.poll(() => side.value).toBe('right')
    text.value = 'Hello world'
    await expect.poll(() => side.value).toBe('left')
  }
  finally {
    wrapper.unmount()
  }
})
