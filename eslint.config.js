import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

const BIDI_CONTROL_CHAR = /\p{Bidi_Control}/gu

const bidiPlugin = {
  rules: {
    'no-bidi-control-chars': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow literal Unicode bidi control characters in source files.',
        },
        schema: [],
        messages: {
          unexpected: 'Unexpected literal Unicode bidi control character U+{{code}}; use a \\uXXXX escape or named constant instead.',
        },
      },
      create(context) {
        return {
          Program() {
            const text = context.sourceCode.getText()
            for (const match of text.matchAll(BIDI_CONTROL_CHAR)) {
              const char = match[0]
              const index = match.index
              const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
              context.report({
                loc: {
                  start: context.sourceCode.getLocFromIndex(index),
                  end: context.sourceCode.getLocFromIndex(index + char.length),
                },
                messageId: 'unexpected',
                data: { code },
              })
            }
          },
        }
      },
    },
  },
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playground/dist/**', 'site/.vitepress/cache/**', 'site/.vitepress/dist/**', 'docs/**', 'test/fixtures/**/.nuxt/**', 'test/fixtures/**/.output/**', 'examples/**/dist/**', 'examples/**/.nuxt/**', 'examples/**/.output/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    plugins: {
      bidi: bidiPlugin,
    },
    rules: {
      'bidi/no-bidi-control-chars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/attributes-order': 'off',
      'eqeqeq': ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'object-shorthand': 'error',
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'never'],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'vue/one-component-per-file': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['test/fixtures/**/*.ts'],
    languageOptions: {
      globals: {
        defineNuxtConfig: 'readonly',
      },
    },
  },
)
