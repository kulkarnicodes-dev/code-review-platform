import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authApi } from './api'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import AnalyticsPage from './pages/AnalyticsPage'
import GamificationPage from './pages/GamificationPage'
import ReviewsPage from './pages/ReviewsPage'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      authApi.getMe()
        .then(res => {
          if (res.data.role === 'admin') {
            setUser(res.data)
          } else {
            localStorage.removeItem('admin_token')
          }
        })
        .catch(() => localStorage.removeItem('admin_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    const token = res.data.access_token
    localStorage.setItem('admin_token', token)
    const me = await authApi.getMe()
    if (me.data.role !== 'admin') {
      localStorage.removeItem('admin_token')
      throw new Error('Access denied: Admin role required')
    }
    setUser(me.data)
    return me.data
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0d14', color: '#00d4ff', fontFamily: 'Space Mono, monospace', fontSize: '14px' }}>
        Loading admin panel...
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          {user ? (
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="gamification" element={<GamificationPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
