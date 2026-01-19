import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getEmailLabelsAPI } from '@/shared/utils/electronAPI';

import { useEmailLabels } from './useEmailLabels';
import { useEmailLabelsStore } from '../stores/labels.store';

import type { EmailLabel } from '../types/Email.types';

// Mock stores and APIs
vi.mock('@/shared/utils/electronAPI', () => ({
  getEmailLabelsAPI: vi.fn(),
}));

vi.mock('../stores/labels.store', () => ({
  useEmailLabelsStore: vi.fn(),
}));

describe('useEmailLabels', () => {
  const mockGetEmailLabelsAPI = getEmailLabelsAPI as ReturnType<typeof vi.fn>;
  const mockUseEmailLabelsStore = useEmailLabelsStore as unknown as ReturnType<typeof vi.fn>;
  const mockEmailLabelsAPI = {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    apply: vi.fn(),
    remove: vi.fn(),
  };

  const mockStore = {
    labels: [] as EmailLabel[],
    isLoading: false,
    error: null,
    setLabels: vi.fn(),
    addLabel: vi.fn(),
    updateLabel: vi.fn(),
    removeLabel: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmailLabelsAPI.mockReturnValue(mockEmailLabelsAPI);
    mockUseEmailLabelsStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useEmailLabels());

    expect(result.current.labels).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load labels on mount', async () => {
    const mockLabels: EmailLabel[] = [
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

    mockEmailLabelsAPI.getAll.mockResolvedValue(mockLabels);

    renderHook(() => useEmailLabels('account-1'));

    await waitFor(() => {
      expect(mockEmailLabelsAPI.getAll).toHaveBeenCalledWith('account-1');
      expect(mockStore.setLabels).toHaveBeenCalled();
    });
  });

  it('should load labels without accountId', async () => {
    mockEmailLabelsAPI.getAll.mockResolvedValue([]);

    renderHook(() => useEmailLabels());

    await waitFor(() => {
      expect(mockEmailLabelsAPI.getAll).toHaveBeenCalledWith(undefined);
    });
  });

  it('should create label', async () => {
    const newLabel: EmailLabel = {
      id: 'label-2',
      accountId: 'account-1',
      familyId: 'family-1',
      name: 'Personal',
      color: '#00FF00',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    mockEmailLabelsAPI.create.mockResolvedValue(newLabel);

    const { result } = renderHook(() => useEmailLabels());

    await act(async () => {
      await result.current.createLabel({
        accountId: 'account-1',
        name: 'Personal',
        color: '#00FF00',
      });
    });

    expect(mockEmailLabelsAPI.create).toHaveBeenCalledWith({
      accountId: 'account-1',
      name: 'Personal',
      color: '#00FF00',
    });
    expect(mockStore.addLabel).toHaveBeenCalledWith(newLabel);
  });

  it('should handle create label errors', async () => {
    mockEmailLabelsAPI.create.mockRejectedValue(new Error('Failed to create'));

    const { result } = renderHook(() => useEmailLabels());

    await act(async () => {
      await expect(
        result.current.createLabel({
          accountId: 'account-1',
          name: 'Test',
          color: '#000000',
        })
      ).rejects.toThrow();
    });

    expect(mockStore.setError).toHaveBeenCalled();
  });

  it('should update label', async () => {
    const updatedLabel = {
      id: 'label-1',
      accountId: 'account-1',
      name: 'Updated',
      color: '#0000FF',
      icon: undefined,
      createdAt: Date.now(),
    };

    mockEmailLabelsAPI.update.mockResolvedValue(updatedLabel);

    const { result } = renderHook(() => useEmailLabels());

    await act(async () => {
      await result.current.updateLabel('label-1', {
        name: 'Updated',
        color: '#0000FF',
      });
    });

    expect(mockEmailLabelsAPI.update).toHaveBeenCalledWith('label-1', {
      name: 'Updated',
      color: '#0000FF',
    });
    expect(mockStore.updateLabel).toHaveBeenCalledWith('label-1', updatedLabel);
  });

  it('should handle update label errors', async () => {
    mockEmailLabelsAPI.update.mockRejectedValue(new Error('Failed to update'));

    const { result } = renderHook(() => useEmailLabels());

    await act(async () => {
      await expect(result.current.updateLabel('label-1', { name: 'Updated' })).rejects.toThrow();
    });

    expect(mockStore.setError).toHaveBeenCalled();
  });

  it('should delete label', async () => {
    mockEmailLabelsAPI.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useEmailLabels());

    await act(async () => {
      await result.current.deleteLabel('label-1');
    });

    expect(mockEmailLabelsAPI.delete).toHaveBeenCalledWith('label-1');
    expect(mockStore.removeLabel).toHaveBeenCalledWith('label-1');
  });

  it('should handle delete label errors', async () => {
    mockEmailLabelsAPI.delete.mockRejectedValue(new Error('Failed to delete'));

    const { result } = renderHook(() => useEmailLabels());

    await act(async () => {
      await expect(result.current.deleteLabel('label-1')).rejects.toThrow();
    });

    expect(mockStore.setError).toHaveBeenCalled();
  });

  it('should apply label to messages', async () => {
    mockEmailLabelsAPI.apply.mockResolvedValue(undefined);

    const { result } = renderHook(() => useEmailLabels('account-1'));

    await act(async () => {
      await result.current.applyLabel(['msg-1', 'msg-2'], 'label-1');
    });

    expect(mockEmailLabelsAPI.apply).toHaveBeenCalledWith(
      'account-1',
      ['msg-1', 'msg-2'],
      'label-1'
    );
  });

  it('should throw error when applying label without accountId', async () => {
    const { result } = renderHook(() => useEmailLabels(null));

    await act(async () => {
      await expect(result.current.applyLabel(['msg-1'], 'label-1')).rejects.toThrow(
        'Account ID is required'
      );
    });
  });

  it('should remove label from messages', async () => {
    mockEmailLabelsAPI.remove.mockResolvedValue(undefined);

    const { result } = renderHook(() => useEmailLabels('account-1'));

    await act(async () => {
      await result.current.removeLabel(['msg-1', 'msg-2'], 'label-1');
    });

    expect(mockEmailLabelsAPI.remove).toHaveBeenCalledWith(
      'account-1',
      ['msg-1', 'msg-2'],
      'label-1'
    );
  });

  it('should throw error when removing label without accountId', async () => {
    const { result } = renderHook(() => useEmailLabels(null));

    await act(async () => {
      await expect(result.current.removeLabel(['msg-1'], 'label-1')).rejects.toThrow(
        'Account ID is required'
      );
    });
  });

  it('should filter labels by accountId', () => {
    mockStore.labels = [
      {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Label 1',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'label-2',
        accountId: null,
        familyId: 'family-1',
        name: 'Global',
        color: '#00FF00',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'label-3',
        accountId: 'account-2',
        familyId: 'family-1',
        name: 'Label 3',
        color: '#0000FF',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const { result } = renderHook(() => useEmailLabels('account-1'));

    expect(result.current.labels).toEqual([
      {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Label 1',
        color: '#FF0000',
        createdAt: expect.any(Number) as number,
        updatedAt: expect.any(Number) as number,
      },
      {
        id: 'label-2',
        accountId: null,
        familyId: 'family-1',
        name: 'Global',
        color: '#00FF00',
        createdAt: expect.any(Number) as number,
        updatedAt: expect.any(Number) as number,
      },
    ]);
  });

  it('should return all labels when accountId is undefined', () => {
    mockStore.labels = [
      {
        id: 'label-1',
        accountId: 'account-1',
        familyId: 'family-1',
        name: 'Label 1',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'label-2',
        accountId: null,
        familyId: 'family-1',
        name: 'Global',
        color: '#00FF00',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const { result } = renderHook(() => useEmailLabels(undefined));

    expect(result.current.labels).toEqual(mockStore.labels);
  });
});
