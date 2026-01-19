import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Sidebar, SidebarContent } from './Sidebar';

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('@/shared/brand', () => ({
  BRAND: { name: 'DOFTool' },
  DOFToolLogo: () => <div data-testid="doftool-logo">Logo</div>,
}));

vi.mock('@/app/components/AboutDialog', () => ({
  AboutDialog: ({ isCollapsed }: { isCollapsed: boolean }) => (
    <button data-testid="about-dialog" type="button">
      {isCollapsed ? 'About' : 'About DOFTool'}
    </button>
  ),
}));

const renderWithRouter = (
  Component: React.ComponentType<Record<string, unknown>>,
  props = {}
): ReturnType<typeof render> => {
  return render(
    <MemoryRouter>
      <Component {...props} />
    </MemoryRouter>
  );
};

describe('SidebarContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render logo', () => {
    renderWithRouter(SidebarContent);
    expect(screen.getByTestId('doftool-logo')).toBeDefined();
  });

  it('should render brand name when not collapsed', () => {
    renderWithRouter(SidebarContent, { isCollapsed: false });
    expect(screen.getByText('DOFTool')).toBeDefined();
  });

  it('should hide brand name when collapsed', () => {
    renderWithRouter(SidebarContent, { isCollapsed: true });
    expect(screen.queryByText('DOFTool')).toBeNull();
  });

  it('should render navigation links', () => {
    renderWithRouter(SidebarContent);
    expect(screen.getByText('Calendar')).toBeDefined();
    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Family')).toBeDefined();
  });

  it('should render Settings link', () => {
    renderWithRouter(SidebarContent);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('should render About dialog', () => {
    renderWithRouter(SidebarContent);
    expect(screen.getByTestId('about-dialog')).toBeDefined();
  });

  it('should render Support button', () => {
    renderWithRouter(SidebarContent);
    expect(screen.getByText('Support')).toBeDefined();
  });

  it('should call onNavigate when nav link is clicked', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(SidebarContent, { onNavigate });

    await user.click(screen.getByText('Calendar'));

    expect(onNavigate).toHaveBeenCalled();
  });

  it('should hide nav labels when collapsed', () => {
    renderWithRouter(SidebarContent, { isCollapsed: true });
    expect(screen.queryByText('Calendar')).toBeNull();
    expect(screen.queryByText('Tasks')).toBeNull();
  });

  it('should open external link when Support is clicked', async () => {
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    const user = userEvent.setup();
    renderWithRouter(SidebarContent);

    await user.click(screen.getByText('Support'));

    expect(mockOpen).toHaveBeenCalledWith('https://buymeacoffee.com/asterixix', '_blank');
  });
});

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render aside element', () => {
    renderWithRouter(Sidebar);
    expect(screen.getByRole('complementary')).toBeDefined();
  });

  it('should render SidebarContent', () => {
    renderWithRouter(Sidebar);
    expect(screen.getByTestId('doftool-logo')).toBeDefined();
  });

  it('should pass isCollapsed prop to SidebarContent', () => {
    renderWithRouter(Sidebar, { isCollapsed: true });
    expect(screen.queryByText('DOFTool')).toBeNull();
  });

  it('should have correct width when expanded', () => {
    const { container } = renderWithRouter(Sidebar, { isCollapsed: false });
    const aside = container.querySelector('aside');
    expect(aside).toBeDefined();
  });

  it('should have correct width when collapsed', () => {
    const { container } = renderWithRouter(Sidebar, { isCollapsed: true });
    const aside = container.querySelector('aside');
    expect(aside).toBeDefined();
  });
});
