/**
 * Email Module - Unit tests for main entry point
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import EmailModule from './index';

describe('EmailModule', () => {
  describe('EmailBuildingPlaceholder', () => {
    it('should render the building placeholder', () => {
      render(<EmailModule />);

      expect(screen.getByText('Email Module Building')).toBeInTheDocument();
    });

    it('should display informational message about the module status', () => {
      render(<EmailModule />);

      expect(screen.getByText(/The email module is currently being rebuilt/i)).toBeInTheDocument();
    });

    it('should show the Mail icon', () => {
      render(<EmailModule />);

      const mailIcon = document.querySelector('.lucide-mail');
      expect(mailIcon).toBeInTheDocument();
    });

    it('should show loading spinner with text', () => {
      render(<EmailModule />);

      expect(screen.getByText(/Building email functionality/i)).toBeInTheDocument();
    });

    it('should have proper layout with centered content', () => {
      const { container } = render(<EmailModule />);

      const wrapper = container.querySelector('.flex.min-h-full');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('flex-col', 'items-center', 'justify-center');
    });
  });
});
