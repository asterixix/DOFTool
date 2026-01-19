import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useEmailPreferencesStore } from './emailPreferences.store';
import {
  DEFAULT_EMAIL_PREFERENCES,
  DEFAULT_DISPLAY_PREFERENCES,
  DEFAULT_COMPOSE_PREFERENCES,
  DEFAULT_SECURITY_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../types/EmailPreferences.types';

describe('emailPreferences.store', () => {
  beforeEach(() => {
    const { resetPreferences } = useEmailPreferencesStore.getState();
    act(() => {
      resetPreferences();
    });
  });

  describe('initial state', () => {
    it('should have default preferences initially', () => {
      const state = useEmailPreferencesStore.getState();
      // Use toMatchObject to ignore updatedAt timestamp differences
      expect(state.preferences).toMatchObject({
        display: DEFAULT_EMAIL_PREFERENCES.display,
        compose: DEFAULT_EMAIL_PREFERENCES.compose,
        security: DEFAULT_EMAIL_PREFERENCES.security,
        notifications: DEFAULT_EMAIL_PREFERENCES.notifications,
      });
    });

    it('should have false isLoading initially', () => {
      const state = useEmailPreferencesStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setPreferences', () => {
    it('should set preferences', () => {
      const preferences = {
        ...DEFAULT_EMAIL_PREFERENCES,
        display: {
          ...DEFAULT_DISPLAY_PREFERENCES,
          density: 'comfortable' as const,
        },
      };

      const { setPreferences } = useEmailPreferencesStore.getState();
      act(() => {
        setPreferences(preferences);
      });

      const state = useEmailPreferencesStore.getState();
      // Fix: density is nested under display
      expect(state.preferences.display.density).toBe('comfortable');
      expect(state.preferences.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('resetPreferences', () => {
    it('should reset preferences to default', () => {
      const { setPreferences, resetPreferences } = useEmailPreferencesStore.getState();
      act(() => {
        setPreferences({
          ...DEFAULT_EMAIL_PREFERENCES,
          display: {
            ...DEFAULT_DISPLAY_PREFERENCES,
            density: 'comfortable' as const,
          },
        });
        resetPreferences();
      });

      const state = useEmailPreferencesStore.getState();
      // Use toMatchObject to ignore updatedAt timestamp differences
      expect(state.preferences).toMatchObject({
        display: DEFAULT_EMAIL_PREFERENCES.display,
        compose: DEFAULT_EMAIL_PREFERENCES.compose,
        security: DEFAULT_EMAIL_PREFERENCES.security,
        notifications: DEFAULT_EMAIL_PREFERENCES.notifications,
      });
    });
  });

  describe('updateDisplayPreferences', () => {
    it('should update display preferences', () => {
      const { updateDisplayPreferences } = useEmailPreferencesStore.getState();
      act(() => {
        updateDisplayPreferences({ density: 'compact' });
      });

      const state = useEmailPreferencesStore.getState();
      expect(state.preferences.display.density).toBe('compact');
      expect(state.preferences.updatedAt).toBeGreaterThan(0);
    });

    it('should merge display preferences', () => {
      const { updateDisplayPreferences } = useEmailPreferencesStore.getState();
      act(() => {
        updateDisplayPreferences({ density: 'comfortable', previewPane: 'bottom' });
      });

      const state = useEmailPreferencesStore.getState();
      expect(state.preferences.display.density).toBe('comfortable');
      expect(state.preferences.display.previewPane).toBe('bottom');
    });
  });

  describe('updateComposePreferences', () => {
    it('should update compose preferences', () => {
      const { updateComposePreferences } = useEmailPreferencesStore.getState();
      act(() => {
        updateComposePreferences({ undoSendDelay: 10 });
      });

      const state = useEmailPreferencesStore.getState();
      expect(state.preferences.compose.undoSendDelay).toBe(10);
      expect(state.preferences.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('updateSecurityPreferences', () => {
    it('should update security preferences', () => {
      const { updateSecurityPreferences } = useEmailPreferencesStore.getState();
      act(() => {
        updateSecurityPreferences({ externalImages: 'allow' });
      });

      const state = useEmailPreferencesStore.getState();
      expect(state.preferences.security.externalImages).toBe('allow');
      expect(state.preferences.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', () => {
      const { updateNotificationPreferences } = useEmailPreferencesStore.getState();
      act(() => {
        updateNotificationPreferences({ desktopNotifications: false });
      });

      const state = useEmailPreferencesStore.getState();
      expect(state.preferences.notifications.desktopNotifications).toBe(false);
      expect(state.preferences.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('computed helpers', () => {
    it('should get display preferences', () => {
      const { getDisplayPreferences } = useEmailPreferencesStore.getState();
      const displayPrefs = getDisplayPreferences();
      expect(displayPrefs).toEqual(DEFAULT_DISPLAY_PREFERENCES);
    });

    it('should get compose preferences', () => {
      const { getComposePreferences } = useEmailPreferencesStore.getState();
      const composePrefs = getComposePreferences();
      expect(composePrefs).toEqual(DEFAULT_COMPOSE_PREFERENCES);
    });

    it('should get security preferences', () => {
      const { getSecurityPreferences } = useEmailPreferencesStore.getState();
      const securityPrefs = getSecurityPreferences();
      expect(securityPrefs).toEqual(DEFAULT_SECURITY_PREFERENCES);
    });

    it('should get notification preferences', () => {
      const { getNotificationPreferences } = useEmailPreferencesStore.getState();
      const notificationPrefs = getNotificationPreferences();
      expect(notificationPrefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });
  });
});
