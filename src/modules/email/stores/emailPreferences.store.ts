/**
 * Email Preferences Store - Zustand state management for email UI preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  DEFAULT_EMAIL_PREFERENCES,
  DEFAULT_DISPLAY_PREFERENCES,
  DEFAULT_COMPOSE_PREFERENCES,
  DEFAULT_SECURITY_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../types/EmailPreferences.types';

import type {
  EmailPreferences,
  DisplayPreferences,
  ComposePreferences,
  SecurityPreferences,
  NotificationPreferences,
} from '../types/EmailPreferences.types';

interface EmailPreferencesStore {
  // ============================================================================
  // State
  // ============================================================================
  preferences: EmailPreferences;
  isLoading: boolean;

  // ============================================================================
  // Actions - Full Preferences
  // ============================================================================
  setPreferences: (preferences: EmailPreferences) => void;
  resetPreferences: () => void;

  // ============================================================================
  // Actions - Display Preferences
  // ============================================================================
  updateDisplayPreferences: (updates: Partial<DisplayPreferences>) => void;

  // ============================================================================
  // Actions - Compose Preferences
  // ============================================================================
  updateComposePreferences: (updates: Partial<ComposePreferences>) => void;

  // ============================================================================
  // Actions - Security Preferences
  // ============================================================================
  updateSecurityPreferences: (updates: Partial<SecurityPreferences>) => void;

  // ============================================================================
  // Actions - Notification Preferences
  // ============================================================================
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;

  // ============================================================================
  // Computed Helpers
  // ============================================================================
  getDisplayPreferences: () => DisplayPreferences;
  getComposePreferences: () => ComposePreferences;
  getSecurityPreferences: () => SecurityPreferences;
  getNotificationPreferences: () => NotificationPreferences;
}

export const useEmailPreferencesStore = create<EmailPreferencesStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // Initial State
      // ============================================================================
      preferences: DEFAULT_EMAIL_PREFERENCES,
      isLoading: false,

      // ============================================================================
      // Action Implementations - Full Preferences
      // ============================================================================
      setPreferences: (preferences) =>
        set({
          preferences: { ...preferences, updatedAt: Date.now() },
        }),

      resetPreferences: () =>
        set({
          preferences: { ...DEFAULT_EMAIL_PREFERENCES, updatedAt: Date.now() },
        }),

      // ============================================================================
      // Action Implementations - Display Preferences
      // ============================================================================
      updateDisplayPreferences: (updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            display: { ...state.preferences.display, ...updates },
            updatedAt: Date.now(),
          },
        })),

      // ============================================================================
      // Action Implementations - Compose Preferences
      // ============================================================================
      updateComposePreferences: (updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            compose: { ...state.preferences.compose, ...updates },
            updatedAt: Date.now(),
          },
        })),

      // ============================================================================
      // Action Implementations - Security Preferences
      // ============================================================================
      updateSecurityPreferences: (updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            security: { ...state.preferences.security, ...updates },
            updatedAt: Date.now(),
          },
        })),

      // ============================================================================
      // Action Implementations - Notification Preferences
      // ============================================================================
      updateNotificationPreferences: (updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            notifications: { ...state.preferences.notifications, ...updates },
            updatedAt: Date.now(),
          },
        })),

      // ============================================================================
      // Computed Helper Implementations
      // ============================================================================
      getDisplayPreferences: () => get().preferences.display ?? DEFAULT_DISPLAY_PREFERENCES,
      getComposePreferences: () => get().preferences.compose ?? DEFAULT_COMPOSE_PREFERENCES,
      getSecurityPreferences: () => get().preferences.security ?? DEFAULT_SECURITY_PREFERENCES,
      getNotificationPreferences: () =>
        get().preferences.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES,
    }),
    {
      name: 'doftool-email-preferences',
      version: 1,
    }
  )
);

// ============================================================================
// Selector Hooks for Optimized Re-renders
// ============================================================================

export const selectEmailPreferences = (state: EmailPreferencesStore): EmailPreferences =>
  state.preferences;

export const selectDisplayPreferences = (state: EmailPreferencesStore): DisplayPreferences =>
  state.preferences.display;

export const selectComposePreferences = (state: EmailPreferencesStore): ComposePreferences =>
  state.preferences.compose;

export const selectSecurityPreferences = (state: EmailPreferencesStore): SecurityPreferences =>
  state.preferences.security;

export const selectNotificationPreferences = (
  state: EmailPreferencesStore
): NotificationPreferences => state.preferences.notifications;
