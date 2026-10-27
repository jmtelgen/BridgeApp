import { useEffect, useState } from 'react';
import {
  ArchivedBoard,
  BoardSummary,
  boardFeaturesService,
} from '../../../services/boardFeaturesService';
import { FeatureDialog } from './FeatureDialog';
import { Position } from '../types';
import { sortVisibleHand } from '../../../utils/handOrder';
import { MatchScoreboard } from './MatchScoreboard';
import {
  convertServerCardToFrontend,
  convertServerContractToFrontend,
} from '../../../utils/gameStateConverter';

const seats: Position[] = ['North', 'East', 'South', 'West'];
export function replaySteps(board: ArchivedBoard) {
  return [
    ...board.auction.map((bid) => ({
      kind: 'auction' as const,
      text: `${bid.seat}: ${bid.bid}`,
    })),
    ...board.tricks.flatMap((trick, index) => [
      ...trick.plays.map((play) => ({
        kind: 'card' as const,
        text: `Trick ${index + 1} · ${play.seat}: ${play.card}`,
        seat: play.seat,
        card: play.card,
      })),
      {
        kind: 'winner' as const,
        text: `Trick ${index + 1} won by ${trick.winner}`,
      },
    ]),
    ...(board.claimSettlement?.unplayedTrick ?? []).map((play) => ({
      kind: 'card' as const,
      text: `Unfinished trick · ${play.seat}: ${play.card}`,
      seat: play.seat,
      card: play.card,
    })),
    ...(board.claimSettlement ? [{
      kind: 'settlement' as const,
      text: `Accepted claim allocation · NS ${board.claimSettlement.allocation.NS} / EW ${board.claimSettlement.allocation.EW} remaining tricks. No further cards were played.`,
    }] : []),
  ];
}
export function BoardReplay({
  roomId,
  onClose,
}: {
  roomId: string;
  onClose: () => void;
}) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [board, setBoard] = useState<ArchivedBoard>();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [cursor, setCursor] = useState<number | null>(null);
  const [pagePending, setPagePending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    boardFeaturesService
      .archivePage(roomId)
      .then((page) => {
        if (active) {
          setBoards(page.boards);
          setCursor(page.nextBeforeBoardNumber);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId, refresh]);
  useEffect(() => {
    if (!selected) {
      setBoard(undefined);
      setStep(0);
      return;
    }
    let active = true;
    setLoading(true);
    setBoard(undefined);
    setError('');
    boardFeaturesService
      .archive(roomId, selected)
      .then((value) => {
        if (active) {
          setBoard(value);
          setStep(0);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId, selected]);
  const loadMore = async () => {
    if (cursor == null || pagePending) return;
    setPagePending(true);
    setError('');
    try {
      const page = await boardFeaturesService.archivePage(roomId, cursor);
      setBoards((current) => [...current, ...page.boards.filter((item) => !current.some((old) => old.boardId === item.boardId))]);
      setCursor(page.nextBeforeBoardNumber);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load older boards.');
    } finally {
      setPagePending(false);
    }
  };
  const steps = board ? replaySteps(board) : [];
  const changeStep = (next: number) =>
    setStep(Math.max(0, Math.min(steps.length, next)));
  const played = steps.slice(0, step).filter((entry) => entry.kind === 'card');
  return (
    <FeatureDialog title="Completed-board replay" onClose={onClose}>
      <p>
        Completed boards only. Archives remain available for this server
        lifetime. Shared-deal event boards appear only after every table finishes
        that board.
      </p>
      <MatchScoreboard roomId={roomId} />
      <label>
        Completed board
        <select
          aria-label="Completed board"
          value={selected}
          disabled={loading}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Select a board</option>
          {boards.map((item) => (
            <option key={item.boardId} value={item.boardId}>
              Board {item.boardNumber} · NS {item.result?.scoreNS} / EW{' '}
              {item.result?.scoreEW}
            </option>
          ))}
        </select>
      </label>
      <button className="room-button secondary" disabled={loading || pagePending} onClick={() => setRefresh((value) => value + 1)}>Refresh completed boards</button>
      {cursor != null && (
        <button className="room-button secondary" disabled={pagePending || loading} onClick={() => void loadMore()}>
          {pagePending ? 'Loading older boards…' : 'Load older boards'}
        </button>
      )}
      {loading && <p role="status">Loading authorized archive…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !boards.length && (
        <p>No completed boards are archived yet.</p>
      )}
      {board && (
        <section
          className="replay-content"
          tabIndex={0}
          aria-label="Replay steps"
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              changeStep(step - 1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              changeStep(step + 1);
            }
            if (event.key === 'Home') {
              event.preventDefault();
              changeStep(0);
            }
            if (event.key === 'End') {
              event.preventDefault();
              changeStep(steps.length);
            }
          }}
        >
          <h3>
            Board {board.boardNumber} · Dealer {board.dealer} · Vulnerability{' '}
            {board.vulnerability}
          </h3>
          <p>
            {board.result.passedOut
              ? 'Passed out'
              : `${board.contract} · Declarer ${board.declarer}`}{' '}
            · Final score NS {board.result.scoreNS} / EW {board.result.scoreEW}
          </p>
          {board.claimSettlement && <p>Settled by consent, not 52 played cards. Only recorded completed tricks and the unfinished trick are replayed; the remaining tricks were allocated N–S {board.claimSettlement.allocation.NS} / E–W {board.claimSettlement.allocation.EW}.</p>}
          <p>
            Frozen agreements: NS {board.agreements.NS.system}{' '}
            {board.agreements.NS.version} · EW {board.agreements.EW.system}{' '}
            {board.agreements.EW.version}
          </p>
          <nav className="replay-controls" aria-label="Replay controls">
            <button
              className="room-button secondary"
              disabled={!step}
              onClick={() => changeStep(0)}
            >
              Start
            </button>
            <button
              className="room-button secondary"
              disabled={!step}
              onClick={() => changeStep(step - 1)}
            >
              Previous
            </button>
            <button
              className="room-button"
              disabled={step === steps.length}
              onClick={() => changeStep(step + 1)}
            >
              Next
            </button>
            <button
              className="room-button secondary"
              disabled={step === steps.length}
              onClick={() => changeStep(steps.length)}
            >
              End
            </button>
          </nav>
          <p role="status">
            Step {step} of {steps.length}:{' '}
            {step ? steps[step - 1].text : 'Initial deal'}
          </p>
          <small>
            Focus this replay panel to use ← / →, Home / End. Escape closes.
          </small>
          <div className="replay-hands">
            {seats.map((seat) => (
              <section key={seat}>
                <h4>{seat}</h4>
                <p>
                  {sortVisibleHand(
                    board.initialHands[seat]
                      .filter(
                        (card) =>
                          !played.some(
                            (entry) =>
                              entry.kind === 'card' &&
                              entry.seat === seat &&
                              entry.card === card
                          )
                      )
                      .map(convertServerCardToFrontend),
                    board.contract
                      ? convertServerContractToFrontend(
                          board.contract,
                          board.declarer || ''
                        )?.suit
                      : undefined
                  )
                    .map((card) => `${card.rank}${card.suit}`)
                    .join(' · ') || 'No cards remaining'}
                </p>
              </section>
            ))}
          </div>
          <h3>Auction</h3>
          <ol className="replay-events">
            {board.auction.slice(0, step).map((bid, index) => (
              <li key={index}>
                {bid.seat}: {bid.bid}
              </li>
            ))}
          </ol>
          <h3>Trick cards</h3>
          <ol className="replay-events">
            {steps
              .slice(0, step)
              .filter((entry) => entry.kind !== 'auction')
              .map((entry, index) => (
                <li key={index}>{entry.text}</li>
              ))}
          </ol>
        </section>
      )}
    </FeatureDialog>
  );
}
