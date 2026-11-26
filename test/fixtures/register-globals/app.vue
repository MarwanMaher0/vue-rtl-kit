<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const app = getCurrentInstance()?.appContext.app
const hasRtlDirective = Boolean(app?.directive('rtl'))
const hasDigitsDirective = Boolean(app?.directive('digits'))
</script>

<template>
  <div>
    <p id="rtl-directive">{{ hasRtlDirective }}</p>
    <p id="digits-directive">{{ hasDigitsDirective }}</p>
    <BidiText id="bidi" as="p" text="آخر تحديث 12-05-2024" />
  </div>
</template>
