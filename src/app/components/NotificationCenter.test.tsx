import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationCenter } from './NotificationCenter';

import type { NotificationHistoryItem } from '@/hooks/useNotifications';

const mockHistory: NotificationHistoryItem[] = [
  {
    id: '1',
    title: 'Test Notification',
    body: 'Test body',
    module: 'calendar',
    priority: 'normal',
    createdAt: Date.now(),
  },
  {
    id: '2',
    title: 'Urgent Notification',
    body: 'Urgent body',
    module: 'tasks',
    priority: 'urgent',
    createdAt: Date.now(),
  },
];

const mockUseNotifications = {
  history: mockHistory,
  preferences: { paused: false },
  unreadCount: 2,
  isLoading: false,
  clearHistory: vi.fn().mockResolvedValue(undefined),
  togglePaused: vi.fn().mockResolvedValue(undefined),
  markAsViewed: vi.fn(),
};

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => mockUseNotifications),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.history = mockHistory;
    mockUseNotifications.unreadCount = 2;
    mockUseNotifications.preferences = { paused: false };
    mockUseNotifications.isLoading = false;
  });

  it('should render notification button', () => {
    render(<NotificationCenter />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('should show unread count badge when there are unread notifications', () => {
    render(<NotificationCenter />);
    expect(screen.getByText('2')).toBeDefined();
  });

  it('should have correct aria-label with unread count', () => {
    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Notifications (2 unread)');
  });

  it('should open popover when button is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('should display notification items when popover is open', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Test Notification')).toBeDefined();
    expect(screen.getByText('Urgent Notification')).toBeDefined();
  });

  it('should call markAsViewed when popover opens', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockUseNotifications.markAsViewed).toHaveBeenCalled();
    });
  });

  it('should show empty state when no notifications', async () => {
    mockUseNotifications.history = [];
    mockUseNotifications.unreadCount = 0;

    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('No notifications yet')).toBeDefined();
  });

  it('should show loading state when isLoading is true', async () => {
    mockUseNotifications.isLoading = true;

    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('should show paused message when notifications are paused', async () => {
    mockUseNotifications.preferences = { paused: true };

    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Notifications are paused')).toBeDefined();
  });

  it('should call togglePaused when pause button is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));
    const pauseButton = screen.getByTitle('Pause notifications');
    await user.click(pauseButton);

    expect(mockUseNotifications.togglePaused).toHaveBeenCalled();
  });

  it('should call clearHistory when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));
    const clearButton = screen.getByTitle('Clear all notifications');
    await user.click(clearButton);

    expect(mockUseNotifications.clearHistory).toHaveBeenCalled();
  });

  it('should display Close button when there are notifications', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Close')).toBeDefined();
  });
});
