// Vercel Serverless Function — Meta Conversions API (CAPI)
// POST /api/meta-capi
//
// Env vars necessárias na Vercel:
//   META_PIXEL_ID
//   META_ACCESS_TOKEN
//   META_TEST_EVENT_CODE   (opcional — para testar no Events Manager > Test Events)

import crypto from 'node:crypto'

const GRAPH_VERSION = 'v21.0'

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function normalizeAndHash(value) {
  if (value == null) return null
  const v = String(value).trim().toLowerCase()
  if (!v) return null
  return sha256(v)
}

function firstHeader(req, name) {
  const h = req.headers[name] || req.headers[name.toLowerCase()]
  if (!h) return null
  if (Array.isArray(h)) return h[0]
  return String(h).split(',')[0].trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const PIXEL_ID = process.env.META_PIXEL_ID
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN
  const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    res.status(500).json({ error: 'Missing META_PIXEL_ID or META_ACCESS_TOKEN' })
    return
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')

    const {
      event_name,
      event_id,
      event_source_url,
      user_data_client = {},
      user_data_pii = {}, // { em, ph, fn, ln, zp, external_id }
      custom_data,
    } = body

    if (!event_name) {
      res.status(400).json({ error: 'event_name is required' })
      return
    }

    // ── Headers (Vercel geo + IP + UA) ──
    const ip =
      firstHeader(req, 'x-real-ip') ||
      firstHeader(req, 'x-forwarded-for') ||
      req.socket?.remoteAddress ||
      null
    const userAgent = firstHeader(req, 'user-agent')
    const city = firstHeader(req, 'x-vercel-ip-city')
    const region = firstHeader(req, 'x-vercel-ip-country-region')
    const country = firstHeader(req, 'x-vercel-ip-country')

    const user_data = {
      ...(ip && { client_ip_address: ip }),
      ...(userAgent && { client_user_agent: userAgent }),
      ...(user_data_client.fbp && { fbp: user_data_client.fbp }),
      ...(user_data_client.fbc && { fbc: user_data_client.fbc }),
    }

    // Geo (hashed)
    const ctH = normalizeAndHash(city ? decodeURIComponent(city) : null)
    const stH = normalizeAndHash(region)
    const countryH = normalizeAndHash(country)
    if (ctH) user_data.ct = [ctH]
    if (stH) user_data.st = [stH]
    if (countryH) user_data.country = [countryH]

    // PII opcional vinda do client
    const emH = normalizeAndHash(user_data_pii.em)
    const phH = normalizeAndHash(user_data_pii.ph && String(user_data_pii.ph).replace(/\D/g, ''))
    const fnH = normalizeAndHash(user_data_pii.fn)
    const lnH = normalizeAndHash(user_data_pii.ln)
    const zpH = normalizeAndHash(user_data_pii.zp && String(user_data_pii.zp).replace(/\D/g, ''))
    if (emH) user_data.em = [emH]
    if (phH) user_data.ph = [phH]
    if (fnH) user_data.fn = [fnH]
    if (lnH) user_data.ln = [lnH]
    if (zpH) user_data.zp = [zpH]
    if (user_data_pii.external_id) user_data.external_id = [normalizeAndHash(user_data_pii.external_id)]

    const eventPayload = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      ...(event_id && { event_id }),
      ...(event_source_url && { event_source_url }),
      action_source: 'website',
      user_data,
      ...(custom_data && { custom_data }),
    }

    const payload = {
      data: [eventPayload],
      ...(TEST_EVENT_CODE && { test_event_code: TEST_EVENT_CODE }),
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`

    const fbRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const fbJson = await fbRes.json().catch(() => ({}))

    if (!fbRes.ok) {
      res.status(502).json({ error: 'Meta CAPI error', details: fbJson })
      return
    }

    res.status(200).json({ ok: true, fb: fbJson })
  } catch (err) {
    res.status(500).json({ error: 'Internal error', message: err?.message })
  }
}
