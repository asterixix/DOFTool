import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useEncryption } from './useEncryption';

describe('useEncryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return encryption functions', () => {
    const { result } = renderHook(() => useEncryption());

    expect(result.current.generateKey).toBeDefined();
    expect(result.current.hashString).toBeDefined();
    expect(result.current.generateToken).toBeDefined();
  });

  it('should have generateKey as a function', () => {
    const { result } = renderHook(() => useEncryption());
    expect(typeof result.current.generateKey).toBe('function');
  });

  it('should have hashString as a function', () => {
    const { result } = renderHook(() => useEncryption());
    expect(typeof result.current.hashString).toBe('function');
  });

  it('should have generateToken as a function', () => {
    const { result } = renderHook(() => useEncryption());
    expect(typeof result.current.generateToken).toBe('function');
  });
});
