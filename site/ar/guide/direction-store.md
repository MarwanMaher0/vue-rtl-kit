# مخزن الاتجاه

مخزن الاتجاه هو الحالة التفاعلية المشتركة التي تعتمد عليها إضافة Vue وكل composable وكل نطاق `<RtlProvider>`.

## الحالة والإجراءات

تُعيد `createRtl()` كائنًا من النوع `RtlInstance` يوسّع `DirectionContext`:

| العضو | النوع | المعنى |
| --- | --- | --- |
| `dir` | `Ref<Direction>` | قيمة الاتجاه الحالية `'rtl'` أو `'ltr'`. |
| `locale` | `Ref<string>` | وسم اللغة الحالي وفق BCP-47. |
| `isRtl`, `isLtr` | `ComputedRef<boolean>` | محددات للتحقق من الاتجاه. |
| `startSide`, `endSide` | `ComputedRef<'left' \| 'right'>` | الجانبان الماديان لبداية السطر ونهايته. |
| `sign` | `ComputedRef<1 \| -1>` | يساوي `1` في LTR و`-1` في RTL. |
| `setDirection(dir)` | `(dir: Direction) => void` | يضبط الاتجاه ويثبّته. |
| `toggleDirection()` | `() => Direction` | يبدّل الاتجاه ويثبّته، ثم يعيد القيمة الجديدة. |
| `setLocale(locale)` | `(locale: string) => void` | يغيّر اللغة ويستنتج اتجاهها ما لم يكن الاتجاه مثبّتًا. |
| `htmlAttrs()` | `() => { dir: Direction, lang: string }` | سمات هيكل مستند SSR. |

يتضمن `RtlInstance` أيضًا `isRoot: true`، و`options` بعد حل قيمها، والتابع `install(app)`، و`dispose()` لإيقاف مزامنة المستند.

## تغييرات اللغة مقابل تغييرات الاتجاه

يتبع الاتجاه اللغة في البداية. يؤدي استدعاء `setDirection()` أو `toggleDirection()` إلى تثبيته، ولذلك يغيّر استدعاء `setLocale()` لاحقًا اللغة فقط.

```ts
import { createRtl } from 'vue-rtl-kit'

const rtl = createRtl({
  locales: ['en', 'ar', 'he'],
  defaultLocale: 'en',
})

rtl.setLocale('ar')
console.log(rtl.dir.value) // 'rtl'

rtl.setDirection('ltr')
rtl.setLocale('he')
console.log(rtl.dir.value) // 'ltr': direction was pinned
```

يمكن استخدام المخزن المعاد خارج شجرة المكوّنات، مثلًا أثناء إعداد التطبيق أو داخل حارس في موجّه الصفحات. ثبّت الكائن نفسه باستخدام `app.use(rtl)` لتتشاركه المكوّنات.

## سلوك المستند وSSR

عند ضبط `syncDocument: true`، يحافظ مخزن المتصفح على تزامن `document.documentElement.dir` و`lang`. ويمكن لـ`htmlClass` أيضًا إدارة أصناف الاتجاه.

لا يتعامل SSR مع DOM مطلقًا. عند إنشاء هيكل Vue SSR يدويًا، استخدم قيم المخزن الفعلية:

```ts
const attrs = rtl.htmlAttrs()
// { dir: 'rtl', lang: 'ar' }
```

تنفّذ وحدة Nuxt تكامل هيكل المستند هذا تلقائيًا.

## حالة مستقلة

استخدم `createDirectionState()` عندما تحتاج إلى آلية الحالة نفسها دون تثبيت إضافة:

```ts
import { createDirectionState } from 'vue-rtl-kit'

const state = createDirectionState({
  dir: 'rtl',
  locale: 'ar',
  locales: { en: 'ltr', ar: 'rtl' },
})

state.setLocale('en')
```

لا يزامن هذا المساعد منخفض المستوى المستند، ولا يتضمن الأعضاء `isRoot` أو `options` أو `install` أو `dispose`.
