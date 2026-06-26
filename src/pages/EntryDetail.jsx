import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Phone, Copy, Check, ArrowLeft, Clock, Timer, ExternalLink } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPhone, faKeyboard, faComment, faHourglass, faUser,
  faTriangleExclamation, faGlobe, faCodeBranch,
} from '@fortawesome/free-solid-svg-icons'
import { getEntry } from '../lib/db'
import { categoryColor, CATEGORY_LABELS } from '../components/EntryCard'

// ── Step type detection (strings only) ────────────────────────────────────────
function detectStepType(text) {
  const t = text.toLowerCase()
  if (/^call\b/.test(t))                                         return 'call'
  if (/\bpress\b|\benter\b|\bdial\b|\btype\b/.test(t))           return 'press'
  if (/\bsay\b|\bspeak\b|\bannounce\b|\bstate\b/.test(t))        return 'say'
  if (/\bhold\b|\bwait\b|\bminute\b|\bqueue\b/.test(t))          return 'wait'
  if (/\bcannot\b|automated only|no human|not available/.test(t)) return 'warning'
  return 'default'
}

const STEP_CONFIG = {
  call:        { icon: faPhone,               bg: 'bg-brand-light',  border: 'border-brand-mid',   iconClass: 'text-brand',       label: 'Call'   },
  press:       { icon: faKeyboard,            bg: 'bg-blue-50',      border: 'border-blue-200',    iconClass: 'text-blue-600',    label: 'Press'  },
  say:         { icon: faComment,             bg: 'bg-violet-50',    border: 'border-violet-200',  iconClass: 'text-violet-600',  label: 'Say'    },
  wait:        { icon: faHourglass,           bg: 'bg-amber-50',     border: 'border-amber-200',   iconClass: 'text-amber-600',   label: 'Wait'   },
  warning:     { icon: faTriangleExclamation, bg: 'bg-red-50',       border: 'border-red-200',     iconClass: 'text-red-500',     label: 'Note'   },
  conditional: { icon: faCodeBranch,          bg: 'bg-indigo-50',    border: 'border-indigo-200',  iconClass: 'text-indigo-600',  label: 'Choose' },
  default:     { icon: faGlobe,              bg: 'bg-gray-50',       border: 'border-gray-200',    iconClass: 'text-gray-400',    label: null     },
}

// Highlight keypresses and quoted phrases in string steps
function HighlightedStep({ text }) {
  const parts = []
  let last = 0
  for (const m of text.matchAll(/((?:(?:press|enter|dial)\s+)([\d*#]+))|(['"""'][^'"""']+['"""'])/gi)) {
    if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>)
    const matched = m[0]
    if (m[2]) {
      const pre = text.slice(m.index, m.index + matched.length - m[2].length)
      parts.push(<span key={m.index}>{pre}</span>)
      parts.push(
        <kbd key={`k${m.index}`} className="inline-flex items-center justify-center min-w-[1.4em] px-1.5 py-0.5 mx-0.5 text-xs font-bold font-mono bg-brand-dark text-brand-light rounded border border-brand-dark shadow-sm">
          {m[2]}
        </kbd>
      )
    } else {
      parts.push(
        <span key={m.index} className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 rounded">
          <FontAwesomeIcon icon={faComment} className="text-[9px]" />
          {matched.replace(/['"'"]/g, '')}
        </span>
      )
    }
    last = m.index + matched.length
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>)
  return parts.length ? <>{parts}</> : <>{text}</>
}

// ── Conditional step renderer ─────────────────────────────────────────────────
function ConditionalStepContent({ step, selected, onSelect }) {
  return (
    <div>
      <p className="text-sm text-indigo-700 font-medium mb-2">{step.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {step.options.map(opt => {
          const isSelected = selected?.label === opt.label
          return (
            <button
              key={opt.label}
              onClick={() => onSelect(isSelected ? null : opt)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400'
              }`}
            >
              {isSelected && (
                <kbd className="inline-flex items-center justify-center min-w-[1.2em] px-1 text-xs font-bold font-mono bg-white text-indigo-600 rounded">
                  {opt.key}
                </kbd>
              )}
              {opt.label}
            </button>
          )
        })}
      </div>
      {selected && (
        <p className="text-xs text-indigo-600 mt-2">
          Press{' '}
          <kbd className="inline-flex items-center justify-center min-w-[1.4em] px-1.5 py-0.5 text-xs font-bold font-mono bg-brand-dark text-brand-light rounded border border-brand-dark">
            {selected.key}
          </kbd>
          {' '}for {selected.label}
        </p>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EntryDetail() {
  const { id } = useParams()
  const [entry, setEntry]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  const [selections, setSelections] = useState({}) // { [stepIndex]: { label, key } }

  useEffect(() => {
    setSelections({})
    getEntry(id).then(data => {
      setEntry(data)
      setLoading(false)
    })
  }, [id])

  function selectOption(stepIndex, opt) {
    setSelections(s =>
      opt === null
        ? (({ [stepIndex]: _, ...rest }) => rest)(s)
        : { ...s, [stepIndex]: opt }
    )
  }

  function copyPhone() {
    navigator.clipboard.writeText(entry.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-brand-mid p-8 animate-pulse h-64" />
      </div>
    )
  }

  if (!entry || entry.status !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 text-lg">Entry not found.</p>
        <Link to="/" className="text-brand underline text-sm mt-2 inline-block">← Back to directory</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to directory
      </Link>

      <div className="bg-white rounded-2xl border border-brand-mid p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(entry.category)} capitalize`}>
              {CATEGORY_LABELS[entry.category] ?? entry.category}
            </span>
            <h1 className="font-display text-2xl font-bold text-brand-dark mt-2">{entry.company}</h1>
          </div>
        </div>

        {/* Phone number */}
        <div className="flex items-center gap-3 bg-brand-light rounded-xl p-4 mb-6">
          <Phone size={20} className="text-brand flex-shrink-0" />
          <span className="font-mono text-xl font-semibold text-brand-dark flex-1">{entry.phone}</span>
          <button
            onClick={copyPhone}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            {copied ? <Check size={15} className="text-brand" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Meta badges */}
        {(entry.hours || entry.avgHoldTime || entry.phoneType) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {entry.hours && (
              <span className="inline-flex items-center gap-1 text-xs bg-brand-light text-brand-dark px-2.5 py-1 rounded-full">
                <Clock size={11} /> {entry.hours}
              </span>
            )}
            {entry.avgHoldTime && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                <Timer size={11} /> ~{entry.avgHoldTime} avg hold
              </span>
            )}
            {entry.phoneType && entry.phoneType !== 'Unknown' && (
              <span className="inline-flex items-center gap-1 text-xs bg-brand-light text-brand-dark px-2.5 py-1 rounded-full">
                {entry.phoneType}
              </span>
            )}
          </div>
        )}

        {/* Steps */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Steps to reach a human
          </h2>

          <ol className="relative">
            {entry.steps.map((step, i) => {
              const isConditional = typeof step === 'object' && step.type === 'conditional'
              const config = isConditional ? STEP_CONFIG.conditional : STEP_CONFIG[detectStepType(step)]
              const isLast = i === entry.steps.length - 1

              return (
                <li key={i} className="relative flex gap-4 pb-4">
                  {!isLast && (
                    <div className="absolute left-[18px] top-9 bottom-0 w-px bg-brand-mid" />
                  )}

                  <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full border-2 ${config.bg} ${config.border} flex items-center justify-center`}>
                    <FontAwesomeIcon icon={config.icon} className={`text-sm ${config.iconClass}`} />
                  </div>

                  <div className={`flex-1 rounded-xl border ${config.border} ${config.bg} px-4 py-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {config.label && (
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${config.iconClass} block mb-1`}>
                            {config.label}
                          </span>
                        )}
                        {isConditional ? (
                          <ConditionalStepContent
                            step={step}
                            selected={selections[i] ?? null}
                            onSelect={opt => selectOption(i, opt)}
                          />
                        ) : (
                          <p className="text-sm text-gray-800 leading-snug">
                            <HighlightedStep text={step} />
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-bold text-gray-300 mt-0.5">{i + 1}</span>
                    </div>
                  </div>
                </li>
              )
            })}

            {/* Final indicator */}
            <li className="flex gap-4">
              <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-brand border-2 border-brand flex items-center justify-center">
                <FontAwesomeIcon icon={faUser} className="text-sm text-white" />
              </div>
              <div className="flex-1 rounded-xl border border-brand bg-brand px-4 py-3">
                <p className="text-sm font-semibold text-white">You're through to a human</p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {entry.submittedAt && (
        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
          <Clock size={11} />
          Last updated {new Date(entry.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      )}

      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-gray-500">
          Are these steps outdated?{' '}
          <Link to="/submit" className="text-brand underline">Submit an update</Link>
        </p>
        {entry.sourceUrl && (
          <p className="text-xs text-gray-400">
            Data sourced from{' '}
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-gray-400 hover:text-gray-600 underline">
              GetHuman <ExternalLink size={10} />
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
