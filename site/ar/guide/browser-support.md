# دعم المتصفحات

كل ما هنا سلوك أصلي في المنصة دون أي polyfills. يعتمد التخطيط على خصائص CSS المنطقية، وتستخدم أدوات الاتجاه `:dir()` وخاصية `scale` المستقلة، ويستخدم العزل `<bdi>` أو محارف تحكم Unicode.

## جدول الدعم

| الميزة | Chrome | Firefox | Safari |
| --- | --- | --- | --- |
| `<bdi>` وعزل Unicode | 16 | 10 | 6.1 |
| خصائص CSS المنطقية (margin/padding/inset/border) | 87 | 66 | 14.1 |
| أنصاف الأقطار المنطقية للزوايا (`border-start-start-radius`) | 89 | 66 | 15 |
| `:dir()` (أدوات الاتجاه الذاتي) | 120 | 49 | 16.4 |
| خاصية `scale` المستقلة | 104 | 72 | 14.1 |
| التمرير السطري (`scrollLeft` السالب في RTL و`ResizeObserver`) | 85 | 69 | 15.4 |
| أنظمة أرقام `Intl` (`-u-nu-`) | 24 | 29 | 10 |

تفترض أدوات التمرير السطري (`getScrollInline` و`scrollToInline` و`scrollByInline` و`scrollInlineEdges` و`useInlineScroll`) نموذج `scrollLeft` السالب في RTL وفق مواصفة CSSOM View (Chrome 85 فأحدث، وFirefox، وSafari 15.4 فأحدث) وتدعم أوضاع الكتابة الأفقية (`writing-mode: horizontal-tb`) فقط. تستخدم `useInlineScroll` واجهة `ResizeObserver` عند توفرها (Chrome 64 فأحدث، وFirefox 69 فأحدث، وSafari 13.1 فأحدث) وتعمل بأمان عند غيابها.

## `:dir()` و`scale`

تتبع أدوات الاتجاه الذاتي (`.rtl-only` و`.ltr-only` و`.rtl-flip` و`.rtl-noflip` و`.rtl-scroll-x`) اتجاه العنصر نفسه، لا سمة `dir` لأي سلف. وتحتاج أدوات الاتجاه وانعكاس العناصر مع الحفاظ على `transform` إلى `:dir()` و`scale` معًا: Chrome 120 أو أحدث، أو Firefox 72 أو أحدث، أو Safari 16.4 أو أحدث.

تستخدم المتصفحات الأقدم محددات السلف `[dir]` وبديل `transform` داخل `@supports not selector(:dir(rtl))`:

```css
@supports not selector(:dir(rtl)) {
  [dir='rtl'] .rtl-flip {
    transform: scaleX(-1);
  }
}
```

## حدود البدائل

يحافظ البديل على عرض الاتجاه الصريح والانعكاس، لكن له ثلاثة حدود:

- قد تطابق جزر الاتجاه المتداخلة سلفًا بعيدًا يحمل `[dir]` بدلًا من أقرب نطاق.
- يستخدم الانعكاس `transform: scaleX(-1)`، فيستبدل أي `transform` يحمله العنصر مسبقًا.
- يحتاج البديل إلى `dir` صريح. أما مع `:dir()` فإن `.rtl-only` تختفي أيضًا في الصفحات التي لا تحمل سمة `dir` لأن HTML يفترض LTR.

## toPhysicalStyle للوحة الرسم وSVG وPDF والبريد

حيث لا تصل الخصائص المنطقية، حلّها في JavaScript باستخدام `toPhysicalStyle(style, dir)`. وتوسّع هذه الدالة الاختصارات المنطقية ذات القيمة أو القيمتين إلى الجانبين الماديين للاتجاه المعطى.

```ts
import { toPhysicalStyle } from 'vue-rtl-kit'

toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
// { marginRight: '8px' }

toPhysicalStyle({ insetInlineStart: '12px', textAlign: 'start' }, 'rtl')
// { right: '12px', textAlign: 'right' }

toPhysicalStyle({ marginInline: '1px 2px' }, 'rtl')
// { marginRight: '1px', marginLeft: '2px' }
```

استخدم الناتج عند كتابة استدعاءات الرسم على canvas أو سمات SVG المضمّنة أو قوالب PDF أو HTML البريد التي لا تستطيع استخدام CSS المنطقي.
