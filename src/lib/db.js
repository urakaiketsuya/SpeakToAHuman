let cache = null

async function load() {
  if (!cache) {
    const res = await fetch(`${import.meta.env.BASE_URL}data/entries.json`)
    const raw = await res.json()
    cache = raw.map(e => ({ ...e, submittedAt: e.submittedAt ? new Date(e.submittedAt) : null }))
  }
  return cache
}

export async function getEntries(statusFilter = 'approved') {
  const data = await load()
  return data.filter(e => e.status === statusFilter)
}

export async function getEntry(id) {
  const data = await load()
  return data.find(e => e.id === id) ?? null
}

export async function submitEntry() {
  // Static hosting — submissions are not supported
  throw new Error('submissions_disabled')
}

export async function getPendingEntries() {
  return []
}

export async function updateEntryStatus() {
  // no-op
}
