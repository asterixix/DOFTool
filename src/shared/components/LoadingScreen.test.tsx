/**
 * LoadingScreen - Unit tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  it('should render the loading text', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render a spinner element', () => {
    const { container } = render(<LoadingScreen />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should have full screen layout', () => {
    const { container } = render(<LoadingScreen />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('min-h-screen');
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('should have background styling', () => {
    const { container } = render(<LoadingScreen />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('bg-background');
  });

  it('should render spinner with primary color border', () => {
    const { container } = render(<LoadingScreen />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('border-primary');
    expect(spinner).toHaveClass('border-t-transparent');
  });

  it('should have spinner with correct size', () => {
    const { container } = render(<LoadingScreen />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-10', 'w-10');
  });

  it('should have content centered in a flex column', () => {
    const { container } = render(<LoadingScreen />);

    const contentWrapper = container.querySelector('.flex.flex-col');
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper).toHaveClass('items-center', 'gap-4');
  });

  it('should render loading text with muted styling', () => {
    render(<LoadingScreen />);

    const loadingText = screen.getByText('Loading...');
    expect(loadingText).toHaveClass('text-sm', 'text-muted-foreground');
  });
});
