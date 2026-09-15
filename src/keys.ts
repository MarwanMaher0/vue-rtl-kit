import type { InjectionKey } from 'vue'
import type { DirectionContext, RtlInstance } from './types'

/** Injection key for the app-level instance created by `createRtl()`. */
export const rtlInstanceKey: InjectionKey<RtlInstance> = Symbol.for('vue-rtl-kit:instance')

/**
 * Injection key for the *nearest* direction scope. The plugin provides the
 * root instance here; every `<RtlProvider>` shadows it for its subtree.
 */
export const directionScopeKey: InjectionKey<DirectionContext> = Symbol.for('vue-rtl-kit:scope')
