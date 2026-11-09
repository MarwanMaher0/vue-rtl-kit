# أدوات CSS

توفر أدوات CSS الاختيارية تباعدًا ومحاذاة وحدودًا ومواضع منطقية وعزلًا للنص وأدوات للأيقونات الاتجاهية في تخطيطات RTL وLTR. تتبع أقرب سمة `dir` دون تبديل ملف التنسيق. استورد الملف مرة واحدة:

```ts
import 'vue-rtl-kit/styles.css'
```

تفعل وحدة Nuxt ذلك افتراضيًا. تستخدم كل قاعدة تخطيط خصائص منطقية، لذا تحدد أقرب سمة `dir` النتيجة، ولا تتطلب تغييرات الاتجاه أثناء التشغيل تبديل ملف التنسيق.

## متغيرات التصميم

```css
:root {
  --rtl-space: 0.25rem;
  --rtl-border-width: 1px;
  --rtl-radius: 0.375rem;
}
```

عدّل قيم المتغيرات لتتوافق مع نظام التصميم لديك. تضرب أدوات التباعد قيمها في `--rtl-space`.

## التباعد

| الأصناف | CSS |
| --- | --- |
| من `ms-0` إلى `ms-6`، و`ms-8`، و`ms-10`، و`ms-12`، و`ms-auto` | `margin-inline-start` |
| من `me-0` إلى `me-6`، و`me-8`، و`me-10`، و`me-12`، و`me-auto` | `margin-inline-end` |
| من `mi-0` إلى `mi-4`، و`mi-auto` | `margin-inline` |
| من `ps-0` إلى `ps-6`، و`ps-8`، و`ps-10`، و`ps-12` | `padding-inline-start` |
| من `pe-0` إلى `pe-6`، و`pe-8`، و`pe-10`، و`pe-12` | `padding-inline-end` |
| من `pi-0` إلى `pi-4`، و`pi-6` | `padding-inline` |

يتضمن تدريج الهوامش الرقمي القيم `0` و`1` و`2` و`3` و`4` و`5` و`6` و`8` و`10` و`12`. ويتضمن تدريج الحشو الرقمي القيم نفسها، باستثناء `pi-*` و`mi-*` اللذين يتوقفان عند القيم المذكورة أعلاه.

```html
<button class="ms-4 ps-3 pe-3">Save</button>
```

## المحاذاة والتخطيط المرن

| الأصناف | CSS |
| --- | --- |
| `text-start`، `text-end`، `text-center` | محاذاة نصية منطقية أو متوسطة |
| `float-start`، `float-end` | `float: inline-start / inline-end` |
| `clear-start`، `clear-end` | `clear: inline-start / inline-end` |
| `justify-start`، `justify-end` | `justify-content: flex-start / flex-end` |
| `items-start`، `items-end` | `align-items: flex-start / flex-end` |

## الموضع والحدود

| الأصناف | CSS |
| --- | --- |
| `start-0`، `start-auto` | `inset-inline-start` |
| `end-0`، `end-auto` | `inset-inline-end` |
| `inset-i-0` | `inset-inline: 0` |
| `border-s`، `border-e` | حدّ منطقي في اتجاه السطر باستخدام `--rtl-border-width` |
| `border-s-0`، `border-e-0` | عرض صفري للحد المنطقي في اتجاه السطر |
| `rounded-s`، `rounded-e` | أنصاف أقطار زوايا منطقية باستخدام `--rtl-radius` |
| `rounded-s-0`، `rounded-e-0` | أنصاف أقطار صفرية للزوايا المنطقية |

تتطلب أدوات الموضع أن يكون العنصر مُحدد الموضع، وأن توفّر في CSS الخاص بك أي إزاحات أو أبعاد مطلوبة.

## النص ثنائي الاتجاه

| الصنف | التأثير |
| --- | --- |
| `bidi-isolate` | `unicode-bidi: isolate` |
| `bidi-plaintext` | `unicode-bidi: plaintext` |
| `bidi-nowrap` | العزل مع `white-space: nowrap` |
| `nums-latn` | أرقام متساوية الارتفاع وعزل Unicode |

استخدم `bidi-plaintext` للشيفرات والمسارات التي يكون اتجاهها الذاتي هو المرجع. وللجمل المختلطة التي تحتاج إلى عزل على مستوى المقاطع، فضّل `BidiText`.

## العرض والأيقونات بحسب الاتجاه

| الصنف | التأثير |
| --- | --- |
| `ltr-only` | مخفي عندما يكون اتجاه العنصر نفسه RTL (`:dir(rtl)`) |
| `rtl-only` | مخفي عندما يكون اتجاه العنصر نفسه LTR (`:dir(ltr)`) |
| `rtl-flip` | يعكس العنصر باستخدام `scale: -1 1` عندما يكون اتجاهه نفسه RTL |
| `rtl-noflip` | يلغي `rtl-flip` الموروث من سلف لعنصر متداخل |
| `rtl-scroll-x` | يضبط `direction: rtl` عندما يكون اتجاه العنصر نفسه RTL |

تعتمد هذه الأدوات على اتجاه العنصر نفسه عبر `:dir(rtl)` / `:dir(ltr)`، لا على أي سمة `dir` لسلف ما. فداخل جزيرة `dir="ltr"` في صفحة RTL — مثل نطاق `<RtlProvider dir="ltr">` أو شجرة `v-rtl:ltr` — يظهر `.ltr-only` ويختفي `.rtl-only` ولا ينعكس `.rtl-flip`؛ وجزيرة RTL داخلها تتصرّف كـ RTL من جديد. ويستخدم `.rtl-flip` خاصية `scale` المستقلة، لذا يتركّب مع أي `transform` يحمله العنصر أصلًا بدلًا من الكتابة فوقه.

اعكس فقط الرموز الاتجاهية مثل الأسهم والشيفرونات. لا تعكس الشعارات أو الساعات أو علامات الصح أو أدوات التحكم بالوسائط.
