// Meta Pixel + CAPI dual-fire helper
// O Pixel é inicializado em index.html. Aqui só disparamos eventos com event_id
// para deduplicação contra o servidor (/api/meta-capi).

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}

function buildFbcFromUrl() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const fbclid = params.get('fbclid')
  if (!fbclid) return null
  return `fb.1.${Date.now()}.${fbclid}`
}

// ── URL params → sck (Hotmart) ──
// Captura todos os params da landing e devolve um sck no formato
// chave:valor|chave:valor (URL-encoded). Retorna null se não houver params.
export function buildSckFromUrl() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const parts = []
  params.forEach((val, key) => {
    if (val) parts.push(`${key}:${String(val).replace(/[|:]/g, '-')}`)
  })
  if (!parts.length) return null
  return encodeURIComponent(parts.join('|'))
}

// Anexa o sck a uma URL de checkout (ex.: link Hotmart).
export function appendSck(checkoutUrl) {
  if (!checkoutUrl) return checkoutUrl
  const sck = buildSckFromUrl()
  if (!sck) return checkoutUrl
  const sep = checkoutUrl.indexOf('?') > -1 ? '&' : '?'
  return `${checkoutUrl}${sep}sck=${sck}`
}

function newEventId() {
  return 'eid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
}

export function trackEvent(eventName, customData) {
  try {
    const eventId = newEventId()
    const fbp = getCookie('_fbp')
    const fbc = getCookie('_fbc') || buildFbcFromUrl()

    // 1) Pixel client-side com eventID para dedup
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, customData || {}, { eventID: eventId })
    }

    // 2) CAPI server-side
    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
        user_data_client: {
          ...(fbp && { fbp }),
          ...(fbc && { fbc }),
        },
        ...(customData && { custom_data: customData }),
      }),
      keepalive: true,
    }).catch(() => {})
  } catch (_) {
    // never break the page over tracking
  }
}
