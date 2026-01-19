/**
 * EmptyState - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox, Search, FileText } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('should render the icon', () => {
    render(<EmptyState description="No items found" icon={Inbox} title="No Items" />);

    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-12', 'w-12');
  });

  it('should render the title', () => {
    render(<EmptyState description="No items found" icon={Inbox} title="No Items" />);

    expect(screen.getByRole('heading', { name: 'No Items' })).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(
      <EmptyState description="There are no items to display" icon={Inbox} title="No Items" />
    );

    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState
        className="custom-class"
        description="No items found"
        icon={Inbox}
        title="No Items"
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should have proper centering styles', () => {
    const { container } = render(
      <EmptyState description="No items found" icon={Inbox} title="No Items" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });

  describe('with action button', () => {
    it('should render action button when actionLabel and onAction are provided', () => {
      const handleAction = vi.fn();

      render(
        <EmptyState
          actionLabel="Create Item"
          description="No items found"
          icon={Inbox}
          title="No Items"
          onAction={handleAction}
        />
      );

      expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
    });

    it('should call onAction when button is clicked', async () => {
      const user = userEvent.setup();
      const handleAction = vi.fn();

      render(
        <EmptyState
          actionLabel="Create Item"
          description="No items found"
          icon={Inbox}
          title="No Items"
          onAction={handleAction}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Create Item' }));

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should not render button when only actionLabel is provided', () => {
      render(
        <EmptyState
          actionLabel="Create Item"
          description="No items found"
          icon={Inbox}
          title="No Items"
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not render button when only onAction is provided', () => {
      const handleAction = vi.fn();

      render(
        <EmptyState
          description="No items found"
          icon={Inbox}
          title="No Items"
          onAction={handleAction}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('without action button', () => {
    it('should not render button when neither actionLabel nor onAction provided', () => {
      render(<EmptyState description="No items found" icon={Inbox} title="No Items" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('with different icons', () => {
    it('should render Search icon', () => {
      const { container } = render(
        <EmptyState description="No results found" icon={Search} title="No Results" />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render FileText icon', () => {
      const { container } = render(
        <EmptyState description="No documents" icon={FileText} title="No Documents" />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
