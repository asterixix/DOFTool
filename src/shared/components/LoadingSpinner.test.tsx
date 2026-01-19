/**
 * LoadingSpinner - Unit tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render the spinner icon', () => {
    const { container } = render(<LoadingSpinner />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });

  describe('size prop', () => {
    it('should render small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('should render medium size by default', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8');
    });

    it('should render large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
    });
  });

  describe('text prop', () => {
    it('should not render text when not provided', () => {
      render(<LoadingSpinner />);

      const paragraphs = screen.queryAllByRole('paragraph');
      expect(paragraphs).toHaveLength(0);
    });

    it('should render text when provided', () => {
      render(<LoadingSpinner text="Loading data..." />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should style text with muted foreground', () => {
      render(<LoadingSpinner text="Please wait" />);

      const text = screen.getByText('Please wait');
      expect(text).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should preserve default classes alongside custom', () => {
      const { container } = render(<LoadingSpinner className="my-custom" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'gap-3');
      expect(wrapper).toHaveClass('my-custom');
    });
  });

  describe('fullScreen prop', () => {
    it('should not be fullScreen by default', () => {
      const { container } = render(<LoadingSpinner />);

      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass('flex-1');
    });

    it('should wrap in fullScreen container when fullScreen is true', () => {
      const { container } = render(<LoadingSpinner fullScreen />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-1', 'items-center', 'justify-center');
    });

    it('should render spinner inside fullScreen wrapper', () => {
      const { container } = render(<LoadingSpinner fullScreen text="Loading..." />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('combined props', () => {
    it('should handle all props together', () => {
      const { container } = render(
        <LoadingSpinner fullScreen className="extra-class" size="lg" text="Syncing data..." />
      );

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
      expect(screen.getByText('Syncing data...')).toBeInTheDocument();

      const outerWrapper = container.firstChild;
      expect(outerWrapper).toHaveClass('flex-1');
    });

    it('should apply className to inner content even in fullScreen mode', () => {
      const { container } = render(<LoadingSpinner fullScreen className="inner-custom" />);

      const innerWrapper = container.querySelector('.inner-custom');
      expect(innerWrapper).toBeInTheDocument();
    });
  });

  it('should have muted foreground color on spinner', () => {
    const { container } = render(<LoadingSpinner />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-muted-foreground');
  });
});
