<script setup lang="ts">
import { useDirection, useFormat, useLogicalStyles } from 'vue-rtl-kit'

const { dir, locale, startSide, sign } = useDirection()
const { toLogical, mirror } = useLogicalStyles()
const fmt = useFormat()
</script>

<template>
  <div :style="toLogical({ marginLeft: '8px', textAlign: 'left' })">
    <h1>vue-rtl-kit fixture</h1>
    <p id="state">{{ dir }}|{{ locale }}|{{ startSide }}|{{ sign }}|{{ mirror(12) }}|{{ fmt.formatNumber(1234, { numberingSystem: 'latn' }) }}</p>
    <BidiText id="bidi" as="p" text="آخر تحديث 12-05-2024" />
    <RtlProvider id="scoped-ltr" dir="ltr" tag="section">
      <pre v-rtl:ltr>npm test</pre>
    </RtlProvider>
  </div>
</template>