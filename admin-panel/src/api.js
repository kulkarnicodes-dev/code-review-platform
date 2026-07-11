import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Inject token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getTopUsers: (limit = 10) => api.get(`/admin/analytics/top-users?limit=${limit}`),
  getLanguageStats: () => api.get('/admin/analytics/language-stats'),
  getReviewTrends: (days = 30) => api.get(`/admin/analytics/review-trends?days=${days}`),
  getScoreDistribution: () => api.get('/admin/analytics/score-distribution'),
  getAllUsers: (page = 1, limit = 20) => api.get(`/admin/users?page=${page}&limit=${limit}`),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role?role=${role}`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getGamificationStats: () => api.get('/admin/gamification/stats'),
  getRecentReviews: (limit = 20) => api.get(`/admin/reviews/recent?limit=${limit}`),
  getSystemHealth: () => api.get('/admin/system/health'),
}

export default api
