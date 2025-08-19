import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
})

// Mock custom storage events to prevent issues in tests
const originalAddEventListener = window.addEventListener;
window.addEventListener = vi.fn((event, handler, options) => {
  if (event === 'watchlist-storage-change' || event === 'storage') {
    // Don't actually add storage listeners that could cause issues in tests
    return
  }
  // Call original implementation for other events if it exists
  if (originalAddEventListener) {
    return originalAddEventListener.call(window, event, handler, options)
  }
})

// Mock window.open for testing
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(),
})

// Mock Cytoscape for component tests
vi.mock('cytoscape', () => {
  const mockNodes = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    connectedEdges: vi.fn().mockReturnValue({
      connectedNodes: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        removeClass: vi.fn().mockReturnThis(),
      })
    }),
    boundingBox: vi.fn().mockReturnValue({
      x1: 100, y1: 100, x2: 300, y2: 300,
      w: 200, h: 200
    }),
    length: 1,
  }

  const mockEdges = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    length: 1,
  }

  const mockElement = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    connectedEdges: vi.fn().mockReturnValue({
      connectedNodes: vi.fn().mockReturnValue(mockNodes)
    }),
    data: vi.fn().mockReturnValue({}),
    source: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('source-1') }),
    target: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('target-1') }),
    id: vi.fn().mockReturnValue('element-1'),
  }

  return {
    default: vi.fn(() => ({
      nodes: vi.fn(() => mockNodes),
      edges: vi.fn(() => mockEdges),
      on: vi.fn(),
      getElementById: vi.fn().mockReturnValue(mockElement),
      fit: vi.fn(),
      zoom: vi.fn().mockImplementation((options) => {
        if (typeof options === 'object' && options.level) {
          return options.level
        }
        return 1
      }),
      pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      destroy: vi.fn(),
      // Mock the core cytoscape instance for background clicks
      target: undefined,
    })),
  }
})