/**
 * InvitationCard - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { InvitationCard } from './InvitationCard';

import type { PermissionRole } from '../types/Family.types';

// Mock QRCodeSVG
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value}>
      QR Code
    </div>
  ),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('InvitationCard', () => {
  const mockOnGenerateInvite = vi.fn();
  const mockOnClearInvite = vi.fn();

  const mockPendingInvite: { token: string; role: PermissionRole } = {
    token: 'test-invite-token-12345',
    role: 'member',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user has no family', () => {
    it('should show message to create family first', () => {
      render(
        <InvitationCard
          hasFamily={false}
          isInviting={false}
          pendingInvite={null}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      expect(screen.getByText('Invite Members')).toBeInTheDocument();
      expect(
        screen.getByText('Create a family first to generate invitations.')
      ).toBeInTheDocument();
    });
  });

  describe('when user has family but no pending invite', () => {
    it('should show the invite generation form', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={null}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      expect(screen.getByText('Invite Members')).toBeInTheDocument();
      expect(screen.getByLabelText('Member Role')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Invite Code/i })).toBeInTheDocument();
    });

    it('should show role options', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={null}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      const select = screen.getByLabelText('Member Role');
      expect(select).toBeInTheDocument();
    });

    it('should call onGenerateInvite when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={null}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Invite Code/i });
      await user.click(button);

      expect(mockOnGenerateInvite).toHaveBeenCalledWith('member');
    });

    it('should show loading state when isInviting is true', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={true}
          pendingInvite={null}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      expect(screen.getByRole('button', { name: /Generating.../i })).toBeDisabled();
    });

    it('should allow selecting different roles', async () => {
      const user = userEvent.setup();

      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={null}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      const select = screen.getByLabelText('Member Role');
      await user.selectOptions(select, 'admin');

      const button = screen.getByRole('button', { name: /Generate Invite Code/i });
      await user.click(button);

      expect(mockOnGenerateInvite).toHaveBeenCalledWith('admin');
    });
  });

  describe('when there is a pending invite', () => {
    it('should display the QR code', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={mockPendingInvite}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toBeInTheDocument();
      expect(qrCode).toHaveAttribute('data-value', mockPendingInvite.token);
    });

    it('should display the invite token', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={mockPendingInvite}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      expect(screen.getByText(mockPendingInvite.token)).toBeInTheDocument();
    });

    it('should display the role badge', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={mockPendingInvite}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('should have a Copy button', () => {
      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={mockPendingInvite}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      const copyButton = screen.getByRole('button', { name: /Copy/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should call onClearInvite when Generate New Invite is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InvitationCard
          hasFamily={true}
          isInviting={false}
          pendingInvite={mockPendingInvite}
          onClearInvite={mockOnClearInvite}
          onGenerateInvite={mockOnGenerateInvite}
        />
      );

      const newInviteButton = screen.getByRole('button', { name: /Generate New Invite/i });
      await user.click(newInviteButton);

      expect(mockOnClearInvite).toHaveBeenCalled();
    });
  });
});
