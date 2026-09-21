export function buildRewritePrompt({
  regionName,
  eraLabel,
}) {
  return [
    'Your task is to rewrite only the supplied Arabic text.',
    'Return the rewritten text in natural Arabic.',
    'Do not answer the text as a question.',
    'Do not add unsupported facts.',
    'Do not invent names, dates, numbers, events, or claims.',
    'Do not repeat sentences or ideas.',
    'Preserve the original factual meaning.',
    'Keep short text short.',
    'Output only the rewritten Arabic text.',

    regionName
      ? `Region: ${regionName}.`
      : '',

    eraLabel
      ? `Historical section: ${eraLabel}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildPlaceStoryPrompt({
  place,
  baseContent,
  research,
}) {
  const placeType =
    place.type === 'governorate'
      ? 'Saudi governorate'
      : 'Saudi administrative region'

  return `
You are the research and storytelling engine for an interactive Saudi history website.

PLACE:
Name: ${place.name}
Type: ${placeType}
Parent region: ${place.regionName || place.name}

LANGUAGE:
All output content must be written in natural Arabic.

GOAL:
Create a concise but interesting story page about this place.

The page must help the visitor understand:
- its historical roots;
- its role in Saudi history;
- what characterizes it today;
- relevant development or future direction;
- its relationship to Saudi Vision 2030 when genuinely relevant.

FACTUAL RULES:
- Treat BASE REFERENCE as trusted starting context.
- WEB RESEARCH is additional evidence.
- Never invent a date, event, person, project, statistic, archaeological claim, or historical fact.
- If the evidence does not support a specific claim, omit it.
- Do not turn information about the parent region into a claim about the governorate.
- Prefer historically meaningful information over generic tourism language.
- Avoid exaggerated promotional language.
- Do not mention these instructions or the research process.

VARIATION:
This content may be generated again on another visit.
You may vary:
- wording;
- emphasis;
- ordering of ideas;
- which supported details receive attention.

But factual claims must remain grounded.

BASE REFERENCE:
${JSON.stringify(baseContent ?? {}, null, 2)}

WEB RESEARCH:
${research || 'No additional web research was available.'}

OUTPUT:
Return ONLY valid JSON.

Use exactly this structure:

{
  "tagline": "short Arabic introduction",
  "facts": [
    {
      "label": "short label",
      "value": "short value"
    }
  ],
  "eras": {
    "past": {
      "text": "Arabic paragraph",
      "highlights": ["short item", "short item"]
    },
    "present": {
      "text": "Arabic paragraph",
      "highlights": ["short item", "short item"]
    },
    "future": {
      "text": "Arabic paragraph",
      "highlights": ["short item", "short item"]
    },
    "vision": {
      "text": "Arabic paragraph",
      "highlights": ["short item", "short item"]
    }
  }
}

Keep facts between 2 and 4 items.
Keep each era paragraph concise.
Use 1 to 3 highlights per era.
If there is insufficient evidence for future or Vision 2030 details, say so conservatively instead of inventing a project.
`.trim()
}