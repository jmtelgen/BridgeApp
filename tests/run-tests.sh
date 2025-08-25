#!/bin/bash

# Bridge Game Test Runner
# This script provides convenient ways to run the test suite

echo "🚀 Bridge Game Test Runner"
echo "=========================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  all         Run all tests (default)"
    echo "  watch       Run tests in watch mode"
    echo "  coverage    Run tests with coverage report"
    echo "  bidding     Run only bidding phase tests"
    echo "  playing     Run only playing phase tests"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 watch             # Run tests in watch mode"
    echo "  $0 coverage          # Run tests with coverage"
    echo "  $0 bidding           # Run only bidding tests"
}

# Function to run tests
run_tests() {
    case $1 in
        "all"|"")
            echo "🧪 Running all tests..."
            npm run test
            ;;
        "watch")
            echo "👀 Running tests in watch mode..."
            npm run test -- --watch
            ;;
        "coverage")
            echo "📊 Running tests with coverage..."
            npm run test -- --coverage
            ;;
        "bidding")
            echo "🎯 Running bidding phase tests..."
            npm run test -- tests/components/bridge/BiddingArea.test.tsx
            ;;
        "playing")
            echo "🃏 Running playing phase tests..."
            npm run test -- tests/components/bridge/PlayerHand.test.tsx tests/components/bridge/Play.test.tsx
            ;;
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Run tests based on argument
run_tests "$1"
