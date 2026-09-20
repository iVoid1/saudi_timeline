import { ERAS, getRegionContent } from '../data/regionsContent.js'

export const AI = {
  enabled: true,

  // الـFrontend يكلم Backend فقط
  baseUrl: '/api',

  // إعدادات النموذج الحقيقية موجودة أيضًا في السيرفر
  model: 'llama3.2',
  temperature: 0.6,

  title: 'اسأل الذاكرة',

  starter:
    'مرحبًا، أنا رفيق الرحلة. اسألني عن أي منطقة، أو حقبة، أو مشروع مرتبط برؤية 2030.',

  quickPrompts: [
    'ما أبرز ما يميّز المنطقة؟',
    'احكِ لي قصة قصيرة عنها',
    'ما علاقتها برؤية 2030؟',
  ],

  extraContext: null,

  systemPrompt(region) {
    const where = region?.name ?? 'المملكة العربية السعودية'

    const knowledge = [
      siteKnowledge(region),
      AI.extraContext?.(region),
    ]
      .filter(Boolean)
      .join('\n')

    return [
      'أنت مساعد تاريخي عربي موجز وموثوق، يجيب عن أسئلة تخص المملكة العربية السعودية.',
      `السياق الحالي: ${where}.`,
      'أجب بالعربية المبسّطة في فقرة أو فقرتين. إذا لم تكن متأكدًا من معلومة فاذكر أنها تحتاج تحققًا.',
      knowledge &&
        `معلومات مرجعية من الموقع (اعتمد عليها أولًا):\n${knowledge}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  },
}

function siteKnowledge(region) {
  if (!region) return ''

  const { eras } = getRegionContent(region.id)

  return ERAS.map((era) => {
    const { text, highlights } = eras[era.key]

    const parts = [text, ...highlights].filter(Boolean)

    return parts.length
      ? `${era.label}: ${parts.join(' ')}`
      : ''
  })
    .filter(Boolean)
    .join('\n')
}