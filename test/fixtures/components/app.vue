<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const app = getCurrentInstance()?.appContext.app
const hasGlobals = Boolean(
  app?.component('RtlProvider')
  && app.component('BidiText')
  && app.directive('rtl')
  && app.directive('digits'),
)
</script>

<template>
  <div>
    <p id="globals">{{ hasGlobals }}</p>
    <BidiText id="bidi" as="p" text="آخر تحديث 12-05-2024" />
    <pre id="directive" v-rtl:ltr>npm test</pre>
  </div>
</template>
