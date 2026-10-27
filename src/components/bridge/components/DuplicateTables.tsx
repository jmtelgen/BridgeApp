import { useEffect, useState } from 'react';
import { DuplicateEvent, roadmapService } from '../../../services/roadmapService';
import { useRoomDataStore } from '../../../stores/roomDataStore';
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { roomWebSocketService } from '../../../services/websocketService';
import { applyRoomMessage } from '../../../hooks/useWebSocketMessages';

export function DuplicateTables() {
  const room = useRoomDataStore((state) => state.currentRoom);
  const userId = useUserStore((state) => state.userId);
  const phase = useGameStore((state) => state.gameData.phase);
  const boundId = useRoomFeaturesStore((state) => state.roomId === room?.roomId ? state.board.eventId : undefined) ?? room?.eventId;
  const [event, setEvent] = useState<DuplicateEvent>();
  const [eventId, setEventId] = useState('');
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState('');
  const [tables, setTables] = useState(2);
  const [boards, setBoards] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const activeId = boundId || event?.eventId;
  useEffect(() => {
    if (!activeId) return;
    let active = true;
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await roadmapService.event('getDuplicateEvent', { eventId: activeId });
        if (active) {
          setEvent(response.event);
          useRoomFeaturesStore.getState().setDuplicateEvent(response.event);
          setPollError('');
        }
      } catch (error) { if (active) setPollError(error instanceof Error ? error.message : 'Unable to refresh event.'); }
      finally { fetching = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, [activeId]);
  if (!room) return null;
  const owner = room.ownerId === userId;
  const run = async (action: 'createDuplicateEvent' | 'joinDuplicateEvent' | 'startDuplicateEvent' | 'getDuplicateEvent', data: Record<string, unknown>) => {
    if (pending) return;
    setPending(true); setError('');
    try {
      const response = await roadmapService.event(action, data);
      if (useRoomDataStore.getState().currentRoom?.roomId !== room.roomId) return;
      setEvent(response.event);
      useRoomFeaturesStore.getState().setDuplicateEvent(response.event);
      if (response.invitationToken) setInvitation(response.invitationToken);
      if (action !== 'getDuplicateEvent') {
        const snapshot = await roomWebSocketService.getGameState(room.roomId, userId!);
        applyRoomMessage(snapshot, room.roomId);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Event request failed.'); }
    finally { setPending(false); }
  };
  const currentTable = event?.tables.find((table) => table.roomId === room.roomId);
  return (
    <details className="duplicate-tables">
      <summary>Duplicate club tables</summary>
      <p>2–4 isolated tables · 1–8 shared boards. Two tables use IMPs; three or four use matchpoints. Each player belongs to one event table only. Shared deals are never shown here.</p>
      {!activeId && (owner && phase === 'setup' ? <>
        <fieldset disabled={pending}>
          <legend>Create event with this room as table 1</legend>
          <label>Event tables<select value={tables} onChange={(e) => setTables(Number(e.target.value))}>{[2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Event boards<select value={boards} onChange={(e) => setBoards(Number(e.target.value))}>{Array.from({ length: 8 }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>
          <button className="room-button secondary" onClick={() => void run('createDuplicateEvent', { roomId: room.roomId, tableCount: tables, boardCount: boards })}>Create duplicate event</button>
        </fieldset>
        <fieldset disabled={pending}>
          <legend>Join event · select this owned waiting room as your table</legend>
          <label>Event code<input value={eventId} onChange={(e) => setEventId(e.target.value)} maxLength={100} autoComplete="off" /></label>
          <label>Event invitation token<input value={token} onChange={(e) => setToken(e.target.value)} maxLength={500} autoComplete="off" /></label>
          <button className="room-button secondary" disabled={!eventId.trim() || !token.trim()} onClick={() => void run('joinDuplicateEvent', { eventId: eventId.trim(), invitationToken: token.trim(), roomId: room.roomId })}>Join event with this table</button>
        </fieldset>
        <small>Seat all human members before binding a room. Membership is frozen after event registration; table numbers are assigned by the server, not selected by seat-hopping.</small>
      </> : <p>Only an owner of a waiting room can create or join an event.</p>)}
      {event && <>
        <h3>Event {event.eventId}</h3>
        <p>{event.status} · {event.scoring} · {event.boardCount} boards · {event.tables.length}/{event.tableCount} tables registered{currentTable ? ` · Your table ${currentTable.tableNumber}` : ''}</p>
        {invitation && <p className="invite-link">Share privately with other room owners: event code {event.eventId} · invitation token <span>{invitation}</span>. This is an invitation, not an identity credential.</p>}
        <ul>{event.tables.map((table) => <li key={table.roomId}>Table {table.tableNumber} · {table.roomId === room.roomId ? 'Your room' : table.roomId}</li>)}</ul>
        {event.status === 'waiting' && event.organizerId === userId && <button className="room-button" disabled={pending || event.tables.length !== event.tableCount} onClick={() => void run('startDuplicateEvent', { eventId: event.eventId })}>Start all event tables</button>}
        {event.status === 'waiting' && <p>Waiting for all tables to register; only the organizer starts the event. Empty seats become robots when started.</p>}
        <button className="room-button secondary" disabled={pending} onClick={() => void run('getDuplicateEvent', { eventId: event.eventId })}>Refresh event scores</button>
        <div className="feature-table-scroll">
          <table className="feature-results"><caption>Shared-board comparison · {event.scoring}</caption>
            <thead><tr><th>Board</th><th>Release status</th><th>Table results</th></tr></thead>
            <tbody>{event.boards.map((board) => <tr key={board.boardId}>
              <th scope="row">{board.boardNumber}</th>
              <td>{board.released ? 'Released · replay available at your table' : `Waiting for other tables · ${board.completedTables}/${event.tableCount} finished · replay locked`}</td>
              <td>{board.released ? board.results.map((result) => <p key={result.tableNumber}>Table {result.tableNumber}: duplicate NS {result.scoreNS} / EW {result.scoreEW}; {event.scoring} NS {result.pointsNS} / EW {result.pointsEW}</p>) : 'Comparisons withheld until every table finishes this board.'}</td>
            </tr>)}</tbody>
          </table>
          <table className="feature-results"><caption>Released-board totals only · {event.scoring}</caption><thead><tr><th>Table</th><th>N–S</th><th>E–W</th></tr></thead><tbody>{event.totals.map((total) => <tr key={total.tableNumber}><th scope="row">{total.tableNumber}</th><td>{total.pointsNS}</td><td>{total.pointsEW}</td></tr>)}</tbody></table>
        </div>
        <p>Each room owner advances their own completed board, in order, up to the event board count. Other tables may still be playing; results and replay release separately for each shared board. Practice hints and pace changes are off.</p>
      </>}
      {activeId && !event && <p>Loading your registered event…</p>}
      {pending && <p role="status">Waiting for event confirmation…</p>}
      {error && <p role="alert">{error}</p>}
      {pollError && <p role="alert">Event refresh failed: {pollError} Last confirmed results are still shown; retry Refresh event scores.</p>}
    </details>
  );
}
