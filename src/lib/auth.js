const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
const SESSION_KEY = 'sth_admin_authed'

export function login(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, '1')
    return true
  }
  return false
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}
