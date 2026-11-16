// @vitest-environment node
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

describe('ESLint bidi/no-bidi-control-chars rule', () => {
  it('flags literal bidi control characters in TS and Vue files while allowing escaped literals', async () => {
    const eslint = new ESLint()
    const rlo = String.fromCodePoint(0x202E)
    const lri = String.fromCodePoint(0x2066)

    const [badTs] = await eslint.lintText(`export const s = '${rlo}abc'\n`, { filePath: 'src/check.ts' })
    expect(badTs!.messages.some(m => m.ruleId === 'bidi/no-bidi-control-chars' && m.message.includes('U+202E'))).toBe(true)

    const [badVue] = await eslint.lintText(`<template><p>${lri}12-05-2024</p></template>\n`, { filePath: 'src/Check.vue' })
    expect(badVue!.messages.some(m => m.ruleId === 'bidi/no-bidi-control-chars' && m.message.includes('U+2066'))).toBe(true)

    const [goodTs] = await eslint.lintText(`export const s = '\\u202Eabc'\n`, { filePath: 'src/check.ts' })
    expect(goodTs!.messages).toEqual([])
  })
})
