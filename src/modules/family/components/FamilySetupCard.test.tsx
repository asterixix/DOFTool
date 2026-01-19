/**
 * FamilySetupCard - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FamilySetupCard } from './FamilySetupCard';

import type { FamilyInfo } from '../types/Family.types';

describe('FamilySetupCard', () => {
  const mockOnCreateFamily = vi.fn();

  const mockFamily: FamilyInfo = {
    id: 'family-123-456-789',
    name: 'The Smiths',
    createdAt: Date.now() - 86400000, // 1 day ago
    adminDeviceId: 'device-admin-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no family exists', () => {
    it('should render the create family form', () => {
      render(
        <FamilySetupCard family={null} isCreating={false} onCreateFamily={mockOnCreateFamily} />
      );

      expect(screen.getByText('Family Setup')).toBeInTheDocument();
      expect(screen.getByText('Create your family to get started.')).toBeInTheDocument();
      expect(screen.getByLabelText('Family name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Family/i })).toBeInTheDocument();
    });

    it('should disable the create button when input is empty', () => {
      render(
        <FamilySetupCard family={null} isCreating={false} onCreateFamily={mockOnCreateFamily} />
      );

      const button = screen.getByRole('button', { name: /Create Family/i });
      expect(button).toBeDisabled();
    });

    it('should enable the create button when input has value', async () => {
      const user = userEvent.setup();

      render(
        <FamilySetupCard family={null} isCreating={false} onCreateFamily={mockOnCreateFamily} />
      );

      const input = screen.getByLabelText('Family name');
      await user.type(input, 'My Family');

      const button = screen.getByRole('button', { name: /Create Family/i });
      expect(button).not.toBeDisabled();
    });

    it('should call onCreateFamily with trimmed name on submit', async () => {
      const user = userEvent.setup();

      render(
        <FamilySetupCard family={null} isCreating={false} onCreateFamily={mockOnCreateFamily} />
      );

      const input = screen.getByLabelText('Family name');
      await user.type(input, '  The Johnsons  ');

      const button = screen.getByRole('button', { name: /Create Family/i });
      await user.click(button);

      expect(mockOnCreateFamily).toHaveBeenCalledWith('The Johnsons');
    });

    it('should not call onCreateFamily if input is only whitespace', async () => {
      const user = userEvent.setup();

      render(
        <FamilySetupCard family={null} isCreating={false} onCreateFamily={mockOnCreateFamily} />
      );

      const input = screen.getByLabelText('Family name');
      await user.type(input, '   ');

      const button = screen.getByRole('button', { name: /Create Family/i });
      expect(button).toBeDisabled();
    });

    it('should show loading state when isCreating is true', () => {
      render(
        <FamilySetupCard family={null} isCreating={true} onCreateFamily={mockOnCreateFamily} />
      );

      expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
      expect(screen.getByLabelText('Family name')).toBeDisabled();
    });

    it('should show placeholder text in input', () => {
      render(
        <FamilySetupCard family={null} isCreating={false} onCreateFamily={mockOnCreateFamily} />
      );

      const input = screen.getByPlaceholderText(/Enter your family name/i);
      expect(input).toBeInTheDocument();
    });
  });

  describe('when family exists', () => {
    it('should display family information', () => {
      render(
        <FamilySetupCard
          family={mockFamily}
          isCreating={false}
          onCreateFamily={mockOnCreateFamily}
        />
      );

      expect(screen.getByText('Family Setup')).toBeInTheDocument();
      expect(screen.getByText('Your family is set up and ready to use.')).toBeInTheDocument();
      expect(screen.getByText('The Smiths')).toBeInTheDocument();
    });

    it('should display family initial as avatar', () => {
      render(
        <FamilySetupCard
          family={mockFamily}
          isCreating={false}
          onCreateFamily={mockOnCreateFamily}
        />
      );

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should display truncated family ID', () => {
      render(
        <FamilySetupCard
          family={mockFamily}
          isCreating={false}
          onCreateFamily={mockOnCreateFamily}
        />
      );

      expect(screen.getByText(/ID: family-1.../)).toBeInTheDocument();
    });

    it('should not show the create form when family exists', () => {
      render(
        <FamilySetupCard
          family={mockFamily}
          isCreating={false}
          onCreateFamily={mockOnCreateFamily}
        />
      );

      expect(screen.queryByLabelText('Family name')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Create Family/i })).not.toBeInTheDocument();
    });

    it('should display created date', () => {
      render(
        <FamilySetupCard
          family={mockFamily}
          isCreating={false}
          onCreateFamily={mockOnCreateFamily}
        />
      );

      expect(screen.getByText(/Created/)).toBeInTheDocument();
    });
  });
});
