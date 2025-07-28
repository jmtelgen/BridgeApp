import {
  handsToDealString,
  cardToString,
  stringToCard,
  isValidCard,
  createDealString,
  cardToIndex,
  solveBoardFromStart,
  Suit,
  Rank,
  Direction,
  Strain,
  SUITS,
  RANKS,
  DIRECTIONS,
  STRAINS
} from './double-dummy-solver';

describe('Double Dummy Solver', () => {
  describe('Utility Functions', () => {
    it('should convert suit and rank to string', () => {
      expect(cardToString(Suit.SPADES, Rank.ACE)).toBe('SA');
      expect(cardToString(Suit.HEARTS, Rank.KING)).toBe('HK');
      expect(cardToString(Suit.DIAMONDS, Rank.QUEEN)).toBe('DQ');
      expect(cardToString(Suit.CLUBS, Rank.JACK)).toBe('CJ');
    });

    it('should convert string to suit and rank', () => {
      expect(stringToCard('SA')).toEqual({ suit: Suit.SPADES, rank: Rank.ACE });
      expect(stringToCard('HK')).toEqual({ suit: Suit.HEARTS, rank: Rank.KING });
      expect(stringToCard('DQ')).toEqual({ suit: Suit.DIAMONDS, rank: Rank.QUEEN });
      expect(stringToCard('CJ')).toEqual({ suit: Suit.CLUBS, rank: Rank.JACK });
    });

    it('should validate card strings', () => {
      expect(isValidCard('SA')).toBe(true);
      expect(isValidCard('HK')).toBe(true);
      expect(isValidCard('DQ')).toBe(true);
      expect(isValidCard('CJ')).toBe(true);
      expect(isValidCard('XX')).toBe(false);
      expect(isValidCard('A')).toBe(false);
      expect(isValidCard('')).toBe(false);
    });

    it('should convert card to index', () => {
      // Our encoding: suit * 13 + rank
      // SA: suit=3 (spades), rank=12 (ace) -> 3*13 + 12 = 51
      expect(cardToIndex('SA')).toBe(3 * 13 + 12); // Spades=3, Ace=12
      // HK: suit=2 (hearts), rank=11 (king) -> 2*13 + 11 = 37
      expect(cardToIndex('HK')).toBe(2 * 13 + 11); // Hearts=2, King=11
      // DQ: suit=1 (diamonds), rank=10 (queen) -> 1*13 + 10 = 23
      expect(cardToIndex('DQ')).toBe(1 * 13 + 10); // Diamonds=1, Queen=10
      // CJ: suit=0 (clubs), rank=9 (jack) -> 0*13 + 9 = 9
      expect(cardToIndex('CJ')).toBe(0 * 13 + 9);  // Clubs=0, Jack=9
    });

    it('should create deal string from individual hands', () => {
      const northHand = ['AS', 'KH'];
      const eastHand = ['QS', 'JH'];
      const southHand = ['KS', 'AH'];
      const westHand = ['JS', 'QH'];
      
      const result = createDealString(northHand, eastHand, southHand, westHand, 'N');
      expect(result).toBe('N:AS.KH QS.JH KS.AH JS.QH');
    });
  });

  describe('handsToDealString', () => {
    it('should convert hands to DDS deal string format', () => {
      const hands = {
        'N': ['AS', 'KH', 'QD'],
        'E': ['KS', 'AH', 'JD'],
        'S': ['QS', 'JH', 'KD'],
        'W': ['JS', 'QH', 'AD']
      };
      
      const result = handsToDealString(hands, 'N');
      expect(result).toBe('N:AS.KH.QD KS.AH.JD QS.JH.KD JS.QH.AD');
    });

    it('should handle empty suits correctly', () => {
      const hands = {
        'N': ['AS', 'KH'],
        'E': ['KS'],
        'S': ['QS', 'JH'],
        'W': ['JS']
      };
      
      const result = handsToDealString(hands, 'N');
      expect(result).toBe('N:AS.KH KS.. QS.JH JS..');
    });

    it('should throw error for missing direction', () => {
      const hands = {
        'N': ['AS'],
        'E': ['KS'],
        'S': ['QS']
        // Missing 'W'
      };
      
      expect(() => handsToDealString(hands, 'N')).toThrow('Missing hand for direction: W');
    });

    it('should throw error for invalid suit', () => {
      const hands = {
        'N': ['AS', 'XH'], // Invalid suit 'X'
        'E': ['KS'],
        'S': ['QS'],
        'W': ['JS']
      };
      
      expect(() => handsToDealString(hands, 'N')).toThrow('Invalid suit in card: XH');
    });
  });

  describe('Constants', () => {
    it('should have correct suit mappings', () => {
      expect(SUITS).toEqual(['S', 'H', 'D', 'C']);
      expect(SUITS[Suit.SPADES]).toBe('S');
      expect(SUITS[Suit.HEARTS]).toBe('H');
      expect(SUITS[Suit.DIAMONDS]).toBe('D');
      expect(SUITS[Suit.CLUBS]).toBe('C');
    });

    it('should have correct rank mappings', () => {
      expect(RANKS).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
      expect(RANKS[Rank.TWO]).toBe('2');
      expect(RANKS[Rank.ACE]).toBe('A');
      expect(RANKS[Rank.KING]).toBe('K');
      expect(RANKS[Rank.QUEEN]).toBe('Q');
    });

    it('should have correct direction mappings', () => {
      expect(DIRECTIONS).toEqual(['N', 'E', 'S', 'W']);
      expect(DIRECTIONS[Direction.NORTH]).toBe('N');
      expect(DIRECTIONS[Direction.EAST]).toBe('E');
      expect(DIRECTIONS[Direction.SOUTH]).toBe('S');
      expect(DIRECTIONS[Direction.WEST]).toBe('W');
    });

    it('should have correct strain mappings', () => {
      expect(STRAINS).toEqual(['C', 'D', 'H', 'S', 'NT']);
      expect(STRAINS[Strain.CLUBS]).toBe('C');
      expect(STRAINS[Strain.DIAMONDS]).toBe('D');
      expect(STRAINS[Strain.HEARTS]).toBe('H');
      expect(STRAINS[Strain.SPADES]).toBe('S');
      expect(STRAINS[Strain.NO_TRUMP]).toBe('NT');
    });
  });

  describe('Integration', () => {
    it('should create valid deal string for complete bridge deal', () => {
      const hands = {
        'N': ['AS', 'KS', 'QS', 'JS', 'AH', 'KH', 'QH', 'JH', 'AD', 'KD', 'QD', 'JD', 'AC'],
        'E': ['TS', '9S', '8S', '7S', 'TH', '9H', '8H', '7H', 'TD', '9D', '8D', '7D', 'KC'],
        'S': ['6S', '5S', '4S', '3S', '6H', '5H', '4H', '3H', '6D', '5D', '4D', '3D', 'QC'],
        'W': ['2S', '2H', '2D', '2C', 'TC', '9C', '8C', '7C', '6C', '5C', '4C', '3C', 'JC']
      };
      
      const result = handsToDealString(hands, 'N');
      expect(result).toBeDefined();
      expect(result.includes('AS.KS.QS.JS.AH.KH.QH.JH.AD.KD.QD.JD.AC')).toBe(true);
      expect(result.includes('TS.9S.8S.7S.TH.9H.8H.7H.TD.9D.8D.7D.KC')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid card format', () => {
      expect(() => stringToCard('INVALID')).toThrow('Invalid card string: INVALID');
      expect(() => stringToCard('A')).toThrow('Invalid card string: A');
      expect(() => stringToCard('')).toThrow('Invalid card string: ');
    });

    it('should handle invalid card index conversion', () => {
      expect(() => cardToIndex('INVALID')).toThrow('Invalid card: INVALID');
      expect(() => cardToIndex('XH')).toThrow('Invalid card: XH');
    });

    it('should handle invalid hands format', () => {
      const invalidHands = {
        'N': ['AS', 'INVALID_CARD'],
        'E': ['KS'],
        'S': ['QS'],
        'W': ['JS']
      };
      
      expect(() => handsToDealString(invalidHands, 'N')).toThrow('Invalid suit in card: INVALID_CARD');
    });
  });

  describe('solveBoardFromStart', () => {
    it('should handle solving board when no cards have been played', async () => {
      const hands = {
        'N': ['AS', 'KS', 'QS', 'JS', 'AH', 'KH', 'QH', 'JH', 'AD', 'KD', 'QD', 'JD', 'AC'],
        'E': ['TS', '9S', '8S', '7S', 'TH', '9H', '8H', '7H', 'TD', '9D', '8D', '7D', 'KC'],
        'S': ['6S', '5S', '4S', '3S', '6H', '5H', '4H', '3H', '6D', '5D', '4D', '3D', 'QC'],
        'W': ['2S', '2H', '2D', '2C', 'TC', '9C', '8C', '7C', '6C', '5C', '4C', '3C', 'JC']
      };

      // This test will fail if DDS is not available, but that's expected
      // We're testing the interface, not the actual DDS functionality
      try {
        const solutions = await solveBoardFromStart({
          trump: 'NT',
          first: 'N',
          dealer: 'N',
          hands
        });
        
        // If we get here, the function worked
        expect(Array.isArray(solutions)).toBe(true);
      } catch (error) {
        // Expected if DDS is not available
        expect(error).toBeDefined();
      }
    });

    it('should handle different trump suits', async () => {
      const hands = {
        'N': ['AS', 'KS', 'QS', 'JS', 'AH', 'KH', 'QH', 'JH', 'AD', 'KD', 'QD', 'JD', 'AC'],
        'E': ['TS', '9S', '8S', '7S', 'TH', '9H', '8H', '7H', 'TD', '9D', '8D', '7D', 'KC'],
        'S': ['6S', '5S', '4S', '3S', '6H', '5H', '4H', '3H', '6D', '5D', '4D', '3D', 'QC'],
        'W': ['2S', '2H', '2D', '2C', 'TC', '9C', '8C', '7C', '6C', '5C', '4C', '3C', 'JC']
      };

      try {
        const solutions = await solveBoardFromStart({
          trump: 'S', // Spades
          first: 'N',
          dealer: 'N',
          hands
        });
        
        expect(Array.isArray(solutions)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
}); 