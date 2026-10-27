import { useRef, useState } from 'react';
import { useGameStore } from '../../../stores/gameStore';
import { useRoomDataStore } from '../../../stores/roomDataStore';
import { useUserStore } from '../../../stores/userStore';
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore';
import { roadmapService } from '../../../services/roadmapService';
import { applyRoomMessage } from '../../../hooks/useWebSocketMessages';

export function ClaimControls() {
  const room = useRoomDataStore((state) => state.currentRoom);
  const userId = useUserStore((state) => state.userId);
  const game = useGameStore((state) => state.gameData);
  const seat = useGameStore((state) => state.currentPlayerPosition);
  const board = useRoomFeaturesStore((state) => state.roomId === room?.roomId ? state.board : undefined);
  const [tricks, setTricks] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const proposal = useRef<{ key: string; id: string }>();
  if (!room || !board?.boardId) return null;
  const claim = board.claim;
  const frozen = claim?.status === 'pending';
  const remaining = 13 - game.tricks.length;
  const side = seat === 'North' || seat === 'South' ? 'NS' : 'EW';
  const opponents = side === 'NS' ? ['East', 'West'] : ['North', 'South'];
  const positiveAllowed = opponents.every((position) => room.seats[position] && !room.seats[position].toUpperCase().startsWith('ROBOT_'));
  const eligible = game.phase === 'playing' && game.isMyTurn && !game.completedTrick && !frozen;
  const run = async (action: 'proposeClaim' | 'respondClaim' | 'cancelClaim', values: Record<string, unknown>) => {
    if (pending) return;
    setPending(true); setError('');
    try {
      const response = await roadmapService.claim(room.roomId, action, {
        boardId: board.boardId, revision: board.revision, ...values,
      });
      applyRoomMessage(response, room.roomId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Claim operation failed.');
    } finally { setPending(false); }
  };
  const propose = (allocation: number) => {
    const key = `${board.boardId}:${board.revision}:${allocation}`;
    if (proposal.current?.key !== key)
      proposal.current = { key, id: crypto.randomUUID() };
    void run('proposeClaim', { proposalId: proposal.current.id, tricks: allocation });
  };
  if (game.phase !== 'playing' && !claim && !board.claimSettlement) return null;
  return (
    <section className="claim-panel" aria-label="Claims and concessions">
      <h3>Claims and concessions</h3>
      {frozen ? <>
        <p role="status">Play paused by server · {claim.proposer} proposes {claim.tricks} of {claim.remainingTricks} remaining tricks for {claim.side}. {claim.tricks === 0 ? 'Full concession.' : 'Unanimous consent required.'}</p>
        <p>Proposal expires at {new Date(claim.expiresAt).toLocaleTimeString()}; the server resumes play after rejection, cancellation or expiry. No hidden hands are revealed.</p>
        <ul>{claim.requiredSeats.map((position) => <li key={position}>{position}: {claim.votes[position] === true ? 'Accepted' : claim.votes[position] === false ? 'Rejected' : 'Awaiting decision'}</li>)}</ul>
        {claim.proposer === seat && room.seats[seat] === userId && <button className="room-button secondary" disabled={pending} onClick={() => void run('cancelClaim', { proposalId: claim.proposalId })}>Cancel proposal</button>}
        {claim.requiredSeats.includes(seat) && claim.votes[seat] == null && <>
          <button className="room-button" disabled={pending} onClick={() => void run('respondClaim', { proposalId: claim.proposalId, accept: true })}>Accept allocation</button>
          <button className="room-button secondary" disabled={pending} onClick={() => void run('respondClaim', { proposalId: claim.proposalId, accept: false })}>Reject and resume play</button>
        </>}
      </> : <>
        {claim && <p role="status">Proposal {claim.status}{claim.status === 'accepted' ? ' · settled by consent.' : ' · no hidden hands revealed; play resumes at the same position.'}</p>}
        {game.phase === 'playing' && <>
          <p>Claimed tricks are for your partnership out of all remaining tricks, including an unfinished trick. Every other human must consent, including partner or dummy.</p>
          {positiveAllowed ? <label>Tricks claimed
            <select value={Math.min(tricks, remaining)} disabled={!eligible || pending} onChange={(event) => setTricks(Number(event.target.value))}>
              {Array.from({ length: remaining }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} of {remaining}</option>)}
            </select>
          </label> : <p>Positive claims unavailable against computer opponents. You may concede all remaining tricks.</p>}
          {positiveAllowed && <button className="room-button secondary" disabled={!eligible || pending} onClick={() => propose(Math.min(tricks, remaining))}>Propose claim</button>}
          <button className="room-button secondary" disabled={!eligible || pending} onClick={() => propose(0)}>Concede all remaining tricks</button>
          {!eligible && <small>Only the current human controller can propose, outside trick collection.</small>}
        </>}
      </>}
      {board.claimSettlement && <p>Accepted settlement: N–S {board.claimSettlement.allocation.NS} / E–W {board.claimSettlement.allocation.EW} remaining tricks. Unplayed cards are not simulated.</p>}
      {pending && <p role="status">Waiting for claim confirmation…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
