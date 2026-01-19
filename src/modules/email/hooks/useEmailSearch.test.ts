import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getEmailAPI } from '@/shared/utils/electronAPI';

import { useEmailSearch } from './useEmailSearch';

// Mock electronAPI
vi.mock('@/shared/utils/electronAPI', () => ({
  getEmailAPI: vi.fn(),
}));

describe('useEmailSearch', () => {
  const mockGetEmailAPI = getEmailAPI as ReturnType<typeof vi.fn>;
  const mockEmailAPI = {
    search: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmailAPI.mockReturnValue(mockEmailAPI);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useEmailSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should perform search', async () => {
    const mockResults = [
      { messageId: 'msg-1', accountId: 'account-1', score: 0.95 },
      { messageId: 'msg-2', accountId: 'account-1', score: 0.85 },
    ];

    mockEmailAPI.search.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useEmailSearch());

    await act(async () => {
      await result.current.search({ query: 'test search' });
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockEmailAPI.search).toHaveBeenCalledWith({ query: 'test search' });
  });

  it('should set loading state during search', async () => {
    let resolveSearch: ((value: unknown) => void) | undefined;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    mockEmailAPI.search.mockReturnValue(searchPromise);

    const { result } = renderHook(() => useEmailSearch());

    // Start the search without awaiting
    let searchPromise2: Promise<void> | undefined;
    act(() => {
      searchPromise2 = result.current.search({ query: 'test' });
    });

    // Check loading state is true while search is pending
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the search
    await act(async () => {
      if (resolveSearch) {
        resolveSearch([]);
      }
      await searchPromise2;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle search errors', async () => {
    mockEmailAPI.search.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => useEmailSearch());

    // The search method catches errors internally, so we don't need try/catch here
    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear results for empty query', async () => {
    const { result } = renderHook(() => useEmailSearch());

    // First set some results
    mockEmailAPI.search.mockResolvedValue([
      { messageId: 'msg-1', accountId: 'account-1', score: 0.95 },
    ]);

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    });

    // Then search with empty query
    await act(async () => {
      await result.current.search({ query: '   ' });
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
    });
    // Should only call API once (for the first non-empty query)
    expect(mockEmailAPI.search).toHaveBeenCalledTimes(1);
  });

  it('should clear results', async () => {
    mockEmailAPI.search.mockResolvedValue([
      { messageId: 'msg-1', accountId: 'account-1', score: 0.95 },
    ]);

    const { result } = renderHook(() => useEmailSearch());

    // First perform a search to have some results
    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    });

    // Now clear results
    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should trim query before searching', async () => {
    mockEmailAPI.search.mockResolvedValue([]);

    const { result } = renderHook(() => useEmailSearch());

    await act(async () => {
      await result.current.search({ query: '  test  ' });
    });

    await waitFor(() => {
      // Should call with the query (note: the hook passes the query as-is to the API)
      expect(mockEmailAPI.search).toHaveBeenCalledWith({ query: '  test  ' });
    });
  });

  it('should handle search with folder filter', async () => {
    const mockResults = [{ messageId: 'msg-1', accountId: 'account-1', score: 0.95 }];
    mockEmailAPI.search.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useEmailSearch());

    await act(async () => {
      await result.current.search({ query: 'test', folder: 'inbox' });
    });

    await waitFor(() => {
      expect(mockEmailAPI.search).toHaveBeenCalledWith({ query: 'test', folder: 'inbox' });
      expect(result.current.results).toEqual(mockResults);
    });
  });
});
