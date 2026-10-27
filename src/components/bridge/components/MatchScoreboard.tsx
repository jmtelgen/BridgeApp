import { useEffect, useState } from 'react';
import { MatchScoreboard as Scoreboard, roadmapService } from '../../../services/roadmapService';
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore';

export function MatchScoreboard({ roomId }: { roomId: string }) {
  const live = useRoomFeaturesStore((state) => state.roomId === roomId ? state.board.scoreboard : undefined);
  const [scoreboard, setScoreboard] = useState<Scoreboard>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    roadmapService.scoreboard(roomId).then((value) => {
      if (active) setScoreboard(value);
    }).catch((error) => {
      if (active) setError(error.message);
    });
    return () => { active = false; };
  }, [roomId, retry]);
  const value = live ?? scoreboard;
  return (
    <section className="match-scoreboard" aria-label="Match scoreboard">
      <h3>Multi-board match</h3>
      {value ? <p>{value.completedBoards} completed boards · N–S {value.scoreNS} / E–W {value.scoreEW}</p> : !error && <p>Loading cumulative scores…</p>}
      <small>Cumulative duplicate points, not IMPs, matchpoints or rubber scores. Event comparison scores are separate.</small>
      {error && <p role="alert">{error} <button className="room-button secondary" onClick={() => setRetry((current) => current + 1)}>Retry scoreboard</button></p>}
    </section>
  );
}
