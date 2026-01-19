/**
 * EmailPreferencesPanel Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EmailPreferencesPanel } from './EmailPreferencesPanel';

// Mock the store
const mockUpdateDisplayPreferences = vi.fn();
const mockUpdateComposePreferences = vi.fn();
const mockUpdateSecurityPreferences = vi.fn();
const mockUpdateNotificationPreferences = vi.fn();

const mockPreferences = {
  display: {
    density: 'comfortable' as const,
    previewPane: 'right' as const,
    dateFormat: 'relative' as const,
    threadMode: 'conversation' as const,
    showSnippets: true,
    showAvatars: true,
    keyboardShortcuts: true,
  },
  compose: {
    windowMode: 'dialog' as const,
    defaultReply: 'reply' as const,
    includeOriginal: true,
    richTextEditor: true,
    confirmBeforeSend: false,
  },
  security: {
    externalImages: 'ask' as const,
    blockTrackingPixels: true,
    showPhishingWarnings: true,
    externalSenderWarnings: false,
  },
  notifications: {
    desktopNotifications: true,
    soundEnabled: true,
    showPreview: true,
    importantOnly: false,
  },
};

vi.mock('../../stores/emailPreferences.store', () => ({
  useEmailPreferencesStore: vi.fn((selector) =>
    selector({
      preferences: mockPreferences,
      updateDisplayPreferences: mockUpdateDisplayPreferences,
      updateComposePreferences: mockUpdateComposePreferences,
      updateSecurityPreferences: mockUpdateSecurityPreferences,
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    })
  ),
}));

describe('EmailPreferencesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render Display section', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Display')).toBeInTheDocument();
      expect(screen.getByText('Customize how emails are displayed')).toBeInTheDocument();
    });

    it('should render Compose section', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Compose')).toBeInTheDocument();
      expect(screen.getByText('Customize email composition behavior')).toBeInTheDocument();
    });

    it('should render Security & Privacy section', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
      expect(screen.getByText('Control how external content is handled')).toBeInTheDocument();
    });

    it('should render Notifications section', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Configure email notification settings')).toBeInTheDocument();
    });
  });

  describe('display preferences', () => {
    it('should render Message density select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Message density')).toBeInTheDocument();
    });

    it('should render Preview pane select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Preview pane')).toBeInTheDocument();
    });

    it('should render Date format select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Date format')).toBeInTheDocument();
    });

    it('should render Thread display select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Thread display')).toBeInTheDocument();
    });

    it('should render Show message snippets switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Show message snippets')).toBeInTheDocument();
    });

    it('should render Show avatars switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Show avatars')).toBeInTheDocument();
    });

    it('should render Keyboard shortcuts switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
    });

    it('should call updateDisplayPreferences when density is changed', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      // Click the density select trigger
      const densityLabels = screen.getAllByText(/comfortable/i);
      await user.click(densityLabels[0]!);

      // Select a different option
      const compactOption = screen.getByRole('option', { name: 'Compact' });
      await user.click(compactOption);

      expect(mockUpdateDisplayPreferences).toHaveBeenCalledWith({ density: 'compact' });
    });

    it('should call updateDisplayPreferences when show snippets is toggled', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      const snippetSwitch = screen.getByRole('switch', { name: /Show message snippets/i });
      await user.click(snippetSwitch);

      expect(mockUpdateDisplayPreferences).toHaveBeenCalledWith({ showSnippets: false });
    });
  });

  describe('compose preferences', () => {
    it('should render Compose window select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Compose window')).toBeInTheDocument();
    });

    it('should render Default reply select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Default reply')).toBeInTheDocument();
    });

    it('should render Include original message switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Include original message')).toBeInTheDocument();
    });

    it('should render Rich text editor switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Rich text editor')).toBeInTheDocument();
    });

    it('should render Confirm before sending switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Confirm before sending')).toBeInTheDocument();
    });

    it('should call updateComposePreferences when window mode is changed', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      // Click the window mode select
      const dialogOptions = screen.getAllByText('Dialog');
      await user.click(dialogOptions[0]!);

      const fullscreenOption = screen.getByRole('option', { name: 'Fullscreen' });
      await user.click(fullscreenOption);

      expect(mockUpdateComposePreferences).toHaveBeenCalledWith({ windowMode: 'fullscreen' });
    });

    it('should call updateComposePreferences when confirm before send is toggled', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      const confirmSwitch = screen.getByRole('switch', { name: /Confirm before sending/i });
      await user.click(confirmSwitch);

      expect(mockUpdateComposePreferences).toHaveBeenCalledWith({ confirmBeforeSend: true });
    });
  });

  describe('security preferences', () => {
    it('should render External images select', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('External images')).toBeInTheDocument();
    });

    it('should render Block tracking pixels switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Block tracking pixels')).toBeInTheDocument();
    });

    it('should render Show phishing warnings switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Show phishing warnings')).toBeInTheDocument();
    });

    it('should render External sender warnings switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('External sender warnings')).toBeInTheDocument();
    });

    it('should call updateSecurityPreferences when external images is changed', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      // Click the external images select
      const askOptions = screen.getAllByText(/Ask each time/i);
      await user.click(askOptions[0]!);

      const blockOption = screen.getByRole('option', { name: 'Block' });
      await user.click(blockOption);

      expect(mockUpdateSecurityPreferences).toHaveBeenCalledWith({ externalImages: 'block' });
    });

    it('should call updateSecurityPreferences when tracking pixels is toggled', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      const trackingSwitch = screen.getByRole('switch', { name: /Block tracking pixels/i });
      await user.click(trackingSwitch);

      expect(mockUpdateSecurityPreferences).toHaveBeenCalledWith({ blockTrackingPixels: false });
    });
  });

  describe('notification preferences', () => {
    it('should render Desktop notifications switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Desktop notifications')).toBeInTheDocument();
    });

    it('should render Notification sound switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Notification sound')).toBeInTheDocument();
    });

    it('should render Show preview switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Show preview')).toBeInTheDocument();
    });

    it('should render Important only switch', () => {
      render(<EmailPreferencesPanel />);

      expect(screen.getByText('Important only')).toBeInTheDocument();
    });

    it('should call updateNotificationPreferences when desktop notifications is toggled', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      const notificationsSwitch = screen.getByRole('switch', { name: /Desktop notifications/i });
      await user.click(notificationsSwitch);

      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
        desktopNotifications: false,
      });
    });

    it('should call updateNotificationPreferences when sound is toggled', async () => {
      const user = userEvent.setup();
      render(<EmailPreferencesPanel />);

      const switches = screen.getAllByRole('switch');
      const soundSwitch =
        switches.find(
          (switchEl) =>
            switchEl.getAttribute('aria-label') === 'Notification sound' ||
            switchEl.closest('div')?.querySelector('label')?.textContent === 'Notification sound'
        ) || switches[2]; // Fallback to third switch (sound toggle)

      if (!soundSwitch) {
        throw new Error('Sound switch not found');
      }

      await user.click(soundSwitch);

      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({ soundEnabled: false });
    });
  });

  describe('switch component styling', () => {
    it('should have proper switch role for all toggle items', () => {
      render(<EmailPreferencesPanel />);

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('should have aria-checked attribute on switches', () => {
      render(<EmailPreferencesPanel />);

      const switches = screen.getAllByRole('switch');
      switches.forEach((switchEl) => {
        expect(switchEl).toHaveAttribute('aria-checked');
      });
    });
  });
});
