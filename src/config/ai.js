import { ERAS, getRegionContent } from '../data/regionsContent.js'

export const AI = {
  enabled: true,

<<<<<<< HEAD
  baseUrl: '/api',

  // المشروع هو اللي يحدد الموديل
  model: 'llama3.1:latest',

  options: {
    temperature: 0.6,
    num_predict: 700,
  },

  rewriteOptions: {
    temperature: 0.8,
    num_predict: 500,
  },

  title: 'اسأل التاريخ',

=======
  // الـFrontend يكلم Backend فقط
  baseUrl: '/api',

  // إعدادات النموذج الحقيقية موجودة أيضًا في السيرفر
  model: 'llama3.2',
  temperature: 0.6,

  title: 'اسأل الذاكرة',

>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
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
      'أنت مساعد عربي لموقع تفاعلي عن المملكة العربية السعودية.',
      `السياق الحالي: ${where}.`,
<<<<<<< HEAD
      'أجب بالعربية بشكل طبيعي ومباشر.',
      'استخدم المعلومات المرجعية الموجودة في الموقع أولًا.',
      'لا تخترع حقائق أو أرقامًا غير موجودة في السياق.',
      knowledge
        ? `معلومات الموقع المرجعية:\n${knowledge}`
        : '',
=======
      'أجب بالعربية المبسّطة في فقرة أو فقرتين. إذا لم تكن متأكدًا من معلومة فاذكر أنها تحتاج تحققًا.',
      knowledge &&
        `معلومات مرجعية من الموقع (اعتمد عليها أولًا):\n${knowledge}`,
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
    ]
      .filter(Boolean)
      .join('\n\n')
  },
}

function siteKnowledge(region) {
  if (!region) return ''

  const { eras } = getRegionContent(region.id)

  return ERAS.map((era) => {
<<<<<<< HEAD
    const data = eras?.[era.key]

    if (!data) return ''

    const parts = [
      data.text,
      ...(data.highlights ?? []),
    ].filter(Boolean)
=======
    const { text, highlights } = eras[era.key]

    const parts = [text, ...highlights].filter(Boolean)
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8

    return parts.length
      ? `${era.label}: ${parts.join(' ')}`
      : ''
  })
    .filter(Boolean)
    .join('\n')
}