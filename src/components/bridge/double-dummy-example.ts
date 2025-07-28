import { solveBoardFromStart } from './double-dummy-solver';

// Example usage based on the user's input:
// int contract_bid = 0;        // or whatever the contract is (0-4 for suits, 5+ for NT)
// int hand_to_play = 0;        // 0=North, 1=East, 2=South, 3=West (who should play first)
// int currentTrick0 = -1;      // No card played yet
// int currentTrick1 = -1;      // No card played yet  
// int currentTrick2 = -1;      // No card played yet
// char* pbn_remain_cards = "N:QJ6.K652.J85.T98 873.J97.AT764.Q4 K5.T83.KQ9.A7652 AT942.AQ4.32.KJ3";

export async function runExample(): Promise<void> {
  // Convert the PBN string to our hands format
  // PBN: "N:QJ6.K652.J85.T98 873.J97.AT764.Q4 K5.T83.KQ9.A7652 AT942.AQ4.32.KJ3"
  // This means:
  // North: QJ6.K652.J85.T98 (Spades: QJ6, Hearts: K652, Diamonds: J85, Clubs: T98)
  // East: 873.J97.AT764.Q4 (Spades: 873, Hearts: J97, Diamonds: AT764, Clubs: Q4)
  // South: K5.T83.KQ9.A7652 (Spades: K5, Hearts: T83, Diamonds: KQ9, Clubs: A7652)
  // West: AT942.AQ4.32.KJ3 (Spades: AT942, Hearts: AQ4, Diamonds: 32, Clubs: KJ3)
  
  const hands = {
    'N': ['QS', 'JS', '6S', 'KH', '6H', '5H', '2H', 'JD', '8D', '5D', 'TC', '9C', '8C'],
    'E': ['8S', '7S', '3S', 'JH', '9H', '7H', 'AD', 'TD', '7D', '6D', '4D', 'QC', '4C'],
    'S': ['KS', '5S', 'TH', '8H', '3H', 'KD', 'QD', '9D', 'AC', '7C', '6C', '5C', '2C'],
    'W': ['AS', 'TS', '9S', '4S', '2S', 'AH', 'QH', '4H', '3D', '2D', 'KC', 'JC', '3C']
  };

  try {
    console.log('Solving double-dummy problem...');
    console.log('Contract: Clubs (0)');
    console.log('First to play: North (0)');
    console.log('No cards played yet (all currentTrick values = -1)');
    
    const solutions = await solveBoardFromStart({
      trump: 'C', // Clubs (contract_bid = 0)
      first: 'N', // North (hand_to_play = 0)
      dealer: 'N', // North is the dealer
      hands
    });

    console.log('Solutions found:', solutions.length);
    solutions.forEach((solution, index) => {
      console.log(`${index + 1}. Play ${solution.card} -> Score: ${solution.score}`);
    });
    
  } catch (error) {
    console.error('Error solving board:', error);
  }
}

// Alternative example with No Trump
export async function runNTExample(): Promise<void> {
  const hands = {
    'N': ['QS', 'JS', '6S', 'KH', '6H', '5H', '2H', 'JD', '8D', '5D', 'TC', '9C', '8C'],
    'E': ['8S', '7S', '3S', 'JH', '9H', '7H', 'AD', 'TD', '7D', '6D', '4D', 'QC', '4C'],
    'S': ['KS', '5S', 'TH', '8H', '3H', 'KD', 'QD', '9D', 'AC', '7C', '6C', '5C', '2C'],
    'W': ['AS', 'TS', '9S', '4S', '2S', 'AH', 'QH', '4H', '3D', '2D', 'KC', 'JC', '3C']
  };

  try {
    console.log('Solving double-dummy problem (No Trump)...');
    console.log('Contract: No Trump (4)');
    console.log('First to play: North (0)');
    
    const solutions = await solveBoardFromStart({
      trump: 'NT', // No Trump (contract_bid = 4)
      first: 'N', // North (hand_to_play = 0)
      dealer: 'N', // North is the dealer
      hands
    });

    console.log('Solutions found:', solutions.length);
    solutions.forEach((solution, index) => {
      console.log(`${index + 1}. Play ${solution.card} -> Score: ${solution.score}`);
    });
    
  } catch (error) {
    console.error('Error solving board:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().then(() => {
    console.log('\n--- No Trump Example ---');
    return runNTExample();
  }).catch(console.error);
} 