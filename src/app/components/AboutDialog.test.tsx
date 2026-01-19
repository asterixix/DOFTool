import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AboutDialog } from './AboutDialog';

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('@/shared/brand', () => ({
  BRAND: {
    name: 'DOFTool',
    longName: 'Digital Organization for Families Tool',
    tagline: 'Family collaboration made simple',
    themeStorageKey: 'doftool-theme',
  },
  DOFToolLogo: () => <div data-testid="doftool-logo">Logo</div>,
}));

describe('AboutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button', () => {
    render(<AboutDialog />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('should show "About" text when not collapsed', () => {
    render(<AboutDialog isCollapsed={false} />);
    expect(screen.getByText('About')).toBeDefined();
  });

  it('should hide "About" text when collapsed', () => {
    render(<AboutDialog isCollapsed={true} />);
    expect(screen.queryByText('About')).toBeNull();
  });

  it('should have correct title attribute when collapsed', () => {
    render(<AboutDialog isCollapsed={true} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('title')).toBe('About');
  });

  it('should have correct title attribute when not collapsed', () => {
    render(<AboutDialog isCollapsed={false} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('title')).toBe('About DOFTool');
  });

  it('should open dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('should display brand name in dialog', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('DOFTool')).toBeDefined();
  });

  it('should display key technologies section', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Key Technologies')).toBeDefined();
  });

  it('should display license information', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('License')).toBeDefined();
    expect(screen.getByText('MIT License - Open Source')).toBeDefined();
  });

  it('should display author section', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Author')).toBeDefined();
  });

  it('should render custom trigger when provided', () => {
    render(<AboutDialog trigger={<button type="button">Custom Trigger</button>} />);
    expect(screen.getByText('Custom Trigger')).toBeDefined();
  });

  it('should display GitHub and Support buttons in dialog', async () => {
    const user = userEvent.setup();
    render(<AboutDialog />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('GitHub')).toBeDefined();
    expect(screen.getByText('Support')).toBeDefined();
  });
});
