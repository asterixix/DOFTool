import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SettingsPage from './SettingsPage';

vi.mock('@/hooks/useAnalytics', () => ({
  trackModuleAction: vi.fn(),
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('@/shared/brand', () => ({
  BRAND: { name: 'DOFTool' },
}));

vi.mock('@/modules/sync/components/SyncSettingsSection', () => ({
  SyncSettingsSection: () => <div data-testid="sync-settings">Sync Settings</div>,
}));

const mockSettings = {
  user: { displayName: 'Test User' },
  appearance: { theme: 'system', reducedMotion: false, compactMode: false },
  regional: {
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    weekStartDay: 'sunday',
    timezone: 'UTC',
  },
  notifications: {
    enabled: true,
    soundEnabled: true,
    taskReminders: true,
    calendarReminders: true,
  },
  privacy: { analyticsEnabled: true, crashReportsEnabled: true },
  tutorial: { hasSeenTutorial: false },
  updateUserSettings: vi.fn(),
  updateAppearanceSettings: vi.fn(),
  updateRegionalSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  resetSettings: vi.fn(),
  startTutorial: vi.fn(),
  resetTutorial: vi.fn(),
};

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: vi.fn(() => mockSettings),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      ...window.electronAPI,
      calendar: {
        ...window.electronAPI?.calendar,
        reminderSettings: {
          get: vi.fn().mockResolvedValue({
            global: { enabled: true, minMinutesBefore: 5, maxRemindersPerEvent: 3 },
          }),
          update: vi.fn().mockResolvedValue({
            global: { enabled: true, minMinutesBefore: 5, maxRemindersPerEvent: 3 },
          }),
        },
      },
    };
  });

  it('should render Settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: /settings/i })).toBeDefined();
  });

  it('should render tab list', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tablist')).toBeDefined();
  });

  it('should render General tab', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /general/i })).toBeDefined();
  });

  it('should render Appearance tab', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeDefined();
  });

  it('should render Regional tab', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /regional/i })).toBeDefined();
  });

  it('should render Notifications tab', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /notifications/i })).toBeDefined();
  });

  it('should render Sync tab', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /sync/i })).toBeDefined();
  });

  it('should render Privacy tab', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /privacy/i })).toBeDefined();
  });

  it('should show General settings by default', () => {
    render(<SettingsPage />);
    expect(screen.getByText('User Profile')).toBeDefined();
  });

  it('should render display name input', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Display Name')).toBeDefined();
  });

  it('should show Save Profile button', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /save profile/i })).toBeDefined();
  });

  it('should call updateUserSettings when Save Profile is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(mockSettings.updateUserSettings).toHaveBeenCalled();
  });

  it('should render Reset Settings button', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /reset all settings/i })).toBeDefined();
  });

  it('should switch to Appearance tab when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: /appearance/i }));

    await waitFor(() => {
      expect(screen.getByText('Theme')).toBeDefined();
    });
  });

  it('should switch to Regional tab when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: /regional/i }));

    await waitFor(() => {
      expect(screen.getByText('Regional Preferences')).toBeDefined();
    });
  });

  it('should switch to Notifications tab when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeDefined();
    });
  });

  it('should switch to Sync tab when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: /sync/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sync-settings')).toBeDefined();
    });
  });

  it('should switch to Privacy tab when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: /privacy/i }));

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeDefined();
    });
  });

  it('should render App Tour section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('App Tour')).toBeDefined();
  });

  it('should show Start Tutorial button when tutorial not seen', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /start tutorial/i })).toBeDefined();
  });

  it('should show Restart Tutorial button when tutorial has been seen', () => {
    mockSettings.tutorial.hasSeenTutorial = true;
    render(<SettingsPage />);
    expect(screen.getByRole('button', { name: /restart tutorial/i })).toBeDefined();
  });
});
