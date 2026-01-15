/**
 * useEmailSearch Hook
 * Hook for email search functionality
 */

import { useState, useCallback } from 'react';

import { getEmailAPI } from '@/shared/utils/electronAPI';

import type { EmailSearchQuery } from '../components/SearchBar';

export interface EmailSearchResult {
  messageId: string;
  accountId: string;
  score: number;
}

interface UseEmailSearchReturn {
  results: EmailSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: EmailSearchQuery) => Promise<void>;
  clearResults: () => void;
}

export function useEmailSearch(): UseEmailSearchReturn {
  const [results, setResults] = useState<EmailSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: EmailSearchQuery): Promise<void> => {
    if (!query.query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const emailAPI = getEmailAPI();
      const searchResults = (await emailAPI.search(query)) as EmailSearchResult[];
      setResults(searchResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search emails';
      setError(errorMessage);
      setResults([]);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
}
