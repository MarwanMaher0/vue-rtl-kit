export interface Faq {
  question: string
  answer: string
}

export const faqs: { en: Faq[], ar: Faq[] } = {
  en: [
    {
      question: 'What is vue-rtl-kit?',
      answer: 'vue-rtl-kit is an MIT-licensed toolkit for Vue 3.3+ and Nuxt 3 or 4. It provides reactive direction state, scoped RTL and LTR layouts, logical style helpers, locale-aware formatting, and plain-text bidirectional isolation.',
    },
    {
      question: 'How do I install it before npm publication?',
      answer: 'Install the tagged GitHub release with npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1. Its prepare script builds the package during installation. The npm install vue-rtl-kit command is intended for use after npm publication.',
    },
    {
      question: 'Does it replace a translation library?',
      answer: 'No. vue-rtl-kit manages direction and formatting, not message translation. Keep your translation library and pass its active locale to setLocale(). Use CSS logical properties for ordinary layout rather than expecting automatic conversion of an entire interface.',
    },
    {
      question: 'Can BidiText process rich HTML or every Unicode bidi case?',
      answer: 'No. BidiText uses simplified run detection to isolate mixed-direction plain text with bdi elements or Unicode isolate characters. It is not a rich-text engine or a complete implementation of the Unicode bidirectional algorithm. Slots containing element markup are left untouched; use the text prop for plain-text isolation.',
    },
    {
      question: 'Why does changing the locale sometimes leave direction unchanged?',
      answer: 'Direction follows the locale until it is pinned. An explicit initial dir, setDirection(), or toggleDirection() pins the root direction, so later setLocale() calls change the locale without recalculating direction. Omit the initial dir and use setLocale() alone when direction should follow language.',
    },
    {
      question: 'Can one panel use a different direction from the application?',
      answer: 'Yes. RtlProvider creates a local direction and locale scope without changing the root store. useDirection() reads the nearest scope, while useRtl() always accesses the installed root store and throws if the plugin is missing. A renderless provider needs direction attributes on its children.',
    },
    {
      question: 'Does the Nuxt module support server rendering?',
      answer: 'Yes. Add vue-rtl-kit/nuxt to your Nuxt modules. It installs the runtime plugin, writes reactive dir and lang attributes into the SSR document, and enables composable auto-imports, component registration, and CSS by default. Plain Vue SSR can use the root store’s htmlAttrs() to populate its document shell.',
    },
  ],
  ar: [
    {
      question: 'ما هي vue-rtl-kit؟',
      answer: 'vue-rtl-kit مجموعة أدوات بترخيص MIT تدعم Vue 3.3 والإصدارات الأحدث وNuxt 3 و4. توفر حالة اتجاه تفاعلية، ونطاقات مستقلة لتخطيطات RTL وLTR، وأدوات للأنماط المنطقية، وتنسيقًا حسب اللغة، وعزلًا للنص العادي ثنائي الاتجاه.',
    },
    {
      question: 'كيف أثبّت الحزمة قبل نشرها على npm؟',
      answer: 'ثبّت الإصدار الموسوم من GitHub بالأمر npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1. يبني سكربت prepare الحزمة أثناء التثبيت. أما الأمر npm install vue-rtl-kit فهو مخصص للاستخدام بعد نشر الحزمة على npm.',
    },
    {
      question: 'هل تحل محل مكتبة الترجمة؟',
      answer: 'لا. تدير vue-rtl-kit الاتجاه والتنسيق، ولا تترجم الرسائل. احتفظ بمكتبة الترجمة ومرّر اللغة النشطة إلى setLocale(). استخدم خصائص CSS المنطقية للتخطيط المعتاد، ولا تتوقع تحويل الواجهة بأكملها تلقائيًا.',
    },
    {
      question: 'هل يعالج BidiText محتوى HTML الغني أو جميع حالات Unicode ثنائية الاتجاه؟',
      answer: 'لا. يستخدم BidiText كشفًا مبسطًا للمقاطع لعزل النص العادي مختلط الاتجاهات بعناصر bdi أو محارف عزل Unicode. ليس محرّك نص غني ولا تنفيذًا كاملًا لخوارزمية Unicode ثنائية الاتجاه. يترك الخانات التي تحتوي على وسوم عناصر دون تعديل؛ استخدم الخاصية text لعزل النص العادي.',
    },
    {
      question: 'لماذا لا يتغير الاتجاه أحيانًا عند تغيير اللغة؟',
      answer: 'يتبع الاتجاه اللغة حتى يُثبّت. يؤدي تحديد dir عند الإنشاء أو استدعاء setDirection() أو toggleDirection() إلى تثبيت اتجاه الجذر، ثم تغيّر استدعاءات setLocale() اللاحقة اللغة دون إعادة حساب الاتجاه. أغفل dir الأولي واستخدم setLocale() وحدها إذا أردت أن يتبع الاتجاه اللغة.',
    },
    {
      question: 'هل يمكن أن تستخدم لوحة اتجاهًا مختلفًا عن التطبيق؟',
      answer: 'نعم. ينشئ RtlProvider نطاقًا محليًا للاتجاه واللغة دون تغيير مخزن الجذر. تقرأ useDirection() أقرب نطاق، بينما تصل useRtl() دائمًا إلى مخزن الجذر المثبّت وترمي خطأ إن كانت الإضافة غائبة. يحتاج المزوّد دون عنصر حاوٍ إلى سمات اتجاه على عناصره الأبناء.',
    },
    {
      question: 'هل تدعم وحدة Nuxt العرض على الخادم؟',
      answer: 'نعم. أضف vue-rtl-kit/nuxt إلى وحدات Nuxt. تثبّت الوحدة إضافة التشغيل، وتكتب سمتَي dir وlang التفاعليتين في مستند SSR، وتفعّل الاستيراد التلقائي للدوال وتسجيل المكوّنات وملف CSS افتراضيًا. في Vue SSR العادي، استخدم htmlAttrs() من مخزن الجذر لإعداد سمات المستند.',
    },
  ],
}
