<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'

const { frontmatter, lang } = useData()
</script>

<template>
  <Content v-if="frontmatter.landing" :key="lang" />
  <DefaultTheme.Layout v-else />
</template>
