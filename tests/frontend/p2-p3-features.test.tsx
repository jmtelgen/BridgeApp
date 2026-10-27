import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { roadmapService, DuplicateEvent, ClaimProposal } from '../../src/services/roadmapService';
import { boardFeaturesService } from '../../src/services/boardFeaturesService';
import { websocketService, roomWebSocketService, gameWebSocketService } from '../../src/services/websocketService';
import { GuidedPractice } from '../../src/components/bridge/components/GuidedPractice';
import { ClaimControls } from '../../src/components/bridge/components/ClaimControls';
import { DuplicateTables } from '../../src/components/bridge/components/DuplicateTables';
import { BoardReplay, replaySteps } from '../../src/components/bridge/components/BoardReplay';
import { RoomFeatures } from '../../src/components/bridge/components/RoomFeatures';
import { MatchScoreboard } from '../../src/components/bridge/components/MatchScoreboard';
import BridgeGame from '../../src/components/bridge/play';
import { useRoomFeaturesStore } from '../../src/stores/roomFeaturesStore';
import { useGameStore } from '../../src/stores/gameStore';
import { useRoomDataStore } from '../../src/stores/roomDataStore';
import { useUserStore } from '../../src/stores/userStore';
import { applyRoomMessage } from '../../src/hooks/useWebSocketMessages';
import { snapshot } from './fixtures';

const soloSeats = { North: 'me', East: 'ROBOT_1', South: 'ROBOT_2', West: 'ROBOT_3' };
const humanSeats = { North: 'me', East: 'opponent-1', South: 'partner', West: 'opponent-2' };
const score = { completedBoards: 2, scoreNS: 120, scoreEW: -120, lastBoardId: 'board-2' };
const proposal: ClaimProposal = {
  proposalId: 'proposal-one', boardId: 'board-2', proposer: 'North', side: 'NS',
  tricks: 6, remainingTricks: 12, status: 'pending',
  requiredSeats: ['East', 'South', 'West'], votes: { East: true }, expiresAt: Date.now() + 60000,
};
const event: DuplicateEvent = {
  eventId: 'event-one', organizerId: 'me', status: 'waiting', scoring: 'IMPs', tableCount: 2, boardCount: 1,
  tables: [{ tableNumber: 1, roomId: 'table-1' }], boards: [], totals: [],
};
function setup(seats = soloSeats) {
  const frame: any = snapshot();
  frame.room.seats = seats;
  frame.publicState.computerLevel = 'standard';
  frame.publicState.scoreboard = score;
  applyRoomMessage(frame, 'table-1');
  return frame;
}
beforeEach(() => {
  vi.restoreAllMocks();
  useUserStore.setState({ userId: 'me', playerName: 'Player' });
  useRoomFeaturesStore.getState().clear();
  useGameStore.getState().startNewGame();
  useRoomDataStore.getState().clearCurrentRoom();
  setup();
});

describe('room-scoped P2/P3 service contracts', () => {
  it('requests scoreboard without inventing scoring fields', async () => {
    const request = vi.spyOn(websocketService, 'request').mockResolvedValue({ scoreboard: score });
    expect(await roadmapService.scoreboard('table-1')).toEqual(score);
    expect(request).toHaveBeenCalledWith({ action: 'getMatchScoreboard', data: { roomId: 'table-1' } }, ['matchScoreboard'], expect.any(Function));
    const matches = request.mock.calls[0][2]!;
    expect(matches({ roomId: 'unrelated' })).toBe(false);
  });
  it('rejects malformed scoreboards and practice hints visibly instead of fabricating values', async () => {
    vi.spyOn(websocketService, 'request').mockResolvedValue({ scoreboard: { ...score, scoreNS: '120' }, hint: {} });
    await expect(roadmapService.scoreboard('table-1')).rejects.toThrow('invalid match');
    await expect(roadmapService.hint('table-1', 7, true)).rejects.toThrow('invalid practice');
  });
  it('pages summary archives using the exact returned before-board cursor', async () => {
    const request = vi.spyOn(websocketService, 'request').mockResolvedValue({ boards: [], nextBeforeBoardNumber: 41 });
    expect(await boardFeaturesService.archivePage('table-1', 61)).toEqual({ boards: [], nextBeforeBoardNumber: 41 });
    expect(request).toHaveBeenCalledWith({ action: 'listBoardArchives', data: { roomId: 'table-1', limit: 20, beforeBoardNumber: 61 } }, ['boardArchives'], expect.any(Function));
  });
  it('rejects invalid page cursors', async () => {
    vi.spyOn(websocketService, 'request').mockResolvedValue({ boards: [], nextBeforeBoardNumber: -1 });
    await expect(boardFeaturesService.archivePage('table-1')).rejects.toThrow('invalid board archive page');
  });
  it('sends board/revision/proposal and filters unrelated room claim messages', async () => {
    const request = vi.spyOn(websocketService, 'request').mockResolvedValue({});
    await roadmapService.claim('table-1', 'respondClaim', { boardId: 'board-2', revision: 7, proposalId: 'one', accept: false });
    expect(request).toHaveBeenCalledWith({ action: 'respondClaim', data: { roomId: 'table-1', boardId: 'board-2', revision: 7, proposalId: 'one', accept: false } }, ['claimUpdated'], expect.any(Function));
    const matches = request.mock.calls[0][2]!;
    expect(matches({ roomId: 'different' })).toBe(false);
    expect(matches({ roomId: 'table-1', publicState: { claim: { proposalId: 'different' } } })).toBe(false);
    expect(matches({ roomId: 'table-1', privateState: { seat: 'North' }, publicState: { claim: { proposalId: 'one', votes: { North: true } } } })).toBe(false);
    expect(matches({ roomId: 'table-1', privateState: { seat: 'North' }, publicState: { claim: { proposalId: 'one', votes: { North: false } } } })).toBe(true);
  });
  it('filters unrelated event responses while allowing explicit server errors', async () => {
    const request = vi.spyOn(websocketService, 'request').mockResolvedValue({ event });
    await roadmapService.event('getDuplicateEvent', { eventId: event.eventId });
    const matches = request.mock.calls[0][2]!;
    expect(matches({ eventId: 'another' })).toBe(false);
    expect(matches({ action: 'error', error: 'Forbidden' })).toBe(true);
  });
  it('does not let a late old-room snapshot replace a newly selected room', () => {
    useRoomDataStore.getState().updateCurrentRoom({ roomId: 'new-table' });
    applyRoomMessage(snapshot(), 'table-1');
    expect(useRoomDataStore.getState().currentRoom?.roomId).toBe('new-table');
  });
});

describe('match scoreboard and paged results', () => {
  it('uses authoritative live cumulative duplicate scores without adding on rerender', async () => {
    vi.spyOn(roadmapService, 'scoreboard').mockResolvedValue(score);
    const { rerender } = render(<MatchScoreboard roomId="table-1" />);
    await screen.findByText(/2 completed boards/);
    rerender(<MatchScoreboard roomId="table-1" />);
    expect(screen.getByText(/N–S 120 \/ E–W -120/)).toBeInTheDocument();
    expect(screen.getByText(/not IMPs/)).toBeInTheDocument();
  });
  it('appends older summaries once and preserves current selection across pagination', async () => {
    vi.spyOn(roadmapService, 'scoreboard').mockResolvedValue(score);
    const board = (number: number) => ({ boardId: `board-${number}`, boardNumber: number, completedAt: 1, result: { passedOut: true, scoreNS: 0, scoreEW: 0 } });
    const page = vi.spyOn(boardFeaturesService, 'archivePage')
      .mockResolvedValueOnce({ boards: [board(3)], nextBeforeBoardNumber: 3 })
      .mockResolvedValueOnce({ boards: [board(3), board(2)], nextBeforeBoardNumber: null });
    render(<BoardReplay roomId="table-1" onClose={vi.fn()} />);
    await screen.findByRole('option', { name: /Board 3/ });
    fireEvent.click(screen.getByRole('button', { name: 'Load older boards' }));
    await screen.findByRole('option', { name: /Board 2/ });
    expect(screen.getAllByRole('option', { name: /Board 3/ })).toHaveLength(1);
    expect(page).toHaveBeenLastCalledWith('table-1', 3);
    expect(screen.queryByRole('button', { name: 'Load older boards' })).not.toBeInTheDocument();
  });
});

describe('lawful guided practice and play policies', () => {
  it('never offers hints or play policies in multiplayer or event tables', () => {
    useRoomDataStore.getState().updateCurrentRoom({ seats: humanSeats });
    const { rerender } = render(<GuidedPractice />);
    expect(screen.queryByText('Guided solo practice')).not.toBeInTheDocument();
    act(() => { useRoomDataStore.getState().updateCurrentRoom({ seats: soloSeats, eventId: 'event-one' }); });
    rerender(<GuidedPractice />);
    expect(screen.queryByText('Guided solo practice')).not.toBeInTheDocument();
  });
  it('renders legal explanation and explicitly degraded lawful suggestions', async () => {
    const hint = vi.spyOn(roadmapService, 'hint').mockResolvedValue({
      revision: 7, hint: { actor: 'South', controller: 'North', phase: 'playing', legalActions: ['TH'], explanation: 'Follow hearts.', information: 'Only lawful public history.', suggestion: { card: 'TH', mode: 'heuristic', completedSamples: 0, degraded: true, caution: 'Not optimal.' } },
    });
    render(<GuidedPractice />);
    fireEvent.click(screen.getByText('Guided solo practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Ask for a practice hint' }));
    await screen.findByText('Follow hearts.');
    expect(hint).toHaveBeenCalledWith('table-1', 7, true);
    expect(screen.getByText(/Degraded analysis/)).toBeInTheDocument();
    expect(screen.getByText(/soft budgets/)).toBeInTheDocument();
  });
  it('discards a delayed hint when a newer revision arrives', async () => {
    let resolve!: (value: any) => void;
    vi.spyOn(roadmapService, 'hint').mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<GuidedPractice />);
    fireEvent.click(screen.getByText('Guided solo practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Explain legal actions' }));
    act(() => useRoomFeaturesStore.getState().update('table-1', { revision: 8 }));
    await act(async () => resolve({ revision: 7, hint: { phase: 'playing', actor: 'North', controller: 'North', legalActions: ['AH'], explanation: 'Stale advice' } }));
    expect(screen.queryByText('Stale advice')).not.toBeInTheDocument();
  });
  it('shows visible-hand bidding HCP and shape without fabricating recommendations', async () => {
    vi.spyOn(roadmapService, 'hint').mockResolvedValue({ revision: 7, hint: { phase: 'bidding', actor: 'North', controller: 'North', legalActions: ['pass'], explanation: 'Legal calls only.', handHcp: 12, shape: { S: 4, H: 3, D: 3, C: 3 }, suggestion: null } });
    useGameStore.getState().updateGameData({ ...useGameStore.getState().gameData, phase: 'bidding' });
    render(<GuidedPractice />);
    fireEvent.click(screen.getByText('Guided solo practice'));
    fireEvent.click(screen.getByRole('button', { name: 'Explain legal actions' }));
    await screen.findByText('Visible hand: 12 HCP · S/H/D/C 4/3/3/3');
    expect(screen.queryByText(/Suggested card:/)).not.toBeInTheDocument();
  });
  it('sets only named policies and resynchronizes actual server state after confirmation', async () => {
    const changed = vi.spyOn(roadmapService, 'level').mockResolvedValue({ computerLevel: { name: 'thoughtful', samples: 8, budgetMs: 100 }, revision: 8 });
    const frame = setup();
    frame.room.computerLevel = 'thoughtful';
    frame.publicState.computerLevel = 'thoughtful';
    frame.publicState.revision = 8;
    vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue(frame);
    render(<GuidedPractice />);
    fireEvent.click(screen.getByText('Guided solo practice'));
    fireEvent.change(screen.getByLabelText('Computer play policy'), { target: { value: 'thoughtful' } });
    await waitFor(() => expect(useRoomFeaturesStore.getState().board.computerLevel).toBe('thoughtful'));
    expect(changed).toHaveBeenCalledWith('table-1', 7, 'thoughtful');
  });
});

describe('server-consent claims without hand revelation', () => {
  it('offers only full concessions against robots and sends zero remaining tricks', async () => {
    const request = vi.spyOn(roadmapService, 'claim').mockResolvedValue({});
    render(<ClaimControls />);
    expect(screen.queryByRole('button', { name: 'Propose claim' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Concede all remaining tricks' }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith('table-1', 'proposeClaim', expect.objectContaining({ boardId: 'board-2', revision: 7, proposalId: expect.any(String), tricks: 0 }));
  });
  it('includes unfinished trick in remaining partnership allocation and permits human-only positive claims', async () => {
    setup(humanSeats);
    const request = vi.spyOn(roadmapService, 'claim').mockResolvedValue({});
    render(<ClaimControls />);
    fireEvent.change(screen.getByLabelText('Tricks claimed'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Propose claim' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('table-1', 'proposeClaim', expect.objectContaining({ tricks: 6 })));
    expect(screen.getByText(/including an unfinished trick/)).toBeInTheDocument();
  });
  it('retains proposal identity after a transport failure for idempotent retry', async () => {
    const request = vi.spyOn(roadmapService, 'claim').mockRejectedValue(new Error('Timed out'));
    render(<ClaimControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Concede all remaining tricks' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Concede all remaining tricks' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[0][2].proposalId).toBe(request.mock.calls[1][2].proposalId);
  });
  it('shows required partner/dummy votes and cancel, and blocks store/card controls even if turn flag is stale', async () => {
    setup(humanSeats);
    useRoomFeaturesStore.getState().update('table-1', { claim: proposal });
    const play = vi.spyOn(gameWebSocketService, 'playCard').mockResolvedValue({});
    render(<BridgeGame />);
    expect(screen.getByText('South: Awaiting decision')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel proposal' })).toBeEnabled();
    expect(useGameStore.getState().canMakeMove()).toBe(false);
    expect(screen.getByRole('button', { name: '10 of hearts' })).toBeDisabled();
    await useGameStore.getState().playCard({ rank: '10', suit: '♥', value: 10 });
    expect(play).not.toHaveBeenCalled();
  });
  it('allows required opponents to explicitly reject and resume, never reveals hands', async () => {
    setup(humanSeats);
    const request = vi.spyOn(roadmapService, 'claim').mockResolvedValue({});
    useGameStore.getState().setCurrentPlayerPosition('West');
    useRoomFeaturesStore.getState().update('table-1', { claim: proposal });
    render(<ClaimControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject and resume play' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('table-1', 'respondClaim', expect.objectContaining({ proposalId: proposal.proposalId, accept: false })));
    expect(screen.queryByText(/initialHands/)).not.toBeInTheDocument();
  });
  it('clears pending proposal when authoritative new board starts', () => {
    useRoomFeaturesStore.getState().update('table-1', { claim: proposal });
    useRoomFeaturesStore.getState().update('table-1', { boardId: 'board-3', revision: 9 });
    expect(useRoomFeaturesStore.getState().board.claim).toBeUndefined();
  });
  it('replays only actual partial cards then explicit settlement, not synthetic tricks or winners', () => {
    const steps = replaySteps({
      auction: [{ seat: 'North', bid: '1NT' }], tricks: [],
      claimSettlement: { proposalId: 'one', proposer: 'East', allocation: { NS: 12, EW: 1 }, acceptedAt: 1, unplayedTrick: [{ seat: 'East', card: 'AS' }] },
    } as any);
    expect(steps.map((step) => step.kind)).toEqual(['auction', 'card', 'settlement']);
    expect(steps[1].text).toBe('Unfinished trick · East: AS');
    expect(steps[2].text).toContain('No further cards were played.');
  });
});

describe('duplicate club membership and comparison release', () => {
  it('creates bounded events only from the current owned waiting room', async () => {
    useGameStore.getState().startNewGame();
    const request = vi.spyOn(roadmapService, 'event').mockResolvedValue({ event, invitationToken: 'private-event-token' });
    vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue(snapshot());
    render(<DuplicateTables />);
    fireEvent.click(screen.getByText('Duplicate club tables'));
    fireEvent.change(screen.getByLabelText('Event tables'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Event boards'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create duplicate event' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('createDuplicateEvent', { roomId: 'table-1', tableCount: 4, boardCount: 8 }));
    expect(await screen.findByText(/private-event-token/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start all event tables' })).toBeDisabled();
  });
  it('does not expose create/join controls to nonowners', () => {
    useGameStore.getState().startNewGame();
    useRoomDataStore.getState().updateCurrentRoom({ ownerId: 'other' });
    render(<DuplicateTables />);
    fireEvent.click(screen.getByText('Duplicate club tables'));
    expect(screen.queryByRole('button', { name: 'Create duplicate event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join event with this table' })).not.toBeInTheDocument();
  });
  it('withholds unreleased comparison results even if supplied and labels other-table waiting honestly', async () => {
    useRoomFeaturesStore.getState().update('table-1', { eventId: event.eventId });
    vi.spyOn(roadmapService, 'event').mockResolvedValue({ event: { ...event, status: 'started', boards: [{ boardId: 'one', boardNumber: 1, completedTables: 1, released: false, results: [{ tableNumber: 1, scoreNS: 9999, scoreEW: -9999, pointsNS: 8, pointsEW: -8 }] }] } });
    render(<DuplicateTables />);
    fireEvent.click(screen.getByText('Duplicate club tables'));
    await screen.findByText(/1\/2 finished · replay locked/);
    expect(screen.queryByText(/9999/)).not.toBeInTheDocument();
  });
  it('shows released comparisons and totals separately from raw duplicate scores', async () => {
    useRoomFeaturesStore.getState().update('table-1', { eventId: event.eventId });
    vi.spyOn(roadmapService, 'event').mockResolvedValue({ event: { ...event, status: 'completed', boards: [{ boardId: 'one', boardNumber: 1, completedTables: 2, released: true, results: [{ tableNumber: 1, scoreNS: 120, scoreEW: -120, pointsNS: 3, pointsEW: -3 }] }], totals: [{ tableNumber: 1, pointsNS: 3, pointsEW: -3 }] } });
    render(<DuplicateTables />);
    fireEvent.click(screen.getByText('Duplicate club tables'));
    await screen.findByText('Table 1: duplicate NS 120 / EW -120; IMPs NS 3 / EW -3');
    expect(screen.getByText('Released-board totals only · IMPs')).toBeInTheDocument();
  });
  it('does not let a finished event table request a nonexistent extra board', () => {
    useRoomFeaturesStore.getState().update('table-1', { eventId: event.eventId });
    useRoomFeaturesStore.getState().setDuplicateEvent(event);
    useGameStore.getState().updateGameData({ ...useGameStore.getState().gameData, phase: 'completed', gameNumber: 1 });
    render(<BridgeGame />);
    expect(screen.queryByRole('button', { name: 'Deal next board' })).not.toBeInTheDocument();
    expect(screen.getByText(/Your event boards are finished/)).toBeInTheDocument();
  });
  it('hides frozen membership mutation controls in waiting event rooms', async () => {
    useRoomDataStore.getState().updateCurrentRoom({ seats: humanSeats, eventId: event.eventId, presence: { South: { status: 'offline', connectionCount: 0 } } });
    useGameStore.getState().startNewGame();
    vi.spyOn(roadmapService, 'event').mockResolvedValue({ event });
    render(<RoomFeatures onLeave={vi.fn()} />);
    fireEvent.click(screen.getByText('Room membership and access'));
    expect(screen.queryByRole('button', { name: /Make .* owner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Replace .* robot/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave room and release seat' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create / copy private invitation' })).toBeDisabled();
    expect(screen.getByText(/Event membership and ownership are frozen/)).toBeInTheDocument();
    await waitFor(() => expect(useRoomFeaturesStore.getState().duplicateEvent?.eventId).toBe(event.eventId));
  });
});

describe('private invitation administration', () => {
  it('shows server expiry/ID, allows custom lifetime and revokes a saved older ID', async () => {
    const request = vi.spyOn(websocketService, 'request').mockResolvedValue({ invitationId: 'current-id', invitationToken: 'room-token', expiresAt: 2000000000 });
    render(<RoomFeatures onLeave={vi.fn()} />);
    fireEvent.click(screen.getByText('Room membership and access'));
    fireEvent.change(screen.getByLabelText('New invitation lifetime'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create / copy private invitation' }));
    await screen.findByText(/Invitation ID: current-id/);
    expect(request).toHaveBeenCalledWith({ action: 'createInvitation', data: { roomId: 'table-1', expiresInSeconds: 60 } }, ['roomInvitation'], expect.any(Function));
    fireEvent.change(screen.getByLabelText('Invitation ID to revoke'), { target: { value: 'saved-older-id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revoke this invitation' }));
    await screen.findByText('Invitation revoked by server.');
    expect(request).toHaveBeenLastCalledWith({ action: 'revokeInvitation', data: { roomId: 'table-1', invitationId: 'saved-older-id' } }, ['roomUpdated'], expect.any(Function));
  });
});
