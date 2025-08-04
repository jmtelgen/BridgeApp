import { api } from './api'

// Types
interface User {
  id: string
  username: string
  email?: string
  avatar?: string
  stats?: UserStats
}

interface UserStats {
  gamesPlayed: number
  gamesWon: number
  averageScore: number
  rank?: string
}

interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  email: string
  password: string
}

interface AuthResponse {
  user: User
  token: string
}

// User Service
export const userService = {
  /**
   * User login
   */
  login: async (request: LoginRequest) => {
    return api.post<AuthResponse>('/auth/login', request, {
      errorMessage: 'Login failed',
      showSuccess: true,
      successMessage: 'Login successful!'
    })
  },

  /**
   * User registration
   */
  register: async (request: RegisterRequest) => {
    return api.post<AuthResponse>('/auth/register', request, {
      errorMessage: 'Registration failed',
      showSuccess: true,
      successMessage: 'Registration successful!'
    })
  },

  /**
   * User logout
   */
  logout: async () => {
    return api.post('/auth/logout', {}, {
      errorMessage: 'Logout failed',
      showSuccess: true,
      successMessage: 'Logged out successfully'
    })
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    return api.get<User>('/user/profile', {
      errorMessage: 'Failed to get user profile'
    })
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates: Partial<User>) => {
    return api.put<User>('/user/profile', updates, {
      errorMessage: 'Failed to update profile',
      showSuccess: true,
      successMessage: 'Profile updated successfully!'
    })
  },

  /**
   * Get user statistics
   */
  getStats: async (userId?: string) => {
    const endpoint = userId ? `/user/${userId}/stats` : '/user/stats'
    return api.get<UserStats>(endpoint, {
      errorMessage: 'Failed to get user statistics'
    })
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async () => {
    return api.get<User[]>('/user/leaderboard', {
      errorMessage: 'Failed to get leaderboard'
    })
  }
} 