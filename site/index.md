---
layout: home
title: Real RTL for Vue and Nuxt
hero:
  name: RTL that holds.
  text: For Vue & Nuxt.
  tagline: Direction state that survives SSR, logical styles for dynamic interfaces, and Unicode isolation that keeps dates, versions, and URLs readable inside Arabic text.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Explore the guide
      link: /guide/direction-store
features:
  - title: State, not a stylesheet swap
    details: One reactive store keeps locale, direction, and the document shell aligned on the client and during SSR.
  - title: Text that stays in order
    details: BidiText isolates only the runs that need help, so neutral punctuation stops scrambling mixed-direction content.
  - title: Logical by default
    details: Use direction-aware composables and plain CSS utilities without maintaining parallel LTR and RTL stylesheets.
---

<BidiDemo />

<div class="home-editorial">

## A mirrored layout is only the beginning.

RTL interfaces fail in the seams: a popover offset calculated from the wrong edge, a server-rendered page that flashes LTR, or a correctly stored date rendered in the wrong order. vue-rtl-kit handles those seams with small, composable primitives.

<div class="home-editorial__grid">
  <div>
    <h3>Correct at first paint</h3>
    <p>The Nuxt module writes <code>dir</code> and <code>lang</code> into server-rendered HTML, before hydration begins.</p>
  </div>
  <div>
    <h3>Scoped when you need it</h3>
    <p>Pin code, terminal output, or an embedded panel with RtlProvider while the rest of the page keeps its direction.</p>
  </div>
  <div>
    <h3>Useful outside components</h3>
    <p>Format numbers, resolve locale directions, isolate plain strings, and convert style objects anywhere in your app.</p>
  </div>
</div>

</div>
