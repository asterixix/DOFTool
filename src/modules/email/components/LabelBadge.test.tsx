/**
 * LabelBadge Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LabelBadge } from './LabelBadge';

import type { EmailLabel } from '../types/Email.types';

describe('LabelBadge', () => {
  const mockLabel: EmailLabel = {
    id: 'label-1',
    accountId: 'account-1',
    familyId: 'family-1',
    name: 'Important',
    color: '#ff0000',
    icon: '⭐',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockLabelWithoutIcon: EmailLabel = {
    id: 'label-2',
    accountId: 'account-1',
    familyId: 'family-1',
    name: 'Work',
    color: '#0000ff',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the label name', () => {
      render(<LabelBadge label={mockLabel} />);

      expect(screen.getByText('Important')).toBeInTheDocument();
    });

    it('should render the icon when provided', () => {
      render(<LabelBadge label={mockLabel} />);

      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should not render icon when not provided', () => {
      render(<LabelBadge label={mockLabelWithoutIcon} />);

      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<LabelBadge className="custom-class" label={mockLabel} />);

      const badge = container.querySelector('.custom-class');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply default variant styles with background color', () => {
      const { container } = render(<LabelBadge label={mockLabel} variant="default" />);

      const badge = container.querySelector('[class*="group"]');
      expect(badge).toHaveStyle({ backgroundColor: '#ff0000' });
      expect(badge).toHaveStyle({ color: '#ffffff' });
    });

    it('should apply outline variant styles with border color', () => {
      const { container } = render(<LabelBadge label={mockLabel} variant="outline" />);

      const badge = container.querySelector('[class*="group"]');
      expect(badge).toHaveStyle({ borderColor: '#ff0000' });
      expect(badge).toHaveStyle({ color: '#ff0000' });
    });

    it('should default to default variant', () => {
      const { container } = render(<LabelBadge label={mockLabel} />);

      const badge = container.querySelector('[class*="group"]');
      expect(badge).toHaveStyle({ backgroundColor: '#ff0000' });
    });
  });

  describe('remove functionality', () => {
    it('should not show remove button when onRemove is not provided', () => {
      render(<LabelBadge label={mockLabel} />);

      const removeButton = screen.queryByRole('button');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should show remove button when onRemove is provided', () => {
      const mockOnRemove = vi.fn();
      render(<LabelBadge label={mockLabel} onRemove={mockOnRemove} />);

      const removeButton = screen.getByRole('button');
      expect(removeButton).toBeInTheDocument();
    });

    it('should call onRemove with label id when remove button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRemove = vi.fn();
      render(<LabelBadge label={mockLabel} onRemove={mockOnRemove} />);

      const removeButton = screen.getByRole('button');
      await user.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnRemove).toHaveBeenCalledWith('label-1');
    });

    it('should stop event propagation when remove is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRemove = vi.fn();
      const mockParentClick = vi.fn();

      render(
        <div onClick={mockParentClick}>
          <LabelBadge label={mockLabel} onRemove={mockOnRemove} />
        </div>
      );

      const removeButton = screen.getByRole('button');
      await user.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalled();
      expect(mockParentClick).not.toHaveBeenCalled();
    });

    it('should render X icon in remove button', () => {
      const mockOnRemove = vi.fn();
      render(<LabelBadge label={mockLabel} onRemove={mockOnRemove} />);

      const xIcon = document.querySelector('.lucide-x');
      expect(xIcon).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper button type', () => {
      const mockOnRemove = vi.fn();
      render(<LabelBadge label={mockLabel} onRemove={mockOnRemove} />);

      const removeButton = screen.getByRole('button');
      expect(removeButton).toHaveAttribute('type', 'button');
    });
  });
});
