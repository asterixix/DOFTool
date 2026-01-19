/**
 * LabelManager Component - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LabelManager } from './LabelManager';

import type { EmailLabel } from '../types/Email.types';

// Mock the useEmailLabels hook
const mockLabels: EmailLabel[] = [
  {
    id: 'label-1',
    accountId: 'account-1',
    familyId: 'family-1',
    name: 'Important',
    color: '#ff0000',
    icon: '⭐',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'label-2',
    accountId: 'account-1',
    familyId: 'family-1',
    name: 'Work',
    color: '#0000ff',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const mockLoadLabels = vi.fn().mockResolvedValue(undefined);
const mockCreateLabel = vi.fn().mockResolvedValue(undefined);
const mockUpdateLabel = vi.fn().mockResolvedValue(undefined);
const mockDeleteLabel = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useEmailLabels', () => ({
  useEmailLabels: vi.fn(() => ({
    labels: mockLabels,
    isLoading: false,
    error: null,
    loadLabels: mockLoadLabels,
    createLabel: mockCreateLabel,
    updateLabel: mockUpdateLabel,
    deleteLabel: mockDeleteLabel,
  })),
}));

describe('LabelManager', () => {
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    accountId: 'account-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open is true', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByText('Manage Labels')).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      render(<LabelManager {...defaultProps} open={false} />);

      expect(screen.queryByText('Manage Labels')).not.toBeInTheDocument();
    });

    it('should render description', () => {
      render(<LabelManager {...defaultProps} />);

      expect(
        screen.getByText(/Create and manage labels for organizing your emails/i)
      ).toBeInTheDocument();
    });

    it('should render Create New Label section', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByText('Create New Label')).toBeInTheDocument();
    });

    it('should render label name input', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByLabelText('Label Name')).toBeInTheDocument();
    });

    it('should render color input', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByLabelText('Color')).toBeInTheDocument();
    });

    it('should render icon input', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByLabelText('Icon (Optional)')).toBeInTheDocument();
    });

    it('should render Create Label button', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Create Label/i })).toBeInTheDocument();
    });

    it('should render Close button', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });
  });

  describe('existing labels list', () => {
    it('should show Existing Labels section', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByText('Existing Labels')).toBeInTheDocument();
    });

    it('should display labels with LabelBadge', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should show edit button for each label', () => {
      render(<LabelManager {...defaultProps} />);

      const tagIcons = document.querySelectorAll('.lucide-tag');
      expect(tagIcons.length).toBe(2);
    });

    it('should show delete button for each label', () => {
      render(<LabelManager {...defaultProps} />);

      const xIcons = document.querySelectorAll('.lucide-x');
      expect(xIcons.length).toBe(2);
    });
  });

  describe('create label', () => {
    it('should disable Create button when label name is empty', () => {
      render(<LabelManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Create Label/i })).toBeDisabled();
    });

    it('should enable Create button when label name has value', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const input = screen.getByLabelText('Label Name');
      await user.type(input, 'New Label');

      expect(screen.getByRole('button', { name: /Create Label/i })).not.toBeDisabled();
    });

    it('should call createLabel when Create is clicked', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const input = screen.getByLabelText('Label Name');
      await user.type(input, 'New Label');

      await user.click(screen.getByRole('button', { name: /Create Label/i }));

      await waitFor(() => {
        expect(mockCreateLabel).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Label',
            accountId: 'account-1',
          })
        );
      });
    });

    it('should include color in create call', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const nameInput = screen.getByLabelText('Label Name');
      await user.type(nameInput, 'New Label');

      await user.click(screen.getByRole('button', { name: /Create Label/i }));

      await waitFor(() => {
        expect(mockCreateLabel).toHaveBeenCalledWith(
          expect.objectContaining({
            color: '#3b82f6', // Default blue
          })
        );
      });
    });

    it('should include icon in create call when provided', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const nameInput = screen.getByLabelText('Label Name');
      await user.type(nameInput, 'New Label');

      const iconInput = screen.getByLabelText('Icon (Optional)');
      await user.type(iconInput, '🏷️');

      await user.click(screen.getByRole('button', { name: /Create Label/i }));

      await waitFor(() => {
        expect(mockCreateLabel).toHaveBeenCalledWith(
          expect.objectContaining({
            icon: '🏷️',
          })
        );
      });
    });

    it('should clear form after successful creation', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const input = screen.getByLabelText('Label Name');
      await user.type(input, 'New Label');

      await user.click(screen.getByRole('button', { name: /Create Label/i }));

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('edit label', () => {
    it('should show Edit Label title when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      expect(screen.getByText('Edit Label')).toBeInTheDocument();
    });

    it('should pre-fill form with label data', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      const nameInput = screen.getByLabelText('Label Name');
      expect(nameInput).toHaveValue('Important');
    });

    it('should show Update button instead of Create when editing', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      expect(screen.getByRole('button', { name: /Update Label/i })).toBeInTheDocument();
    });

    it('should show Cancel button when editing', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should call updateLabel when Update is clicked', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      const nameInput = screen.getByLabelText('Label Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Label');

      await user.click(screen.getByRole('button', { name: /Update Label/i }));

      await waitFor(() => {
        expect(mockUpdateLabel).toHaveBeenCalledWith(
          'label-1',
          expect.objectContaining({
            name: 'Updated Label',
          })
        );
      });
    });

    it('should cancel editing when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(screen.getByText('Create New Label')).toBeInTheDocument();
    });
  });

  describe('delete label', () => {
    it('should show confirmation when delete button is clicked', async () => {
      const user = userEvent.setup();

      // Mock confirm dialog
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LabelManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-x')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this label?');
    });

    it('should call deleteLabel when confirmed', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LabelManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-x')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      await waitFor(() => {
        expect(mockDeleteLabel).toHaveBeenCalledWith('label-1');
      });
    });

    it('should not call deleteLabel when cancelled', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<LabelManager {...defaultProps} />);

      const deleteButton = document.querySelector('.lucide-x')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(mockDeleteLabel).not.toHaveBeenCalled();
    });

    it('should reset edit form if deleted label was being edited', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<LabelManager {...defaultProps} />);

      // Start editing the first label
      const editButton = document.querySelector('.lucide-tag')?.parentElement;
      if (editButton) {
        await user.click(editButton);
      }

      // Delete the label being edited
      const deleteButton = document.querySelector('.lucide-x')?.parentElement;
      if (deleteButton) {
        await user.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Create New Label')).toBeInTheDocument();
      });
    });
  });

  describe('load labels', () => {
    it('should call loadLabels when dialog opens', () => {
      render(<LabelManager {...defaultProps} />);

      expect(mockLoadLabels).toHaveBeenCalled();
    });
  });

  describe('close dialog', () => {
    it('should call onOpenChange when Close is clicked', async () => {
      const user = userEvent.setup();
      render(<LabelManager {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Close/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
