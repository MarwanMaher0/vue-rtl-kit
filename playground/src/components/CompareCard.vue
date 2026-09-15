<script setup lang="ts">
defineProps<{
  label: string
  tone: 'bad' | 'good' | 'neutral'
  note?: string
}>()
</script>

<template>
  <figure class="compare" :class="`compare--${tone}`">
    <figcaption v-rtl:ltr class="compare__label">
      <span class="compare__dot" />
      {{ label }}
      <span v-if="note" class="compare__note">{{ note }}</span>
    </figcaption>
    <div class="compare__body">
      <slot />
    </div>
  </figure>
</template>

<style scoped>
.compare {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  overflow: hidden;
}

.compare__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-dim);
  background: var(--panel-2);
  border-block-end: 1px solid var(--line);
}

.compare__note {
  margin-inline-start: auto;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ink-faint);
  font-size: 0.72rem;
}

.compare__dot {
  inline-size: 7px;
  block-size: 7px;
  border-radius: 50%;
  background: var(--ink-faint);
  flex: none;
}

.compare--bad .compare__dot { background: var(--bad); }
.compare--good .compare__dot { background: var(--good); }
.compare--bad .compare__label { color: var(--bad); }
.compare--good .compare__label { color: var(--good); }

.compare__body { padding: 1rem 1.1rem; }
</style>
