import { beforeEach, describe, expect, it, vi } from 'vitest'
import { snapshot } from './fixtures'
import { convertFrontendCardToServer, convertSeatBasedResponseToGameData, convertServerCardToFrontend } from '../../src/utils/gameStateConverter'
import { toDisplayPosition, toGamePosition } from '../../src/utils/positionUtils'
import { applyRoomMessage } from '../../src/hooks/useWebSocketMessages'
import { useRoomDataStore } from '../../src/stores/roomDataStore'
import { useGameStore } from '../../src/stores/gameStore'
import { useUserStore } from '../../src/stores/userStore'
import { gameWebSocketService } from '../../src/services/websocketService'
import { Position } from '../../src/components/bridge/types'

describe('authoritative personalized state', () => {
  beforeEach(() => {
    useUserStore.setState({ userId: 'me' })
    useRoomDataStore.getState().clearCurrentRoom()
    useGameStore.getState().startNewGame()
  })
  it('round trips canonical rank+suit including tens', () => {
    for (const value of ['AS', 'TH', '2C', 'KD']) expect(convertFrontendCardToServer(convertServerCardToFrontend(value))).toBe(value)
    expect(() => convertServerCardToFrontend('SA')).toThrow()
  })
  it('retains multiplier, tricks, board, legal moves, public counts and result', () => {
    const fixture = snapshot()
    fixture.publicState.result = { scoreNS: 180, scoreEW: -180, declarerTricks: 7, target: 7, made: true }
    const game = convertSeatBasedResponseToGameData(fixture, {}, 'North')
    expect(game.contract).toMatchObject({ doubled: true, redoubled: false, suit: 'NT' })
    expect(game.tricks[0].winner).toBe('East')
    expect(game.previousTrick?.cards.North?.rank).toBe('K')
    expect(game.gameNumber).toBe(2)
    expect(game.result?.scoreNS).toBe(180)
    expect(game.legalCards).toEqual(['TH'])
    expect(game.hands.East).toEqual([])
    expect(game.hands.West).toEqual([])
    expect(game.firstCardPlayed).toBe(true)
    expect(game.hands.South[0].rank).toBe('10')
  })
  it('keeps dummy visible between tricks without opening-lead cards in the center', () => {
    const fixture = snapshot()
    fixture.publicState.currentTrick = []
    expect(convertSeatBasedResponseToGameData(fixture, {}, 'North').firstCardPlayed).toBe(true)
    fixture.publicState.dummyHand = null
    expect(convertSeatBasedResponseToGameData(fixture, {}, 'North').hands.South).toEqual([])
  })
  it('preserves redoubled contracts and completed passed-out results', () => {
    const fixture = snapshot()
    fixture.publicState.contract = '7NT'
    fixture.publicState.contractMultiplier = 4
    fixture.publicState.currentPhase = 'completed'
    fixture.publicState.result = { passedOut: true, scoreNS: 0, scoreEW: 0, declarerTricks: 0, target: 0, made: false }
    const game = convertSeatBasedResponseToGameData(fixture, {}, 'North')
    expect(game.contract).toMatchObject({ redoubled: true, doubled: false, level: 7, suit: 'NT' })
    expect(game.phase).toBe('completed')
    expect(game.result?.passedOut).toBe(true)
  })
  it('applies personalized start/snapshot, discards raw deals and stale/wrong-room state', () => {
    const data: any = snapshot()
    data.room.gameData = { hands: { East: ['AS'] } }
    applyRoomMessage(data, 'table-1')
    expect(useGameStore.getState().gameData.revision).toBe(7)
    expect(useGameStore.getState().currentPlayerPosition).toBe('North')
    expect(useRoomDataStore.getState().currentRoom?.gameData).toBeNull()
    const old = snapshot()
    old.publicState.revision = 1
    ;(old as any).room.roomName = 'Stale room title'
    applyRoomMessage(old, 'table-1')
    expect(useGameStore.getState().gameData.revision).toBe(7)
    expect(useRoomDataStore.getState().currentRoom?.roomName).toBe('Club table')
    applyRoomMessage(snapshot({ roomId: 'other' }), 'table-1')
    expect(useRoomDataStore.getState().currentRoom?.roomId).toBe('table-1')
  })
  it('lets only server legal moves through and never owns robot turns', async () => {
    applyRoomMessage(snapshot(), 'table-1')
    const play = vi.spyOn(gameWebSocketService, 'playCard').mockResolvedValue({ action: 'cardPlayed' })
    await useGameStore.getState().playCard(convertServerCardToFrontend('AH'))
    expect(play).not.toHaveBeenCalled()
    await useGameStore.getState().playCard(convertServerCardToFrontend('TH'))
    expect(play).toHaveBeenCalledWith('table-1', 'me', expect.objectContaining({ rank: '10' }))
    await useGameStore.getState().handleAITurn()
    expect(play).toHaveBeenCalledTimes(1)
    play.mockRestore()
  })
})

describe('seat orientation', () => {
  const seats: Position[] = ['North', 'East', 'South', 'West']
  for (const viewer of seats) it(`rotates all hands and trick positions for ${viewer}`, () => {
    expect(toDisplayPosition(viewer, viewer)).toBe('South')
    const displayed = seats.map(actual => toDisplayPosition(actual, viewer))
    expect(new Set(displayed).size).toBe(4)
    for (const actual of seats) expect(toGamePosition(toDisplayPosition(actual, viewer), viewer)).toBe(actual)
  })
})
