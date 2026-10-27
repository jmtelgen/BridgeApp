import { useEffect, useRef, useState } from 'react';
import { ComputerLevel, PracticeHint, roadmapService } from '../../../services/roadmapService';
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore';
import { useRoomDataStore } from '../../../stores/roomDataStore';
import { useUserStore } from '../../../stores/userStore';
import { useGameStore } from '../../../stores/gameStore';
import { applyRoomMessage } from '../../../hooks/useWebSocketMessages';
import { roomWebSocketService } from '../../../services/websocketService';

export function GuidedPractice() {
  const room = useRoomDataStore((state) => state.currentRoom);
  const userId = useUserStore((state) => state.userId);
  const game = useGameStore((state) => state.gameData);
  const board = useRoomFeaturesStore((state) => state.roomId === room?.roomId ? state.board : undefined);
  const [hint, setHint] = useState<{ revision: number; hint: PracticeHint }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const humanIds = Object.values(room?.seats ?? {}).filter((id) => id && !id.toUpperCase().startsWith('ROBOT_'));
  const solo = !!room && !room.eventId && !board?.eventId && humanIds.length === 1 && humanIds[0] === userId &&
    Object.values(room.seats).filter((id) => id?.toUpperCase().startsWith('ROBOT_')).length === 3;
  if (!solo || !room) return null;
  const run = async (operation: () => Promise<void>) => {
    if (pending) return;
    setPending(true); setError('');
    try { await operation(); }
    catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Practice request failed.'); }
    finally { if (mounted.current) setPending(false); }
  };
  const requestHint = (suggest: boolean) => run(async () => {
    setHint(undefined);
    const value = await roadmapService.hint(room.roomId, board?.revision, suggest);
    const latest = useRoomFeaturesStore.getState();
    if (mounted.current && latest.roomId === room.roomId && latest.board.boardId === board?.boardId && latest.board.revision === value.revision)
      setHint(value);
  });
  const currentHint = hint && hint.revision === board?.revision ? hint.hint : undefined;
  const canHint = game.isMyTurn && !game.completedTrick && (game.phase === 'bidding' || game.phase === 'playing') && board?.claim?.status !== 'pending';
  const level = board?.computerLevel ?? room.computerLevel;
  return (
    <details className="guided-practice">
      <summary>Guided solo practice</summary>
      <p>Advice uses only your lawful visible information. Sampled policies compare possible deals, not the actual hidden allocation; no actual or sampled hidden hands are displayed. Hints do not pause the server clock.</p>
      {room.ownerId === userId && <label>Computer play policy
        <select value={level ?? ''} disabled={pending} onChange={(event) => {
          const computerLevel = event.target.value as ComputerLevel;
          void run(async () => {
            const response = await roadmapService.level(room.roomId, board?.revision, computerLevel);
            if (!mounted.current || useRoomDataStore.getState().currentRoom?.roomId !== room.roomId) return;
            applyRoomMessage(response, room.roomId);
            const snapshot = await roomWebSocketService.getGameState(room.roomId, userId!);
            if (!mounted.current || useRoomDataStore.getState().currentRoom?.roomId !== room.roomId) return;
            applyRoomMessage(snapshot, room.roomId);
          });
        }}>
          {!level && <option value="" disabled>Awaiting server policy</option>}
          <option value="heuristic">Heuristic · legal rules · no DDS samples</option>
          <option value="standard">Standard · 4 samples · soft 50 ms</option>
          <option value="thoughtful">Thoughtful · 8 samples · soft 100 ms</option>
        </select>
      </label>}
      <p>Card-play budgets, not skill ratings. Bidding is the same supported SAYC subset. Small exploratory benchmarks do not prove expert strength or that Thoughtful is stronger. Native solves can exceed soft budgets; legal fallback remains possible. Pace is separate.</p>
      <div className="feature-toolbar">
        <button className="room-button secondary" disabled={pending || !canHint} onClick={() => void requestHint(false)}>Explain legal actions</button>
        <button className="room-button secondary" disabled={pending || !canHint} onClick={() => void requestHint(true)}>Ask for a practice hint</button>
      </div>
      {!canHint && <small>Available only on your active turn, including exposed dummy you control; not during trick collection or claims.</small>}
      {pending && <p role="status">Waiting for practice response…</p>}
      {error && <p role="alert">{error}</p>}
      {currentHint && <section aria-label="Practice explanation" aria-live="polite">
        <h3>{currentHint.actor} · {currentHint.phase}</h3>
        <p>{currentHint.explanation}</p>
        {currentHint.handHcp != null && <p>Visible hand: {currentHint.handHcp} HCP{currentHint.shape ? ` · S/H/D/C ${['S', 'H', 'D', 'C'].map((suit) => currentHint.shape![suit]).join('/')}` : ''}</p>}
        <p>Legal actions: {currentHint.legalActions.join(', ')}</p>
        {currentHint.suggestion && <>
          <p>Suggested card: {currentHint.suggestion.card} · {currentHint.suggestion.mode} · {currentHint.suggestion.completedSamples} completed samples</p>
          <p>{currentHint.suggestion.caution}</p>
          {currentHint.suggestion.degraded && <p role="status">Degraded analysis: legal fallback, not an optimal-play guarantee.</p>}
        </>}
        {currentHint.information && <p>{currentHint.information}</p>}
      </section>}
    </details>
  );
}
