import { create } from 'zustand';
import { AgreementRef } from '../services/boardFeaturesService';
import { ClaimProposal, ComputerLevel, DuplicateEvent, MatchScoreboard } from '../services/roadmapService';

export interface BoardFeatures {
  boardId?: string;
  revision?: number;
  agreements?: Record<'NS' | 'EW', AgreementRef>;
  practiceMode?: boolean;
  pacing?: { robotCardDelayMs: number; trickHoldMs: number };
  scoreboard?: MatchScoreboard;
  computerLevel?: ComputerLevel;
  eventId?: string | null;
  claim?: ClaimProposal | null;
  claimSettlement?: { allocation: { NS: number; EW: number } } | null;
}
export const useRoomFeaturesStore = create<{
  roomId: string | null;
  board: BoardFeatures;
  duplicateEvent: DuplicateEvent | null;
  setDuplicateEvent: (event: DuplicateEvent) => void;
  update: (roomId: string, state: BoardFeatures) => void;
  clear: () => void;
}>((set) => ({
  roomId: null,
  board: {},
  duplicateEvent: null,
  setDuplicateEvent: (duplicateEvent) => set({ duplicateEvent }),
  update: (roomId, state) =>
    set((current) => ({
      roomId,
      board: current.roomId === roomId && (!state.boardId || !current.board.boardId || state.boardId === current.board.boardId)
        ? { ...current.board, ...state } : state,
    })),
  clear: () => set({ roomId: null, board: {}, duplicateEvent: null }),
}));
