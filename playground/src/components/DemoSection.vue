<script setup lang="ts">
defineProps<{
  id: string
  index: string
  title: string
  lede: string
  api?: string
}>()
</script>

<template>
  <section :id="id" class="section">
    <!-- The section chrome is English prose: pin it LTR with the directive
         rather than letting an RTL page drag its punctuation around. -->
    <header v-rtl:ltr class="section__head">
      <span class="section__index mono">{{ index }}</span>
      <div>
        <h2 class="section__title">{{ title }}</h2>
        <p class="section__lede">{{ lede }}</p>
      </div>
      <code v-if="api" class="section__api">{{ api }}</code>
    </header>
    <div class="section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section {
  border-top: 1px solid var(--line);
  padding-block: 2.25rem 2.75rem;
}

.section__head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.9rem;
  align-items: start;
  margin-block-end: 1.5rem;
}

.section__index {
  color: var(--ink-faint);
  font-size: 0.75rem;
  padding-block-start: 0.4rem;
  font-variant-numeric: tabular-nums;
}

.section__title { font-size: 1.15rem; }

.section__lede {
  margin: 0.35rem 0 0;
  color: var(--ink-dim);
  max-width: 64ch;
  font-size: 0.92rem;
}

.section__api {
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid rgba(110, 168, 254, 0.2);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
