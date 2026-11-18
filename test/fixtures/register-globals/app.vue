<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const app = getCurrentInstance()?.appContext.app
const hasRtlDirective = Boolean(app?.directive('rtl'))
</script>

<template>
  <div>
    <p id="rtl-directive">{{ hasRtlDirective }}</p>
    <BidiText id="bidi" as="p" text="آخر تحديث 12-05-2024" />
  </div>
</template>
