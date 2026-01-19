import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import WelcomePage from './WelcomePage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('@/shared/brand', () => ({
  BRAND: { name: 'DOFTool' },
  DOFToolLogo: () => <div data-testid="doftool-logo">Logo</div>,
}));

const mockUseFamily = {
  createFamily: vi.fn().mockResolvedValue(undefined),
  joinFamily: vi.fn().mockResolvedValue(true),
  isCreating: false,
  isJoining: false,
  error: null as string | null,
  clearError: vi.fn(),
};

vi.mock('@/modules/family/hooks/useFamily', () => ({
  useFamily: vi.fn(() => mockUseFamily),
}));

const mockSettingsStore = {
  setFirstRunComplete: vi.fn(),
  setOnboardingComplete: vi.fn(),
  updateUserSettings: vi.fn(),
  startTutorial: vi.fn(),
  tutorial: { hasSeenTutorial: false },
};

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
}));

const renderWithRouter = (): ReturnType<typeof render> => {
  return render(
    <MemoryRouter>
      <WelcomePage />
    </MemoryRouter>
  );
};

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFamily.error = null;
    mockUseFamily.isCreating = false;
    mockUseFamily.isJoining = false;
  });

  describe('welcome step', () => {
    it('should render logo', () => {
      renderWithRouter();
      expect(screen.getByTestId('doftool-logo')).toBeDefined();
    });

    it('should render welcome heading', () => {
      renderWithRouter();
      expect(screen.getByText(/welcome to doftool/i)).toBeDefined();
    });

    it('should render Get Started button', () => {
      renderWithRouter();
      expect(screen.getByRole('button', { name: /get started/i })).toBeDefined();
    });

    it('should render Skip Setup button', () => {
      renderWithRouter();
      expect(screen.getByRole('button', { name: /skip setup/i })).toBeDefined();
    });

    it('should navigate to setup step when Get Started is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByText('Set Up Your Family')).toBeDefined();
      });
    });

    it('should complete setup and navigate when Skip Setup is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByRole('button', { name: /skip setup/i }));

      expect(mockSettingsStore.setFirstRunComplete).toHaveBeenCalled();
      expect(mockSettingsStore.setOnboardingComplete).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('setup step', () => {
    const goToSetupStep = async (): Promise<void> => {
      const user = userEvent.setup();
      renderWithRouter();
      await user.click(screen.getByRole('button', { name: /get started/i }));
    };

    it('should render family setup heading', async () => {
      await goToSetupStep();
      expect(screen.getByText('Set Up Your Family')).toBeDefined();
    });

    it('should render Your Name input', async () => {
      await goToSetupStep();
      expect(screen.getByLabelText(/your name/i)).toBeDefined();
    });

    it('should render Family Name input', async () => {
      await goToSetupStep();
      expect(screen.getByLabelText(/family name/i)).toBeDefined();
    });

    it('should render Invite Token input', async () => {
      await goToSetupStep();
      expect(screen.getByLabelText(/invite token/i)).toBeDefined();
    });

    it('should render Create Family button', async () => {
      await goToSetupStep();
      expect(screen.getByRole('button', { name: /create family/i })).toBeDefined();
    });

    it('should render Join Family button', async () => {
      await goToSetupStep();
      expect(screen.getByRole('button', { name: /join family/i })).toBeDefined();
    });

    it('should render Back button', async () => {
      await goToSetupStep();
      expect(screen.getByRole('button', { name: /back/i })).toBeDefined();
    });

    it('should go back to welcome step when Back is clicked', async () => {
      const user = userEvent.setup();
      await goToSetupStep();

      await user.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText(/welcome to doftool/i)).toBeDefined();
      });
    });

    it('should disable Create Family button when family name is empty', async () => {
      await goToSetupStep();
      const button = screen.getByRole('button', { name: /create family/i });
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('should enable Create Family button when family name is entered', async () => {
      const user = userEvent.setup();
      await goToSetupStep();

      await user.type(screen.getByLabelText(/family name/i), 'Test Family');

      const button = screen.getByRole('button', { name: /create family/i });
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('should call createFamily when Create Family is clicked', async () => {
      const user = userEvent.setup();
      await goToSetupStep();

      await user.type(screen.getByLabelText(/family name/i), 'Test Family');
      await user.click(screen.getByRole('button', { name: /create family/i }));

      expect(mockUseFamily.createFamily).toHaveBeenCalledWith('Test Family');
    });

    it('should disable Join Family button when invite token is empty', async () => {
      await goToSetupStep();
      const button = screen.getByRole('button', { name: /join family/i });
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('should enable Join Family button when invite token is entered', async () => {
      const user = userEvent.setup();
      await goToSetupStep();

      await user.type(screen.getByLabelText(/invite token/i), 'test-token');

      const button = screen.getByRole('button', { name: /join family/i });
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('should call joinFamily when Join Family is clicked', async () => {
      const user = userEvent.setup();
      await goToSetupStep();

      await user.type(screen.getByLabelText(/invite token/i), 'test-token');
      await user.click(screen.getByRole('button', { name: /join family/i }));

      expect(mockUseFamily.joinFamily).toHaveBeenCalledWith('test-token');
    });

    it('should show error alert when error exists', async () => {
      mockUseFamily.error = 'Failed to create family';
      await goToSetupStep();

      expect(screen.getByText('Failed to create family')).toBeDefined();
    });

    it('should show Creating... when isCreating is true', async () => {
      mockUseFamily.isCreating = true;
      await goToSetupStep();

      expect(screen.getByText('Creating...')).toBeDefined();
    });

    it('should show Joining... when isJoining is true', async () => {
      mockUseFamily.isJoining = true;
      await goToSetupStep();

      expect(screen.getByText('Joining...')).toBeDefined();
    });
  });
});
