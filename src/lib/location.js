const CACHE_KEY = 'sth_geo_v2'
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

async function tryIpapi() {
  const res = await fetch('https://ipapi.co/json/')
  if (!res.ok) return null
  const raw = await res.json()
  if (raw.error) return null
  return {
    lat:         raw.latitude,
    lng:         raw.longitude,
    city:        raw.city,
    region:      raw.region,
    regionCode:  raw.region_code,
    country:     raw.country_name,
    countryCode: raw.country_code,
  }
}

async function tryIpinfo() {
  const res = await fetch('https://ipinfo.io/json')
  if (!res.ok) return null
  const raw = await res.json()
  if (!raw.loc) return null
  const [lat, lng] = raw.loc.split(',').map(Number)
  return {
    lat,
    lng,
    city:        raw.city ?? '',
    region:      raw.region ?? '',
    regionCode:  raw.region ?? '',  // ipinfo returns full region name; good enough for display
    country:     raw.country ?? '',
    countryCode: raw.country ?? '', // ipinfo returns ISO 2-letter code here
  }
}

export async function getUserLocation() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) return data
    }

    // Try primary, then fallback
    const data = await tryIpapi().catch(() => null) ?? await tryIpinfo().catch(() => null)
    if (!data) return null

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
    return data
  } catch {
    return null
  }
}

export const SUPPORTED_COUNTRIES = new Set(['US', 'CA'])

export function isInternationalPhone(phone) {
  return phone.startsWith('+') && !phone.startsWith('+1')
}

export function getCallingCode(phone) {
  const match = phone.match(/^\+(\d{1,3})/)
  return match ? match[1] : null
}
