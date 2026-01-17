import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock crypto.randomUUID
Object.defineProperty(crypto, 'randomUUID', {
  value: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }),
});

// Mock Electron API
const mockElectronAPI = {
  getVersion: vi.fn().mockResolvedValue('0.1.0'),
  getPlatform: vi.fn().mockResolvedValue('darwin'),
  family: {
    create: vi.fn().mockResolvedValue({ id: 'family-1', name: 'Test Family' }),
    join: vi.fn().mockResolvedValue({ success: true }),
    leave: vi.fn().mockResolvedValue(undefined),
    invite: vi.fn().mockResolvedValue({ token: 'test-token', qrCode: 'data:image/png;base64,...' }),
  },
  calendar: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    import: vi.fn().mockResolvedValue({ imported: 0 }),
    export: vi.fn().mockResolvedValue(''),
  },
  tasks: {
    getLists: vi.fn().mockResolvedValue([]),
    createList: vi.fn().mockResolvedValue({}),
    getTasks: vi.fn().mockResolvedValue([]),
    createTask: vi.fn().mockResolvedValue({}),
    updateTask: vi.fn().mockResolvedValue({}),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    import: vi.fn().mockResolvedValue({ imported: 0 }),
    export: vi.fn().mockResolvedValue(''),
  },
  email: {
    getAccounts: vi.fn().mockResolvedValue([]),
    addAccount: vi.fn().mockResolvedValue({}),
    removeAccount: vi.fn().mockResolvedValue(undefined),
    fetchMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
  sync: {
    getStatus: vi.fn().mockResolvedValue({ status: 'connected', peers: 0 }),
    forceSync: vi.fn().mockResolvedValue(undefined),
    getPeers: vi.fn().mockResolvedValue([]),
  },
  on: vi.fn(),
  off: vi.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  writable: true,
  value: mockElectronAPI,
});
