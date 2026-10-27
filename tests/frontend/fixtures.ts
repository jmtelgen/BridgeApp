import { SeatBasedGameResponse } from '../../src/components/bridge/types'

export function snapshot(overrides: any = {}): SeatBasedGameResponse {
  return {
    action: 'gameState', roomId: 'table-1',
    room: { roomId: 'table-1', ownerId: 'me', roomName: 'Club table', isPrivate: true, state: 'playing', seats: { North: 'me', East: 'ROBOT_1', South: 'partner', West: 'opponent' } },
    seat: 'North', playerId: 'me', message: null, lastAction: null,
    publicState: {
      currentPhase: 'playing', turn: 'South', dealer: 'North', vulnerability: 'Both',
      bids: [{ seat: 'North', bid: '1NT' }, { seat: 'East', bid: 'double' }],
      contract: '1NT', contractMultiplier: 2, declarer: 'North', openingLeader: 'East',
      dummy: 'South', dummyHand: ['TH', '2C'], currentTrick: [], previousTrick: { leader: 'East', plays: [{ seat: 'East', card: 'AS' }, { seat: 'South', card: '2S' }, { seat: 'West', card: '3S' }, { seat: 'North', card: 'KS' }], winner: 'East' },
      trickWinner: 'East', tricks: [{ leader: 'East', plays: [{ seat: 'East', card: 'AS' }], winner: 'East' }],
      gameResult: null, handCounts: { North: 12, East: 12, South: 12, West: 12 }, boardNumber: 2, revision: 7,
      scores: { NS: -100, EW: 100 }, result: null, boardId: 'board-2',
    },
    privateState: { seat: 'North', hand: ['AH', '2H'], validBids: [], legalCards: ['TH'], playSeat: 'South', isMyTurn: true, isDeclarer: true, isDummy: false, partnerSeat: 'South' },
    ...overrides,
  } as any
}
