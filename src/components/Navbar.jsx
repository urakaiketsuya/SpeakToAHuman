import { Link, useLocation } from 'react-router-dom'
import { Phone } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-white border-b border-brand-mid sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-gray-900 text-xl no-underline">
          <Phone size={20} className="text-brand" />
          Speak to a Human
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors ${pathname === '/' ? 'text-brand' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Directory
          </Link>
          <Link
            to="/submit"
            className="text-sm bg-brand hover:bg-brand-dark text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            + Submit
          </Link>
        </div>
      </div>
    </nav>
  )
}
