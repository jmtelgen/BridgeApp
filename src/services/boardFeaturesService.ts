import { websocketService } from './websocketService';
import { Position } from '../components/bridge/types';

export interface AgreementRef {
  system: string;
  version: string;
}
export interface AgreementCard extends AgreementRef {
  title: string;
  supported: { topic: string; description: string }[];
  unsupported: string[];
  deviations: string[];
  source: string;
}
export interface BoardSummary {
  boardId: string;
  boardNumber: number;
  completedAt: number | string;
  result: { passedOut: boolean; scoreNS: number; scoreEW: number };
}
export interface ArchivedBoard extends BoardSummary {
  schemaVersion: 1;
  roomId: string;
  dealer: Position;
  vulnerability: string;
  initialHands: Record<Position, string[]>;
  auction: { seat: Position; bid: string; timestamp?: number }[];
  tricks: {
    leader: Position;
    plays: { seat: Position; card: string; timestamp?: number }[];
    winner: Position;
  }[];
  contract: string | null;
  contractMultiplier: number;
  declarer: Position | null;
  claimSettlement?: {
    proposalId: string;
    proposer: Position;
    allocation: { NS: number; EW: number };
    acceptedAt: number;
    unplayedTrick: { seat: Position; card: string; timestamp?: number }[];
  } | null;
  agreements: Record<'NS' | 'EW', AgreementRef>;
}

export function featureRequest(
  roomId: string,
  action: string,
  response: string,
  data: Record<string, unknown> = {}
) {
  return websocketService.request(
    { action, data: { roomId, ...data } },
    [response],
    (message) =>
      (!message.roomId || message.roomId === roomId) &&
      (!message.room?.roomId || message.room.roomId === roomId)
  );
}

export const boardFeaturesService = {
  async archivePage(roomId: string, beforeBoardNumber?: number): Promise<{ boards: BoardSummary[]; nextBeforeBoardNumber: number | null }> {
    const response = await featureRequest(roomId, 'listBoardArchives', 'boardArchives', {
      limit: 20,
      ...(beforeBoardNumber == null ? {} : { beforeBoardNumber }),
    });
    if (!Array.isArray(response.boards) ||
      (response.nextBeforeBoardNumber != null && (!Number.isInteger(response.nextBeforeBoardNumber) || response.nextBeforeBoardNumber < 1)))
      throw new Error('The server returned an invalid board archive page.');
    return { boards: response.boards, nextBeforeBoardNumber: response.nextBeforeBoardNumber ?? null };
  },
  async listArchives(roomId: string): Promise<BoardSummary[]> {
    const response = await featureRequest(
      roomId,
      'listBoardArchives',
      'boardArchives',
      { limit: 100 }
    );
    if (!Array.isArray(response.boards))
      throw new Error('The server returned an invalid board archive list.');
    return response.boards;
  },
  async archive(roomId: string, boardId: string): Promise<ArchivedBoard> {
    const response = await featureRequest(
      roomId,
      'getBoardArchive',
      'boardArchive',
      { boardId }
    );
    const board = response.board as ArchivedBoard;
    if (
      !board ||
      board.schemaVersion !== 1 ||
      board.roomId !== roomId ||
      board.boardId !== boardId ||
      !board.completedAt ||
      !board.result ||
      !Number.isFinite(board.result.scoreNS) ||
      !Number.isFinite(board.result.scoreEW) ||
      !Array.isArray(board.auction) ||
      !Array.isArray(board.tricks) ||
      !board.agreements?.NS?.version ||
      !board.agreements?.EW?.version ||
      !(['North', 'East', 'South', 'West'] as Position[]).every(
        (seat) =>
          Array.isArray(board.initialHands?.[seat]) &&
          board.initialHands[seat].every(
            (card) =>
              typeof card === 'string' && /^[2-9TJQKA][CDHS]$/.test(card)
          )
      )
    )
      throw new Error(
        'The server did not return a completed, authorized board archive.'
      );
    return board;
  },
  async agreement(
    roomId: string,
    version?: string
  ): Promise<{
    card: AgreementCard;
    agreements: Record<'NS' | 'EW', AgreementRef>;
  }> {
    const response = await featureRequest(
      roomId,
      'getAgreementCard',
      'agreementCard',
      version ? { version } : {}
    );
    if (
      !response.card ||
      (version && response.card.version !== version) ||
      !Array.isArray(response.card.supported) ||
      !Array.isArray(response.card.unsupported) ||
      !Array.isArray(response.card.deviations)
    )
      throw new Error('The server returned an invalid convention card.');
    return { card: response.card, agreements: response.agreements };
  },
};
