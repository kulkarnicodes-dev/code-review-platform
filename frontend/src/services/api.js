import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach auth token ───────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
          return config;
        }
      } catch {
        // JSON parse failed — fall through to plain token
      }
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 globally ────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login:    (data) => apiClient.post('/auth/login', data),
  getMe:    ()     => apiClient.get('/auth/me'),
};

// ── Reviews ───────────────────────────────────────────────────────
export const reviewAPI = {
  submitReview: (data) => apiClient.post('/review/', data),
  getReview:    (id)   => apiClient.get(`/review/${id}`),
  getReviews:   ()     => apiClient.get('/review/'),
  refactorCode: (data) => apiClient.post('/review/refactor', data),
};

// ── Gamification ──────────────────────────────────────────────────
// All routes match app/api/gamification.py exactly
export const gamificationAPI = {
  // Lightweight summary used by the sidebar (XP, level, streak, badge count)
  getMyProfile:       () => apiClient.get('/gamification/summary'),

  // Full profile with daily challenges, badge details, progress %
  getFullProfile:     () => apiClient.get('/gamification/profile'),

  // All badges with earned/not-earned status
  getBadges:          () => apiClient.get('/gamification/badges'),

  // Today's daily challenges
  getDailyChallenges: () => apiClient.get('/gamification/daily-challenges'),

  // Global leaderboard
  getLeaderboard: (limit = 10) => apiClient.get(`/gamification/leaderboard?limit=${limit}`),
};

// ── Analytics ─────────────────────────────────────────────────────
export const analyticsAPI = {
  getStats: () => apiClient.get('/analytics/stats'),
};

export default apiClient;