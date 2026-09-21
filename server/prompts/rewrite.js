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