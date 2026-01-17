import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  useSettingsStore,
  selectIsFirstRun,
  selectHasCompletedOnboarding,
  selectUserSettings,
  selectAppearanceSettings,
  selectRegionalSettings,
  selectNotificationSettings,
  selectPrivacySettings,
  selectTutorialState,
} from './settings.store';

describe('settings.store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { resetSettings, resetTutorial } = useSettingsStore.getState();
    act(() => {
      resetSettings();
      resetTutorial();
    });
  });

  describe('initial state', () => {
    it('should have isFirstRun as true initially', () => {
      const state = useSettingsStore.getState();
      expect(state.isFirstRun).toBe(true);
    });

    it('should have hasCompletedOnboarding as false initially', () => {
      const state = useSettingsStore.getState();
      expect(state.hasCompletedOnboarding).toBe(false);
    });

    it('should have default appearance settings', () => {
      const state = useSettingsStore.getState();
      expect(state.appearance.theme).toBe('system');
      expect(state.appearance.reducedMotion).toBe(false);
      expect(state.appearance.compactMode).toBe(false);
    });

    it('should have default regional settings', () => {
      const state = useSettingsStore.getState();
      expect(state.regional.dateFormat).toBe('MM/DD/YYYY');
      expect(state.regional.timeFormat).toBe('12h');
      expect(state.regional.weekStartDay).toBe('sunday');
    });

    it('should have default notification settings', () => {
      const state = useSettingsStore.getState();
      expect(state.notifications.enabled).toBe(true);
      expect(state.notifications.soundEnabled).toBe(true);
    });

    it('should have default privacy settings', () => {
      const state = useSettingsStore.getState();
      expect(state.privacy.analyticsEnabled).toBe(true);
      expect(state.privacy.crashReportsEnabled).toBe(true);
    });
  });

  describe('setFirstRunComplete', () => {
    it('should set isFirstRun to false', () => {
      const { setFirstRunComplete } = useSettingsStore.getState();
      act(() => {
        setFirstRunComplete();
      });
      expect(useSettingsStore.getState().isFirstRun).toBe(false);
    });
  });

  describe('setOnboardingComplete', () => {
    it('should set hasCompletedOnboarding to true', () => {
      const { setOnboardingComplete } = useSettingsStore.getState();
      act(() => {
        setOnboardingComplete();
      });
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true);
    });
  });

  describe('tutorial actions', () => {
    it('should start tutorial', () => {
      const { startTutorial } = useSettingsStore.getState();
      act(() => {
        startTutorial();
      });
      const state = useSettingsStore.getState();
      expect(state.tutorial.showTutorial).toBe(true);
      expect(state.tutorial.currentStep).toBe('welcome');
    });

    it('should advance to next step', () => {
      const { startTutorial, nextTutorialStep } = useSettingsStore.getState();
      act(() => {
        startTutorial();
        nextTutorialStep();
      });
      expect(useSettingsStore.getState().tutorial.currentStep).toBe('calendar');
    });

    it('should skip tutorial', () => {
      const { startTutorial, skipTutorial } = useSettingsStore.getState();
      act(() => {
        startTutorial();
        skipTutorial();
      });
      const state = useSettingsStore.getState();
      expect(state.tutorial.showTutorial).toBe(false);
      expect(state.tutorial.hasSeenTutorial).toBe(true);
      expect(state.tutorial.currentStep).toBe('complete');
    });

    it('should complete tutorial', () => {
      const { startTutorial, completeTutorial } = useSettingsStore.getState();
      act(() => {
        startTutorial();
        completeTutorial();
      });
      const state = useSettingsStore.getState();
      expect(state.tutorial.showTutorial).toBe(false);
      expect(state.tutorial.hasSeenTutorial).toBe(true);
    });

    it('should reset tutorial', () => {
      const { startTutorial, nextTutorialStep, resetTutorial } = useSettingsStore.getState();
      act(() => {
        startTutorial();
        nextTutorialStep();
        resetTutorial();
      });
      const state = useSettingsStore.getState();
      expect(state.tutorial.showTutorial).toBe(false);
      expect(state.tutorial.hasSeenTutorial).toBe(false);
      expect(state.tutorial.currentStep).toBe('welcome');
    });
  });

  describe('updateUserSettings', () => {
    it('should update user display name', () => {
      const { updateUserSettings } = useSettingsStore.getState();
      act(() => {
        updateUserSettings({ displayName: 'Test User' });
      });
      expect(useSettingsStore.getState().user.displayName).toBe('Test User');
    });

    it('should update user avatar URL', () => {
      const { updateUserSettings } = useSettingsStore.getState();
      act(() => {
        updateUserSettings({ avatarUrl: 'https://example.com/avatar.jpg' });
      });
      expect(useSettingsStore.getState().user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should merge with existing settings', () => {
      const { updateUserSettings } = useSettingsStore.getState();
      act(() => {
        updateUserSettings({ displayName: 'Test' });
        updateUserSettings({ avatarUrl: 'https://example.com/avatar.jpg' });
      });
      const state = useSettingsStore.getState();
      expect(state.user.displayName).toBe('Test');
      expect(state.user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('updateAppearanceSettings', () => {
    it('should update theme', () => {
      const { updateAppearanceSettings } = useSettingsStore.getState();
      act(() => {
        updateAppearanceSettings({ theme: 'dark' });
      });
      expect(useSettingsStore.getState().appearance.theme).toBe('dark');
    });

    it('should update reduced motion', () => {
      const { updateAppearanceSettings } = useSettingsStore.getState();
      act(() => {
        updateAppearanceSettings({ reducedMotion: true });
      });
      expect(useSettingsStore.getState().appearance.reducedMotion).toBe(true);
    });

    it('should update compact mode', () => {
      const { updateAppearanceSettings } = useSettingsStore.getState();
      act(() => {
        updateAppearanceSettings({ compactMode: true });
      });
      expect(useSettingsStore.getState().appearance.compactMode).toBe(true);
    });
  });

  describe('updateRegionalSettings', () => {
    it('should update date format', () => {
      const { updateRegionalSettings } = useSettingsStore.getState();
      act(() => {
        updateRegionalSettings({ dateFormat: 'YYYY-MM-DD' });
      });
      expect(useSettingsStore.getState().regional.dateFormat).toBe('YYYY-MM-DD');
    });

    it('should update time format', () => {
      const { updateRegionalSettings } = useSettingsStore.getState();
      act(() => {
        updateRegionalSettings({ timeFormat: '24h' });
      });
      expect(useSettingsStore.getState().regional.timeFormat).toBe('24h');
    });

    it('should update week start day', () => {
      const { updateRegionalSettings } = useSettingsStore.getState();
      act(() => {
        updateRegionalSettings({ weekStartDay: 'monday' });
      });
      expect(useSettingsStore.getState().regional.weekStartDay).toBe('monday');
    });

    it('should update timezone', () => {
      const { updateRegionalSettings } = useSettingsStore.getState();
      act(() => {
        updateRegionalSettings({ timezone: 'America/New_York' });
      });
      expect(useSettingsStore.getState().regional.timezone).toBe('America/New_York');
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update enabled', () => {
      const { updateNotificationSettings } = useSettingsStore.getState();
      act(() => {
        updateNotificationSettings({ enabled: false });
      });
      expect(useSettingsStore.getState().notifications.enabled).toBe(false);
    });

    it('should update sound enabled', () => {
      const { updateNotificationSettings } = useSettingsStore.getState();
      act(() => {
        updateNotificationSettings({ soundEnabled: false });
      });
      expect(useSettingsStore.getState().notifications.soundEnabled).toBe(false);
    });

    it('should update reminder settings', () => {
      const { updateNotificationSettings } = useSettingsStore.getState();
      act(() => {
        updateNotificationSettings({
          emailReminders: false,
          taskReminders: false,
          calendarReminders: false,
        });
      });
      const state = useSettingsStore.getState();
      expect(state.notifications.emailReminders).toBe(false);
      expect(state.notifications.taskReminders).toBe(false);
      expect(state.notifications.calendarReminders).toBe(false);
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update analytics enabled', () => {
      const { updatePrivacySettings } = useSettingsStore.getState();
      act(() => {
        updatePrivacySettings({ analyticsEnabled: false });
      });
      expect(useSettingsStore.getState().privacy.analyticsEnabled).toBe(false);
    });

    it('should update crash reports enabled', () => {
      const { updatePrivacySettings } = useSettingsStore.getState();
      act(() => {
        updatePrivacySettings({ crashReportsEnabled: false });
      });
      expect(useSettingsStore.getState().privacy.crashReportsEnabled).toBe(false);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      const { updateAppearanceSettings, updateRegionalSettings, resetSettings } =
        useSettingsStore.getState();
      act(() => {
        updateAppearanceSettings({ theme: 'dark', compactMode: true });
        updateRegionalSettings({ dateFormat: 'YYYY-MM-DD', timeFormat: '24h' });
        resetSettings();
      });
      const state = useSettingsStore.getState();
      expect(state.appearance.theme).toBe('system');
      expect(state.appearance.compactMode).toBe(false);
      expect(state.regional.dateFormat).toBe('MM/DD/YYYY');
      expect(state.regional.timeFormat).toBe('12h');
    });
  });

  describe('selectors', () => {
    it('selectIsFirstRun should return isFirstRun', () => {
      const state = useSettingsStore.getState();
      expect(selectIsFirstRun(state)).toBe(state.isFirstRun);
    });

    it('selectHasCompletedOnboarding should return hasCompletedOnboarding', () => {
      const state = useSettingsStore.getState();
      expect(selectHasCompletedOnboarding(state)).toBe(state.hasCompletedOnboarding);
    });

    it('selectUserSettings should return user settings', () => {
      const state = useSettingsStore.getState();
      expect(selectUserSettings(state)).toBe(state.user);
    });

    it('selectAppearanceSettings should return appearance settings', () => {
      const state = useSettingsStore.getState();
      expect(selectAppearanceSettings(state)).toBe(state.appearance);
    });

    it('selectRegionalSettings should return regional settings', () => {
      const state = useSettingsStore.getState();
      expect(selectRegionalSettings(state)).toBe(state.regional);
    });

    it('selectNotificationSettings should return notification settings', () => {
      const state = useSettingsStore.getState();
      expect(selectNotificationSettings(state)).toBe(state.notifications);
    });

    it('selectPrivacySettings should return privacy settings', () => {
      const state = useSettingsStore.getState();
      expect(selectPrivacySettings(state)).toBe(state.privacy);
    });

    it('selectTutorialState should return tutorial state', () => {
      const state = useSettingsStore.getState();
      expect(selectTutorialState(state)).toBe(state.tutorial);
    });
  });
});
