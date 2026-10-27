import { Position } from '../components/bridge/types';
import { featureRequest } from './boardFeaturesService';
import { websocketService } from './websocketService';

export type ComputerLevel = 'heuristic' | 'standard' | 'thoughtful';
export interface MatchScoreboard {
  completedBoards: number;
  scoreNS: number;
  scoreEW: number;
  lastBoardId: string | null;
}
export interface PracticeHint {
  phase: string;
  actor: Position;
  controller: Position;
  legalActions: string[];
  explanation: string;
  suggestion?: {
    card: string;
    mode: string;
    completedSamples: number;
    degraded: boolean;
    caution: string;
  } | null;
  information?: string;
  handHcp?: number;
  shape?: Record<string, number>;
}
export interface ClaimProposal {
  proposalId: string;
  boardId: string;
  proposer: Position;
  side: 'NS' | 'EW';
  tricks: number;
  remainingTricks: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'disconnected';
  requiredSeats: Position[];
  votes: Partial<Record<Position, boolean>>;
  expiresAt: number;
}
export interface DuplicateEvent {
  eventId: string;
  organizerId: string;
  status: 'waiting' | 'started' | 'completed';
  tableCount: number;
  boardCount: number;
  scoring: 'IMPs' | 'matchpoints';
  tables: { tableNumber: number; roomId: string }[];
  boards: {
    boardNumber: number;
    boardId: string;
    completedTables: number;
    released: boolean;
    results: { tableNumber: number; scoreNS: number; scoreEW: number; pointsNS: number; pointsEW: number }[];
  }[];
  totals: { tableNumber: number; pointsNS: number; pointsEW: number }[];
}

export const roadmapService = {
  async scoreboard(roomId: string): Promise<MatchScoreboard> {
    const response = await featureRequest(roomId, 'getMatchScoreboard', 'matchScoreboard');
    const value = response.scoreboard;
    if (!value || !Number.isInteger(value.completedBoards) || !Number.isFinite(value.scoreNS) || !Number.isFinite(value.scoreEW))
      throw new Error('The server returned an invalid match scoreboard.');
    return value;
  },
  async hint(roomId: string, revision: number | undefined, suggest: boolean) {
    const response = await featureRequest(roomId, 'getPracticeHint', 'practiceHint', { revision, suggest });
    if (!response.hint || !Array.isArray(response.hint.legalActions) || typeof response.hint.explanation !== 'string')
      throw new Error('The server returned an invalid practice explanation.');
    return { revision: response.revision as number, hint: response.hint as PracticeHint };
  },
  level(roomId: string, revision: number | undefined, computerLevel: ComputerLevel) {
    return featureRequest(roomId, 'setComputerLevel', 'computerLevelChanged', { revision, computerLevel });
  },
  claim(roomId: string, action: 'proposeClaim' | 'respondClaim' | 'cancelClaim', data: Record<string, unknown>) {
    return websocketService.request({ action, data: { roomId, ...data } }, ['claimUpdated'], (message) => {
      if ((message.roomId && message.roomId !== roomId) || (message.room?.roomId && message.room.roomId !== roomId)) return false;
      if (message.action === 'error') return true;
      const claim = message.publicState?.claim;
      if (claim?.proposalId !== data.proposalId) return false;
      if (action === 'cancelClaim') return claim.status === 'cancelled';
      if (action === 'respondClaim') return claim.votes?.[message.privateState?.seat] === data.accept;
      return true;
    });
  },
  async event(action: 'createDuplicateEvent' | 'joinDuplicateEvent' | 'startDuplicateEvent' | 'getDuplicateEvent', data: Record<string, unknown>) {
    const actions = {
      createDuplicateEvent: 'duplicateEventCreated',
      joinDuplicateEvent: 'duplicateEventJoined',
      startDuplicateEvent: 'duplicateEventStarted',
      getDuplicateEvent: 'duplicateEvent',
    };
    const response = await websocketService.request(
      { action, data }, [actions[action]],
      (message) => (message.action === 'error' || !data.eventId || message.eventId === data.eventId) &&
        (!message.roomId || !data.roomId || message.roomId === data.roomId)
    );
    if (!response.event || !Array.isArray(response.event.tables) || !Array.isArray(response.event.boards) || !Array.isArray(response.event.totals))
      throw new Error('The server returned an invalid duplicate event.');
    return { event: response.event as DuplicateEvent, invitationToken: response.invitationToken as string | undefined };
  },
};
