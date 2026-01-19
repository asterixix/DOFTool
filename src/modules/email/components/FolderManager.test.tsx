/**
 * FolderManager Component - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FolderManager } from './FolderManager';

import type { EmailFolder } from '../types/Email.types';

// Mock electronAPI
const mockCreateFolder = vi.fn().mockResolvedValue({ success: true });
const mockRenameFolder = vi.fn().mockResolvedValue({ success: true });
const mockDeleteFolder = vi.fn().mockResolvedValue({ success: true });

vi.stubGlobal('electronAPI', {
  email: {
    createFolder: mockCreateFolder,
    renameFolder: mockRenameFolder,
    deleteFolder: mockDeleteFolder,
  },
});

describe('FolderManager', () => {
  const mockFolders: EmailFolder[] = [
    {
      id: 'folder-1',
      accountId: 'account-1',
      path: 'INBOX',
      name: 'Inbox',
      type: 'inbox',
      totalMessages: 100,
      unreadMessages: 5,
      selectable: true,
    },
    {
      id: 'folder-2',
      accountId: 'account-1',
      path: 'Custom',
      name: 'Custom',
      type: 'custom',
      totalMessages: 10,
      unreadMessages: 2,
      selectable: true,
    },
  ];

  const mockOnFolderCreated = vi.fn();
  const mockOnFolderRenamed = vi.fn();
  const mockOnFolderDeleted = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    accountId: 'account-1',
    folders: mockFolders,
    onFolderCreated: mockOnFolderCreated,
    onFolderRenamed: mockOnFolderRenamed,
    onFolderDeleted: mockOnFolderDeleted,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open is true', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByText('Manage Folders')).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      render(<FolderManager {...defaultProps} open={false} />);

      expect(screen.queryByText('Manage Folders')).not.toBeInTheDocument();
    });

    it('should render description', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByText(/Create, rename, and delete email folders/i)).toBeInTheDocument();
    });

    it('should render Create New Folder section', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    });

    it('should render folder name input', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
    });

    it('should render parent folder select', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByLabelText('Parent Folder (Optional)')).toBeInTheDocument();
    });

    it('should render Create Folder button', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Create Folder/i })).toBeInTheDocument();
    });

    it('should render Close button', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });
  });

  describe('custom folders list', () => {
    it('should show Custom Folders section', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByText('Custom Folders')).toBeInTheDocument();
    });

    it('should display custom folders', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('should show message when no custom folders', () => {
      const foldersWithoutCustom = mockFolders.filter((f) => f.type !== 'custom');

      render(<FolderManager {...defaultProps} folders={foldersWithoutCustom} />);

      expect(screen.getByText('No custom folders created yet.')).toBeInTheDocument();
    });

    it('should show unread count for folders with unread messages', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByText('(2 unread)')).toBeInTheDocument();
    });

    it('should show edit button for custom folders', () => {
      render(<FolderManager {...defaultProps} />);

      const editButtons = document.querySelectorAll('.lucide-edit-2');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should show delete button for custom folders', () => {
      render(<FolderManager {...defaultProps} />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('create folder', () => {
    it('should disable Create button when folder name is empty', () => {
      render(<FolderManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Create Folder/i })).toBeDisabled();
    });

    it('should enable Create button when folder name has value', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const input = screen.getByLabelText('Folder Name');
      await user.type(input, 'New Folder');

      expect(screen.getByRole('button', { name: /Create Folder/i })).not.toBeDisabled();
    });

    it('should call createFolder when Create is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const input = screen.getByLabelText('Folder Name');
      await user.type(input, 'New Folder');

      await user.click(screen.getByRole('button', { name: /Create Folder/i }));

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith('account-1', 'New Folder');
      });
    });

    it('should call onFolderCreated after successful creation', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const input = screen.getByLabelText('Folder Name');
      await user.type(input, 'New Folder');

      await user.click(screen.getByRole('button', { name: /Create Folder/i }));

      await waitFor(() => {
        expect(mockOnFolderCreated).toHaveBeenCalled();
      });
    });

    it('should create folder with parent path when parent is selected', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const input = screen.getByLabelText('Folder Name');
      await user.type(input, 'Subfolder');

      // Select parent folder via the select component
      const parentSelect = screen.getByLabelText('Parent Folder (Optional)');
      await user.click(parentSelect);

      const inboxOption = screen.getByRole('option', { name: 'Inbox' });
      await user.click(inboxOption);

      await user.click(screen.getByRole('button', { name: /Create Folder/i }));

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith('account-1', 'INBOX/Subfolder');
      });
    });

    it('should show error when creation fails', async () => {
      mockCreateFolder.mockRejectedValueOnce(new Error('Creation failed'));
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const input = screen.getByLabelText('Folder Name');
      await user.type(input, 'New Folder');

      await user.click(screen.getByRole('button', { name: /Create Folder/i }));

      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument();
      });
    });

    it('should submit on Enter key', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const input = screen.getByLabelText('Folder Name');
      await user.type(input, 'New Folder{Enter}');

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalled();
      });
    });
  });

  describe('edit folder', () => {
    it('should show rename form when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-edit-2')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      expect(screen.getByText('Rename Folder')).toBeInTheDocument();
    });

    it('should pre-fill input with current folder name', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-edit-2')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      const input = screen.getByLabelText('New Folder Name');
      expect(input).toHaveValue('Custom');
    });

    it('should call renameFolder when Save is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-edit-2')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      const input = screen.getByLabelText('New Folder Name');
      await user.clear(input);
      await user.type(input, 'Renamed Folder');

      await user.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(mockRenameFolder).toHaveBeenCalledWith('account-1', 'Custom', 'Renamed Folder');
      });
    });

    it('should call onFolderRenamed after successful rename', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-edit-2')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      await user.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(mockOnFolderRenamed).toHaveBeenCalled();
      });
    });

    it('should cancel editing when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-edit-2')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(screen.queryByText('Rename Folder')).not.toBeInTheDocument();
    });

    it('should cancel editing on Escape key', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-edit-2')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      const input = screen.getByLabelText('New Folder Name');
      await user.type(input, '{Escape}');

      expect(screen.queryByText('Rename Folder')).not.toBeInTheDocument();
    });
  });

  describe('delete folder', () => {
    it('should show delete confirmation when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
    });

    it('should show folder path in confirmation', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(screen.getByText(/delete "Custom"/i)).toBeInTheDocument();
    });

    it('should show move messages option for folders with messages', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(screen.getByText(/This folder contains 10 message/)).toBeInTheDocument();
    });

    it('should call deleteFolder when Delete is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      await user.click(screen.getByRole('button', { name: /^Delete$/i }));

      await waitFor(() => {
        expect(mockDeleteFolder).toHaveBeenCalledWith('account-1', 'Custom', undefined);
      });
    });

    it('should call onFolderDeleted after successful delete', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      await user.click(screen.getByRole('button', { name: /^Delete$/i }));

      await waitFor(() => {
        expect(mockOnFolderDeleted).toHaveBeenCalled();
      });
    });

    it('should cancel deletion when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-trash-2')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
      await user.click(cancelButtons[cancelButtons.length - 1]!);

      expect(screen.queryByText('Delete Folder')).not.toBeInTheDocument();
    });
  });

  describe('close dialog', () => {
    it('should call onOpenChange when Close is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderManager {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Close/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
