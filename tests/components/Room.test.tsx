import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RoomManager } from '../../src/components/bridge/components/Room'
import { useUserStore } from '../../src/stores/userStore'
import { useRoomDataStore } from '../../src/stores/roomDataStore'
import { useGameStore } from '../../src/stores/gameStore'
import { roomService } from '../../src/services'
import { connectionService } from '../../src/services/connectionService'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

// Mock services
vi.mock('../../src/services', () => ({
  roomService: {
    createRoom: vi.fn(),
    joinRoom: vi.fn()
  }
}))

vi.mock('../../src/services/connectionService', () => ({
  connectionService: {
    getConnectionCount: vi.fn()
  }
}))

// Mock error store
const mockErrors = { showError: vi.fn(), showSuccess: vi.fn() }
vi.mock('../../src/stores/errorStore', () => ({
  useErrorStore: {
    getState: () => mockErrors
  }
}))

// Mock stores
const mockUserStore = {
  playerName: 'TestPlayer',
  setPlayerName: vi.fn(),
  userId: 'user_123'
}

const mockRoomDataStore = {
  setCurrentRoom: vi.fn()
}

const mockGameStore = {
  detectAndSetCurrentPlayerPosition: vi.fn()
}

vi.mock('../../src/stores/userStore', () => ({
  useUserStore: Object.assign(vi.fn(() => mockUserStore), { getState: () => mockUserStore, subscribe: vi.fn(() => () => {}) })
}))

vi.mock('../../src/stores/roomDataStore', () => ({
  useRoomDataStore: vi.fn(() => mockRoomDataStore)
}))

vi.mock('../../src/stores/gameStore', () => ({
  useGameStore: {
    getState: () => mockGameStore
  }
}))

describe('RoomManager', () => {
  const mockOnRoomJoined = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset store mocks to clean state
    Object.assign(mockUserStore, {
      playerName: 'TestPlayer',
      setPlayerName: vi.fn(),
      userId: 'user_123'
    });
    
    Object.assign(mockRoomDataStore, {
      setCurrentRoom: vi.fn()
    });
    
    Object.assign(mockGameStore, {
      detectAndSetCurrentPlayerPosition: vi.fn()
    });
    vi.mocked(connectionService.getConnectionCount).mockResolvedValue({
      success: true, data: { totalConnections: 0, activeUserCount: 0, activeRoomCount: 0 }, error: null
    })
  })

  afterEach(() => {
    vi.useRealTimers();
  })

  const renderComponent = () => {
    return render(<MemoryRouter><RoomManager onRoomJoined={mockOnRoomJoined} /></MemoryRouter>)
  }

  describe('Initial Render', () => {
    it('renders app title and navigation buttons', () => {
      renderComponent()
      
      expect(screen.getByTestId('app-title')).toHaveTextContent('Next Level Bridge')
      expect(screen.getByTestId('login-button')).toBeInTheDocument()
      expect(screen.getByTestId('signup-button')).toBeInTheDocument()
    })

    it('shows create room tab by default', () => {
      renderComponent()
      
      expect(screen.getByTestId('create-room-card')).toBeInTheDocument()
      expect(screen.getByTestId('create-room-title')).toHaveTextContent('Create New Room')
    })

    it('displays connection stats badges', () => {
      renderComponent()
      
      expect(screen.getByTestId('active-players-badge')).toBeInTheDocument()
      expect(screen.getByTestId('active-rooms-badge')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-connections-button')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('switches to join room tab when clicked', () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      expect(screen.getByTestId('join-room-card')).toBeInTheDocument()
      expect(screen.getByTestId('join-room-title')).toHaveTextContent('Join Room')
    })

    it('switches back to create room tab', () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      fireEvent.click(screen.getByTestId('create-room-tab'))
      
      expect(screen.getByTestId('create-room-card')).toBeInTheDocument()
    })
  })

  describe('Create Room Form', () => {
    it('renders create room form fields', () => {
      renderComponent()
      
      expect(screen.getByTestId('create-player-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('create-room-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('private-room-checkbox')).toBeInTheDocument()
      expect(screen.getByTestId('create-room-button')).toBeInTheDocument()
    })

    it('updates form state on input change', () => {
      renderComponent()
      
      const playerNameInput = screen.getByTestId('create-player-name-input')
      const roomNameInput = screen.getByTestId('create-room-name-input')
      
      fireEvent.change(playerNameInput, { target: { value: 'NewPlayer' } })
      fireEvent.change(roomNameInput, { target: { value: 'TestRoom' } })
      
      expect(playerNameInput).toHaveValue('NewPlayer')
      expect(roomNameInput).toHaveValue('TestRoom')
    })

    it('toggles private room checkbox', () => {
      renderComponent()
      
      const checkbox = screen.getByTestId('private-room-checkbox')
      expect(checkbox).not.toBeChecked()
      
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('disables create button when form is incomplete', () => {
      renderComponent()
      
      const createButton = screen.getByTestId('create-room-button')
      expect(createButton).toBeDisabled()
      
      // Fill in only player name
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'Player' } 
      })
      expect(createButton).toBeDisabled()
      
      // Fill in room name
      fireEvent.change(screen.getByTestId('create-room-name-input'), { 
        target: { value: 'Room' } 
      })
      expect(createButton).not.toBeDisabled()
    })
  })

  describe('Join Room Form', () => {
    it('renders join room form fields', () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      expect(screen.getByTestId('join-player-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('join-room-id-input')).toBeInTheDocument()
      expect(screen.getByTestId('join-room-button')).toBeInTheDocument()
    })

    it('updates join form state on input change', () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      const playerNameInput = screen.getByTestId('join-player-name-input')
      const roomIdInput = screen.getByTestId('join-room-id-input')
      
      fireEvent.change(playerNameInput, { target: { value: 'JoinPlayer' } })
      fireEvent.change(roomIdInput, { target: { value: 'ROOM-123' } })
      
      expect(playerNameInput).toHaveValue('JoinPlayer')
      expect(roomIdInput).toHaveValue('ROOM-123')
    })

    it('disables join button when form is incomplete', () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      const joinButton = screen.getByTestId('join-room-button')
      expect(joinButton).toBeDisabled()
      
      // Fill in only player name
      fireEvent.change(screen.getByTestId('join-player-name-input'), { 
        target: { value: 'Player' } 
      })
      expect(joinButton).toBeDisabled()
      
      // Fill in room ID
      fireEvent.change(screen.getByTestId('join-room-id-input'), { 
        target: { value: 'ROOM' } 
      })
      expect(joinButton).not.toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('prevents creating a room with empty fields', async () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('create-room-button'))
      
      expect(screen.getByTestId('create-room-button')).toBeDisabled()
      expect(roomService.createRoom).not.toHaveBeenCalled()
    })

    it('prevents joining a room with empty fields', async () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      fireEvent.click(screen.getByTestId('join-room-button'))
      
      expect(screen.getByTestId('join-room-button')).toBeDisabled()
      expect(roomService.joinRoom).not.toHaveBeenCalled()
    })

    it('prevents computer-table creation without player name', async () => {
      renderComponent()
      fireEvent.change(screen.getByTestId('create-player-name-input'), { target: { value: '' } })
      
      fireEvent.click(screen.getByTestId('quick-join-button'))
      
      expect(screen.getByTestId('quick-join-button')).toBeDisabled()
      expect(roomService.createRoom).not.toHaveBeenCalled()
    })
  })

  describe('Room Creation', () => {
    it('creates room successfully', async () => {
      const mockRoomResponse = {
        success: true,
        data: {
          room: {
            roomId: 'room_123',
            ownerId: 'user_123',
            seats: { 'South': 'user_123' },
            state: 'waiting',
            gameData: null
          }
        }
      }
      
      vi.mocked(roomService.createRoom).mockResolvedValue(mockRoomResponse)
      mockGameStore.detectAndSetCurrentPlayerPosition.mockReturnValue('South')
      
      renderComponent()
      
      // Fill form
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'TestPlayer' } 
      })
      fireEvent.change(screen.getByTestId('create-room-name-input'), { 
        target: { value: 'TestRoom' } 
      })
      
      fireEvent.click(screen.getByTestId('create-room-button'))
      
      await waitFor(() => {
        expect(roomService.createRoom).toHaveBeenCalledWith({
          roomName: 'TestRoom',
          isPrivate: false,
          maxPlayers: 4,
          playerName: 'TestPlayer'
        })
      })
      
      await waitFor(() => {
        expect(mockRoomDataStore.setCurrentRoom).toHaveBeenCalledWith(mockRoomResponse.data.room)
        expect(mockOnRoomJoined).toHaveBeenCalledWith('room_123', 'South')
      })
    })

    it('handles room creation failure', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Room creation failed'
      }
      
      vi.mocked(roomService.createRoom).mockResolvedValue(mockErrorResponse)
      const { showError } = await import('../../src/stores/errorStore').then(m => m.useErrorStore.getState())
      
      renderComponent()
      
      // Fill form
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'TestPlayer' } 
      })
      fireEvent.change(screen.getByTestId('create-room-name-input'), { 
        target: { value: 'TestRoom' } 
      })
      
      fireEvent.click(screen.getByTestId('create-room-button'))
      
      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith('Room creation failed')
      })
    })

    it('handles room creation error', async () => {
      vi.mocked(roomService.createRoom).mockRejectedValue(new Error('Network error'))
      const { showError } = await import('../../src/stores/errorStore').then(m => m.useErrorStore.getState())
      
      renderComponent()
      
      // Fill form
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'TestPlayer' } 
      })
      fireEvent.change(screen.getByTestId('create-room-name-input'), { 
        target: { value: 'TestRoom' } 
      })
      
      fireEvent.click(screen.getByTestId('create-room-button'))
      
      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith('Failed to create room. Please try again.')
      })
    })
  })

  describe('Room Joining', () => {
    it('joins room successfully', async () => {
      const mockJoinResponse = {
        success: true,
        data: {
          room: {
            roomId: 'room_456',
            ownerId: 'user_789',
            seats: { 'North': 'user_123' },
            state: 'waiting',
            gameData: null
          }
        }
      }
      
      vi.mocked(roomService.joinRoom).mockResolvedValue(mockJoinResponse)
      mockGameStore.detectAndSetCurrentPlayerPosition.mockReturnValue('North')
      
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      // Fill form
      fireEvent.change(screen.getByTestId('join-player-name-input'), { 
        target: { value: 'JoinPlayer' } 
      })
      fireEvent.change(screen.getByTestId('join-room-id-input'), { 
        target: { value: 'ROOM-456' } 
      })
      
      fireEvent.click(screen.getByTestId('join-room-button'))
      
      await waitFor(() => {
        expect(roomService.joinRoom).toHaveBeenCalledWith({
          playerName: 'JoinPlayer',
          roomId: 'ROOM-456'
        })
      })
      
      await waitFor(() => {
        expect(mockRoomDataStore.setCurrentRoom).toHaveBeenCalledWith(mockJoinResponse.data.room)
        expect(mockOnRoomJoined).toHaveBeenCalledWith('room_456', 'North')
      })
    })

    it('handles room join failure', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Room not found'
      }
      
      vi.mocked(roomService.joinRoom).mockResolvedValue(mockErrorResponse)
      const { showError } = await import('../../src/stores/errorStore').then(m => m.useErrorStore.getState())
      
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      // Fill form
      fireEvent.change(screen.getByTestId('join-player-name-input'), { 
        target: { value: 'JoinPlayer' } 
      })
      fireEvent.change(screen.getByTestId('join-room-id-input'), { 
        target: { value: 'ROOM-456' } 
      })
      
      fireEvent.click(screen.getByTestId('join-room-button'))
      
      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith('Room not found')
      })
    })
  })

  describe('Quick Join', () => {
    it('creates a real private computer table before navigation', async () => {
      mockGameStore.detectAndSetCurrentPlayerPosition.mockReturnValue('East')
      vi.mocked(roomService.createRoom).mockResolvedValue({
        success: true, error: null, data: { room: { roomId: 'server-room', seats: { East: 'user_123' } } }
      } as any)
      
      renderComponent()
      
      // Fill player name
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'QuickPlayer' } 
      })
      
      fireEvent.click(screen.getByTestId('quick-join-button'))
      
      await waitFor(() => {
        expect(roomService.createRoom).toHaveBeenCalledWith({
          roomName: "QuickPlayer's computer table", playerName: 'QuickPlayer', isPrivate: true, maxPlayers: 4
        })
        expect(mockOnRoomJoined).toHaveBeenCalledWith('server-room', 'East')
      })
    })

    it('handles quick join error', async () => {
      const { showError } = await import('../../src/stores/errorStore').then(m => m.useErrorStore.getState())
      vi.mocked(roomService.createRoom).mockRejectedValue(new Error('Network unavailable'))
      
      // Mock an error during quick join
      vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderComponent()
      
      // Fill player name
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'QuickPlayer' } 
      })
      
      // Simulate an error by throwing in the quick join function
      const quickJoinButton = screen.getByTestId('quick-join-button')
      fireEvent.click(quickJoinButton)
      
      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith('Network unavailable')
        expect(mockOnRoomJoined).not.toHaveBeenCalled()
      })
    })
  })

  describe('Connection Stats', () => {
    it('fetches connection count on mount', async () => {
      const mockConnectionResponse = {
        success: true,
        data: {
          totalConnections: 150,
          activeUserCount: 45,
          activeRoomCount: 12
        }
      }
      
      vi.mocked(connectionService.getConnectionCount).mockResolvedValue(mockConnectionResponse)
      
      renderComponent()
      await waitFor(() => expect(screen.getByTestId('refresh-connections-button')).not.toBeDisabled())
      
      await waitFor(() => {
        expect(connectionService.getConnectionCount).toHaveBeenCalled()
      })
      
      expect(screen.getByTestId('active-players-badge')).toHaveTextContent('45 Active Players')
      expect(screen.getByTestId('active-rooms-badge')).toHaveTextContent('12 Active Rooms')
    })

    it('refreshes connection count on button click', async () => {
      const mockConnectionResponse = {
        success: true,
        data: {
          totalConnections: 200,
          activeUserCount: 60,
          activeRoomCount: 15
        }
      }
      
      vi.mocked(connectionService.getConnectionCount).mockResolvedValue(mockConnectionResponse)
      
      renderComponent()
      
      const refreshButton = screen.getByTestId('refresh-connections-button')
      await waitFor(() => expect(refreshButton).not.toBeDisabled())
      fireEvent.click(refreshButton)
      
      await waitFor(() => {
        expect(connectionService.getConnectionCount).toHaveBeenCalledTimes(2) // Once on mount, once on click
      })
    })

    it('handles connection count fetch error gracefully', async () => {
      vi.mocked(connectionService.getConnectionCount).mockRejectedValue(new Error('Network error'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByTestId('refresh-connections-button')).not.toBeDisabled()
      })
    })
  })

  describe('Player Name Persistence', () => {
    it('updates stored player name on blur for create form', () => {
      renderComponent()
      
      const playerNameInput = screen.getByTestId('create-player-name-input')
      fireEvent.change(playerNameInput, { target: { value: 'NewPlayerName' } })
      fireEvent.blur(playerNameInput)
      
      expect(mockUserStore.setPlayerName).toHaveBeenCalledWith('NewPlayerName')
    })

    it('updates stored player name on blur for join form', () => {
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      const playerNameInput = screen.getByTestId('join-player-name-input')
      fireEvent.change(playerNameInput, { target: { value: 'JoinPlayerName' } })
      fireEvent.blur(playerNameInput)
      
      expect(mockUserStore.setPlayerName).toHaveBeenCalledWith('JoinPlayerName')
    })

    it('does not update stored name if unchanged', () => {
      renderComponent()
      
      const playerNameInput = screen.getByTestId('create-player-name-input')
      fireEvent.blur(playerNameInput)
      
      expect(mockUserStore.setPlayerName).not.toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('shows loading state during room creation', async () => {
      vi.mocked(roomService.createRoom).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: { room: {} } }), 100))
      )
      
      renderComponent()
      
      // Fill form
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'TestPlayer' } 
      })
      fireEvent.change(screen.getByTestId('create-room-name-input'), { 
        target: { value: 'TestRoom' } 
      })
      
      fireEvent.click(screen.getByTestId('create-room-button'))
      
      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(screen.getByTestId('create-room-button')).toBeDisabled()
    })

    it('shows loading state during room joining', async () => {
      vi.mocked(roomService.joinRoom).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: { room: {} } }), 100))
      )
      
      renderComponent()
      
      fireEvent.click(screen.getByTestId('join-room-tab'))
      
      // Fill form
      fireEvent.change(screen.getByTestId('join-player-name-input'), { 
        target: { value: 'JoinPlayer' } 
      })
      fireEvent.change(screen.getByTestId('join-room-id-input'), { 
        target: { value: 'ROOM-123' } 
      })
      
      fireEvent.click(screen.getByTestId('join-room-button'))
      
      expect(screen.getByText('Joining...')).toBeInTheDocument()
      expect(screen.getByTestId('join-room-button')).toBeDisabled()
    })

    it('shows loading state during quick join', async () => {
      renderComponent()
      
      // Fill player name
      fireEvent.change(screen.getByTestId('create-player-name-input'), { 
        target: { value: 'QuickPlayer' } 
      })
      
      fireEvent.click(screen.getByTestId('quick-join-button'))
      
      expect(screen.getByText('Creating computer table...')).toBeInTheDocument()
      expect(screen.getByTestId('quick-join-button')).toBeDisabled()
    })
  })

  describe('Modern entry accessibility and feedback', () => {
    it('provides a readable hero, named room choices and explicit field labels', () => {
      renderComponent()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good company.Great hands.')
      expect(screen.getByRole('group', { name: 'Choose how to play' })).toBeInTheDocument()
      expect(screen.getByTestId('create-room-tab')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('join-room-tab')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByLabelText('Room name')).toBeRequired()
      expect(screen.getByLabelText('Your name for a new room')).toBeRequired()
      expect(screen.getByRole('button', { name: 'Refresh room activity' })).toBeInTheDocument()
      expect(screen.getByText('No account needed to play as a guest.')).toBeInTheDocument()
    })

    it('preserves both drafts when changing room choices', () => {
      renderComponent()
      fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Sunday table' } })
      fireEvent.click(screen.getByTestId('join-room-tab'))
      fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'case-Sensitive-code' } })
      fireEvent.click(screen.getByTestId('create-room-tab'))
      expect(screen.getByLabelText('Room name')).toHaveValue('Sunday table')
      fireEvent.click(screen.getByTestId('join-room-tab'))
      expect(screen.getByLabelText('Room code')).toHaveValue('case-Sensitive-code')
      expect(screen.getByTestId('join-room-tab')).toHaveAttribute('aria-pressed', 'true')
    })

    it('submits a private room by keyboard and preserves trimmed payload and server seating', async () => {
      const user = userEvent.setup()
      mockGameStore.detectAndSetCurrentPlayerPosition.mockReturnValue('South')
      vi.mocked(roomService.createRoom).mockResolvedValue({
        success: true, data: { room: { roomId: 'keyboard-table', seats: { South: 'user_123' } } }
      } as any)
      renderComponent()
      fireEvent.change(screen.getByTestId('create-player-name-input'), { target: { value: '  Host  ' } })
      await user.type(screen.getByLabelText('Room name'), '  Keyboard table  ')
      await user.click(screen.getByLabelText('Private Room'))
      screen.getByLabelText('Room name').focus()
      await user.keyboard('{Enter}')
      await waitFor(() => expect(mockOnRoomJoined).toHaveBeenCalledWith('keyboard-table', 'South'))
      expect(roomService.createRoom).toHaveBeenCalledWith({
        roomName: 'Keyboard table', playerName: 'Host', isPrivate: true, maxPlayers: 4
      })
    })

    it('shows failures inline, retains the draft and allows a retry', async () => {
      vi.mocked(roomService.createRoom).mockResolvedValue({ success: false, error: 'Connection unavailable. Try again.' })
      renderComponent()
      fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Retained table' } })
      fireEvent.click(screen.getByTestId('create-room-button'))
      expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable. Try again.')
      expect(screen.getByLabelText('Room name')).toHaveValue('Retained table')
      expect(screen.getByTestId('create-room-button')).toBeEnabled()
      expect(mockOnRoomJoined).not.toHaveBeenCalled()
      fireEvent.click(screen.getByTestId('join-room-tab'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('locks the form and alternative actions while awaiting a real server response', async () => {
      let finish!: (value: any) => void
      vi.mocked(roomService.createRoom).mockImplementation(() => new Promise(resolve => { finish = resolve }))
      renderComponent()
      fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Pending table' } })
      fireEvent.click(screen.getByTestId('create-room-button'))
      expect(screen.getByRole('form', { name: 'Create room' })).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByLabelText('Room name')).toBeDisabled()
      expect(screen.getByTestId('join-room-tab')).toBeDisabled()
      expect(screen.getByTestId('quick-join-button')).toBeDisabled()
      expect(screen.getByText('Connecting to your table. Please wait…')).toHaveAttribute('role', 'status')
      expect(roomService.createRoom).toHaveBeenCalledTimes(1)
      finish({ success: false, error: 'Request failed' })
      await screen.findByRole('alert')
      expect(screen.getByTestId('join-room-tab')).toBeEnabled()
    })

    it('reports unavailable activity honestly without disabling room creation', async () => {
      vi.mocked(connectionService.getConnectionCount).mockResolvedValue({ success: false, error: 'Offline' })
      renderComponent()
      expect(await screen.findByText('Players unavailable')).toBeInTheDocument()
      expect(screen.getByText('Rooms unavailable')).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Still available' } })
      expect(screen.getByTestId('create-room-button')).toBeEnabled()
    })

    it.each([['login-button', '/login'], ['signup-button', '/create-account']])('retains %s navigation', async (testId, path) => {
      const user = userEvent.setup()
      render(<MemoryRouter><Routes>
        <Route path="/" element={<RoomManager onRoomJoined={mockOnRoomJoined} />} />
        <Route path={path} element={<h1>Account destination</h1>} />
      </Routes></MemoryRouter>)
      expect(screen.getByTestId(testId)).toHaveAttribute('href', path)
      await user.click(screen.getByTestId(testId))
      expect(screen.getByRole('heading', { name: 'Account destination' })).toBeInTheDocument()
    })
  })
})
