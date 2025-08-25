# Bridge Game Test Suite

This directory contains comprehensive tests for the Bridge Game application using Vitest and React Testing Library.

## Test Structure

```
tests/
├── setup.ts                 # Test setup and global mocks
├── mocks/                   # Mock utilities and data factories
│   └── index.ts            # Main mock exports
├── utils/                   # Test utilities and helpers
│   └── test-utils.tsx      # Custom render functions and helpers
├── components/              # Component tests
│   └── bridge/             # Bridge game component tests
│       ├── BiddingArea.test.tsx    # Bidding phase tests
│       ├── PlayerHand.test.tsx     # Card playing tests
│       └── Play.test.tsx           # Main game component tests
└── README.md               # This file
```

## Running Tests

### Run all tests
```bash
npm run test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test files
```bash
npm run test -- tests/components/bridge/BiddingArea.test.tsx
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Test Coverage

The test suite covers:

### Bidding Phase
- ✅ Bidding interface rendering
- ✅ Level selection (1-7)
- ✅ Suit selection (♣, ♦, ♥, ♠, NT)
- ✅ Bid types (Pass, Double, Redouble, Bid)
- ✅ Bidding history display
- ✅ Dealer indicator
- ✅ Turn validation
- ✅ Bid submission

### Playing Phase
- ✅ Player hand rendering
- ✅ Card display (face/back)
- ✅ Card interaction (click to play)
- ✅ Turn validation
- ✅ Current trick display
- ✅ Contract information
- ✅ Player positioning

### Game State Management
- ✅ Phase transitions
- ✅ Turn indicators
- ✅ AI thinking states
- ✅ Player position updates

## Mocking Strategy

### Services
- **WebSocket Service**: Mocked to prevent real connections
- **API Service**: Mocked to prevent real HTTP requests
- **Game Store**: Mocked with test data factories
- **Room Store**: Mocked with test room configurations

### Data Factories
- `createTestGameData()`: Creates game state with defaults
- `createTestHand()`: Creates playing card arrays from string notation
- `createTestBid()`: Creates bid objects with proper typing

## Writing New Tests

### 1. Import Test Utilities
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { createTestGameData, resetMocks } from '../../mocks'
```

### 2. Mock Dependencies
```typescript
vi.mock('../../../src/stores/gameStore', () => ({
  useGameStore: () => mockGameStore
}))
```

### 3. Test Component Behavior
```typescript
it('should render correctly', () => {
  render(<Component />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

### 4. Test User Interactions
```typescript
it('should handle user input', () => {
  render(<Component />)
  const button = screen.getByText('Click Me')
  fireEvent.click(button)
  expect(mockFunction).toHaveBeenCalled()
})
```

## Best Practices

1. **Use descriptive test names** that explain the expected behavior
2. **Test one thing at a time** - each test should have a single assertion
3. **Use data factories** for consistent test data
4. **Mock external dependencies** to isolate component behavior
5. **Reset mocks** between tests to prevent test pollution
6. **Test both success and failure scenarios**
7. **Use accessibility queries** when possible (getByRole, getByLabelText)

## Debugging Tests

### Enable Verbose Logging
```bash
VITEST_VERBOSE=true npm run test
```

### Debug Specific Test
```typescript
it('should work', () => {
  debugger; // Add this line to pause execution
  render(<Component />)
  // ... rest of test
})
```

### View Component Output
```typescript
it('should render', () => {
  const { debug } = render(<Component />)
  debug(); // This will print the rendered HTML
})
```

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Main branch pushes
- Release builds

## Coverage Requirements

- **Statements**: 80% minimum
- **Branches**: 75% minimum  
- **Functions**: 80% minimum
- **Lines**: 80% minimum

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are defined before component imports
2. **Test isolation**: Use `beforeEach` to reset mocks and state
3. **Async operations**: Use `waitFor` for asynchronous assertions
4. **Component not rendering**: Check if all required props are provided

### Getting Help

- Check the test output for detailed error messages
- Review the mock implementations in `tests/mocks/`
- Ensure all dependencies are properly mocked
- Verify test data matches component expectations
