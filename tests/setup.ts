import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Set up DOM environment for tests
import { jsdom } from 'jsdom'

const dom = new jsdom('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost'
})

global.document = dom.window.document
global.window = dom.window
global.navigator = dom.window.navigator

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock console methods to reduce noise in tests
beforeAll(() => {
  // Suppress console.log in tests unless explicitly needed
  const originalLog = console.log
  console.log = (...args) => {
    if (process.env.VITEST_VERBOSE) {
      originalLog(...args)
    }
  }
})
