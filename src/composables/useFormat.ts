import type { ComputedRef } from 'vue'
import { computed, inject } from 'vue'
import type { BoundFormatters, DateFormatOptions, NumberFormatOptions } from '../format'
import { formatCurrency, formatDate, formatNumber } from '../format'
import { rtlInstanceKey } from '../keys'
import type { NumberingSystem } from '../types'
import { useDirection } from './useDirection'

/**
 * `formatNumber` / `formatDate` / `formatCurrency`, pre-bound to the current
 * locale and to the numbering system configured in `createRtl()`.
 *
 * Saves threading `locale` through every call site, and means switching the app
 * from Arabic-Indic to Western digits is one option change rather than a
 * codebase-wide find-and-replace.
 *
 * @example
 * const fmt = useFormat()
 * const total = computed(() => fmt.value.formatCurrency(order.total, 'EGP'))
 */
export function useFormat(): ComputedRef<BoundFormatters> {
  const { locale, dir } = useDirection()
  const instance = inject(rtlInstanceKey, null)

  const numberingSystem = computed<NumberingSystem | undefined>(() => {
    const configured = instance?.options.numberingSystem
    if (!configured) return undefined
    if (typeof configured === 'string') return configured
    const tag = locale.value
    return configured[tag] ?? configured[tag.split(/[-_]/)[0]!]
  })

  return computed<BoundFormatters>(() => {
    const defaults = { locale: locale.value, numberingSystem: numberingSystem.value }
    return {
      locale: locale.value,
      dir: dir.value,
      formatNumber: (value: number, options: NumberFormatOptions = {}) =>
        formatNumber(value, { ...defaults, ...options }),
      formatCurrency: (value: number, currency: string, options: NumberFormatOptions = {}) =>
        formatCurrency(value, currency, { ...defaults, ...options }),
      formatDate: (value: Date | number | string, options: DateFormatOptions = {}) =>
        formatDate(value, { ...defaults, ...options }),
    }
  })
}
