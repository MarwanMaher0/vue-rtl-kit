import { expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useDirection, useLogicalPlacement } from '../src'

it('follows scoped direction when an anchor is not supplied', () => {
  const scope = effectScope()
  try {
    scope.run(() => {
      const direction = useDirection()
      const original = direction.dir.value
      try {
        const resolved = useLogicalPlacement('inline-start')
        direction.setDirection('ltr')
        expect(resolved.value).toBe('left')
        direction.setDirection('rtl')
        expect(resolved.value).toBe('right')
      }
      finally {
        direction.setDirection(original)
      }
    })
  }
  finally {
    scope.stop()
  }
})

it('reads the replacement target and returns to the scope when cleared', async () => {
  const ltr = document.createElement('button')
  const rtl = document.createElement('button')
  ltr.style.direction = 'ltr'
  rtl.style.direction = 'rtl'
  document.body.append(ltr, rtl)
  const scope = effectScope()
  try {
    const target = ref<HTMLElement | null>(ltr)
    const resolved = scope.run(() => useLogicalPlacement('inline-start', target))!
    expect(resolved.value).toBe('left')
    target.value = rtl
    expect(resolved.value).toBe('right')
    await nextTick()
    rtl.style.direction = 'ltr'
    await nextTick()
    expect(resolved.value).toBe('left')
    target.value = null
    expect(resolved.value).toBe(useDirection().dir.value === 'rtl' ? 'right' : 'left')
  }
  finally {
    scope.stop()
    ltr.remove()
    rtl.remove()
  }
})
