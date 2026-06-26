import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Directory from './pages/Directory'
import EntryDetail from './pages/EntryDetail'
import Submit from './pages/Submit'
import Admin from './pages/Admin'
import './index.css'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-brand-light">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Directory />} />
            <Route path="/entry/:id" element={<EntryDetail />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
