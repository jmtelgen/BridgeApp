import { useEffect, useState } from 'react';
import { useRoomDataStore } from '../../../stores/roomDataStore';
import { useUserStore } from '../../../stores/userStore';
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore';
import {
  PracticeSpeed,
  practicePaces,
  usePreferencesStore,
} from '../../../stores/preferencesStore';
import { featureRequest } from '../../../services/boardFeaturesService';
import {
  roomWebSocketService,
  websocketService,
} from '../../../services/websocketService';
import { applyRoomMessage } from '../../../hooks/useWebSocketMessages';
import { PlayerPreferences } from './PlayerPreferences';
import { BoardReplay } from './BoardReplay';
import { ConventionCard } from './ConventionCard';
import { useGameStore } from '../../../stores/gameStore';
import { GuidedPractice } from './GuidedPractice';
import { DuplicateTables } from './DuplicateTables';

export function RoomFeatures({ onLeave }: { onLeave: () => void }) {
  const room = useRoomDataStore((state) => state.currentRoom);
  const userId = useUserStore((state) => state.userId);
  const phase = useGameStore((state) => state.gameData.phase);
  const features = useRoomFeaturesStore((state) =>
    state.roomId === room?.roomId ? state.board : undefined
  );
  const { practiceSpeed, setPracticeSpeed } = usePreferencesStore();
  const [panel, setPanel] = useState<'replay' | 'convention'>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<{
    invitationId: string;
    invitationToken: string;
    expiresAt: number;
  }>();
  const [shareStatus, setShareStatus] = useState('');
  const [expiresInSeconds, setExpiresInSeconds] = useState(3600);
  const [revokeId, setRevokeId] = useState('');
  useEffect(() => {
    if (!room?.presence || !userId) return;
    const deadlines = Object.values(room.presence)
      .filter((value) => value.status === 'reconnecting' && value.reservedUntil)
      .map((value) => value.reservedUntil! * 1000);
    if (!deadlines.length) return;
    const timer = setTimeout(() => {
      roomWebSocketService
        .getGameState(room.roomId, userId)
        .then((data) => applyRoomMessage(data, room.roomId))
        .catch((error) => setError(error.message));
    }, Math.max(100, Math.min(...deadlines) - Date.now() + 100));
    return () => clearTimeout(timer);
  }, [room?.presence, room?.roomId, userId]);
  if (!room) return null;
  const owner = room.ownerId === userId;
  const eventBound = !!room.eventId || !!features?.eventId;
  const humans = Object.entries(room.seats).filter(
    ([, id]) => id && !id.toUpperCase().startsWith('ROBOT_')
  );
  const soloOwner = owner && humans.length === 1;
  const soloPractice =
    soloOwner &&
    !room.eventId &&
    !features?.eventId &&
    phase !== 'setup' &&
    Object.values(room.seats).filter((id) =>
      id?.toUpperCase().startsWith('ROBOT_')
    ).length === 3;
  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError('');
    try {
      await operation();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Server operation failed.'
      );
    } finally {
      setPending(false);
    }
  };
  const mutate = (
    action: string,
    updateType: string,
    values: Record<string, unknown>
  ) =>
    run(async () => {
      const data = await websocketService.request(
        { action, data: { roomId: room.roomId, ...values } },
        ['roomUpdated'],
        (response) =>
          (!response.roomId || response.roomId === room.roomId) &&
          (!response.room?.roomId || response.room.roomId === room.roomId) &&
          (response.action === 'error' || response.updateType === updateType)
      );
      applyRoomMessage(data, room.roomId);
    });
  const share = () =>
    run(async () => {
      let invitation = invite;
      if (
        room.isPrivate &&
        (!invitation || invitation.expiresAt * 1000 <= Date.now())
      ) {
        const response = await featureRequest(
          room.roomId,
          'createInvitation',
          'roomInvitation',
          { expiresInSeconds }
        );
        if (
          typeof response.invitationToken !== 'string' ||
          !response.invitationId ||
          !response.expiresAt
        )
          throw new Error(
            'The server did not return a valid private invitation.'
          );
        invitation = {
          invitationId: response.invitationId,
          invitationToken: response.invitationToken,
          expiresAt: response.expiresAt,
        };
        setInvite(invitation);
        setRevokeId(invitation.invitationId);
      }
      const url = new URL(
        `/room/${encodeURIComponent(room.roomId)}`,
        window.location.origin
      );
      if (invitation)
        url.hash = new URLSearchParams({
          roomId: room.roomId,
          invitationToken: invitation.invitationToken,
        }).toString();
      setShareStatus(url.toString());
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url.toString());
          setShareStatus(`Copied invitation: ${url}`);
        } catch {
          setShareStatus(`Clipboard unavailable. Copy invitation: ${url}`);
        }
      }
    });
  const setPace = (speed: PracticeSpeed) =>
    run(async () => {
      const response = await featureRequest(
        room.roomId,
        'setPracticePace',
        'practicePaceChanged',
        {
          revision: features?.revision,
          practiceMode: true,
          ...practicePaces[speed],
        }
      );
      applyRoomMessage(response, room.roomId);
      setPracticeSpeed(speed);
    });
  return (
    <aside className="room-features" aria-label="Room tools">
      <div className="feature-toolbar">
        <button
          className="room-button secondary"
          onClick={() => setPanel('replay')}
        >
          Completed boards
        </button>
        <button
          className="room-button secondary"
          onClick={() => setPanel('convention')}
        >
          Convention card
        </button>
        <PlayerPreferences />
      </div>
      <details className="room-controls">
        <summary>Room membership and access</summary>
        <p>
          {room.isPrivate
            ? 'Private room · invitation required'
            : 'Public room'}{' '}
          ·{' '}
          {room.locked == null
            ? 'Lock status unavailable'
            : room.locked
            ? 'Locked to new members'
            : 'Unlocked'}
        </p>
        <p>
          Disconnect preserves your seat for 120 seconds. Return with the same
          signed identity to reclaim it; another tab keeps you online.
          Replacement is never automatic.
        </p>
        {owner && (
          <>
            {room.isPrivate && <label>New invitation lifetime
              <select value={expiresInSeconds} disabled={pending} onChange={(event) => {
                setExpiresInSeconds(Number(event.target.value));
                setInvite(undefined);
              }}>
                <option value={60}>1 minute</option>
                <option value={900}>15 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={86400}>24 hours</option>
              </select>
            </label>}
            <button
              className="room-button secondary"
              disabled={pending || room.locked == null}
              onClick={() =>
                void mutate('setRoomLock', 'roomLockChanged', {
                  locked: !room.locked,
                })
              }
            >
              {room.locked ? 'Unlock room' : 'Lock room'}
            </button>
            <button
              className="room-button secondary"
              disabled={pending || room.locked === true || eventBound}
              onClick={() => void share()}
            >
              {room.isPrivate
                ? 'Create / copy private invitation'
                : 'Copy room invitation'}
            </button>
            {invite && (
              <p>Invitation ID: {invite.invitationId} · Expires {new Date(invite.expiresAt * 1000).toLocaleString()}. Expiry is enforced by the server.</p>
            )}
            {room.isPrivate && <label>Invitation ID to revoke
              <input value={revokeId} onChange={(event) => setRevokeId(event.target.value)} maxLength={100} autoComplete="off" />
            </label>}
            {(invite || (room.isPrivate && revokeId.trim())) && (
              <button
                className="room-button secondary"
                disabled={pending || !revokeId.trim()}
                onClick={() =>
                  void run(async () => {
                    await websocketService.request(
                      {
                        action: 'revokeInvitation',
                        data: {
                          roomId: room.roomId,
                          invitationId: revokeId.trim(),
                        },
                      },
                      ['roomUpdated'],
                      (response) =>
                        (!response.roomId || response.roomId === room.roomId) &&
                        (!response.room?.roomId ||
                          response.room.roomId === room.roomId) &&
                        (response.action === 'error' ||
                          response.updateType === 'invitationRevoked')
                    );
                    setInvite(undefined);
                    setRevokeId('');
                    setShareStatus('Invitation revoked by server.');
                  })
                }
              >
                Revoke this invitation
              </button>
            )}
            {room.isPrivate && <small>Save invitation IDs to revoke older links. The server does not expose an invitation directory; changing lifetime creates a new link without revoking previous links. Revocation does not eject seated players.</small>}
            {shareStatus && (
              <p role="status" className="invite-link">
                {shareStatus}
              </p>
            )}
            {phase === 'setup' && !eventBound &&
              humans
                .filter(([, id]) => id !== userId)
                .map(([seat, id]) => (
                  <button
                    className="room-button secondary"
                    key={seat}
                    disabled={pending}
                    onClick={() =>
                      void mutate('transferOwnership', 'ownershipTransferred', {
                        newOwnerId: id,
                      })
                    }
                  >
                    Make {seat} owner
                  </button>
                ))}
            {Object.entries(room.presence || {})
              .filter(([, value]) => !eventBound && value.status === 'offline')
              .map(([seat]) => (
                <button
                  className="room-button secondary"
                  key={seat}
                  disabled={pending}
                  onClick={() =>
                    void mutate('replacePlayer', 'playerReplaced', { seat })
                  }
                >
                  Replace {seat} with robot
                </button>
              ))}
          </>
        )}
        {eventBound ? (
          <p>Event membership and ownership are frozen. Existing members may reconnect; joins, seat release, replacement and ownership transfer are unavailable.</p>
        ) : phase === 'setup' ? (
          <button
            className="room-button secondary"
            disabled={pending || owner}
            onClick={() =>
              void run(async () => {
                await roomWebSocketService.leaveRoom(room.roomId);
                onLeave();
              })
            }
          >
            Leave room and release seat
          </button>
        ) : (
          <p>
            Active board: disconnect is available; releasing your seat is not.
          </p>
        )}
        {owner && humans.length > 1 && (
          <small>
            Ownership transfer and seat release are available only before
            starting a board. Transfer to another human before leaving.
          </small>
        )}
        {owner && humans.length === 1 && !eventBound && phase === 'setup' && <small>A sole owner cannot release the room. Disconnect to leave the connection, or invite another human and transfer ownership first.</small>}
      </details>
      {soloPractice && (
        <details>
          <summary>Solo practice pace</summary>
          <p>
            Opt this one-human table into practice. Only future server deadlines
            change; an in-progress trick keeps its deadline.
          </p>
          <label>
            Practice speed
            <select
              value={practiceSpeed}
              disabled={pending}
              onChange={(event) =>
                void setPace(event.target.value as PracticeSpeed)
              }
            >
              <option value="relaxed">Relaxed</option>
              <option value="standard">Standard · 700 / 1200 ms</option>
              <option value="quick">Quick</option>
            </select>
          </label>
          <button
            className="room-button secondary"
            disabled={pending}
            onClick={() => void setPace(practiceSpeed)}
          >
            Apply saved practice speed
          </button>
          <small>
            {features?.practiceMode && features.pacing
              ? `Server practice pace: ${features.pacing.robotCardDelayMs} / ${features.pacing.trickHoldMs} ms`
              : 'Not applied to this table.'}
          </small>
        </details>
      )}
      <GuidedPractice />
      <DuplicateTables />
      {pending && <p role="status">Waiting for server confirmation…</p>}
      {error && <p role="alert">{error}</p>}
      {panel === 'replay' && (
        <BoardReplay roomId={room.roomId} onClose={() => setPanel(undefined)} />
      )}
      {panel === 'convention' && (
        <ConventionCard
          roomId={room.roomId}
          onClose={() => setPanel(undefined)}
        />
      )}
    </aside>
  );
}
