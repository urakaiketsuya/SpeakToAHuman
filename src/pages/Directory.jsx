import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPhone } from '@fortawesome/free-solid-svg-icons'
import Fuse from 'fuse.js'
import { getEntries } from '../lib/db'
import EntryCard from '../components/EntryCard'
import NearYou from '../components/NearYou'

const CATEGORIES = [
  'all',
  'automotive',
  'banking',
  'education',
  'fashion',
  'fitness',
  'food',
  'government',
  'healthcare',
  'home',
  'insurance',
  'legal',
  'media',
  'mortgage',
  'nonprofit',
  'pets',
  'real_estate',
  'retail',
  'shipping',
  'technology',
  'telecom',
  'travel',
  'utilities',
  'other',
]

const CATEGORY_LABELS = { real_estate: 'Real Estate' }
const PAGE_SIZE = 30

export default function Directory() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    getEntries('approved').then(data => {
      setEntries(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => { setPage(1) }, [search, category])

  // Category-filtered pool (search operates within this)
  const pool = useMemo(() =>
    category === 'all' ? entries : entries.filter(e => e.category === category),
    [entries, category]
  )

  // Fuse instance rebuilt only when the pool changes
  const fuse = useMemo(() => new Fuse(pool, {
    keys: ['company', 'phone'],
    threshold: 0.4,      // 0 = exact, 1 = match anything
    minMatchCharLength: 2,
    ignoreLocation: true,
  }), [pool])

  // { results, isFuzzy }
  const { filtered, isFuzzy } = useMemo(() => {
    const q = search.trim()
    if (!q) return { filtered: pool, isFuzzy: false }

    // 1. Try exact substring match first
    const exact = pool.filter(e =>
      e.company.toLowerCase().includes(q.toLowerCase()) ||
      e.phone.includes(q)
    )
    if (exact.length > 0) return { filtered: exact, isFuzzy: false }

    // 2. Fall back to fuzzy
    const fuzzy = fuse.search(q).map(r => r.item)
    return { filtered: fuzzy, isFuzzy: true }
  }, [pool, fuse, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function goTo(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function pageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = new Set([1, totalPages, page, page - 1, page - 2, page + 1, page + 2].filter(p => p >= 1 && p <= totalPages))
    const sorted = [...pages].sort((a, b) => a - b)
    const result = []
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…')
      result.push(sorted[i])
    }
    return result
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-bold text-brand-dark mb-2">Speak to a Human</h1>
        <p className="text-gray-500 text-lg">Save on time. Get straight to a real person.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search company or phone number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-brand-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand text-sm"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors capitalize ${
              category === cat
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-600 border-brand-mid hover:border-brand'
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Near You */}
      <NearYou allEntries={entries} category={category} />

      {/* Result count */}
      {!loading && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <p className="text-xs text-gray-400">
            {filtered.length.toLocaleString()} {filtered.length === 1 ? 'entry' : 'entries'}
            {search || category !== 'all' ? ' found' : ' in directory'}
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </p>
          {isFuzzy && search && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              Showing similar results for &ldquo;{search}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(PAGE_SIZE)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-brand-mid p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FontAwesomeIcon icon={faPhone} className="text-brand-mid text-3xl mb-3" />
          <p className="font-medium text-gray-600">No results found for &ldquo;{search}&rdquo;</p>
          <p className="text-sm mt-1">
            Try different keywords or{' '}
            <a href="/submit" className="text-brand underline">submit a new entry</a>.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginated.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <button
                onClick={() => goTo(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-brand-mid bg-white text-gray-500 hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {pageNumbers().map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium border transition-colors ${
                      p === page
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-gray-600 border-brand-mid hover:border-brand'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goTo(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-brand-mid bg-white text-gray-500 hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <p className="text-center text-xs text-gray-400 mt-10">
        Know a shortcut that's missing?{' '}
        <a href="/submit" className="text-brand underline">Submit it</a> — no account needed.
      </p>
    </div>
  )
}
