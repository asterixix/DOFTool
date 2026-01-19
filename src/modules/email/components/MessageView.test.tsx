/**
 * MessageView Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MessageView } from './MessageView';

import type { EmailMessage, EmailAttachment } from '../types/Email.types';

describe('MessageView', () => {
  const mockAttachment: EmailAttachment = {
    id: 'attach-1',
    filename: 'document.pdf',
    contentType: 'application/pdf',
    size: 102400, // 100 KB
    inline: false,
  };

  const mockMessage: EmailMessage = {
    id: 'msg-1',
    accountId: 'account-1',
    familyId: 'family-1',
    uid: 12345,
    messageId: '<msg-123@example.com>',
    threadId: 'thread-1',
    folder: 'INBOX',
    from: { name: 'John Doe', address: 'john@example.com' },
    to: [{ name: 'Jane Smith', address: 'jane@example.com' }],
    cc: [{ address: 'cc@example.com' }],
    subject: 'Test Email Subject',
    textBody: 'This is the plain text body.',
    htmlBody: '<p>This is the <strong>HTML</strong> body.</p>',
    snippet: 'This is the snippet preview...',
    date: Date.now() - 3600000, // 1 hour ago
    size: 5000,
    read: false,
    starred: false,
    draft: false,
    labels: [],
    attachments: [mockAttachment],
    flags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockOnArchive = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnDownloadAttachment = vi.fn();
  const mockOnForward = vi.fn();
  const mockOnMarkAsRead = vi.fn();
  const mockOnReply = vi.fn();
  const mockOnReplyAll = vi.fn();
  const mockOnToggleStar = vi.fn();

  const defaultProps = {
    message: mockMessage,
    onArchive: mockOnArchive,
    onBack: mockOnBack,
    onDelete: mockOnDelete,
    onDownloadAttachment: mockOnDownloadAttachment,
    onForward: mockOnForward,
    onMarkAsRead: mockOnMarkAsRead,
    onReply: mockOnReply,
    onReplyAll: mockOnReplyAll,
    onToggleStar: mockOnToggleStar,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render subject', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
    });

    it('should render (no subject) when subject is empty', () => {
      render(<MessageView {...defaultProps} message={{ ...mockMessage, subject: '' }} />);

      expect(screen.getByText('(no subject)')).toBeInTheDocument();
    });

    it('should render sender name', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render sender email address', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('<john@example.com>')).toBeInTheDocument();
    });

    it('should render sender initials in avatar', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render recipients', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText(/to Jane Smith/)).toBeInTheDocument();
    });

    it('should render formatted date', () => {
      render(<MessageView {...defaultProps} />);

      const dateElement = screen.getByText(/\d{1,2}:\d{2}\s?(AM|PM)/i);
      expect(dateElement).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show placeholder when no message is selected', () => {
      render(<MessageView {...defaultProps} message={null} />);

      expect(screen.getByText('Select a message to read')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should render Reply button', () => {
      render(<MessageView {...defaultProps} />);

      const replyButton = screen.getByTitle('Reply');
      expect(replyButton).toBeInTheDocument();
    });

    it('should render Reply All button', () => {
      render(<MessageView {...defaultProps} />);

      const replyAllButton = screen.getByTitle('Reply All');
      expect(replyAllButton).toBeInTheDocument();
    });

    it('should render Forward button', () => {
      render(<MessageView {...defaultProps} />);

      const forwardButton = screen.getByTitle('Forward');
      expect(forwardButton).toBeInTheDocument();
    });

    it('should render Archive button', () => {
      render(<MessageView {...defaultProps} />);

      const archiveButton = screen.getByTitle('Archive');
      expect(archiveButton).toBeInTheDocument();
    });

    it('should render Delete button', () => {
      render(<MessageView {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should call onReply when Reply is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      await user.click(screen.getByTitle('Reply'));

      expect(mockOnReply).toHaveBeenCalled();
    });

    it('should call onReplyAll when Reply All is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      await user.click(screen.getByTitle('Reply All'));

      expect(mockOnReplyAll).toHaveBeenCalled();
    });

    it('should call onForward when Forward is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      await user.click(screen.getByTitle('Forward'));

      expect(mockOnForward).toHaveBeenCalled();
    });

    it('should call onArchive when Archive is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      await user.click(screen.getByTitle('Archive'));

      expect(mockOnArchive).toHaveBeenCalled();
    });

    it('should call onDelete when Delete is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      await user.click(screen.getByTitle('Delete'));

      expect(mockOnDelete).toHaveBeenCalled();
    });

    it('should call onBack when Back is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      const backButton = document.querySelector('.lucide-arrow-left')?.parentElement;
      if (backButton) {
        await user.click(backButton);
      }

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('star functionality', () => {
    it('should render star button', () => {
      render(<MessageView {...defaultProps} />);

      const starButton = screen.getByTitle('Add star');
      expect(starButton).toBeInTheDocument();
    });

    it('should show Remove star title when message is starred', () => {
      render(<MessageView {...defaultProps} message={{ ...mockMessage, starred: true }} />);

      const starButton = screen.getByTitle('Remove star');
      expect(starButton).toBeInTheDocument();
    });

    it('should call onToggleStar when star is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      await user.click(screen.getByTitle('Add star'));

      expect(mockOnToggleStar).toHaveBeenCalled();
    });

    it('should show filled star icon when starred', () => {
      render(<MessageView {...defaultProps} message={{ ...mockMessage, starred: true }} />);

      const starIcon = document.querySelector('.fill-yellow-400');
      expect(starIcon).toBeInTheDocument();
    });
  });

  describe('attachments', () => {
    it('should display attachments section when attachments exist', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('Attachments (1)')).toBeInTheDocument();
    });

    it('should not display attachments section when no attachments', () => {
      render(<MessageView {...defaultProps} message={{ ...mockMessage, attachments: [] }} />);

      expect(screen.queryByText(/Attachments/)).not.toBeInTheDocument();
    });

    it('should display attachment filename', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });

    it('should display attachment size', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.getByText('100.0 KB')).toBeInTheDocument();
    });

    it('should call onDownloadAttachment when download is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      const downloadButton = document.querySelector('.lucide-download')?.parentElement;
      if (downloadButton) {
        await user.click(downloadButton);
      }

      expect(mockOnDownloadAttachment).toHaveBeenCalledWith(mockAttachment);
    });
  });

  describe('external images warning', () => {
    it('should show external images warning when email has external images', () => {
      const messageWithExternalImages: EmailMessage = {
        ...mockMessage,
        htmlBody: '<img src="https://example.com/tracker.gif">',
      };

      render(<MessageView {...defaultProps} message={messageWithExternalImages} />);

      expect(screen.getByText('External images are hidden')).toBeInTheDocument();
    });

    it('should show Show images button when external images are blocked', () => {
      const messageWithExternalImages: EmailMessage = {
        ...mockMessage,
        htmlBody: '<img src="https://example.com/tracker.gif">',
      };

      render(<MessageView {...defaultProps} message={messageWithExternalImages} />);

      expect(screen.getByRole('button', { name: /Show images/i })).toBeInTheDocument();
    });

    it('should hide warning when Show images is clicked', async () => {
      const user = userEvent.setup();
      const messageWithExternalImages: EmailMessage = {
        ...mockMessage,
        htmlBody: '<img src="https://example.com/tracker.gif">',
      };

      render(<MessageView {...defaultProps} message={messageWithExternalImages} />);

      await user.click(screen.getByRole('button', { name: /Show images/i }));

      expect(screen.queryByText('External images are hidden')).not.toBeInTheDocument();
    });

    it('should not show warning for emails without external images', () => {
      render(<MessageView {...defaultProps} />);

      expect(screen.queryByText('External images are hidden')).not.toBeInTheDocument();
    });
  });

  describe('dropdown menu', () => {
    it('should open more options dropdown', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} />);

      const moreButton = document.querySelector('.lucide-more-vertical')?.parentElement;
      if (moreButton) {
        await user.click(moreButton);
      }

      expect(screen.getByText('Print')).toBeInTheDocument();
    });

    it('should show Mark as unread option for read messages', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} message={{ ...mockMessage, read: true }} />);

      const moreButton = document.querySelector('.lucide-more-vertical')?.parentElement;
      if (moreButton) {
        await user.click(moreButton);
      }

      expect(screen.getByText('Mark as unread')).toBeInTheDocument();
    });

    it('should show Mark as read option for unread messages', async () => {
      const user = userEvent.setup();
      render(<MessageView {...defaultProps} message={{ ...mockMessage, read: false }} />);

      const moreButton = document.querySelector('.lucide-more-vertical')?.parentElement;
      if (moreButton) {
        await user.click(moreButton);
      }

      expect(screen.getByText('Mark as read')).toBeInTheDocument();
    });
  });

  describe('recipient overflow', () => {
    it('should show +N more badge when more than 3 recipients', () => {
      const messageWithManyRecipients: EmailMessage = {
        ...mockMessage,
        to: [
          { address: 'a@example.com' },
          { address: 'b@example.com' },
          { address: 'c@example.com' },
          { address: 'd@example.com' },
          { address: 'e@example.com' },
        ],
        cc: [],
      };

      render(<MessageView {...defaultProps} message={messageWithManyRecipients} />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });
});
