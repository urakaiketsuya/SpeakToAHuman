import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, CheckCircle, ChevronDown } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { submitEntry } from '../lib/db'

const CATEGORIES = ['banking', 'government', 'telecom', 'retail', 'insurance', 'healthcare',
  'utilities', 'automotive', 'education', 'fashion', 'fitness', 'food', 'home', 'legal',
  'media', 'mortgage', 'nonprofit', 'pets', 'real_estate', 'shipping', 'technology', 'travel', 'other']
const CATEGORY_LABELS = { real_estate: 'Real Estate' }
const PHONE_TYPES = ['Toll-free', 'Local', 'International', 'Other']

const inputCls = 'w-full border border-brand-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
const hintCls  = 'text-xs text-gray-400 mt-1'

// ── Step item helpers ──────────────────────────────────────────────────────────
function makeAction()      { return { kind: 'action', text: '' } }
function makeConditional() { return { kind: 'conditional', prompt: '', options: [{ label: '', key: '' }, { label: '', key: '' }] } }

function serializeSteps(items) {
  return items
    .map(item => {
      if (item.kind === 'action') return item.text.trim()
      const options = item.options.filter(o => o.label.trim() && o.key.trim())
      if (options.length < 2) return item.prompt.trim() || null
      return { type: 'conditional', prompt: item.prompt.trim(), options }
    })
    .filter(Boolean)
}

// ── Conditional step editor ────────────────────────────────────────────────────
function ConditionalStepEditor({ item, onChange }) {
  function setOption(i, field, value) {
    const opts = item.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o)
    onChange({ ...item, options: opts })
  }
  function addOption()    { onChange({ ...item, options: [...item.options, { label: '', key: '' }] }) }
  function removeOption(i) { onChange({ ...item, options: item.options.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={item.prompt}
        onChange={e => onChange({ ...item, prompt: e.target.value })}
        placeholder="Prompt (e.g. Select your language, Reason for call…)"
        className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50"
      />
      <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200">
        {item.options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              value={opt.label}
              onChange={e => setOption(i, 'label', e.target.value)}
              placeholder="Option (e.g. Spanish)"
              className="flex-1 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <input
              type="text"
              value={opt.key}
              onChange={e => setOption(i, 'key', e.target.value)}
              placeholder="Key"
              className="w-14 border border-indigo-200 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              maxLength={2}
            />
            {item.options.length > 2 && (
              <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors pl-2"
      >
        <Plus size={12} /> Add option
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Submit() {
  const [form, setForm] = useState({
    company: '', category: 'other', phone: '', phoneType: 'Local',
    is24_7: false, hours: '', avgHoldTime: '',
  })
  const [steps, setSteps]         = useState([makeAction()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState(null)

  function setField(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function updateStep(i, val)     { setSteps(s => s.map((item, idx) => idx === i ? val : item)) }
  function removeStep(i)          { setSteps(s => s.filter((_, idx) => idx !== i)) }
  function addStep(kind)          { setSteps(s => [...s, kind === 'conditional' ? makeConditional() : makeAction()]) }
  function toggleKind(i) {
    setSteps(s => s.map((item, idx) =>
      idx !== i ? item : item.kind === 'action' ? makeConditional() : makeAction()
    ))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const serialized = serializeSteps(steps)
    if (!form.company.trim()) { setError('Company name is required.'); return }
    if (!form.phone.trim())   { setError('Phone number is required.'); return }
    if (serialized.length === 0) { setError('Add at least one step.'); return }

    const payload = {
      company:     form.company.trim(),
      category:    form.category,
      phone:       form.phone.trim(),
      phoneType:   form.phoneType,
      hours:       form.is24_7 ? '24/7' : (form.hours.trim() || null),
      avgHoldTime: form.avgHoldTime.trim() || null,
      steps:       serialized,
    }

    setSubmitting(true)
    try {
      await submitEntry(payload)
      setSubmitted(true)
    } catch (err) {
      if (err?.message === 'submissions_disabled') {
        setError('Submissions are not available right now. Check back soon.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle size={48} className="text-brand mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-brand-dark mb-2">Submission received!</h1>
        <p className="text-gray-500 mb-6">Thanks for contributing. An admin will review your submission shortly.</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm">
          ← Back to directory
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 w-full">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to directory
      </Link>

      <h1 className="font-display text-2xl font-bold text-brand-dark mb-1">Submit an entry</h1>
      <p className="text-gray-500 text-sm mb-6">No account needed. Submissions are reviewed before going live.</p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Company */}
        <div>
          <label className={labelCls}>Company / Organization name *</label>
          <input type="text" value={form.company} onChange={e => setField('company', e.target.value)}
            placeholder="e.g. Chase Bank, IRS, Comcast…" className={inputCls} />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>Category *</label>
          <select value={form.category} onChange={e => setField('category', e.target.value)} className={inputCls}>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
            ))}
          </select>
        </div>

        {/* Phone + type */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Phone number *</label>
            <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
              placeholder="e.g. 1-800-123-4567" className={`${inputCls} font-mono`} />
          </div>
          <div className="w-36">
            <label className={labelCls}>Type</label>
            <select value={form.phoneType} onChange={e => setField('phoneType', e.target.value)} className={inputCls}>
              {PHONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Hours */}
        <div>
          <label className={labelCls}>Availability</label>
          <label className="flex items-center gap-2.5 cursor-pointer mb-2">
            <div onClick={() => setField('is24_7', !form.is24_7)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is24_7 ? 'bg-brand' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is24_7 ? 'translate-x-5' : ''}`} />
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <FontAwesomeIcon icon={faClock} className={form.is24_7 ? 'text-brand' : 'text-gray-300'} />
              Available 24/7
            </span>
          </label>
          {!form.is24_7 && (
            <input type="text" value={form.hours} onChange={e => setField('hours', e.target.value)}
              placeholder="e.g. Mon–Fri 8am–8pm ET" className={inputCls} />
          )}
          <p className={hintCls}>Leave blank if unknown.</p>
        </div>

        {/* Avg hold time */}
        <div>
          <label className={labelCls}>Average hold time</label>
          <input type="text" value={form.avgHoldTime} onChange={e => setField('avgHoldTime', e.target.value)}
            placeholder="e.g. 5 minutes, 20–30 minutes" className={inputCls} />
          <p className={hintCls}>Leave blank if unknown.</p>
        </div>

        {/* Steps */}
        <div>
          <label className={`${labelCls} mb-2`}>Steps to reach a human *</label>
          <p className={`${hintCls} mb-3`}>
            Add each step in order. Use <strong>Conditional</strong> for any step where the caller must choose between options.
          </p>

          <div className="space-y-3">
            {steps.map((item, i) => (
              <div key={i} className={`rounded-xl border p-3 ${item.kind === 'conditional' ? 'border-indigo-200 bg-indigo-50' : 'border-brand-mid bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {/* Step number */}
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    item.kind === 'conditional' ? 'bg-indigo-600 text-white' : 'bg-brand text-white'
                  }`}>
                    {i + 1}
                  </span>

                  {/* Kind toggle */}
                  <button
                    type="button"
                    onClick={() => toggleKind(i)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${
                      item.kind === 'conditional'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-500 border-brand-mid hover:border-brand'
                    }`}
                    title="Toggle between action step and conditional step"
                  >
                    <FontAwesomeIcon icon={faCodeBranch} />
                    {item.kind === 'conditional' ? 'Conditional' : 'Action'}
                  </button>

                  <div className="flex-1" />

                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {item.kind === 'action' ? (
                  <input
                    type="text"
                    value={item.text}
                    onChange={e => updateStep(i, { ...item, text: e.target.value })}
                    placeholder={`Step ${i + 1}… (e.g. Press 2 for billing)`}
                    className="w-full border border-brand-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                ) : (
                  <ConditionalStepEditor item={item} onChange={val => updateStep(i, val)} />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => addStep('action')}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-dark font-medium transition-colors">
              <Plus size={15} /> Add step
            </button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={() => addStep('conditional')}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
              <FontAwesomeIcon icon={faCodeBranch} className="text-xs" /> Add conditional
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full bg-brand hover:bg-brand-dark disabled:bg-brand-mid text-white font-medium py-3 rounded-lg transition-colors text-sm">
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}
