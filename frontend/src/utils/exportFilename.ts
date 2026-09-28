const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i

export function exportFilename(value: string, extension: string, fallback = 'analysis') {
  const suffix = extension.replace(/^\./, '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'dat'
  const safeFallback = fallback.normalize('NFKD').toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[ .-]+|[ .-]+$/g, '') || 'analysis'
  let stem = value.normalize('NFKD').toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[ .-]+|[ .-]+$/g, '')
  if (!stem || WINDOWS_RESERVED.test(stem)) stem = WINDOWS_RESERVED.test(safeFallback) ? 'analysis' : safeFallback
  const maxStem = Math.max(1, 120 - suffix.length - 1)
  stem = stem.slice(0, maxStem).replace(/[ .]+$/g, '') || 'analysis'.slice(0, maxStem)
  return `${stem}.${suffix}`
}
