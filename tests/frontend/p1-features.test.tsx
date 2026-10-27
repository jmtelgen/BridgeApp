import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  BoardReplay,
  replaySteps,
} from '../../src/components/bridge/components/BoardReplay';
import { ConventionCard } from '../../src/components/bridge/components/ConventionCard';
import { SeatPresence } from '../../src/components/bridge/components/SeatPresence';
import { RoomFeatures } from '../../src/components/bridge/components/RoomFeatures';
import {
  PlayerPreferences,
  PreferenceEffects,
} from '../../src/components/bridge/components/PlayerPreferences';
import {
  ArchivedBoard,
  boardFeaturesService,
} from '../../src/services/boardFeaturesService';
import {
  usePreferencesStore,
  shouldReduceMotion,
} from '../../src/stores/preferencesStore';
import { useRoomFeaturesStore } from '../../src/stores/roomFeaturesStore';
import { useRoomDataStore } from '../../src/stores/roomDataStore';
import { useGameStore } from '../../src/stores/gameStore';
import { useUserStore } from '../../src/stores/userStore';
import { websocketService } from '../../src/services/websocketService';
import {
  observeSoundSnapshot,
  resetSoundBaseline,
  unlockSound,
} from '../../src/services/soundService';
import { applyRoomMessage } from '../../src/hooks/useWebSocketMessages';
import { snapshot } from './fixtures';
import { roadmapService } from '../../src/services/roadmapService';

const agreement = { system: 'SAYC', version: 'sayc-supported-1' };
export const archivedBoard: ArchivedBoard = {
  schemaVersion: 1,
  roomId: 'table-1',
  boardId: 'finished-1',
  boardNumber: 1,
  completedAt: 10000,
  dealer: 'North',
  vulnerability: 'None',
  initialHands: {
    North: ['AS', '2C'],
    East: ['2S'],
    South: ['3S'],
    West: ['4S'],
  },
  auction: [
    { seat: 'North', bid: '1NT' },
    { seat: 'East', bid: 'pass' },
  ],
  tricks: [
    {
      leader: 'North',
      plays: [
        { seat: 'North', card: 'AS' },
        { seat: 'East', card: '2S' },
        { seat: 'South', card: '3S' },
        { seat: 'West', card: '4S' },
      ],
      winner: 'North',
    },
  ],
  contract: '1NT',
  contractMultiplier: 1,
  declarer: 'North',
  result: { passedOut: false, scoreNS: 90, scoreEW: -90 },
  agreements: { NS: agreement, EW: agreement },
};
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(roadmapService, 'scoreboard').mockResolvedValue({ completedBoards: 1, scoreNS: 90, scoreEW: -90, lastBoardId: 'finished-1' });
  usePreferencesStore.setState({
    motion: 'auto',
    sound: false,
    practiceSpeed: 'standard',
  });
  useRoomFeaturesStore.getState().clear();
  useUserStore.setState({ userId: 'me', playerName: 'You' });
  useGameStore.getState().startNewGame();
  useRoomDataStore
    .getState()
    .setCurrentRoom({ ...snapshot().room, locked: false } as any);
  resetSoundBaseline();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('authorized finished-board replay', () => {
  it('orders auction, trick cards and winner, retaining original archive data', () => {
    const steps = replaySteps(archivedBoard);
    expect(steps.map((step) => step.kind)).toEqual([
      'auction',
      'auction',
      'card',
      'card',
      'card',
      'card',
      'winner',
    ]);
    expect(archivedBoard.initialHands.North).toEqual(['AS', '2C']);
  });
  it('requests only authorized archive routes and rejects incomplete archive envelopes', async () => {
    const request = vi.spyOn(websocketService, 'request').mockResolvedValue({
      action: 'boardArchive',
      board: { ...archivedBoard, completedAt: null },
    });
    await expect(
      boardFeaturesService.archive('table-1', 'finished-1')
    ).rejects.toThrow('completed, authorized');
    expect(request).toHaveBeenCalledWith(
      {
        action: 'getBoardArchive',
        data: { roomId: 'table-1', boardId: 'finished-1' },
      },
      ['boardArchive'],
      expect.any(Function)
    );
  });
  it('does not use current game hands when server denies the archive', async () => {
    vi.spyOn(boardFeaturesService, 'archivePage').mockResolvedValue({ boards: [archivedBoard], nextBeforeBoardNumber: null });
    vi.spyOn(boardFeaturesService, 'archive').mockRejectedValue(
      new Error('Archive access denied')
    );
    render(<BoardReplay roomId="table-1" onClose={vi.fn()} />);
    await screen.findByRole('option', { name: /Board 1/ });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'finished-1' },
    });
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Archive access denied'
    );
    expect(
      screen.queryByRole('region', { name: 'Replay steps' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('A♠')).not.toBeInTheDocument();
  });
  it('supports keyboard stepping, remaining hands, score and frozen agreements in a modal', async () => {
    vi.spyOn(boardFeaturesService, 'archivePage').mockResolvedValue({ boards: [archivedBoard], nextBeforeBoardNumber: null });
    vi.spyOn(boardFeaturesService, 'archive').mockResolvedValue(archivedBoard);
    const close = vi.fn();
    render(<BoardReplay roomId="table-1" onClose={close} />);
    await screen.findByRole('option', { name: /Board 1/ });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'finished-1' },
    });
    const replay = await screen.findByLabelText('Replay steps');
    expect(screen.getByText(/Final score NS 90/)).toBeInTheDocument();
    expect(screen.getByText('2♣ · A♠')).toBeInTheDocument();
    fireEvent.keyDown(replay, { key: 'End' });
    expect(screen.getByRole('status')).toHaveTextContent('won by North');
    expect(screen.getByText('2♣')).toBeInTheDocument();
    fireEvent.keyDown(replay, { key: 'Home' });
    expect(screen.getByRole('status')).toHaveTextContent('Initial deal');
    fireEvent.keyDown(replay, { key: 'ArrowRight' });
    expect(screen.getByRole('status')).toHaveTextContent('North: 1NT');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(screen.queryByLabelText('Replay steps')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Completed-board replay' })
    );
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('versioned agreements and truthful presence', () => {
  it('shows actual backend supported and unsupported sections without configurable controls', async () => {
    useRoomFeaturesStore
      .getState()
      .update('table-1', { agreements: { NS: agreement, EW: agreement } });
    const get = vi.spyOn(boardFeaturesService, 'agreement').mockResolvedValue({
      agreements: { NS: agreement, EW: agreement },
      card: {
        ...agreement,
        title: 'Supported SAYC',
        supported: [
          { topic: 'Opening 1NT', description: 'Balanced 15–17 HCP' },
        ],
        unsupported: ['Weak jump shifts'],
        deviations: ['No convention overrides'],
        source: 'docs/robot-engine-contract.md',
      },
    });
    render(<ConventionCard roomId="table-1" onClose={vi.fn()} />);
    await screen.findByText('Balanced 15–17 HCP');
    expect(get).toHaveBeenCalledWith('table-1', 'sayc-supported-1');
    expect(screen.getByText('Weak jump shifts')).toBeInTheDocument();
    expect(screen.getByText(/Frozen for this board/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  it('renders server presence with grace countdown and duplicate tab count', () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, 'clearInterval');
    useRoomDataStore.getState().updateCurrentRoom({
      presence: {
        North: {
          status: 'reconnecting',
          reservedUntil: Date.now() / 1000 + 120,
          connectionCount: 0,
        },
      },
    });
    const { rerender, unmount } = render(<SeatPresence seat="North" />);
    expect(
      screen.getByText('Reconnecting · 120s reserved')
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(
      screen.getByText('Reconnecting · 119s reserved')
    ).toBeInTheDocument();
    act(() =>
      useRoomDataStore.getState().updateCurrentRoom({
        presence: { North: { status: 'online', connectionCount: 2 } },
      })
    );
    rerender(<SeatPresence seat="North" />);
    expect(screen.getByText('Online · 2 tabs')).toBeInTheDocument();
    unmount();
    expect(clear).toHaveBeenCalled();
  });
  it('never offers automatic replacement or release during active play, and waits for server replacement', async () => {
    applyRoomMessage(snapshot(), 'table-1');
    useRoomDataStore.getState().updateCurrentRoom({
      presence: {
        South: {
          status: 'reconnecting',
          connectionCount: 0,
          reservedUntil: Date.now() / 1000 + 120,
        },
        West: { status: 'offline', connectionCount: 0 },
      },
    });
    const request = vi
      .spyOn(websocketService, 'request')
      .mockRejectedValue(new Error('Seat reconnected; replacement denied'));
    render(<RoomFeatures onLeave={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /Replace South/, hidden: true })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /release seat/, hidden: true })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Room membership and access'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Replace West with robot' })
    );
    await screen.findByRole('alert');
    expect(request).toHaveBeenCalledWith(
      { action: 'replacePlayer', data: { roomId: 'table-1', seat: 'West' } },
      ['roomUpdated'],
      expect.any(Function)
    );
    expect(useRoomDataStore.getState().currentRoom?.seats.West).toBe(
      'opponent'
    );
  });
  it('ignores stale feature revisions along with stale game snapshots', () => {
    const first: any = snapshot();
    first.publicState.agreements = { NS: agreement, EW: agreement };
    applyRoomMessage(first, 'table-1');
    const stale: any = snapshot();
    stale.publicState.revision = 1;
    stale.publicState.boardId = 'stale';
    applyRoomMessage(stale, 'table-1');
    expect(useRoomFeaturesStore.getState().board.boardId).toBe('board-2');
  });
});

describe('persisted preferences and server-only practice speed', () => {
  it('rejects unknown persisted preference values during rehydration', async () => {
    localStorage.setItem(
      'bridge-player-preferences',
      JSON.stringify({
        version: 1,
        state: {
          motion: 'invalid',
          sound: 'enabled',
          practiceSpeed: 'instant',
        },
      })
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState()).toMatchObject({
      motion: 'auto',
      sound: false,
      practiceSpeed: 'standard',
    });
  });
  it('persists preferences and respects system reduction even in full motion mode', () => {
    usePreferencesStore.getState().setMotion('full');
    usePreferencesStore.getState().setPracticeSpeed('quick');
    const saved = JSON.parse(
      localStorage.getItem('bridge-player-preferences')!
    );
    expect(saved.state).toMatchObject({
      motion: 'full',
      practiceSpeed: 'quick',
      sound: false,
    });
    expect(shouldReduceMotion('full', true)).toBe(true);
    expect(shouldReduceMotion('full', false)).toBe(false);
    expect(shouldReduceMotion('reduced', false)).toBe(true);
    render(<PreferenceEffects />);
    expect(document.documentElement.dataset.motion).toBe('full');
    act(() => usePreferencesStore.getState().setMotion('reduced'));
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });
  it('is silent by default and does not mark sound enabled when browser unlock fails', async () => {
    render(<PlayerPreferences />);
    fireEvent.click(screen.getByText('Player preferences'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable sound', exact: true })
    );
    await screen.findByRole('alert');
    expect(usePreferencesStore.getState().sound).toBe(false);
  });
  it('cues a new live turn once, never snapshot/reconnect/duplicate updates', async () => {
    const start = vi.fn();
    class Audio {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => {});
      createOscillator = () => ({
        connect: vi.fn(),
        frequency: { value: 0 },
        start,
        stop: vi.fn(),
      });
      createGain = () => ({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      });
    }
    vi.stubGlobal('AudioContext', Audio);
    await unlockSound();
    usePreferencesStore.getState().setSound(true);
    const frame = (
      revision: number,
      isMyTurn: boolean,
      action = 'cardPlayed'
    ) => ({
      action,
      publicState: { revision, boardId: 'one' },
      privateState: { isMyTurn },
    });
    observeSoundSnapshot(frame(1, false, 'gameState'), 'table-1');
    observeSoundSnapshot(frame(2, true), 'table-1');
    observeSoundSnapshot(frame(2, true), 'table-1');
    expect(start).toHaveBeenCalledOnce();
    resetSoundBaseline();
    observeSoundSnapshot(frame(5, true, 'gameState'), 'table-1');
    observeSoundSnapshot(frame(5, true), 'table-1');
    expect(start).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
  it('shows no practice speed for multiplayer and applies solo speed only after server confirms', async () => {
    applyRoomMessage(snapshot(), 'table-1');
    const request = vi
      .spyOn(websocketService, 'request')
      .mockRejectedValue(new Error('Practice requires exactly one human'));
    const { rerender } = render(<RoomFeatures onLeave={vi.fn()} />);
    expect(screen.queryByText('Solo practice pace')).not.toBeInTheDocument();
    act(() =>
      useRoomDataStore.getState().updateCurrentRoom({
        seats: {
          North: 'me',
          East: 'ROBOT_1',
          South: 'ROBOT_2',
          West: 'ROBOT_3',
        },
      })
    );
    rerender(<RoomFeatures onLeave={vi.fn()} />);
    fireEvent.click(screen.getByText('Solo practice pace'));
    fireEvent.change(screen.getByLabelText('Practice speed'), {
      target: { value: 'quick' },
    });
    await screen.findByRole('alert');
    expect(request).toHaveBeenCalledWith(
      {
        action: 'setPracticePace',
        data: {
          roomId: 'table-1',
          practiceMode: true,
          revision: 7,
          robotCardDelayMs: 300,
          trickHoldMs: 1000,
        },
      },
      ['practicePaceChanged'],
      expect.any(Function)
    );
    expect(usePreferencesStore.getState().practiceSpeed).toBe('standard');
  });
});
