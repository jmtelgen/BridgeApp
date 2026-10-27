import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../../src/stores/gameStore'
import { act } from 'react'

describe('gameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the entire store state before each test
    useGameStore.setState({
      gameData: {
        phase: 'bidding',
        currentPlayer: 'North',
        dealer: 'North',
        bids: [],
        hands: {
          North: [],
          East: [],
          South: [],
          West: []
        },
        currentTrick: {
          cards: { North: null, East: null, South: null, West: null },
          winner: null,
          ledSuit: null,
          trickLeader: null
        },
        tricks: [],
        previousTrick: null,
        contract: null,
        dummy: null,
        firstCardPlayed: false,
        gameNumber: 1,
        vulnerability: { NS: false, EW: false }
      },
      selectedCard: null,
      aiThinking: false,
      currentPlayerPosition: 'North'
    });
  })

  describe('Initial State', () => {
    it('should have correct initial state', async () => {
      const { result } = renderHook(() => useGameStore());

      expect(result.current.gameData.phase).toBe('bidding');
      expect(result.current.gameData.currentPlayer).toBe('North');
      expect(result.current.gameData.dealer).toBe('North');
      expect(result.current.gameData.bids).toEqual([]);
      expect(result.current.gameData.hands).toEqual({
        North: [],
        East: [],
        South: [],
        West: []
      });
      expect(result.current.gameData.currentTrick).toEqual({
        cards: { North: null, East: null, South: null, West: null },
        winner: null,
        ledSuit: null,
        trickLeader: null
      });
      expect(result.current.gameData.tricks).toEqual([]);
      expect(result.current.gameData.contract).toBeNull();
      expect(result.current.selectedCard).toBeNull();
      expect(result.current.aiThinking).toBe(false);
      expect(result.current.currentPlayerPosition).toBe('North');
    })
  })

  describe('startNewGame', () => {
    it('should initialize a new game', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.startNewGame()
      });

      expect(result.current.gameData.phase).toBe('setup');
      expect(result.current.gameData.currentPlayer).toBe('North');
      expect(result.current.gameData.dealer).toBe('North');
      expect(result.current.gameData.bids).toEqual([]);
      expect(result.current.gameData.tricks).toEqual([]);
      expect(result.current.gameData.contract).toBeNull();
      expect(result.current.selectedCard).toBeNull();
      expect(result.current.aiThinking).toBe(false);
      expect(result.current.currentPlayerPosition).toBe('North');
    })
  })

  describe('updateGameData', () => {
    it('should update game data', async () => {
      const { result } = renderHook(() => useGameStore());

      const newGameData = {
        phase: 'playing' as const,
        currentPlayer: 'South' as const,
        dealer: 'North' as const,
        bids: [],
        hands: {
          North: [],
          East: [],
          South: [],
          West: []
        },
        currentTrick: {
          cards: { North: null, East: null, South: null, West: null },
          winner: null,
          ledSuit: null,
          trickLeader: null
        },
        tricks: [],
        previousTrick: null,
        contract: null,
        dummy: null,
        firstCardPlayed: false,
        gameNumber: 1,
        vulnerability: { NS: false, EW: false }
      };

      await act(async () => {
        result.current.updateGameData(newGameData)
      });

      expect(result.current.gameData.phase).toBe('playing');
      expect(result.current.gameData.currentPlayer).toBe('South');
    })
  })

  describe('setSelectedCard', () => {
    it('should set the selected card', async () => {
      const { result } = renderHook(() => useGameStore());

      const card = { suit: '♠' as const, rank: 'A' as const, value: 14 };

      await act(async () => {
        result.current.setSelectedCard(card)
      });

      expect(result.current.selectedCard).toEqual(card);
    })

    it('should clear selected card when set to null', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setSelectedCard(null)
      });

      expect(result.current.selectedCard).toBeNull();
    })
  })

  describe('setAiThinking', () => {
    it('should set AI thinking state', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setAiThinking(true)
      });

      expect(result.current.aiThinking).toBe(true);

      await act(async () => {
        result.current.setAiThinking(false)
      });

      expect(result.current.aiThinking).toBe(false);
    })
  })

  describe('setCurrentPlayerPosition', () => {
    it('should set the current player position', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setCurrentPlayerPosition('South')
      });

      expect(result.current.currentPlayerPosition).toBe('South');
    })
  })

  describe('getCurrentPlayerPosition', () => {
    it('should return the current player position', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setCurrentPlayerPosition('West')
      });

      expect(result.current.getCurrentPlayerPosition()).toBe('West');
    })
  })

  describe('detectAndSetCurrentPlayerPosition', () => {
    it('should detect and set current player position from seats', async () => {
      const { result } = renderHook(() => useGameStore());

      const seats = {
        'South': 'user_123',
        'North': 'user_456',
        'East': 'user_789',
        'West': 'user_012'
      };

      await act(async () => {
        const position = result.current.detectAndSetCurrentPlayerPosition(seats, 'user_123')
        expect(position).toBe('South');
      });

      expect(result.current.currentPlayerPosition).toBe('South');
    })
  })

  describe('State Persistence', () => {
    it('persists game data across store instances', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.updateGameData({
          ...result.current.gameData,
          phase: 'playing',
          currentPlayer: 'South'
        });
        result.current.setSelectedCard({ suit: '♠', rank: 'A', value: 14 });
      });

      // Create new store instance
      const { result: newResult } = renderHook(() => useGameStore());

      expect(newResult.current.gameData.phase).toBe('playing');
      expect(newResult.current.gameData.currentPlayer).toBe('South');
      expect(newResult.current.selectedCard).toEqual({ suit: '♠', rank: 'A', value: 14 });
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple rapid state changes', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setCurrentPlayerPosition('North')
        result.current.setCurrentPlayerPosition('South')
        result.current.setCurrentPlayerPosition('East')
      });

      expect(result.current.currentPlayerPosition).toBe('East');
    })

    it('handles setting selected card multiple times', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setSelectedCard({ suit: '♠', rank: 'A', value: 14 })
        result.current.setSelectedCard({ suit: '♥', rank: 'K', value: 13 })
        result.current.setSelectedCard({ suit: '♦', rank: 'Q', value: 12 })
      });

      expect(result.current.selectedCard).toEqual({ suit: '♦', rank: 'Q', value: 12 });
    })

    it('handles AI thinking state changes', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        result.current.setAiThinking(true)
        result.current.setAiThinking(false)
        result.current.setAiThinking(true)
      });

      expect(result.current.aiThinking).toBe(true);
    })
  })

  describe('Integration Scenarios', () => {
    it('handles complete game setup and state changes', async () => {
      const { result } = renderHook(() => useGameStore());

      // 1. Start new game
      await act(async () => {
        result.current.startNewGame()
      });
      expect(result.current.gameData.phase).toBe('setup');

      // 2. Set current player position
      await act(async () => {
        result.current.setCurrentPlayerPosition('South')
      });

      // 3. Update game data to playing phase
      await act(async () => {
        result.current.updateGameData({
          ...result.current.gameData,
          phase: 'playing',
          currentPlayer: 'South'
        });
      });

      // 4. Set selected card
      await act(async () => {
        result.current.setSelectedCard({ suit: '♠', rank: 'A', value: 14 })
      });

      // 5. Set AI thinking
      await act(async () => {
        result.current.setAiThinking(true)
      });

      // Verify final state
      expect(result.current.gameData.phase).toBe('playing');
      expect(result.current.gameData.currentPlayer).toBe('South');
      expect(result.current.currentPlayerPosition).toBe('South');
      expect(result.current.selectedCard).toEqual({ suit: '♠', rank: 'A', value: 14 });
      expect(result.current.aiThinking).toBe(true);
    })
  })
})
