/**
 * JoinFamilyCard - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { JoinFamilyCard } from './JoinFamilyCard';

describe('JoinFamilyCard', () => {
  const mockOnJoinFamily = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user has no family', () => {
    it('should render the join family form', () => {
      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      expect(
        screen.getByText('Enter an invite token to join an existing family.')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Invite Token')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Join Family/i })).toBeInTheDocument();
    });

    it('should disable the join button when input is empty', () => {
      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      const button = screen.getByRole('button', { name: /Join Family/i });
      expect(button).toBeDisabled();
    });

    it('should enable the join button when input has value', async () => {
      const user = userEvent.setup();

      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      const input = screen.getByLabelText('Invite Token');
      await user.type(input, 'valid-token-123');

      const button = screen.getByRole('button', { name: /Join Family/i });
      expect(button).not.toBeDisabled();
    });

    it('should call onJoinFamily with trimmed token on submit', async () => {
      const user = userEvent.setup();
      mockOnJoinFamily.mockResolvedValue(true);

      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      const input = screen.getByLabelText('Invite Token');
      await user.type(input, '  token-abc  ');

      const button = screen.getByRole('button', { name: /Join Family/i });
      await user.click(button);

      expect(mockOnJoinFamily).toHaveBeenCalledWith('token-abc');
    });

    it('should show success message on successful join', async () => {
      const user = userEvent.setup();
      mockOnJoinFamily.mockResolvedValue(true);

      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      const input = screen.getByLabelText('Invite Token');
      await user.type(input, 'valid-token');

      const button = screen.getByRole('button', { name: /Join Family/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Successfully joined family!')).toBeInTheDocument();
      });
    });

    it('should show error message on failed join', async () => {
      const user = userEvent.setup();
      mockOnJoinFamily.mockResolvedValue(false);

      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      const input = screen.getByLabelText('Invite Token');
      await user.type(input, 'invalid-token');

      const button = screen.getByRole('button', { name: /Join Family/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired invite token')).toBeInTheDocument();
      });
    });

    it('should show error for empty token submission', async () => {
      const user = userEvent.setup();

      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      // Type something and then clear it to enable the button temporarily
      const input = screen.getByLabelText('Invite Token');
      await user.type(input, 'test');
      await user.clear(input);
      await user.type(input, '   '); // Only whitespace

      // Button should be disabled for whitespace-only input
      const button = screen.getByRole('button', { name: /Join Family/i });
      expect(button).toBeDisabled();
    });

    it('should show loading state when isJoining is true', () => {
      render(<JoinFamilyCard hasFamily={false} isJoining={true} onJoinFamily={mockOnJoinFamily} />);

      expect(screen.getByRole('button', { name: /Joining.../i })).toBeDisabled();
      expect(screen.getByLabelText('Invite Token')).toBeDisabled();
    });

    it('should clear error when typing new input', async () => {
      const user = userEvent.setup();
      mockOnJoinFamily.mockResolvedValue(false);

      render(
        <JoinFamilyCard hasFamily={false} isJoining={false} onJoinFamily={mockOnJoinFamily} />
      );

      const input = screen.getByLabelText('Invite Token');
      await user.type(input, 'invalid');
      await user.click(screen.getByRole('button', { name: /Join Family/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired invite token')).toBeInTheDocument();
      });

      await user.type(input, '-new');

      expect(screen.queryByText('Invalid or expired invite token')).not.toBeInTheDocument();
    });
  });

  describe('when user already has family', () => {
    it('should show already member message', () => {
      render(<JoinFamilyCard hasFamily={true} isJoining={false} onJoinFamily={mockOnJoinFamily} />);

      expect(screen.getByText('Join Family')).toBeInTheDocument();
      expect(screen.getByText('You are already part of a family.')).toBeInTheDocument();
      expect(
        screen.getByText(/To join a different family, you would need to leave/)
      ).toBeInTheDocument();
    });

    it('should not show the join form', () => {
      render(<JoinFamilyCard hasFamily={true} isJoining={false} onJoinFamily={mockOnJoinFamily} />);

      expect(screen.queryByLabelText('Invite Token')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Join Family/i })).not.toBeInTheDocument();
    });
  });
});
