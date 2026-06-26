/**
 * areaCodes.js
 * Parses US + CA area-code CSV files and exposes:
 *   - A centroid map  { "201" → { lat, lng, state, country, cities[] } }
 *   - findNearbyCodes(userLat, userLng, radiusMiles) → string[]
 *   - haversine(lat1, lng1, lat2, lng2) → miles
 */

import usCsv from '../data/us-area-code-cities.csv?raw'
import caCsv from '../data/ca-area-code-cities.csv?raw'

// ── CSV parser (handles double-quoted fields) ─────────────────────────────────
function parseCsv(raw) {
  const rows = []
  for (const line of raw.trim().split('\n')) {
    const cols = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur); cur = '' }
      else cur += ch
    }
    cols.push(cur)
    rows.push(cols)
  }
  return rows
}

// ── Build centroid map ─────────────────────────────────────────────────────────
// CSV columns: areaCode, city, state, country, lat, lng
function buildMap(raw) {
  const acc = {} // { areaCode → { latSum, lngSum, count, state, country, cities[] } }
  for (const [code, city, state, country, latStr, lngStr] of parseCsv(raw)) {
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)
    if (!code || isNaN(lat) || isNaN(lng)) continue
    if (!acc[code]) acc[code] = { latSum: 0, lngSum: 0, count: 0, state, country, cities: [] }
    acc[code].latSum += lat
    acc[code].lngSum += lng
    acc[code].count++
    acc[code].cities.push(city)
  }
  const map = {}
  for (const [code, v] of Object.entries(acc)) {
    map[code] = {
      lat: v.latSum / v.count,
      lng: v.lngSum / v.count,
      state: v.state,
      country: v.country,
      cities: v.cities,
    }
  }
  return map
}

export const AREA_CODE_MAP = {
  ...buildMap(usCsv),
  ...buildMap(caCsv),
}

// ── Haversine distance in miles ───────────────────────────────────────────────
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Find area codes within radius, sorted by distance ────────────────────────
export function findNearbyCodes(userLat, userLng, radiusMiles = 100) {
  const results = []
  for (const [code, info] of Object.entries(AREA_CODE_MAP)) {
    const dist = haversine(userLat, userLng, info.lat, info.lng)
    if (dist <= radiusMiles) results.push({ code, dist, ...info })
  }
  return results.sort((a, b) => a.dist - b.dist)
}

// ── Extract 3-digit area code from a phone string ─────────────────────────────
export function extractAreaCode(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1, 4)
  if (digits.length === 10) return digits.slice(0, 3)
  return null
}

// ── Toll-free area codes ───────────────────────────────────────────────────────
export const TOLL_FREE_CODES = new Set(['800','888','877','866','855','844','833'])

export function isTollFree(phone) {
  const ac = extractAreaCode(phone)
  return ac ? TOLL_FREE_CODES.has(ac) : false
}
