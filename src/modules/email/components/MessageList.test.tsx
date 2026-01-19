/**
 * MessageList Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MessageList } from './MessageList';

import type { EmailMessage, EmailThread } from '../types/Email.types';

// Mock the email preferences store
vi.mock('../stores/emailPreferences.store', () => ({
  useEmailPreferencesStore: vi.fn((selector) =>
    selector({
      preferences: {
        display: {
          showSnippets: true,
          snippetLines: 2,
        },
      },
    })
  ),
}));

// Mock the virtualizer
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    getTotalSize: () => 500,
    getVirtualItems: () => [
      { index: 0, start: 0, size: 72, key: 0 },
      { index: 1, start: 72, size: 72, key: 1 },
    ],
  })),
}));

describe('MessageList', () => {
  const mockMessages: EmailMessage[] = [
    {
      id: 'msg-1',
      accountId: 'account-1',
      familyId: 'family-1',
      uid: 12345,
      messageId: '<msg-1@example.com>',
      threadId: 'thread-1',
      folder: 'INBOX',
      from: { name: 'John Doe', address: 'john@example.com' },
      to: [{ address: 'me@example.com' }],
      subject: 'First Test Email',
      textBody: 'This is the first email body.',
      snippet: 'First email snippet...',
      date: Date.now() - 3600000,
      size: 5000,
      read: false,
      starred: true,
      draft: false,
      labels: [],
      attachments: [],
      flags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'msg-2',
      accountId: 'account-1',
      familyId: 'family-1',
      uid: 12346,
      messageId: '<msg-2@example.com>',
      threadId: 'thread-2',
      folder: 'INBOX',
      from: { name: 'Jane Smith', address: 'jane@example.com' },
      to: [{ address: 'me@example.com' }],
      subject: 'Second Test Email',
      textBody: 'This is the second email body.',
      snippet: 'Second email snippet...',
      date: Date.now() - 7200000,
      size: 3000,
      read: true,
      starred: false,
      draft: false,
      labels: [],
      attachments: [
        {
          id: 'attach-1',
          filename: 'file.pdf',
          contentType: 'application/pdf',
          size: 1000,
          inline: false,
        },
      ],
      flags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockThreads: EmailThread[] = [
    {
      id: 'thread-1',
      subject: 'Thread Subject',
      messageIds: ['msg-1'],
      messages: [mockMessages[0]!],
      messageCount: 3,
      unreadCount: 2,
      participantCount: 2,
      hasAttachments: false,
      isStarred: true,
      latestDate: Date.now() - 1800000,
      snippet: 'Thread snippet...',
    },
  ];

  const mockOnMessageSelect = vi.fn();
  const mockOnThreadSelect = vi.fn();
  const mockOnToggleStar = vi.fn();
  const mockOnToggleRead = vi.fn();
  const mockOnSelectionChange = vi.fn();

  const defaultProps = {
    messages: mockMessages,
    threads: mockThreads,
    selectedMessageId: null,
    selectedThreadId: null,
    showThreads: false,
    onMessageSelect: mockOnMessageSelect,
    onThreadSelect: mockOnThreadSelect,
    onToggleStar: mockOnToggleStar,
    onToggleRead: mockOnToggleRead,
    onSelectionChange: mockOnSelectionChange,
    selectedIds: [],
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      render(<MessageList {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no messages', () => {
      render(<MessageList {...defaultProps} messages={[]} />);

      expect(screen.getByText('No messages')).toBeInTheDocument();
      expect(screen.getByText('Messages in this folder will appear here.')).toBeInTheDocument();
    });
  });

  describe('message row rendering', () => {
    it('should render message sender name', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render message subject', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByText('First Test Email')).toBeInTheDocument();
    });

    it('should render (no subject) for empty subject', () => {
      const messagesWithEmptySubject = [{ ...mockMessages[0]!, subject: '' }];

      render(<MessageList {...defaultProps} messages={messagesWithEmptySubject} />);

      expect(screen.getByText('(no subject)')).toBeInTheDocument();
    });

    it('should show attachment icon for messages with attachments', () => {
      render(<MessageList {...defaultProps} />);

      const paperclipIcon = document.querySelector('.lucide-paperclip');
      expect(paperclipIcon).toBeInTheDocument();
    });

    it('should show filled star icon for starred messages', () => {
      render(<MessageList {...defaultProps} />);

      const starIcon = document.querySelector('.fill-yellow-400');
      expect(starIcon).toBeInTheDocument();
    });
  });

  describe('message selection', () => {
    it('should call onMessageSelect when message is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const messageRows = screen.getAllByRole('option');
      if (messageRows[0]) {
        await user.click(messageRows[0]);
      }

      expect(mockOnMessageSelect).toHaveBeenCalledWith('msg-1');
    });

    it('should highlight selected message', () => {
      const { container } = render(<MessageList {...defaultProps} selectedMessageId="msg-1" />);

      const selectedRow = container.querySelector('[aria-selected="true"]');
      expect(selectedRow).toBeInTheDocument();
    });
  });

  describe('checkbox selection', () => {
    it('should render checkboxes for each message', () => {
      render(<MessageList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should call onSelectionChange when checkbox is toggled', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes[0]) {
        await user.click(checkboxes[0]);
      }

      expect(mockOnSelectionChange).toHaveBeenCalled();
    });

    it('should show checkbox as checked for selected messages', () => {
      render(<MessageList {...defaultProps} selectedIds={['msg-1']} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('star toggle', () => {
    it('should call onToggleStar when star is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const starButtons = document.querySelectorAll('.lucide-star');
      const starButton = starButtons[0]?.parentElement;
      if (starButton) {
        await user.click(starButton);
      }

      expect(mockOnToggleStar).toHaveBeenCalled();
    });
  });

  describe('read toggle', () => {
    it('should call onToggleRead when read icon is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const mailIcon = document.querySelector('.lucide-mail')?.parentElement;
      if (mailIcon) {
        await user.click(mailIcon);
      }

      expect(mockOnToggleRead).toHaveBeenCalled();
    });

    it('should show unread indicator for unread messages', () => {
      render(<MessageList {...defaultProps} />);

      const mailIcon = document.querySelector('.lucide-mail');
      expect(mailIcon).toBeInTheDocument();
    });

    it('should show read indicator for read messages', () => {
      render(<MessageList {...defaultProps} />);

      const mailOpenIcon = document.querySelector('.lucide-mail-open');
      expect(mailOpenIcon).toBeInTheDocument();
    });
  });

  describe('thread view', () => {
    it('should render threads when showThreads is true', () => {
      render(<MessageList {...defaultProps} showThreads={true} />);

      expect(screen.getByText('Thread Subject')).toBeInTheDocument();
    });

    it('should show message count badge for threads with multiple messages', () => {
      render(<MessageList {...defaultProps} showThreads={true} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show unread indicator for threads with unread messages', () => {
      render(<MessageList {...defaultProps} showThreads={true} />);

      const unreadIndicator = document.querySelector('.lucide-circle');
      expect(unreadIndicator).toBeInTheDocument();
    });

    it('should call onThreadSelect when thread is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} showThreads={true} />);

      const threadRows = screen.getAllByRole('option');
      if (threadRows[0]) {
        await user.click(threadRows[0]);
      }

      expect(mockOnThreadSelect).toHaveBeenCalledWith('thread-1');
    });

    it('should show participant count for threads with many participants', () => {
      const threadsWithManyParticipants: EmailThread[] = [
        {
          ...mockThreads[0]!,
          participantCount: 5,
        },
      ];

      render(
        <MessageList {...defaultProps} showThreads={true} threads={threadsWithManyParticipants} />
      );

      expect(screen.getByText('5 people')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('should handle Enter key to select message', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const messageRows = screen.getAllByRole('option');
      if (messageRows[0]) {
        messageRows[0].focus();
        await user.keyboard('{Enter}');
      }

      expect(mockOnMessageSelect).toHaveBeenCalledWith('msg-1');
    });

    it('should handle Space key to select message', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const messageRows = screen.getAllByRole('option');
      if (messageRows[0]) {
        messageRows[0].focus();
        await user.keyboard(' ');
      }

      expect(mockOnMessageSelect).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('date formatting', () => {
    it('should display time for today messages', () => {
      const todayMessage = {
        ...mockMessages[0]!,
        date: Date.now() - 60000, // 1 minute ago
      };

      render(<MessageList {...defaultProps} messages={[todayMessage]} />);

      // Should show time format like "10:30 AM"
      const dateElement = screen.getByText(/\d{1,2}:\d{2}\s?(AM|PM)/i);
      expect(dateElement).toBeInTheDocument();
    });

    it('should display Yesterday for yesterday messages', () => {
      const yesterdayMessage = {
        ...mockMessages[0]!,
        date: Date.now() - 86400000 - 3600000, // 25 hours ago
      };

      render(<MessageList {...defaultProps} messages={[yesterdayMessage]} />);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply bold styling to unread message subjects', () => {
      const { container } = render(<MessageList {...defaultProps} />);

      const boldSubject = container.querySelector('.font-semibold');
      expect(boldSubject).toBeInTheDocument();
    });

    it('should apply unread background styling', () => {
      const { container } = render(<MessageList {...defaultProps} />);

      const unreadRow = container.querySelector('[class*="bg-blue-50"]');
      expect(unreadRow).toBeInTheDocument();
    });
  });
});
