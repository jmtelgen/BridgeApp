import { describe, expect, it } from 'vitest'
import { sortVisibleHand } from '../../src/utils/handOrder'
import { convertFrontendCardToServer, convertServerCardToFrontend } from '../../src/utils/gameStateConverter'
import { Suit } from '../../src/components/bridge/types'

describe('visible hand order', () => {
  it.each([
    [null, 'CDHS'], ['NT', 'CDHS'], ['♣', 'DHSC'],
    ['♦', 'CHSD'], ['♥', 'CDSH'], ['♠', 'CDHS'],
  ] as [Suit | 'NT' | null, string][])('sorts low to high with %s trump last', (trump, suits) => {
    const ranks = '23456789TJQKA'
    const source = Object.freeze([...suits].flatMap(suit =>
      [...ranks].reverse().map(rank => Object.freeze(convertServerCardToFrontend(rank + suit)))
    ).reverse())
    const original = [...source]
    const result = sortVisibleHand(source, trump)
    expect(result.map(convertFrontendCardToServer)).toEqual(
      [...suits].flatMap(suit => [...ranks].map(rank => rank + suit))
    )
    expect(source).toEqual(original)
    expect(result).not.toBe(source)
    expect(result.every(card => source.includes(card))).toBe(true)
  })
  it('uses canonical ranks rather than trusting comparison values', () => {
    const cards = ['AC', 'TC', '2C'].map(convertServerCardToFrontend).map(card => ({ ...card, value: 0 }))
    expect(sortVisibleHand(cards).map(convertFrontendCardToServer)).toEqual(['2C', 'TC', 'AC'])
  })
})
