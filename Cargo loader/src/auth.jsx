import { createContext, useContext, useState, useCallback } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const AuthContext = createContext(null)
const STORAGE_KEY = 'cl3d_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
    } catch {
      return null
    }
  })

  const login = useCallback((email) => {
    const u = { email, name: email.split('@')[0] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?ReturnUrl=${returnUrl}`} replace />
  }
  return children
}
