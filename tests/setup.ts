import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

if (!window.matchMedia) window.matchMedia = (query: string) => ({
  matches: false, media: query, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
})
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
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
