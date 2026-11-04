<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import LandingPage from './components/LandingPage.vue'

const { frontmatter, lang } = useData()
</script>

<template>
  <LandingPage v-if="frontmatter.landing" :key="lang" />
  <DefaultTheme.Layout v-else />
</template>
