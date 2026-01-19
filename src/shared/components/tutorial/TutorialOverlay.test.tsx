/**
 * TutorialOverlay - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TutorialOverlay } from './TutorialOverlay';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    li: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <li {...props}>{children}</li>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock settings store
const mockNextTutorialStep = vi.fn();
const mockSkipTutorial = vi.fn();

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: vi.fn(() => ({
    tutorial: {
      showTutorial: true,
      currentStep: 'welcome',
    },
    nextTutorialStep: mockNextTutorialStep,
    skipTutorial: mockSkipTutorial,
  })),
}));

// Mock tutorial content
vi.mock('./tutorialContent', () => ({
  TUTORIAL_CONTENT: [
    {
      id: 'welcome',
      title: 'Welcome to Your Family Hub',
      description: 'Test description',
      icon: () => <svg data-testid="mock-icon" />,
      features: ['Feature 1', 'Feature 2'],
      tip: 'Test tip',
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Calendar description',
      icon: () => <svg data-testid="mock-icon" />,
      features: ['Calendar feature'],
    },
  ],
  getTutorialProgress: (step: string) => ({
    current: step === 'welcome' ? 1 : 2,
    total: 2,
  }),
}));

describe('TutorialOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the tutorial overlay when showTutorial is true', () => {
    render(<TutorialOverlay />);

    expect(screen.getByText('Welcome to Your Family Hub')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should display features list', () => {
    render(<TutorialOverlay />);

    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
  });

  it('should display tip when provided', () => {
    render(<TutorialOverlay />);

    expect(screen.getByText('Test tip')).toBeInTheDocument();
  });

  it('should display progress indicator', () => {
    render(<TutorialOverlay />);

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('should have skip button', () => {
    render(<TutorialOverlay />);

    const skipButton = screen.getByRole('button', { name: /skip tutorial/i });
    expect(skipButton).toBeInTheDocument();
  });

  it('should call skipTutorial when skip button is clicked', async () => {
    const user = userEvent.setup();

    render(<TutorialOverlay />);

    const skipButton = screen.getByRole('button', { name: /skip tutorial/i });
    await user.click(skipButton);

    expect(mockSkipTutorial).toHaveBeenCalled();
  });

  it('should have Next button on first step', () => {
    render(<TutorialOverlay />);

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('should call nextTutorialStep when Next is clicked', async () => {
    const user = userEvent.setup();

    render(<TutorialOverlay />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(mockNextTutorialStep).toHaveBeenCalled();
  });

  it('should hide Back button on first step', () => {
    render(<TutorialOverlay />);

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toHaveClass('invisible');
  });

  it('should accept className prop', () => {
    render(<TutorialOverlay className="custom-class" />);

    expect(screen.getByText('Welcome to Your Family Hub')).toBeInTheDocument();
  });
});
