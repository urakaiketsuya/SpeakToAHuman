import { useState, useEffect, useMemo } from 'react'
import { MapPin, Phone, X, ChevronDown, Loader2 } from 'lucide-react'
import { getUserLocation, SUPPORTED_COUNTRIES, isInternationalPhone, getCallingCode } from '../lib/location'
import { findNearbyCodes, extractAreaCode, isTollFree } from '../lib/areaCodes'
import EntryCard from './EntryCard'

const DISMISS_KEY   = 'sth_nearme_dismissed'
const RADIUS_OPTIONS = [
  { label: '25 mi',  value: 25 },
  { label: '50 mi',  value: 50 },
  { label: '100 mi', value: 100 },
  { label: '250 mi', value: 250 },
]

// Map calling codes to display names for the country selector
const CALLING_CODE_NAMES = {
  '44':  'United Kingdom',
  '49':  'Germany',
  '33':  'France',
  '61':  'Australia',
  '64':  'New Zealand',
  '91':  'India',
  '353': 'Ireland',
  '34':  'Spain',
  '39':  'Italy',
  '31':  'Netherlands',
  '46':  'Sweden',
  '47':  'Norway',
  '45':  'Denmark',
  '358': 'Finland',
  '41':  'Switzerland',
  '43':  'Austria',
  '32':  'Belgium',
  '351': 'Portugal',
  '30':  'Greece',
  '48':  'Poland',
  '420': 'Czech Republic',
  '36':  'Hungary',
  '40':  'Romania',
  '7':   'Russia',
  '380': 'Ukraine',
  '27':  'South Africa',
  '234': 'Nigeria',
  '254': 'Kenya',
  '20':  'Egypt',
  '55':  'Brazil',
  '52':  'Mexico',
  '54':  'Argentina',
  '56':  'Chile',
  '57':  'Colombia',
  '51':  'Peru',
  '58':  'Venezuela',
  '81':  'Japan',
  '82':  'South Korea',
  '86':  'China',
  '852': 'Hong Kong',
  '65':  'Singapore',
  '60':  'Malaysia',
  '66':  'Thailand',
  '62':  'Indonesia',
  '63':  'Philippines',
  '84':  'Vietnam',
  '971': 'UAE',
  '966': 'Saudi Arabia',
  '972': 'Israel',
  '90':  'Turkey',
}

export default function NearYou({ allEntries, category = 'all' }) {
  const inCategory = (e) => category === 'all' || e.category === category
  const [dismissed, setDismissed]     = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')
  const [location, setLocation]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [radius, setRadius]           = useState(100)
  const [countryCode, setCountryCode] = useState('')
  const [showAll, setShowAll]         = useState(false)

  useEffect(() => {
    if (dismissed) { setLoading(false); return }
    getUserLocation().then(loc => {
      setLocation(loc)
      setLoading(false)
    })
  }, [dismissed])

  // ── Nearby entries (US / CA) ────────────────────────────────────────────────
  const nearbyCodes = useMemo(() => {
    if (!location || !SUPPORTED_COUNTRIES.has(location.countryCode)) return new Set()
    return new Set(findNearbyCodes(location.lat, location.lng, radius).map(r => r.code))
  }, [location, radius])

  // Reset expanded view when the result set changes
  useEffect(() => { setShowAll(false) }, [radius, category])

  const nearbyEntries = useMemo(() => {
    if (!nearbyCodes.size) return []
    return allEntries.filter(e => {
      const ac = extractAreaCode(e.phone)
      return ac && nearbyCodes.has(ac) && !isTollFree(e.phone) && inCategory(e)
    })
  }, [allEntries, nearbyCodes, category])

  // ── Toll-free entries ────────────────────────────────────────────────────────
  const tollFreeEntries = useMemo(
    () => allEntries.filter(e => isTollFree(e.phone) && inCategory(e)),
    [allEntries, category]
  )

  // ── International entries (grouped by calling code) ───────────────────────
  const intlByCode = useMemo(() => {
    if (!location || SUPPORTED_COUNTRIES.has(location.countryCode)) return {}
    const groups = {}
    for (const e of allEntries) {
      if (!isInternationalPhone(e.phone) || !inCategory(e)) continue
      const cc = getCallingCode(e.phone)
      if (!cc) continue
      if (!groups[cc]) groups[cc] = []
      groups[cc].push(e)
    }
    return groups
  }, [allEntries, location, category])

  const availableCountries = useMemo(
    () => Object.keys(intlByCode).sort((a, b) => {
      const na = CALLING_CODE_NAMES[a] ?? `+${a}`
      const nb = CALLING_CODE_NAMES[b] ?? `+${b}`
      return na.localeCompare(nb)
    }),
    [intlByCode]
  )

  const intlEntries = useMemo(
    () => (countryCode ? intlByCode[countryCode] ?? [] : []),
    [intlByCode, countryCode]
  )

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mb-6 bg-white border border-brand-mid rounded-2xl p-5 flex items-center gap-3 text-gray-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Finding numbers near you…
      </div>
    )
  }

  // ── Location unavailable ────────────────────────────────────────────────────
  if (!location) {
    return (
      <div className="mb-6 bg-white border border-brand-mid rounded-2xl px-5 py-4 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-brand-mid" />
          Couldn't detect your location — showing all entries below.
        </div>
        <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors ml-4">
          <X size={16} />
        </button>
      </div>
    )
  }

  const isSupported = SUPPORTED_COUNTRIES.has(location.countryCode)

  // ── US / CA: distance-based ─────────────────────────────────────────────────
  if (isSupported) {
    return (
      <section className="mb-8 bg-white border border-brand-mid rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin size={15} className="text-brand" />
            Near {location.city}, {location.regionCode}
            <span className="text-gray-400 font-normal">
              · {nearbyEntries.length} local number{nearbyEntries.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Radius selector */}
            <div className="relative">
              <select
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="appearance-none text-xs text-gray-500 bg-gray-100 border border-brand-border rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                {RADIUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {nearbyEntries.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">
            No local entries found within {radius} miles.{' '}
            <button onClick={() => setRadius(250)} className="text-brand underline">Try 250 mi</button>
          </div>
        ) : showAll ? (
          /* ── Expanded grid ── */
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
            <button
              onClick={() => setShowAll(false)}
              className="mt-4 w-full text-sm text-gray-400 hover:text-gray-700 py-2 transition-colors"
            >
              Show less ↑
            </button>
          </div>
        ) : (
          /* ── Horizontal scroll preview ── */
          <div>
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {nearbyEntries.slice(0, 6).map(entry => (
                  <div key={entry.id} className="w-64 flex-shrink-0">
                    <EntryCard entry={entry} />
                  </div>
                ))}
              </div>
            </div>
            {nearbyEntries.length > 6 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full border-t border-gray-100 px-5 py-2.5 text-sm font-medium text-brand hover:bg-brand-light transition-colors text-center"
              >
                View all {nearbyEntries.length} local entries ↓
              </button>
            )}
          </div>
        )}
      </section>
    )
  }

  // ── International: toll-free + country picker ──────────────────────────────
  return (
    <section className="mb-8 bg-white border border-brand-mid rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Phone size={15} className="text-brand" />
          {location.country
            ? `Viewing from ${location.country}`
            : 'International visitor'}
        </div>
        <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Toll-free section */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Toll-free numbers — reachable from anywhere
          </p>
          <div className="overflow-x-auto">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {tollFreeEntries.slice(0, 10).map(entry => (
                <div key={entry.id} className="w-64 flex-shrink-0">
                  <EntryCard entry={entry} />
                </div>
              ))}
              <div className="w-48 flex-shrink-0 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-brand-mid">
                {tollFreeEntries.length.toLocaleString()} total — search above
              </div>
            </div>
          </div>
        </div>

        {/* Country picker */}
        {availableCountries.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Browse numbers by country
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="appearance-none text-sm bg-gray-100 border border-brand-border rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer text-gray-700 min-w-48"
                >
                  <option value="">Select a country…</option>
                  {availableCountries.map(cc => (
                    <option key={cc} value={cc}>
                      {CALLING_CODE_NAMES[cc] ?? `+${cc}`} ({intlByCode[cc].length})
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {countryCode && (
                <span className="text-sm text-gray-500">
                  {intlEntries.length} number{intlEntries.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>

            {intlEntries.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {intlEntries.slice(0, 10).map(entry => (
                    <div key={entry.id} className="w-64 flex-shrink-0">
                      <EntryCard entry={entry} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
