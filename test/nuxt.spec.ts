// @vitest-environment node
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils'

describe('nuxt module SSR', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders <html dir="rtl" lang="ar"> for an Arabic default locale', async () => {
    // Nuxt joins unhead's leading-space attr string with another space, so
    // collapse whitespace before asserting the exact tag contents.
    const html = String(await $fetch('/')).replace(/\s+/g, ' ')
    expect(html).toContain('<html dir="rtl" lang="ar">')
  })
})