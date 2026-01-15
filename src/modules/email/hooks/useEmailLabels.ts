/**
 * Email Labels Hook - Manages email label operations
 */

import { useCallback, useEffect } from 'react';

import { getEmailLabelsAPI } from '@/shared/utils/electronAPI';

import { useEmailLabelsStore } from '../stores/labels.store';

import type { EmailLabel } from '../types/Email.types';

export function useEmailLabels(accountId?: string | null): {
  labels: EmailLabel[];
  isLoading: boolean;
  error: string | null;
  loadLabels: () => Promise<void>;
  createLabel: (data: {
    accountId: string | null;
    name: string;
    color: string;
    icon?: string | undefined;
  }) => Promise<EmailLabel>;
  updateLabel: (
    labelId: string,
    updates: {
      name?: string;
      color?: string;
      icon?: string | undefined;
    }
  ) => Promise<EmailLabel>;
  deleteLabel: (labelId: string) => Promise<void>;
  applyLabel: (messageIds: string[], labelId: string) => Promise<void>;
  removeLabel: (messageIds: string[], labelId: string) => Promise<void>;
} {
  const {
    labels,
    isLoading,
    error,
    setLabels,
    addLabel,
    updateLabel: updateLabelInStore,
    removeLabel: removeLabelFromStore,
    setLoading,
    setError,
  } = useEmailLabelsStore();

  const loadLabels = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const emailLabelsAPI = getEmailLabelsAPI();
      const loadedLabels = (await emailLabelsAPI.getAll(accountId ?? undefined)) as EmailLabel[];
      setLabels(loadedLabels);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load email labels';
      setError(errorMessage);
      console.error('Failed to load email labels:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId, setLabels, setLoading, setError]);

  const createLabel = useCallback(
    async (data: {
      accountId: string | null;
      name: string;
      color: string;
      icon?: string | undefined;
    }): Promise<EmailLabel> => {
      try {
        setError(null);
        const emailLabelsAPI = getEmailLabelsAPI();
        const createdLabel = (await emailLabelsAPI.create(data)) as EmailLabel;
        addLabel(createdLabel);
        return createdLabel;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create email label';
        setError(errorMessage);
        console.error('Failed to create email label:', err);
        throw err;
      }
    },
    [addLabel, setError]
  );

  const updateLabel = useCallback(
    async (
      labelId: string,
      updates: {
        name?: string;
        color?: string;
        icon?: string | undefined;
      }
    ): Promise<EmailLabel> => {
      try {
        setError(null);
        const emailLabelsAPI = getEmailLabelsAPI();
        const updatedLabel = (await emailLabelsAPI.update(labelId, updates)) as EmailLabel;
        updateLabelInStore(labelId, updatedLabel);
        return updatedLabel;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update email label';
        setError(errorMessage);
        console.error('Failed to update email label:', err);
        throw err;
      }
    },
    [updateLabelInStore, setError]
  );

  const deleteLabel = useCallback(
    async (labelId: string): Promise<void> => {
      try {
        setError(null);
        const emailLabelsAPI = getEmailLabelsAPI();
        await emailLabelsAPI.delete(labelId);
        removeLabelFromStore(labelId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete email label';
        setError(errorMessage);
        console.error('Failed to delete email label:', err);
        throw err;
      }
    },
    [removeLabelFromStore, setError]
  );

  const applyLabel = useCallback(
    async (messageIds: string[], labelId: string): Promise<void> => {
      if (!accountId) {
        throw new Error('Account ID is required to apply labels');
      }

      try {
        setError(null);
        const emailLabelsAPI = getEmailLabelsAPI();
        await emailLabelsAPI.apply(accountId, messageIds, labelId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to apply email label';
        setError(errorMessage);
        console.error('Failed to apply email label:', err);
        throw err;
      }
    },
    [accountId, setError]
  );

  const removeLabel = useCallback(
    async (messageIds: string[], labelId: string): Promise<void> => {
      if (!accountId) {
        throw new Error('Account ID is required to remove labels');
      }

      try {
        setError(null);
        const emailLabelsAPI = getEmailLabelsAPI();
        await emailLabelsAPI.remove(accountId, messageIds, labelId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove email label';
        setError(errorMessage);
        console.error('Failed to remove email label:', err);
        throw err;
      }
    },
    [accountId, setError]
  );

  // Load labels on mount and when accountId changes
  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  return {
    labels:
      accountId !== undefined
        ? labels.filter((l) => l.accountId === accountId || l.accountId === null)
        : labels,
    isLoading,
    error,
    loadLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    applyLabel,
    removeLabel,
  };
}
