import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as useFamilyModule from '@/modules/family/hooks/useFamily';
import * as settingsStoreModule from '@/stores/settings.store';

import { Router } from './Router';

vi.mock('@/modules/family/hooks/useFamily');
vi.mock('@/stores/settings.store');

vi.mock('@/shared/components/LoadingScreen', () => ({
  LoadingScreen: () => <div data-testid="loading-screen">Loading...</div>,
}));

vi.mock('@/shared/utils/debugLogger', () => ({
  logToDebug: vi.fn(),
}));

vi.mock('./components/PageTracker', () => ({
  PageTracker: () => null,
}));

vi.mock('./layouts/AppLayout', () => ({
  AppLayout: () => <div data-testid="app-layout">App Layout</div>,
}));

vi.mock('@/modules/calendar', () => ({
  default: () => <div data-testid="calendar-module">Calendar</div>,
}));

vi.mock('@/modules/tasks', () => ({
  default: () => <div data-testid="tasks-module">Tasks</div>,
}));

vi.mock('@/modules/email', () => ({
  default: () => <div data-testid="email-module">Email</div>,
}));

vi.mock('@/modules/family', () => ({
  default: () => <div data-testid="family-module">Family</div>,
}));

vi.mock('./pages/SettingsPage', () => ({
  default: () => <div data-testid="settings-page">Settings</div>,
}));

vi.mock('./pages/WelcomePage', () => ({
  default: () => <div data-testid="welcome-page">Welcome</div>,
}));

const renderWithRouter = (initialEntries: string[] = ['/']): ReturnType<typeof render> => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Router />
    </MemoryRouter>
  );
};

describe('Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user has family and is not first run', () => {
    beforeEach(() => {
      vi.mocked(useFamilyModule.useFamily).mockReturnValue({
        family: null,
        devices: [],
        permissions: [],
        isLoading: false,
        isCreating: false,
        isInviting: false,
        isJoining: false,
        error: null,
        pendingInvite: null,
        hasFamily: true,
        isAdmin: false,
        currentDevice: undefined,
        loadFamily: vi.fn(),
        createFamily: vi.fn(),
        generateInvite: vi.fn(),
        joinFamily: vi.fn(),
        removeDevice: vi.fn(),
        setPermission: vi.fn(),
        clearInvite: vi.fn(),
        clearError: vi.fn(),
      });

      vi.mocked(settingsStoreModule.useSettingsStore).mockReturnValue({
        isFirstRun: false,
      } as ReturnType<typeof settingsStoreModule.useSettingsStore>);
    });

    it('should render app layout for root route', async () => {
      renderWithRouter(['/']);

      await waitFor(() => {
        expect(screen.getByTestId('app-layout')).toBeDefined();
      });
    });
  });

  describe('when user is first run or has no family', () => {
    beforeEach(() => {
      vi.mocked(useFamilyModule.useFamily).mockReturnValue({
        family: null,
        devices: [],
        permissions: [],
        isLoading: false,
        isCreating: false,
        isInviting: false,
        isJoining: false,
        error: null,
        pendingInvite: null,
        hasFamily: false,
        isAdmin: false,
        currentDevice: undefined,
        loadFamily: vi.fn(),
        createFamily: vi.fn(),
        generateInvite: vi.fn(),
        joinFamily: vi.fn(),
        removeDevice: vi.fn(),
        setPermission: vi.fn(),
        clearInvite: vi.fn(),
        clearError: vi.fn(),
      });
    });

    it('should render welcome page when isFirstRun is true', async () => {
      vi.mocked(settingsStoreModule.useSettingsStore).mockReturnValue({
        isFirstRun: true,
      } as ReturnType<typeof settingsStoreModule.useSettingsStore>);

      renderWithRouter(['/']);

      await waitFor(() => {
        expect(screen.getByTestId('welcome-page')).toBeDefined();
      });
    });

    it('should render welcome page when hasFamily is false', async () => {
      vi.mocked(settingsStoreModule.useSettingsStore).mockReturnValue({
        isFirstRun: false,
      } as ReturnType<typeof settingsStoreModule.useSettingsStore>);

      renderWithRouter(['/']);

      await waitFor(() => {
        expect(screen.getByTestId('welcome-page')).toBeDefined();
      });
    });
  });
});
