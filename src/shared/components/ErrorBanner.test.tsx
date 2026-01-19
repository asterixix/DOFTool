/**
 * ErrorBanner - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  const defaultProps = {
    error: 'Something went wrong',
    onDismiss: vi.fn(),
  };

  describe('when error is null', () => {
    it('should return null and not render anything', () => {
      const { container } = render(<ErrorBanner error={null} onDismiss={vi.fn()} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when error is provided', () => {
    it('should render the error message', () => {
      render(<ErrorBanner {...defaultProps} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should have role="alert" for accessibility', () => {
      render(<ErrorBanner {...defaultProps} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render the alert icon', () => {
      const { container } = render(<ErrorBanner {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-destructive');
    });

    it('should render the dismiss button', () => {
      render(<ErrorBanner {...defaultProps} />);

      const button = screen.getByRole('button', { name: /dismiss error/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(<ErrorBanner error="Error message" onDismiss={onDismiss} />);

      await user.click(screen.getByRole('button', { name: /dismiss error/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should apply custom className', () => {
      render(<ErrorBanner {...defaultProps} className="custom-class" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-class');
    });

    it('should have destructive styling classes', () => {
      render(<ErrorBanner {...defaultProps} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-destructive/50', 'bg-destructive/10');
    });

    it('should display different error messages', () => {
      const { rerender } = render(<ErrorBanner error="First error" onDismiss={vi.fn()} />);

      expect(screen.getByText('First error')).toBeInTheDocument();

      rerender(<ErrorBanner error="Second error" onDismiss={vi.fn()} />);

      expect(screen.getByText('Second error')).toBeInTheDocument();
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });

    it('should have proper layout styles', () => {
      render(<ErrorBanner {...defaultProps} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('flex', 'items-start', 'gap-3', 'rounded-lg');
    });

    it('should have dismiss button with proper styling', () => {
      render(<ErrorBanner {...defaultProps} />);

      const button = screen.getByRole('button', { name: /dismiss error/i });
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveClass('text-destructive');
    });
  });

  describe('edge cases', () => {
    it('should render empty string error as null', () => {
      const { container } = render(<ErrorBanner error="" onDismiss={vi.fn()} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render long error messages', () => {
      const longError =
        'This is a very long error message that describes something that went terribly wrong in the application and needs to be displayed to the user in a clear way';

      render(<ErrorBanner error={longError} onDismiss={vi.fn()} />);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });
  });
});
