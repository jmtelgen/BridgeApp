import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomService } from '../../src/services/roomService';
import {
  roomWebSocketService,
  websocketService,
} from '../../src/services/websocketService';
import { useUserStore } from '../../src/stores/userStore';

describe('P1 room operation envelopes', () => {
  beforeEach(() => {
    useUserStore.setState({ userId: 'signed-player' });
    vi.spyOn(websocketService, 'connect').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());
  it('resolves legacy account display-name seats through an authorized snapshot', async () => {
    vi.spyOn(roomWebSocketService, 'createRoom').mockResolvedValue({
      action: 'createRoom', success: true, assignedSeat: 'North',
      room: { roomId: 'account-table', ownerId: 'signed-player', seats: { North: 'Display name' } },
    })
    const snapshot = vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue({
      action: 'gameState', room: { roomId: 'account-table', ownerId: 'signed-player', seats: { North: 'signed-player' } },
    })
    const result = await roomService.createRoom({ roomName: 'Account table', playerName: 'Display name', isPrivate: false, maxPlayers: 4 })
    expect(snapshot).toHaveBeenCalledWith('account-table', 'signed-player')
    expect(result).toMatchObject({ success: true, data: { room: { seats: { North: 'signed-player' } } } })
  })
  it('never infers account membership from a matching display name or assignedSeat', async () => {
    vi.spyOn(roomWebSocketService, 'createRoom').mockResolvedValue({
      action: 'createRoom', success: true, assignedSeat: 'North',
      room: { roomId: 'account-table', ownerId: 'signed-player', seats: { North: 'Display name' } },
    })
    vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue({
      action: 'gameState', room: { roomId: 'account-table', ownerId: 'signed-player', seats: { North: 'someone-else' } },
    })
    expect(await roomService.createRoom({ roomName: 'Account table', playerName: 'Display name', isPrivate: false, maxPlayers: 4 }))
      .toMatchObject({ success: false, error: expect.stringContaining('signed room membership') })
  })
  it('accepts an authoritative membership broadcast without fabricating a success field', async () => {
    const join = vi.spyOn(roomWebSocketService, 'joinRoom').mockResolvedValue({
      action: 'roomUpdated',
      updateType: 'playerJoined',
      room: {
        roomId: 'private-table',
        seats: { North: 'owner', East: 'signed-player' },
      },
    });
    const response = await roomService.joinRoom({
      roomId: 'private-table',
      playerName: 'Player',
      invitationToken: 'invitation-capability',
    });
    expect(response.success).toBe(true);
    expect(join).toHaveBeenCalledWith({
      roomId: 'private-table',
      userId: 'signed-player',
      playerName: 'Player',
      invitationToken: 'invitation-capability',
    });
  });
  it('does not claim membership when a response lacks the signed subject seat', async () => {
    vi.spyOn(roomWebSocketService, 'joinRoom').mockResolvedValue({
      action: 'joinRoom',
      success: true,
      room: { roomId: 'private-table', seats: { North: 'owner' } },
    });
    expect(
      (
        await roomService.joinRoom({
          roomId: 'private-table',
          playerName: 'Player',
        })
      ).success
    ).toBe(false);
  });
  it('uses server-authorized leaveRoom, preserving rejection details', async () => {
    const leave = vi
      .spyOn(roomWebSocketService, 'leaveRoom')
      .mockRejectedValue(new Error('Active board seats cannot leave'));
    const response = await roomService.leaveRoom(
      'private-table',
      'ignored-untrusted-subject'
    );
    expect(leave).toHaveBeenCalledWith('private-table');
    expect(response).toMatchObject({
      success: false,
      error: 'Active board seats cannot leave',
    });
  });
});
