/**
 * Email Labels Store
 * Manages email label state and operations
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { EmailLabel } from '../types/Email.types';

interface EmailLabelsStore {
  // State
  labels: EmailLabel[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setLabels: (labels: EmailLabel[]) => void;
  addLabel: (label: EmailLabel) => void;
  updateLabel: (id: string, updates: Partial<EmailLabel>) => void;
  removeLabel: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;

  // Computed helpers
  getLabelsByAccount: (accountId: string | null) => EmailLabel[];
  getLabelById: (id: string) => EmailLabel | undefined;
}

const initialState = {
  labels: [],
  isLoading: false,
  error: null,
};

export const useEmailLabelsStore = create<EmailLabelsStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Actions
    setLabels: (labels) => set({ labels }),

    addLabel: (label) =>
      set((state) => ({
        labels: [...state.labels, label],
      })),

    updateLabel: (id, updates) =>
      set((state) => ({
        labels: state.labels.map((label) =>
          label.id === id ? { ...label, ...updates, updatedAt: Date.now() } : label
        ),
      })),

    removeLabel: (id) =>
      set((state) => ({
        labels: state.labels.filter((label) => label.id !== id),
      })),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    reset: () => set(initialState),

    // Computed helpers
    getLabelsByAccount: (accountId) => {
      const { labels } = get();
      return labels.filter((label) => label.accountId === accountId);
    },

    getLabelById: (id) => {
      const { labels } = get();
      return labels.find((label) => label.id === id);
    },
  }))
);
