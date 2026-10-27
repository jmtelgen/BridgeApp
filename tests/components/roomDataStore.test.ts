import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRoomDataStore } from '../../src/stores/roomDataStore'
import { act } from 'react'

// Mock user store
vi.mock('../../src/stores/userStore', () => ({
  useUserStore: {
    subscribe: vi.fn(() => () => {}),
    getState: () => ({
      userId: 'user_123',
      playerName: 'TestPlayer'
    })
  }
}))

describe('roomDataStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the entire store state before each test
    useRoomDataStore.setState({
      currentRoom: null
    });
  })

  describe('Initial State', () => {
    it('should have correct initial state', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      expect(result.current.currentRoom).toBeNull();
    })
  })

  describe('setCurrentRoom', () => {
    it('should set current room', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.currentRoom).toEqual({ ...mockRoom, gameData: null });
    })

    it('should overwrite existing current room', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const room1 = {
        roomId: 'room_1',
        ownerId: 'user_1',
        playerName: 'Player1',
        roomName: 'Room 1',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };
      const room2 = {
        roomId: 'room_2',
        ownerId: 'user_2',
        playerName: 'Player2',
        roomName: 'Room 2',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(room1)
        result.current.setCurrentRoom(room2)
      });

      expect(result.current.currentRoom).toEqual({ ...room2, gameData: null });
    })
  })

  describe('updateCurrentRoom', () => {
    it('should update current room with partial data', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
        result.current.updateCurrentRoom({ state: 'playing', isPrivate: true })
      });

      expect(result.current.currentRoom?.state).toBe('playing');
      expect(result.current.currentRoom?.isPrivate).toBe(true);
      expect(result.current.currentRoom?.roomId).toBe('room_123'); // Other properties unchanged
    })

    it('should do nothing when no current room exists', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      await act(async () => {
        result.current.updateCurrentRoom({ state: 'playing' })
      });

      expect(result.current.currentRoom).toBeNull();
    })
  })

  describe('clearCurrentRoom', () => {
    it('should clear current room', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
        result.current.clearCurrentRoom()
      });

      expect(result.current.currentRoom).toBeNull();
    })
  })

  describe('getPlayerName', () => {
    it('should return player name for valid seat', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerName('South')).toBe('user_123');
      expect(result.current.getPlayerName('North')).toBe('user_456');
    })

    it('should return null for invalid seat', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerName('East')).toBeNull();
      expect(result.current.getPlayerName('West')).toBeNull();
    })

    it('should return null when no current room', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      expect(result.current.getPlayerName('South')).toBeNull();
    })
  })

  describe('getPlayerDisplayName', () => {
    it('should return player name for current user', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerDisplayName('South')).toBe('TestPlayer');
    })

    it('should return "Empty Seat" for unoccupied positions', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerDisplayName('East')).toBe('Empty Seat');
      expect(result.current.getPlayerDisplayName('West')).toBe('Empty Seat');
    })

    it('should format player IDs for other users', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerDisplayName('North')).toBe('Player 456');
      expect(result.current.getPlayerDisplayName('East')).toBe('Player 789');
      expect(result.current.getPlayerDisplayName('West')).toBe('Player 012');
    })

    it('should display robot names correctly', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'ROBOT_1', 'East': 'ROBOT_2', 'West': 'user_456' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerDisplayName('North')).toBe('ROBOT_1');
      expect(result.current.getPlayerDisplayName('East')).toBe('ROBOT_2');
      expect(result.current.getPlayerDisplayName('West')).toBe('Player 456');
    })

    it('should truncate long player IDs', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'player_abcdefghijklmnop', 'East': 'user_789' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getPlayerDisplayName('North')).toBe('player_ab...');
    })

    it('should return "Unknown Player" when no current room', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      expect(result.current.getPlayerDisplayName('South')).toBe('Unknown Player');
    })
  })

  describe('getEastPlayerName', () => {
    it('should return east player name', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getEastPlayerName('South')).toBe('user_789');
      expect(result.current.getEastPlayerName('North')).toBe('user_012');
      expect(result.current.getEastPlayerName('East')).toBe('user_123');
      expect(result.current.getEastPlayerName('West')).toBe('user_456');
    })
  })

  describe('getWestPlayerName', () => {
    it('should return west player name', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getWestPlayerName('South')).toBe('user_012');
      expect(result.current.getWestPlayerName('North')).toBe('user_789');
      expect(result.current.getWestPlayerName('East')).toBe('user_456');
      expect(result.current.getWestPlayerName('West')).toBe('user_123');
    })
  })

  describe('getNorthPlayerName', () => {
    it('should return north player name', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getNorthPlayerName('South')).toBe('user_456');
      expect(result.current.getNorthPlayerName('North')).toBe('user_123');
      expect(result.current.getNorthPlayerName('East')).toBe('user_012');
      expect(result.current.getNorthPlayerName('West')).toBe('user_789');
    })
  })

  describe('getDisplayPositionLabel', () => {
    it('should return correct position labels', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      expect(result.current.getDisplayPositionLabel('South', 'South')).toBe('South');
      expect(result.current.getDisplayPositionLabel('North', 'North')).toBe('North');
      expect(result.current.getDisplayPositionLabel('East', 'East')).toBe('East');
      expect(result.current.getDisplayPositionLabel('West', 'West')).toBe('West');
    })
  })

  describe('isRobot', () => {
    it('should identify robot players', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      // Test new ROBOT_X format
      expect(result.current.isRobot('ROBOT_1')).toBe(true);
      expect(result.current.isRobot('ROBOT_2')).toBe(true);
      expect(result.current.isRobot('ROBOT_10')).toBe(true);
      
      // Test legacy formats
      expect(result.current.isRobot('robot_1')).toBe(true);
      expect(result.current.isRobot('robot_ai_123')).toBe(true);
      expect(result.current.isRobot('AI_Player')).toBe(true);
      expect(result.current.isRobot('bot_123')).toBe(true);
      
      // Test non-robot players
      expect(result.current.isRobot('user_123')).toBe(false);
      expect(result.current.isRobot('player_456')).toBe(false);
      expect(result.current.isRobot('human_player')).toBe(false);
    })
  })

  describe('getRobotDisplayInfo', () => {
    it('should return robot info for robot players', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'ROBOT_1', 'East': 'ROBOT_2', 'West': 'user_456' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getRobotDisplayInfo('North')).toEqual({ isRobot: true, robotName: 'ROBOT_1' });
      expect(result.current.getRobotDisplayInfo('East')).toEqual({ isRobot: true, robotName: 'ROBOT_2' });
      expect(result.current.getRobotDisplayInfo('South')).toEqual({ isRobot: false, robotName: null });
      expect(result.current.getRobotDisplayInfo('West')).toEqual({ isRobot: false, robotName: null });
    })

    it('should handle empty seats', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      expect(result.current.getRobotDisplayInfo('North')).toEqual({ isRobot: false, robotName: null });
      expect(result.current.getRobotDisplayInfo('East')).toEqual({ isRobot: false, robotName: null });
    })

    it('should handle no current room', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      expect(result.current.getRobotDisplayInfo('South')).toEqual({ isRobot: false, robotName: null });
    })
  })

  describe('State Persistence', () => {
    it('persists room data across store instances', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const mockRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(mockRoom)
      });

      // Create new store instance
      const { result: newResult } = renderHook(() => useRoomDataStore());

      expect(newResult.current.currentRoom).toEqual({ ...mockRoom, gameData: null });
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple rapid state changes', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const room1 = {
        roomId: 'room_1',
        ownerId: 'user_1',
        playerName: 'Player1',
        roomName: 'Room 1',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };
      const room2 = {
        roomId: 'room_2',
        ownerId: 'user_2',
        playerName: 'Player2',
        roomName: 'Room 2',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };
      const room3 = {
        roomId: 'room_3',
        ownerId: 'user_3',
        playerName: 'Player3',
        roomName: 'Room 3',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(room1)
        result.current.setCurrentRoom(room2)
        result.current.setCurrentRoom(room3)
      });

      expect(result.current.currentRoom).toEqual({ ...room3, gameData: null });
    })

    it('handles room with no seats', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const emptyRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: {},
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(emptyRoom)
      });

      expect(result.current.getPlayerName('South')).toBeNull();
      expect(result.current.getPlayerDisplayName('South')).toBe('Empty Seat');
    })

    it('handles room with partial seats', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      const partialRoom = {
        roomId: 'room_123',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Test Room',
        isPrivate: false,
        seats: { 'South': 'user_123' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };

      await act(async () => {
        result.current.setCurrentRoom(partialRoom)
      });

      expect(result.current.getPlayerName('South')).toBe('user_123');
      expect(result.current.getPlayerName('North')).toBeNull();
      expect(result.current.getPlayerDisplayName('South')).toBe('TestPlayer');
      expect(result.current.getPlayerDisplayName('North')).toBe('Empty Seat');
    })
  })

  describe('Integration Scenarios', () => {
    it('handles complete room lifecycle', async () => {
      const { result } = renderHook(() => useRoomDataStore());

      // 1. Initial state
      expect(result.current.currentRoom).toBeNull();

      // 2. Set current room
      const currentRoom = {
        roomId: 'room_1',
        ownerId: 'user_123',
        playerName: 'TestPlayer',
        roomName: 'Room 1',
        isPrivate: false,
        seats: { 'South': 'user_123', 'North': 'user_456', 'East': 'user_789', 'West': 'user_012' },
        state: 'waiting',
        gameData: {
          currentPhase: 'waiting',
          turn: 'South',
          bids: [],
          hands: { North: [], East: [], South: [], West: [] },
          tricks: []
        }
      };
      await act(async () => {
        result.current.setCurrentRoom(currentRoom)
      });
      expect(result.current.currentRoom).toEqual({ ...currentRoom, gameData: null });

      // 3. Test player name resolution
      expect(result.current.getPlayerDisplayName('South')).toBe('TestPlayer');
      expect(result.current.getPlayerDisplayName('North')).toBe('Player 456');
      expect(result.current.getPlayerDisplayName('East')).toBe('Player 789');
      expect(result.current.getPlayerDisplayName('West')).toBe('Player 012');

      // 3.5. Test robot detection
      expect(result.current.isRobot('user_456')).toBe(false);
      expect(result.current.isRobot('ROBOT_1')).toBe(true);

      // 4. Update room state
      await act(async () => {
        result.current.updateCurrentRoom({ state: 'playing' })
      });
      expect(result.current.currentRoom?.state).toBe('playing');

      // 5. Clear current room
      await act(async () => {
        result.current.clearCurrentRoom()
      });
      expect(result.current.currentRoom).toBeNull();
    })
  })
})
