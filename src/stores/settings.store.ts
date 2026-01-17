/**
 * Settings Store - Zustand state management for app and user settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type WeekStartDay = 'sunday' | 'monday';
export type TutorialStep = 'welcome' | 'calendar' | 'tasks' | 'email' | 'family' | 'complete';

interface UserSettings {
  displayName: string;
  avatarUrl: string;
}

interface AppearanceSettings {
  theme: ThemeMode;
  reducedMotion: boolean;
  compactMode: boolean;
}

interface RegionalSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartDay: WeekStartDay;
  timezone: string;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  emailReminders: boolean;
  taskReminders: boolean;
  calendarReminders: boolean;
}

interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportsEnabled: boolean;
}

interface TutorialState {
  hasSeenTutorial: boolean;
  showTutorial: boolean;
  currentStep: TutorialStep;
}

interface SettingsState {
  // First run flag
  isFirstRun: boolean;
  hasCompletedOnboarding: boolean;

  // User settings
  user: UserSettings;

  // Appearance
  appearance: AppearanceSettings;

  // Regional
  regional: RegionalSettings;

  // Notifications
  notifications: NotificationSettings;

  // Privacy
  privacy: PrivacySettings;

  // Tutorial
  tutorial: TutorialState;

  // Actions
  setFirstRunComplete: () => void;
  setOnboardingComplete: () => void;
  startTutorial: () => void;
  nextTutorialStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  updateRegionalSettings: (settings: Partial<RegionalSettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  resetSettings: () => void;
}

const defaultUserSettings: UserSettings = {
  displayName: '',
  avatarUrl: '',
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  reducedMotion: false,
  compactMode: false,
};

const defaultRegionalSettings: RegionalSettings = {
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  weekStartDay: 'sunday',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  emailReminders: true,
  taskReminders: true,
  calendarReminders: true,
};

const defaultPrivacySettings: PrivacySettings = {
  analyticsEnabled: true, // Enabled by default on first run
  crashReportsEnabled: true, // Enabled by default on first run
};

const defaultTutorialState: TutorialState = {
  hasSeenTutorial: false,
  showTutorial: false,
  currentStep: 'welcome',
};

const TUTORIAL_STEPS: TutorialStep[] = [
  'welcome',
  'calendar',
  'tasks',
  'email',
  'family',
  'complete',
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      isFirstRun: true,
      hasCompletedOnboarding: false,
      user: defaultUserSettings,
      appearance: defaultAppearanceSettings,
      regional: defaultRegionalSettings,
      notifications: defaultNotificationSettings,
      privacy: defaultPrivacySettings,
      tutorial: defaultTutorialState,

      // Actions
      setFirstRunComplete: () => set({ isFirstRun: false }),
      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

      startTutorial: () =>
        set((state) => ({
          tutorial: {
            ...state.tutorial,
            showTutorial: true,
            currentStep: 'welcome',
          },
        })),

      nextTutorialStep: () =>
        set((state) => {
          const currentIndex = TUTORIAL_STEPS.indexOf(state.tutorial.currentStep);
          const nextStep = TUTORIAL_STEPS[currentIndex + 1] ?? 'complete';
          return {
            tutorial: {
              ...state.tutorial,
              currentStep: nextStep,
              showTutorial: nextStep !== 'complete',
              hasSeenTutorial: nextStep === 'complete' ? true : state.tutorial.hasSeenTutorial,
            },
          };
        }),

      skipTutorial: () =>
        set((state) => ({
          tutorial: {
            ...state.tutorial,
            showTutorial: false,
            hasSeenTutorial: true,
            currentStep: 'complete',
          },
        })),

      completeTutorial: () =>
        set((state) => ({
          tutorial: {
            ...state.tutorial,
            showTutorial: false,
            hasSeenTutorial: true,
            currentStep: 'complete',
          },
        })),

      resetTutorial: () =>
        set({
          tutorial: defaultTutorialState,
        }),

      updateUserSettings: (settings) =>
        set((state) => ({
          user: { ...state.user, ...settings },
        })),

      updateAppearanceSettings: (settings) =>
        set((state) => ({
          appearance: { ...state.appearance, ...settings },
        })),

      updateRegionalSettings: (settings) =>
        set((state) => ({
          regional: { ...state.regional, ...settings },
        })),

      updateNotificationSettings: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        })),

      updatePrivacySettings: (settings) =>
        set((state) => ({
          privacy: { ...state.privacy, ...settings },
        })),

      resetSettings: () =>
        set({
          user: defaultUserSettings,
          appearance: defaultAppearanceSettings,
          regional: defaultRegionalSettings,
          notifications: defaultNotificationSettings,
          privacy: defaultPrivacySettings,
        }),
    }),
    {
      name: 'doftool-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selector hooks for optimized re-renders
export const selectIsFirstRun = (state: SettingsState): boolean => state.isFirstRun;
export const selectHasCompletedOnboarding = (state: SettingsState): boolean =>
  state.hasCompletedOnboarding;
export const selectUserSettings = (state: SettingsState): UserSettings => state.user;
export const selectAppearanceSettings = (state: SettingsState): AppearanceSettings =>
  state.appearance;
export const selectRegionalSettings = (state: SettingsState): RegionalSettings => state.regional;
export const selectNotificationSettings = (state: SettingsState): NotificationSettings =>
  state.notifications;
export const selectPrivacySettings = (state: SettingsState): PrivacySettings => state.privacy;
export const selectTutorialState = (state: SettingsState): TutorialState => state.tutorial;
