import { useState, useEffect } from 'react'
import { Phone, Check, X, LogOut, Clock, RefreshCw } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { login, logout, isAuthenticated } from '../lib/auth'
import { getPendingEntries, updateEntryStatus } from '../lib/db'
import { categoryColor, CATEGORY_LABELS } from '../components/EntryCard'

function LoginForm({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (login(password)) {
      onLogin()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-brand-dark mb-2">Admin</h1>
      <p className="text-gray-500 text-sm mb-8">Enter your admin password to review submissions.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          placeholder="Password"
          autoFocus
          className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${error ? 'border-red-400' : 'border-brand-border'}`}
        />
        {error && <p className="text-red-500 text-sm">Incorrect password.</p>}
        <button
          type="submit"
          className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-3 rounded-lg transition-colors text-sm"
        >
          Sign in
        </button>
      </form>
    </div>
  )
}

function ReviewCard({ entry, onAction }) {
  const [acting, setActing] = useState(false)

  async function handle(status) {
    setActing(true)
    await onAction(entry.id, status)
  }

  return (
    <div className="bg-white rounded-xl border border-brand-mid p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(entry.category)} capitalize`}>
            {CATEGORY_LABELS[entry.category] ?? entry.category}
          </span>
          <h2 className="font-display text-lg font-bold text-brand-dark mt-1">{entry.company}</h2>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
            <Phone size={13} />
            <span className="font-mono">{entry.phone}</span>
          </div>
        </div>
        {entry.submittedAt && (
          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <Clock size={11} />
            {new Date(entry.submittedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      <ol className="space-y-1.5 mb-4">
        {entry.steps.map((step, i) => {
          const isConditional = typeof step === 'object' && step.type === 'conditional'
          return (
            <li key={i} className="flex gap-2 text-sm text-gray-600">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-light text-brand text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {isConditional ? (
                <span className="flex-1">
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-medium mr-1">
                    <FontAwesomeIcon icon={faCodeBranch} className="text-xs" />
                    {step.prompt}
                  </span>
                  <span className="text-gray-400">
                    ({step.options.map(o => `${o.label}: ${o.key}`).join(', ')})
                  </span>
                </span>
              ) : step}
            </li>
          )
        })}
      </ol>

      <div className="flex gap-2">
        <button
          onClick={() => handle('approved')}
          disabled={acting}
          className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark disabled:bg-brand-mid text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <Check size={15} /> Approve
        </button>
        <button
          onClick={() => handle('rejected')}
          disabled={acting}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 disabled:bg-gray-100 text-red-600 border border-red-200 text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <X size={15} /> Reject
        </button>
      </div>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(isAuthenticated())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadPending() {
    setLoading(true)
    const data = await getPendingEntries()
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) loadPending()
  }, [authed])

  async function handleAction(id, status) {
    await updateEntryStatus(id, status)
    setEntries(e => e.filter(entry => entry.id !== id))
  }

  function handleLogout() {
    logout()
    setAuthed(false)
  }

  if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Pending submissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? 'Loading...' : `${entries.length} submission${entries.length !== 1 ? 's' : ''} to review`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPending}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-brand transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-brand-mid px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-brand-mid p-5 animate-pulse h-44" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FontAwesomeIcon icon={faCircleCheck} className="text-brand text-4xl mb-3" />
          <p className="font-medium text-gray-600">All caught up!</p>
          <p className="text-sm mt-1">No pending submissions right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <ReviewCard key={entry.id} entry={entry} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  )
}
