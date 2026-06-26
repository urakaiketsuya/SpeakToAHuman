/**
 * location.js
 * Resolves the user's location from their IP via ipapi.co.
 * Returns: { lat, lng, city, region, country, countryCode }
 * Results cached in sessionStorage for 6 hours.
 */

const CACHE_KEY = 'sth_geo_v2'
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

export async function getUserLocation() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) return data
    }

    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) return null
    const raw = await res.json()
    if (raw.error) return null

    const data = {
      lat:         raw.latitude,
      lng:         raw.longitude,
      city:        raw.city,
      region:      raw.region,       // "California"
      regionCode:  raw.region_code,  // "CA"
      country:     raw.country_name, // "United States"
      countryCode: raw.country_code, // "US"
    }

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
    return data
  } catch {
    return null
  }
}

// Countries we have area-code coordinate data for
export const SUPPORTED_COUNTRIES = new Set(['US', 'CA'])

// Detect international phone numbers (starts with + and not +1)
export function isInternationalPhone(phone) {
  return phone.startsWith('+') && !phone.startsWith('+1')
}

// Extract country calling code from a +XX... number
export function getCallingCode(phone) {
  const match = phone.match(/^\+(\d{1,3})/)
  return match ? match[1] : null
}
