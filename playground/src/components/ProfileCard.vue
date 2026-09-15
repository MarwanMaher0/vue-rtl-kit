<script setup lang="ts">
/**
 * One component, two directions. Every offset here is a logical-property
 * utility from `vue-rtl-kit/styles.css` - there is no `[dir="rtl"]` override
 * block anywhere in this file.
 */
import { BidiText, useFormat } from 'vue-rtl-kit'

defineProps<{ copy: { name: string, role: string, action: string, meta: string } }>()

const fmt = useFormat()
</script>

<template>
  <article class="card">
    <header class="card__head">
      <span class="card__avatar">{{ copy.name.slice(0, 1) }}</span>
      <div class="card__id">
        <BidiText as="strong" class="card__name" :text="copy.name" />
        <BidiText as="span" class="card__role" :text="copy.role" />
      </div>
      <button class="card__action ms-auto">
        {{ copy.action }}
        <span class="rtl-flip" aria-hidden="true">&#8594;</span>
      </button>
    </header>

    <dl class="card__stats">
      <div>
        <dt>{{ copy.meta }}</dt>
        <dd>{{ fmt.formatNumber(48210) }}</dd>
      </div>
      <div>
        <dt>{{ fmt.formatDate(new Date(2024, 4, 12), { dateStyle: 'medium' }) }}</dt>
        <dd>{{ fmt.formatCurrency(2500, 'USD') }}</dd>
      </div>
    </dl>

    <p class="card__bar">
      <span class="card__fill" style="inline-size: 62%" />
    </p>
  </article>
</template>

<style scoped>
.card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  padding: 1rem;
  border-inline-start: 3px solid var(--accent);
}

.card__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.card__avatar {
  inline-size: 34px;
  block-size: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  flex: none;
}

.card__id { display: flex; flex-direction: column; min-inline-size: 0; }
.card__name { font-size: 0.95rem; }
.card__role { color: var(--ink-faint); font-size: 0.8rem; }

.card__action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid rgba(110, 168, 254, 0.25);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}

.card__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin: 0.9rem 0 0;
  padding-block-start: 0.85rem;
  border-block-start: 1px solid var(--line-soft);
}

.card__stats dt { color: var(--ink-faint); font-size: 0.74rem; }
.card__stats dd { margin: 0.1rem 0 0; font-size: 0.95rem; font-variant-numeric: tabular-nums; }

.card__bar {
  margin: 0.9rem 0 0;
  block-size: 5px;
  border-radius: 999px;
  background: var(--panel-2);
  overflow: hidden;
  display: flex;
}

.card__fill {
  display: block;
  block-size: 100%;
  background: linear-gradient(to inline-end, var(--accent), #a78bfa);
}
</style>
