import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (username, password) => {
        try {
          const response = await api.post('/auth/login', { username, password })
          set({
            user: response.data.user,
            token: response.data.access_token,
            isAuthenticated: true,
          })
          // Set token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`
          return { success: true }
        } catch (error) {
          return { success: false, error: error.response?.data?.detail || '登入失敗' }
        }
      },
      register: async (username, email, password) => {
        try {
          const response = await api.post('/auth/register', { username, email, password })
          set({
            user: response.data.user,
            token: response.data.access_token,
            isAuthenticated: true,
          })
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`
          return { success: true }
        } catch (error) {
          return { success: false, error: error.response?.data?.detail || '註冊失敗' }
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

