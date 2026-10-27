import {
  PrivateGameState,
  SeatBasedGameResponse,
  GameData,
  Position,
  PlayingCard,
  Bid,
  Trick,
  Suit,
  Rank,
} from '../components/bridge/types'

const positions: Position[] = ['North', 'East', 'South', 'West']
const seat = (value: string | null | undefined): Position | null =>
  positions.includes(value as Position) ? (value as Position) : null
const suits: Record<string, Suit | 'NT'> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
  NT: 'NT',
}
export const convertServerCardToFrontend = (value: string): PlayingCard => {
  if (!/^[2-9TJQKA][CDHS]$/.test(value))
    throw new Error(`Invalid card: ${value}`)
  const rank = (value[0] === 'T' ? '10' : value[0]) as Rank
  return {
    rank,
    suit: suits[value[1]] as Suit,
    value: { A: 14, K: 13, Q: 12, J: 11, T: 10 }[value[0]] || Number(value[0]),
  }
}
export const convertFrontendCardToServer = (card: PlayingCard): string =>
  (card.rank === '10' ? 'T' : card.rank) +
  { '♣': 'C', '♦': 'D', '♥': 'H', '♠': 'S' }[card.suit]

export const convertServerBidToFrontend = (
  value: string,
  player: string
): Bid => {
  const type =
    value === 'pass'
      ? 'Pass'
      : value === 'double'
      ? 'Double'
      : value === 'redouble'
      ? 'Redouble'
      : 'Bid'
  const match = /^([1-7])(C|D|H|S|NT)$/.exec(value)
  if (type === 'Bid' && !match) throw new Error(`Invalid bid: ${value}`)
  return {
    type,
    level: match ? Number(match[1]) : (type as 'Pass' | 'Double' | 'Redouble'),
    suit: match ? suits[match[2]] : undefined,
    player: seat(player) || 'North',
  }
}
export const convertServerContractToFrontend = (
  value: string,
  declarer: string,
  multiplier = 1
): GameData['contract'] => {
  const match = /^([1-7])(C|D|H|S|NT)(XX|X)?$/.exec(value)
  if (!match || !seat(declarer)) return null
  const factor = match[3] === 'XX' ? 4 : match[3] === 'X' ? 2 : multiplier
  return {
    level: Number(match[1]),
    suit: suits[match[2]],
    declarer: declarer as Position,
    doubled: factor === 2,
    redoubled: factor === 4,
  }
}
export const convertServerTrickToFrontend = (input: any): Trick => {
  const plays = Array.isArray(input) ? input : input?.plays || []
  const trick: Trick = {
    cards: { North: null, East: null, South: null, West: null },
    winner: seat(input?.winner),
    trickLeader: seat(input?.leader || plays[0]?.seat),
    ledSuit: null,
  }
  for (const play of plays) {
    const position = seat(play.seat)
    if (position && play.card)
      trick.cards[position] = convertServerCardToFrontend(play.card)
  }
  if (plays[0]?.card)
    trick.ledSuit = convertServerCardToFrontend(plays[0].card).suit
  return trick
}
export const convertServerVulnerabilityToFrontend = (
  value: string
): GameData['vulnerability'] => ({
  NS: value === 'NS' || value === 'Both',
  EW: value === 'EW' || value === 'Both',
})
export const convertServerPhaseToFrontend = (
  phase: string
): 'bidding' | 'playing' | 'completed' =>
  phase === 'playing' || phase === 'completed' ? phase : 'bidding'
export const convertServerTurnToFrontendPosition = (
  value: string,
  _seats: Record<string, string>
): Position => seat(value) || 'North'

export const convertSeatBasedResponseToGameData = (
  response: SeatBasedGameResponse,
  _seats: Record<string, string>,
  currentPlayerPosition: Position
): GameData => {
  const { publicState: state, privateState: mine } = response
  const hands: GameData['hands'] = { North: [], East: [], South: [], West: [] }
  const ownSeat = seat(mine.seat) || currentPlayerPosition
  hands[ownSeat] = (mine.hand || []).map(convertServerCardToFrontend)
  const dummy = seat(state.dummy)
  if (dummy && state.dummyHand)
    hands[dummy] = state.dummyHand.map(convertServerCardToFrontend)
  const tricks = (state.tricks || []).map(convertServerTrickToFrontend)
  const contract =
    state.contract && state.declarer
      ? convertServerContractToFrontend(
          state.contract,
          state.declarer,
          state.contractMultiplier
        )
      : null
  return {
    phase: convertServerPhaseToFrontend(state.currentPhase),
    currentPlayer: seat(state.turn) || ownSeat,
    dealer: seat(state.dealer) || 'North',
    bids: (state.bids || []).map((bid) =>
      convertServerBidToFrontend(bid.bid, bid.seat)
    ),
    hands,
    currentTrick: convertServerTrickToFrontend(state.currentTrick),
    tricks,
    previousTrick: state.previousTrick
      ? convertServerTrickToFrontend(state.previousTrick)
      : null,
    completedTrick: state.completedTrick
      ? convertServerTrickToFrontend(state.completedTrick)
      : null,
    scheduledAction: state.pendingAction || null,
    serverTimeMs: state.serverTimeMs,
    contract,
    dummy,
    firstCardPlayed: state.dummyHand != null,
    gameNumber: state.boardNumber || 1,
    vulnerability: convertServerVulnerabilityToFrontend(state.vulnerability),
    validBids: mine.validBids || [],
    legalCards: mine.legalCards || [],
    playSeat: mine.playSeat || null,
    isMyTurn: mine.isMyTurn,
    handCounts: state.handCounts || {},
    revision: state.revision,
    result: state.result || null,
    scores: state.scores,
  }
}
export const isCurrentPlayerTurn = (state: PrivateGameState): boolean =>
  state.isMyTurn
