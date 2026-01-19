import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useEmailLabelsStore } from './labels.store';

import type { EmailLabel } from '../types/Email.types';

describe('labels.store', () => {
  beforeEach(() => {
    const { reset } = useEmailLabelsStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have empty labels array initially', () => {
      const state = useEmailLabelsStore.getState();
      expect(state.labels).toEqual([]);
    });

    it('should have false isLoading initially', () => {
      const state = useEmailLabelsStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should have null error initially', () => {
      const state = useEmailLabelsStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setters', () => {
    it('should set labels', () => {
      const labels: EmailLabel[] = [
        {
          id: 'label-1',
          accountId: 'account-1',
          familyId: 'family-1',
          name: 'Work',
          color: '#FF0000',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { setLabels } = useEmailLabelsStore.getState();
      act(() => {
        setLabels(labels);
      });

      expect(useEmailLabelsStore.getState().labels).toEqual(labels);
    });

    it('should add label', () => {
      const label: EmailLabel = {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Work',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { addLabel } = useEmailLabelsStore.getState();
      act(() => {
        addLabel(label);
      });

      const state = useEmailLabelsStore.getState();
      expect(state.labels).toHaveLength(1);
      expect(state.labels[0]).toEqual(label);
    });

    it('should update label', async () => {
      const label: EmailLabel = {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Work',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { addLabel, updateLabel } = useEmailLabelsStore.getState();
      act(() => {
        addLabel(label);
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      act(() => {
        updateLabel('label-1', { name: 'Personal', color: '#00FF00' });
      });

      const state = useEmailLabelsStore.getState();
      expect(state.labels[0]?.name).toBe('Personal');
      expect(state.labels[0]?.color).toBe('#00FF00');
      // Check that updatedAt is at least equal (may be same ms)
      expect(state.labels[0]?.updatedAt).toBeGreaterThanOrEqual(label.updatedAt ?? 0);
    });

    it('should remove label', () => {
      const label: EmailLabel = {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Work',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { addLabel, removeLabel } = useEmailLabelsStore.getState();
      act(() => {
        addLabel(label);
        removeLabel('label-1');
      });

      const state = useEmailLabelsStore.getState();
      expect(state.labels).toHaveLength(0);
    });

    it('should set loading', () => {
      const { setLoading } = useEmailLabelsStore.getState();
      act(() => {
        setLoading(true);
      });

      expect(useEmailLabelsStore.getState().isLoading).toBe(true);
    });

    it('should set error', () => {
      const { setError } = useEmailLabelsStore.getState();
      act(() => {
        setError('Error message');
      });

      expect(useEmailLabelsStore.getState().error).toBe('Error message');
    });

    it('should clear error', () => {
      const { setError, clearError } = useEmailLabelsStore.getState();
      act(() => {
        setError('Error message');
        clearError();
      });

      expect(useEmailLabelsStore.getState().error).toBeNull();
    });
  });

  describe('computed helpers', () => {
    it('should get labels by account', () => {
      const labels: EmailLabel[] = [
        {
          id: 'label-1',
          accountId: 'account-1',
          familyId: 'family-1',
          name: 'Work',
          color: '#FF0000',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'label-2',
          accountId: 'account-2',
          familyId: 'family-1',
          name: 'Personal',
          color: '#00FF00',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'label-3',
          accountId: null,
          familyId: 'family-1',
          name: 'Global',
          color: '#0000FF',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { setLabels, getLabelsByAccount } = useEmailLabelsStore.getState();
      act(() => {
        setLabels(labels);
      });

      const accountLabels = getLabelsByAccount('account-1');
      expect(accountLabels).toHaveLength(1);
      expect(accountLabels[0]?.id).toBe('label-1');
    });

    it('should get label by id', () => {
      const label: EmailLabel = {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Work',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { addLabel, getLabelById } = useEmailLabelsStore.getState();
      act(() => {
        addLabel(label);
      });

      const foundLabel = getLabelById('label-1');
      expect(foundLabel).toEqual(label);
    });

    it('should return undefined for non-existent label', () => {
      const { getLabelById } = useEmailLabelsStore.getState();
      const foundLabel = getLabelById('non-existent');
      expect(foundLabel).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const label: EmailLabel = {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Work',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { addLabel, setError, setLoading, reset } = useEmailLabelsStore.getState();
      act(() => {
        addLabel(label);
        setError('Error');
        setLoading(true);
        reset();
      });

      const state = useEmailLabelsStore.getState();
      expect(state.labels).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
