/**
 * MessageComposer Component - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MessageComposer } from './MessageComposer';

import type { EmailMessage } from '../types/Email.types';

// Mock the email preferences store
vi.mock('../stores/emailPreferences.store', () => ({
  useEmailPreferencesStore: vi.fn((selector) =>
    selector({
      preferences: {
        compose: {
          windowMode: 'dialog',
        },
      },
    })
  ),
}));

describe('MessageComposer', () => {
  const mockReplyToMessage: EmailMessage = {
    id: 'msg-1',
    accountId: 'account-1',
    familyId: 'family-1',
    uid: 12345,
    messageId: '<msg-123@example.com>',
    threadId: 'thread-1',
    folder: 'INBOX',
    from: { name: 'John Doe', address: 'john@example.com' },
    to: [{ address: 'me@example.com' }],
    cc: [{ address: 'cc@example.com' }],
    subject: 'Original Subject',
    textBody: 'Original message body.',
    htmlBody: '<p>Original message body.</p>',
    snippet: 'Original message...',
    date: Date.now() - 3600000,
    size: 5000,
    read: true,
    starred: false,
    draft: false,
    labels: [],
    attachments: [],
    flags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockOnSend = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();
  const mockOnSaveDraft = vi.fn();

  const defaultProps = {
    isOpen: true,
    mode: 'new' as const,
    replyTo: null,
    accountId: 'account-1',
    accountEmail: 'me@example.com',
    onSend: mockOnSend,
    onClose: mockOnClose,
    onSaveDraft: mockOnSaveDraft,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByText('New Message')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<MessageComposer {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('New Message')).not.toBeInTheDocument();
    });

    it('should render To input', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should render Subject input', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByText('Subject')).toBeInTheDocument();
    });

    it('should render Send button', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
    });

    it('should render formatting toolbar', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Underline')).toBeInTheDocument();
    });
  });

  describe('dialog title based on mode', () => {
    it('should show New Message for new mode', () => {
      render(<MessageComposer {...defaultProps} mode="new" />);

      expect(screen.getByText('New Message')).toBeInTheDocument();
    });

    it('should show Reply for reply mode', () => {
      render(<MessageComposer {...defaultProps} mode="reply" replyTo={mockReplyToMessage} />);

      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('should show Reply All for reply_all mode', () => {
      render(<MessageComposer {...defaultProps} mode="reply_all" replyTo={mockReplyToMessage} />);

      expect(screen.getByText('Reply All')).toBeInTheDocument();
    });

    it('should show Forward for forward mode', () => {
      render(<MessageComposer {...defaultProps} mode="forward" replyTo={mockReplyToMessage} />);

      expect(screen.getByText('Forward')).toBeInTheDocument();
    });
  });

  describe('reply mode', () => {
    it('should pre-fill To field with sender address in reply mode', async () => {
      render(<MessageComposer {...defaultProps} mode="reply" replyTo={mockReplyToMessage} />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should pre-fill subject with Re: prefix in reply mode', () => {
      render(<MessageComposer {...defaultProps} mode="reply" replyTo={mockReplyToMessage} />);

      const subjectInput = screen.getByPlaceholderText('Subject');
      expect(subjectInput).toHaveValue('Re: Original Subject');
    });

    it('should not duplicate Re: prefix if already present', () => {
      const messageWithReSubject = {
        ...mockReplyToMessage,
        subject: 'Re: Already replied',
      };

      render(<MessageComposer {...defaultProps} mode="reply" replyTo={messageWithReSubject} />);

      const subjectInput = screen.getByPlaceholderText('Subject');
      expect(subjectInput).toHaveValue('Re: Already replied');
    });
  });

  describe('reply all mode', () => {
    it('should show Cc field in reply all mode', async () => {
      render(<MessageComposer {...defaultProps} mode="reply_all" replyTo={mockReplyToMessage} />);

      await waitFor(() => {
        expect(screen.getByText('Cc')).toBeInTheDocument();
      });
    });
  });

  describe('forward mode', () => {
    it('should pre-fill subject with Fwd: prefix in forward mode', () => {
      render(<MessageComposer {...defaultProps} mode="forward" replyTo={mockReplyToMessage} />);

      const subjectInput = screen.getByPlaceholderText('Subject');
      expect(subjectInput).toHaveValue('Fwd: Original Subject');
    });

    it('should have empty To field in forward mode', () => {
      render(<MessageComposer {...defaultProps} mode="forward" replyTo={mockReplyToMessage} />);

      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });
  });

  describe('recipient input', () => {
    it('should add recipient when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com{Enter}');

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should add recipient when comma is pressed', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com,');

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should remove recipient when X is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com{Enter}');

      expect(screen.getByText('test@example.com')).toBeInTheDocument();

      const removeButtons = document.querySelectorAll('.lucide-x');
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0].parentElement!);
      }

      await waitFor(() => {
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cc and Bcc fields', () => {
    it('should show Add Cc button by default', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Add Cc/i })).toBeInTheDocument();
    });

    it('should show Add Bcc button by default', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Add Bcc/i })).toBeInTheDocument();
    });

    it('should show Cc field when Add Cc is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Add Cc/i }));

      expect(screen.getByText('Cc')).toBeInTheDocument();
    });

    it('should show Bcc field when Add Bcc is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Add Bcc/i }));

      expect(screen.getByText('Bcc')).toBeInTheDocument();
    });
  });

  describe('send functionality', () => {
    it('should disable Send button when no recipients', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
    });

    it('should enable Send button when recipients are added', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com{Enter}');

      expect(screen.getByRole('button', { name: /Send/i })).not.toBeDisabled();
    });

    it('should call onSend with message data when Send is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com{Enter}');

      const subjectInput = screen.getByPlaceholderText('Subject');
      await user.type(subjectInput, 'Test Subject');

      const bodyInput = screen.getByPlaceholderText('Write your message...');
      await user.type(bodyInput, 'Test body content');

      await user.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ['test@example.com'],
            subject: 'Test Subject',
            text: 'Test body content',
          })
        );
      });
    });

    it('should show Sending... while sending', async () => {
      const user = userEvent.setup();
      mockOnSend.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com{Enter}');

      await user.click(screen.getByRole('button', { name: /Send/i }));

      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('should call onClose after successful send', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const toInput = screen.getByPlaceholderText('Recipients');
      await user.type(toInput, 'test@example.com{Enter}');

      await user.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('attachments', () => {
    it('should render attach file button', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
    });

    it('should show attachment when file is added', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('should remove attachment when X is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      expect(screen.getByText('test.pdf')).toBeInTheDocument();

      const attachmentRemoveButtons = document.querySelectorAll('.lucide-x');
      const lastButton = attachmentRemoveButtons[attachmentRemoveButtons.length - 1]?.parentElement;
      if (lastButton) {
        await user.click(lastButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });
  });

  describe('discard functionality', () => {
    it('should render discard button', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByTitle('Discard')).toBeInTheDocument();
    });

    it('should call onClose when discard is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      await user.click(screen.getByTitle('Discard'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('fullscreen toggle', () => {
    it('should render fullscreen toggle button', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
    });

    it('should toggle fullscreen mode when clicked', async () => {
      const user = userEvent.setup();
      render(<MessageComposer {...defaultProps} />);

      await user.click(screen.getByTitle('Fullscreen'));

      expect(screen.getByTitle('Exit fullscreen')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible dialog description', () => {
      render(<MessageComposer {...defaultProps} />);

      expect(screen.getByText('Compose and send an email message')).toBeInTheDocument();
    });
  });
});
