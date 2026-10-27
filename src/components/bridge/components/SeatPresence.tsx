import { useEffect, useState } from 'react';
import { useRoomDataStore } from '../../../stores/roomDataStore';

export function SeatPresence({ seat }: { seat: string }) {
  const presence = useRoomDataStore(
    (state) => state.currentRoom?.presence?.[seat]
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (presence?.status !== 'reconnecting') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [presence?.status, presence?.reservedUntil]);
  if (!presence)
    return <span className="presence-status">Presence unavailable</span>;
  const remaining = presence.reservedUntil
    ? Math.max(0, Math.ceil(presence.reservedUntil - now / 1000))
    : null;
  const label =
    presence.status === 'reconnecting'
      ? remaining
        ? `Reconnecting · ${remaining}s reserved`
        : 'Reconnecting · awaiting server status'
      : presence.status === 'online'
      ? `Online${
          presence.connectionCount > 1
            ? ` · ${presence.connectionCount} tabs`
            : ''
        }`
      : presence.status === 'offline'
      ? 'Offline · replacement eligible'
      : presence.status === 'robot'
      ? 'Robot'
      : 'Open seat';
  return (
    <span
      className={`presence-status presence-${presence.status}`}
      aria-label={`${seat} presence: ${label}`}
    >
      {label}
    </span>
  );
}
