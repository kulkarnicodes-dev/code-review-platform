import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const useReviewStore = create((set) => ({
  currentReview: null,
  reviews: [],
  stats: null,
  
  setCurrentReview: (review) => set({ currentReview: review }),
  
  setReviews: (reviews) => set({ reviews }),
  
  addReview: (review) => set((state) => ({ 
    reviews: [review, ...state.reviews] 
  })),
  
  setStats: (stats) => set({ stats }),
}));
