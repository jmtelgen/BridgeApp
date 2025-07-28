import { loadDDS } from './dds/dds-loader';

// Bridge game constants and types
export enum Suit {
  SPADES = 0,
  HEARTS = 1,
  DIAMONDS = 2,
  CLUBS = 3
}

export enum Rank {
  TWO = 0,
  THREE = 1,
  FOUR = 2,
  FIVE = 3,
  SIX = 4,
  SEVEN = 5,
  EIGHT = 6,
  NINE = 7,
  TEN = 8,
  JACK = 9,
  QUEEN = 10,
  KING = 11,
  ACE = 12
}

export enum Direction {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3
}

export enum Strain {
  CLUBS = 0,
  DIAMONDS = 1,
  HEARTS = 2,
  SPADES = 3,
  NO_TRUMP = 4
}

// String representations for easy conversion
export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const DIRECTIONS = ['N', 'E', 'S', 'W'];
export const STRAINS = ['C', 'D', 'H', 'S', 'NT'];

// DDS instance type
export interface DDSInstance {
  _dds_init(): void;
  _do_dds_solve_board(
    contract_bid: number,
    hand_to_play: number,
    currentTrick0: number,
    currentTrick1: number,
    currentTrick2: number,
    pbn_remain_cards: number,
    output_array: number
  ): number;
  allocateUTF8(str: string): number;
  _malloc(size: number): number;
  _free(ptr: number): void;
  getValue(ptr: number, type: string): number;
}

// Result type for solver
export interface DDSSolution {
  card: string;
  score: number;
}

// Convert hands to DDS deal string format
export function handsToDealString(hands: Record<string, string[]>, dealer: string): string {
  const directions = ['N', 'E', 'S', 'W'];
  const dealParts: string[] = [];
  
  for (const direction of directions) {
    if (!hands[direction]) {
      throw new Error(`Missing hand for direction: ${direction}`);
    }
    
    const hand = hands[direction];
    const suits: string[] = ['', '', '', '']; // S, H, D, C
    
    for (const card of hand) {
      const rank = card[0];
      const suit = card[1];
      const suitIndex = SUITS.indexOf(suit);
      
      if (suitIndex === -1) {
        throw new Error(`Invalid suit in card: ${card}`);
      }
      
      suits[suitIndex] += rank;
    }
    
    dealParts.push(suits.join('.'));
  }
  
  // Format: "dealer:hands" (e.g., "N:AS.KH.QD KS.AH.JD QS.JH.KD JS.QH.AD")
  return `${dealer}:${dealParts.join(' ')}`;
}

// Convert card string to card index for current trick
// Use our encoding: suit * 13 + rank
export function cardToIndex(cardString: string): number {
  const suitIndex = SUITS.indexOf(cardString[0]);
  const rankIndex = RANKS.indexOf(cardString[1]);
  
  if (suitIndex === -1 || rankIndex === -1) {
    throw new Error(`Invalid card: ${cardString}`);
  }
  
  // Use our encoding: suit * 13 + rank
  return suitIndex * 13 + rankIndex;
}

// Convert result buffer to solutions
export function bufferToSolutions(instance: DDSInstance, outputArray: number, numCards: number): DDSSolution[] {
  const solutions: DDSSolution[] = [];
  
  // The output array contains pairs of (card, result) integers
  // Each card is encoded using our format: suit * 13 + rank
  for (let i = 0; i < numCards * 2; i += 2) {
    const cardValue = instance.getValue(outputArray + i * 4, 'i32');
    const scoreValue = instance.getValue(outputArray + (i + 1) * 4, 'i32');
    
    if (cardValue === -1) {
      break; // End of valid results
    }
    
    // Convert card encoding back to our format
    // Our encoding: suit * 13 + rank
    const suit = Math.floor(cardValue / 13);
    const rank = cardValue % 13;
    
    if (suit >= 0 && suit < 4 && rank >= 0 && rank < 13) {
      const cardString = SUITS[suit] + RANKS[rank];
      solutions.push({ card: cardString, score: scoreValue });
    }
  }
  
  return solutions;
}

// Main solver function
export async function solveBoard(params: {
  trump: string;
  first: string;
  dealer: string; // Who dealt the cards
  currentTrick?: string[]; // Optional - if not provided or empty, no cards have been played
  hands: Record<string, string[]>;
}): Promise<DDSSolution[]> {
  const {
    trump,
    first,
    dealer,
    currentTrick = [], // Default to empty array if not provided
    hands,
  } = params;

  // Validate inputs
  const trumpIndex = STRAINS.indexOf(trump);
  const firstIndex = DIRECTIONS.indexOf(first);

  if (trumpIndex === -1) {
    throw new Error(`Invalid trump: ${trump}`);
  }
  if (firstIndex === -1) {
    throw new Error(`Invalid first player: ${first}`);
  }

  // Use our encoding directly: 0=clubs, 1=diamonds, 2=hearts, 3=spades, 4=NT
  // The DDS function will handle the translation internally
  const ddsTrump = trumpIndex;

  // Convert hands to DDS deal string format
  const dealString = handsToDealString(hands, dealer);
    
  try {
    // Initialize DDS
    const instance = await loadDDS();
    instance._dds_init();
    
    console.log('dealString', dealString);
    // Allocate memory for deal string
    const dealStringPtr = instance.allocateUTF8(dealString);
    
    // Allocate memory for results (26 cards max)
    const outputArray = instance._malloc(26 * 4);
    
    // Convert current trick to card indices
    // If no cards have been played yet, all values should be -1
    const currentTrick0 = currentTrick.length > 0 ? cardToIndex(currentTrick[0]) : -1;
    const currentTrick1 = currentTrick.length > 1 ? cardToIndex(currentTrick[1]) : -1;
    const currentTrick2 = currentTrick.length > 2 ? cardToIndex(currentTrick[2]) : -1;
    
    try {
      // Solve the board
      const numNodes = instance._do_dds_solve_board(
        ddsTrump,
        firstIndex,
        currentTrick0,
        currentTrick1,
        currentTrick2,
        dealStringPtr,
        outputArray
      );
      
      if (numNodes < 0) {
        throw new Error(`DDS solver error: ${numNodes}`);
      }

      // Convert buffer to solutions
      // The function returns the number of nodes, but we need to process all possible results
      // The output array can contain up to 26 integers (13 pairs of card/score)
      const result = bufferToSolutions(instance, outputArray, 13);
      return result;
      
    } finally {
      // Clean up allocated memory
      instance._free(outputArray);
      instance._free(dealStringPtr);
    }
    
  } catch (error) {
    throw new Error(`DDS solver failed: ${error}`);
  }
}

// Utility functions for working with cards
export function cardToString(suit: Suit, rank: Rank): string {
  return SUITS[suit] + RANKS[rank];
}

export function stringToCard(cardString: string): { suit: Suit; rank: Rank } {
  const suitIndex = SUITS.indexOf(cardString[0]);
  const rankIndex = RANKS.indexOf(cardString[1]);
  
  if (suitIndex === -1 || rankIndex === -1) {
    throw new Error(`Invalid card string: ${cardString}`);
  }
  
  return { suit: suitIndex as Suit, rank: rankIndex as Rank };
}

export function isValidCard(cardString: string): boolean {
  return SUITS.includes(cardString[0]) && RANKS.includes(cardString[1]);
}

// Helper function to create a deal string from individual hands
export function createDealString(northHand: string[], eastHand: string[], southHand: string[], westHand: string[], dealer: string): string {
  const hands = {
    'N': northHand,
    'E': eastHand,
    'S': southHand,
    'W': westHand
  };
  return handsToDealString(hands, dealer);
}

// Example usage function
// Helper function for solving a board when no cards have been played yet
export async function solveBoardFromStart(params: {
  trump: string;
  first: string;
  dealer: string; // Who dealt the cards
  hands: Record<string, string[]>;
}): Promise<DDSSolution[]> {
  return solveBoard({
    ...params,
    currentTrick: [] // No cards played yet
  });
}

export async function solveExample(): Promise<void> {
  const hands = {
    'N': ['AS', 'AH', 'AD', 'AC', 'QS', 'QH', 'QD', 'QC', 'JS', 'JH', 'JD', 'JC', 'TS'],
    'E': ['KS', 'KH', 'KD', 'KC', '9S', '9H', '9D', '9C', '8S', '8H', '8D', '8C', '7S'],
    'S': ['6S', '6H', '6D', '6C', '5S', '5H', '5D', '5C', '4S', '4H', '4D', '4C', '3S'],
    'W': ['3H', '3D', '3C', '2S', '2H', '2D', '2C', 'TH', 'TD', 'TC', '7H', '7D', '7C']
  };
  
  try {
    const solutions = await solveBoardFromStart({
      trump: 'NT',
      first: 'N',
      dealer: 'N', // North is the dealer
      hands: hands
    });
    
    console.log('Solutions:', solutions);
  } catch (error) {
    console.error('Error solving board:', error);
  }
}
