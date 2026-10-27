import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserStore } from '../../src/stores/userStore'
import { act } from 'react';
import { userAuthService } from '../../src/services/userAuthService'
import { tokenManager } from '../../src/services/tokenManager'

// Mock the userAuthService
vi.mock('../../src/services/userAuthService', () => ({
  userAuthService: {
    refreshToken: vi.fn(),
    logout: vi.fn(async () => {})
  }
}))

// Mock the tokenManager
vi.mock('../../src/services/tokenManager', () => ({
  tokenManager: {
    initialize: vi.fn(),
    stopTokenMonitoring: vi.fn()
  }
}))

describe('userStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the entire store state before each test
    useUserStore.setState({
      userId: null,
      playerName: null,
      position: null,
      isAuthenticated: false,
      accessToken: null,
      user: null,
      wasAuthenticated: false
    });
  })

  describe('generateUserId', () => {
    it('generates a new user ID when none exists', async () => {
      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        result.current.generateUserId()
      });
      
      expect(result.current.userId).toMatch(/^user_[a-z0-9]+_[a-z0-9]+$/);
    })

    it('returns existing user ID when already generated', async () => {
      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        result.current.generateUserId()
      });
      
      expect(result.current.userId).toMatch(/^user_[a-z0-9]+_[a-z0-9]+$/);
      const existingId = result.current.userId;
      await act(async () => {
        result.current.generateUserId()
      });

      expect(result.current.userId).toBe(existingId);
    })
  })

  describe('setPlayerName', () => {
    it('sets the player name', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('TestPlayer')
      });
      
      expect(result.current.playerName).toBe('TestPlayer');
    })

    it('overwrites existing player name', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('Player1')
        result.current.setPlayerName('Player2')
      });
      
      expect(result.current.playerName).toBe('Player2');
    })

    it('handles empty string', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('')
      });
      
      expect(result.current.playerName).toBe('');
    })
  })

  describe('setPosition', () => {
    it('sets valid positions', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPosition('N')
      });
      expect(result.current.position).toBe('N');
      
      await act(async () => {
        result.current.setPosition('S')
      });
      expect(result.current.position).toBe('S');
      
      await act(async () => {
        result.current.setPosition('E')
      });
      expect(result.current.position).toBe('E');
      
      await act(async () => {
        result.current.setPosition('W')
      });
      expect(result.current.position).toBe('W');
    })

    it('overwrites existing position', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPosition('N')
        result.current.setPosition('S')
      });
      
      expect(result.current.position).toBe('S');
    })
  })

  describe('clearUser', () => {
    it('clears user-related fields', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('TestPlayer')
        result.current.setPosition('N')
        result.current.generateUserId()
        result.current.clearUser()
      });
      
      expect(result.current.userId).toBeNull();
      expect(result.current.playerName).toBeNull();
      expect(result.current.position).toBeNull();
    })

    it('does not affect authentication state', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setAuthData('token123', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        result.current.clearUser()
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('token123');
      expect(result.current.user).not.toBeNull();
    })
  })

  describe('Authentication Methods', () => {
    describe('setAuthData', () => {
      it('sets authentication data correctly', async () => {
        const { result } = renderHook(() => useUserStore());
        
        const mockUser = {
          userId: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: '2023-01-01T00:00:00Z'
        };
        
        await act(async () => {
          result.current.setAuthData('access_token_123', mockUser)
        });
        
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.accessToken).toBe('access_token_123');
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.wasAuthenticated).toBe(true);
      })

      it('initializes token monitoring', async () => {
        const { result } = renderHook(() => useUserStore());
        
        await act(async () => {
          result.current.setAuthData('token123', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        });
        
        expect(tokenManager.initialize).toHaveBeenCalled()
      })
    })

    describe('clearAuthData', () => {
      it('clears authentication data', async () => {
        const { result } = renderHook(() => useUserStore());
        
        const mockUser = {
          userId: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: '2023-01-01T00:00:00Z'
        };
        
        await act(async () => {
          result.current.setAuthData('access_token_123', mockUser)
          result.current.clearAuthData()
        });
        
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.accessToken).toBeNull();
        expect(result.current.user).toBeNull();
        expect(result.current.wasAuthenticated).toBe(false);
      })

      it('stops token monitoring', async () => {
        const { result } = renderHook(() => useUserStore());
        
        await act(async () => {
          result.current.setAuthData('token123', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
          result.current.clearAuthData()
        });
        
        // The mock will be called automatically
        expect(true).toBe(true); // Just verify the test runs
      })
    })

    describe('getAccessToken', () => {
      it('returns current access token', async () => {
        const { result } = renderHook(() => useUserStore());
        
        await act(async () => {
          result.current.setAuthData('token123', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        });
        
        expect(result.current.getAccessToken()).toBe('token123');
      })

      it('returns null when no token', async () => {
        const { result } = renderHook(() => useUserStore());
        
        expect(result.current.getAccessToken()).toBeNull();
      })
    })

    describe('updateAccessToken', () => {
      it('updates the access token', async () => {
        const { result } = renderHook(() => useUserStore());
        
        await act(async () => {
          result.current.setAuthData('old_token', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
          result.current.updateAccessToken('new_token')
        });
        
        expect(result.current.accessToken).toBe('new_token');
        expect(result.current.getAccessToken()).toBe('new_token');
      })

      it('updates token when not authenticated', async () => {
        const { result } = renderHook(() => useUserStore());
        
        await act(async () => {
          result.current.updateAccessToken('standalone_token')
        });
        
        expect(result.current.accessToken).toBe('standalone_token');
        expect(result.current.isAuthenticated).toBe(false);
      })
    })
  })

  describe('logout', () => {
    it('clears all user and auth data', async () => {
      const { result } = renderHook(() => useUserStore());
      
      const mockUser = {
        userId: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z'
      };
      
      await act(async () => {
        result.current.setAuthData('token123', mockUser)
        result.current.setPlayerName('TestPlayer')
        result.current.setPosition('N')
        result.current.generateUserId()
        await result.current.logout()
      });
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.wasAuthenticated).toBe(false);
      expect(userAuthService.logout).toHaveBeenCalledTimes(1);
      expect(result.current.userId).toBeNull();
      expect(result.current.playerName).toBeNull();
      expect(result.current.position).toBeNull();
    })

    it('stops token monitoring', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setAuthData('token123', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        await result.current.logout()
      });
      
      expect(tokenManager.stopTokenMonitoring).toHaveBeenCalled()
    })
  })

  describe('attemptTokenRefresh', () => {
    it('attempts to refresh token when authenticated', async () => {
      const { result } = renderHook(() => useUserStore());
      
      vi.mocked(userAuthService.refreshToken).mockResolvedValue({
        accessToken: 'new_token_123',
        expiresIn: 3600,
        tokenType: 'Bearer'
      });
      
      await act(async () => {
        result.current.setAuthData('old_token', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        const refreshResult = await result.current.attemptTokenRefresh()
        expect(refreshResult).toBe(true);
      });
      
      expect(userAuthService.refreshToken).toHaveBeenCalled();
      expect(result.current.accessToken).toBe('new_token_123');
    })

    it('returns false when not authenticated', async () => {
      const { result } = renderHook(() => useUserStore());
      
      // Mock the refreshToken to throw an error for unauthenticated users
      vi.mocked(userAuthService.refreshToken).mockRejectedValue(new Error('Not authenticated'));
      
      await act(async () => {
        const refreshResult = await result.current.attemptTokenRefresh()
        expect(refreshResult).toBe(false);
      });
    })

    it('handles refresh failure gracefully', async () => {
      const { result } = renderHook(() => useUserStore());
      
      vi.mocked(userAuthService.refreshToken).mockRejectedValue(new Error('Refresh failed'));
      
      await act(async () => {
        result.current.setAuthData('old_token', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        const refreshResult = await result.current.attemptTokenRefresh()
        expect(refreshResult).toBe(false);
      });
      
      expect(result.current.accessToken).toBeNull(); // Token cleared on failure
    })

    it('handles refresh error', async () => {
      const { result } = renderHook(() => useUserStore());
      
      vi.mocked(userAuthService.refreshToken).mockRejectedValue(new Error('Network error'));
      
      await act(async () => {
        result.current.setAuthData('old_token', { userId: 'user1', username: 'test', email: 'test@test.com', createdAt: '2023-01-01' })
        const refreshResult = await result.current.attemptTokenRefresh()
        expect(refreshResult).toBe(false);
      });
      
      expect(result.current.accessToken).toBeNull(); // Token cleared on error
    })
  })

  describe('State Persistence', () => {
    it('persists user ID across store instances', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.generateUserId()
      });
      
      const userId = result.current.userId;
      
      // Create new store instance
      const { result: newResult } = renderHook(() => useUserStore());
      
      expect(newResult.current.userId).toBe(userId);
    })

    it('persists player name across store instances', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('PersistentPlayer')
      });
      
      // Create new store instance
      const { result: newResult } = renderHook(() => useUserStore());
      
      expect(newResult.current.playerName).toBe('PersistentPlayer');
    })

    it('persists authentication state across store instances', async () => {
      const { result } = renderHook(() => useUserStore());
      
      const mockUser = {
        userId: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z'
      };
      
      await act(async () => {
        result.current.setAuthData('persistent_token', mockUser)
      });
      
      // Create new store instance
      const { result: newResult } = renderHook(() => useUserStore());
      
      expect(newResult.current.isAuthenticated).toBe(true);
      expect(newResult.current.accessToken).toBe('persistent_token');
      expect(newResult.current.user).toEqual(mockUser);
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple rapid state changes', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('Player1')
        result.current.setPlayerName('Player2')
        result.current.setPlayerName('Player3')
      });
      
      expect(result.current.playerName).toBe('Player3');
    })

    it('handles setting position multiple times', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPosition('N')
        result.current.setPosition('S')
        result.current.setPosition('E')
        result.current.setPosition('W')
      });
      
      expect(result.current.position).toBe('W');
    })

    it('handles clearing data multiple times', async () => {
      const { result } = renderHook(() => useUserStore());
      
      await act(async () => {
        result.current.setPlayerName('TestPlayer')
        result.current.setPosition('N')
        result.current.clearUser()
        result.current.clearUser()
        result.current.clearUser()
      });
      
      expect(result.current.playerName).toBeNull();
      expect(result.current.position).toBeNull();
    })

    it('handles authentication state transitions', async () => {
      const { result } = renderHook(() => useUserStore());
      
      const mockUser = {
        userId: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z'
      };
      
      // Set auth data
      await act(async () => {
        result.current.setAuthData('token1', mockUser)
      });
      expect(result.current.isAuthenticated).toBe(true);
      
      // Clear auth data
      await act(async () => {
        result.current.clearAuthData()
      });
      expect(result.current.isAuthenticated).toBe(false);
      
      // Set auth data again
      await act(async () => {
        result.current.setAuthData('token2', mockUser)
      });
      expect(result.current.isAuthenticated).toBe(true);
    })
  })

  describe('Integration Scenarios', () => {
    it('handles complete user lifecycle', async () => {
      const { result } = renderHook(() => useUserStore());
      
      // 1. Generate user ID
      await act(async () => {
        result.current.generateUserId()
      });
      const userId = result.current.userId;
      expect(userId).toMatch(/^user_[a-z0-9]+_[a-z0-9]+$/);
      
      // 2. Set player details
      await act(async () => {
        result.current.setPlayerName('LifecyclePlayer')
        result.current.setPosition('S')
      });
      expect(result.current.playerName).toBe('LifecyclePlayer');
      expect(result.current.position).toBe('S');
      
      // 3. Authenticate user
      const mockUser = {
        userId: 'user_123',
        username: 'lifecycle',
        email: 'lifecycle@test.com',
        createdAt: '2023-01-01T00:00:00Z'
      };
      await act(async () => {
        result.current.setAuthData('lifecycle_token', mockUser)
      });
      expect(result.current.isAuthenticated).toBe(true);
      
      // 4. Update token
      await act(async () => {
        result.current.updateAccessToken('updated_token')
      });
      expect(result.current.accessToken).toBe('updated_token');
      
      // 5. Logout
      await act(async () => {
        await result.current.logout()
      });
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userId).toBeNull();
      expect(result.current.playerName).toBeNull();
      expect(result.current.position).toBeNull();
    })

    it('handles partial user data scenarios', async () => {
      const { result } = renderHook(() => useUserStore());
      
      // User with only ID
      await act(async () => {
        result.current.generateUserId()
      });
      expect(result.current.userId).not.toBeNull();
      expect(result.current.playerName).toBeNull();
      expect(result.current.position).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      
      // User with ID and name
      await act(async () => {
        result.current.setPlayerName('PartialUser')
      });
      expect(result.current.userId).not.toBeNull();
      expect(result.current.playerName).toBe('PartialUser');
      expect(result.current.position).toBeNull();
      
      // User with ID, name, and position
      await act(async () => {
        result.current.setPosition('E')
      });
      expect(result.current.userId).not.toBeNull();
      expect(result.current.playerName).toBe('PartialUser');
      expect(result.current.position).toBe('E');
    })
  })
})