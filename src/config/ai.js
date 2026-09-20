import { ERAS, getRegionContent } from '../data/regionsContent.js'

/**
 * ⚙️ إعدادات المساعد الذكي (Ollama)
 * كل ما تحتاج تغيّره لتعيين الخدمة موجود هنا، ولا تحتاج تلمس أي مكوّن.
 */
export const AI = {
  /** false = يختفي المساعد بالكامل من الموقع */
  enabled: true,

  /**
   * عنوان خدمة Ollama.
   *  - '/ollama'                → عبر الـ proxy في vite.config (الافتراضي، ما فيه مشاكل CORS)
   *  - 'http://localhost:11434' → مباشرة (لازم تشغّل Ollama مع OLLAMA_ORIGINS=*)
   */
  baseUrl: '/ollama',

  /** اسم النموذج المثبّت عندك (ollama list) */
  model: 'llama3.2',

  /** 0 = دقيق وثابت، 1 = أكثر إبداعًا */
  temperature: 0.6,

  /* ---------- النصوص الظاهرة في الواجهة ---------- */
  title: 'اسأل الذاكرة',
  starter: 'مرحبًا، أنا رفيق الرحلة. اسألني عن أي منطقة، أو حقبة، أو مشروع مرتبط برؤية 2030.',
  quickPrompts: ['ما أبرز ما يميّز المنطقة؟', 'احكِ لي قصة قصيرة عنها', 'ما علاقتها برؤية 2030؟'],

  /* ---------- تعليمات النموذج ---------- */

  /**
   * 🔌 مكان ربط وحدتك الخاصة لاحقًا:
   * ارجع بنص فيه معلومات عن المنطقة، ويُضاف تلقائيًا لتعليمات النموذج.
   * مثال:  extraContext: (region) => mySaudiModule.describe(region.id)
   */
  extraContext: null,

  /** يبني تعليمات النموذج حسب المنطقة المختارة */
  systemPrompt(region) {
    const where = region?.name ?? 'المملكة العربية السعودية'
    const knowledge = [siteKnowledge(region), AI.extraContext?.(region)].filter(Boolean).join('\n')

    return [
      'أنت مساعد تاريخي عربي موجز وموثوق، يجيب عن أسئلة تخص المملكة العربية السعودية.',
      `السياق الحالي: ${where}.`,
      'أجب بالعربية المبسّطة في فقرة أو فقرتين. إذا لم تكن متأكدًا من معلومة فاذكر أنها تحتاج تحققًا.',
      knowledge && `معلومات مرجعية من الموقع (اعتمد عليها أولًا):\n${knowledge}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  },
}

/** يجمع ما كتبتَه أنت في regionsContent.js ويعطيه للنموذج كمرجع */
function siteKnowledge(region) {
  if (!region) return ''
  const { eras } = getRegionContent(region.id)
  return ERAS.map((era) => {
    const { text, highlights } = eras[era.key]
    const parts = [text, ...highlights].filter(Boolean)
    return parts.length ? `${era.label}: ${parts.join(' ')}` : ''
  })
    .filter(Boolean)
    .join('\n')
}
