/**
 * DOFToolLogo - Unit tests
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { DOFToolLogo } from './DOFToolLogo';

describe('DOFToolLogo', () => {
  it('should render an SVG element', () => {
    const { container } = render(<DOFToolLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have aria-hidden attribute for accessibility', () => {
    const { container } = render(<DOFToolLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('should have correct viewBox', () => {
    const { container } = render(<DOFToolLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
  });

  it('should apply custom className', () => {
    const { container } = render(<DOFToolLogo className="custom-class h-8 w-8" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
    expect(svg).toHaveClass('h-8');
    expect(svg).toHaveClass('w-8');
  });

  it('should have default block class', () => {
    const { container } = render(<DOFToolLogo />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('block');
  });

  describe('variant="color" (default)', () => {
    it('should render with color variant styles by default', () => {
      const { container } = render(<DOFToolLogo />);

      const paths = container.querySelectorAll('path');
      const circles = container.querySelectorAll('circle');

      expect(paths.length).toBeGreaterThan(0);
      expect(circles.length).toBe(3);
    });

    it('should use HSL color values for color variant', () => {
      const { container } = render(<DOFToolLogo variant="color" />);

      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke', 'hsl(var(--primary))');
    });
  });

  describe('variant="mono"', () => {
    it('should render with mono variant styles', () => {
      const { container } = render(<DOFToolLogo variant="mono" />);

      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke', 'currentColor');
    });

    it('should use currentColor for all strokes in mono variant', () => {
      const { container } = render(<DOFToolLogo variant="mono" />);

      const paths = container.querySelectorAll('path');
      paths.forEach((path) => {
        const stroke = path.getAttribute('stroke');
        expect(stroke).toBe('currentColor');
      });
    });

    it('should use transparent fill for surface in mono variant', () => {
      const { container } = render(<DOFToolLogo variant="mono" />);

      const pathWithFill = container.querySelector('path[fill]');
      expect(pathWithFill).toHaveAttribute('fill', 'transparent');
    });
  });

  it('should contain the house shape path', () => {
    const { container } = render(<DOFToolLogo />);

    const housePath = container.querySelector('path[d="M32 10 12 26v26h40V26L32 10Z"]');
    expect(housePath).toBeInTheDocument();
  });

  it('should contain three node circles', () => {
    const { container } = render(<DOFToolLogo />);

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(3);

    const circlePositions = Array.from(circles).map((c) => ({
      cx: c.getAttribute('cx'),
      cy: c.getAttribute('cy'),
    }));

    expect(circlePositions).toContainEqual({ cx: '12', cy: '26' });
    expect(circlePositions).toContainEqual({ cx: '52', cy: '26' });
    expect(circlePositions).toContainEqual({ cx: '32', cy: '10' });
  });
});
