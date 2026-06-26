import { Link } from 'react-router-dom'
import { Phone, ChevronRight } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faHourglass, faListOl, faCodeBranch } from '@fortawesome/free-solid-svg-icons'

const CATEGORY_COLORS = {
  automotive:  'bg-slate-100 text-slate-700',
  banking:     'bg-blue-100 text-blue-700',
  education:   'bg-indigo-100 text-indigo-700',
  fashion:     'bg-pink-100 text-pink-700',
  fitness:     'bg-lime-100 text-lime-700',
  food:        'bg-amber-100 text-amber-700',
  government:  'bg-purple-100 text-purple-700',
  healthcare:  'bg-red-100 text-red-700',
  home:        'bg-emerald-100 text-emerald-700',
  insurance:   'bg-teal-100 text-teal-700',
  legal:       'bg-stone-100 text-stone-700',
  media:       'bg-fuchsia-100 text-fuchsia-700',
  mortgage:    'bg-cyan-100 text-cyan-700',
  nonprofit:   'bg-violet-100 text-violet-700',
  pets:        'bg-orange-100 text-orange-700',
  real_estate: 'bg-rose-100 text-rose-700',
  retail:      'bg-yellow-100 text-yellow-700',
  shipping:    'bg-sky-100 text-sky-700',
  technology:  'bg-blue-100 text-blue-800',
  telecom:     'bg-orange-100 text-orange-700',
  travel:      'bg-teal-100 text-teal-800',
  utilities:   'bg-emerald-100 text-emerald-800',
  other:       'bg-brand-light text-brand-dark',
}

export const CATEGORY_LABELS = {
  real_estate: 'Real Estate',
}

export function categoryColor(cat) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other
}

function Pill({ icon, label, className }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      <FontAwesomeIcon icon={icon} className="text-[9px]" />
      {label}
    </span>
  )
}

export default function EntryCard({ entry }) {
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="block bg-white rounded-xl border border-brand-mid p-4 hover:border-brand hover:shadow-sm transition-all group no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(entry.category)}`}>
              {CATEGORY_LABELS[entry.category] ?? entry.category}
            </span>
          </div>
          <h2 className="font-display text-base font-semibold text-gray-900 truncate">{entry.company}</h2>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <Phone size={13} />
            <span className="font-mono">{entry.phone}</span>
          </div>
        </div>
        <ChevronRight size={18} className="text-brand-mid group-hover:text-brand flex-shrink-0 mt-1 transition-colors" />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <Pill
          icon={faListOl}
          label={`${entry.steps.length} step${entry.steps.length !== 1 ? 's' : ''}`}
          className="bg-brand-light text-brand-dark"
        />
        {entry.steps.some(s => typeof s === 'object' && s.type === 'conditional') && (
          <Pill icon={faCodeBranch} label="Options" className="bg-indigo-50 text-indigo-600" />
        )}
        {entry.avgHoldTime && (
          <Pill
            icon={faHourglass}
            label={`~${entry.avgHoldTime}`}
            className="bg-amber-50 text-amber-700"
          />
        )}
        {entry.hours === '24/7' && (
          <Pill
            icon={faClock}
            label="24/7"
            className="bg-emerald-50 text-emerald-700"
          />
        )}
        {entry.hours && entry.hours !== '24/7' && (
          <Pill
            icon={faClock}
            label={entry.hours}
            className="bg-gray-100 text-gray-500"
          />
        )}
      </div>
    </Link>
  )
}
