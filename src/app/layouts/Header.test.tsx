import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Header } from './Header';

vi.mock('@/hooks/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(() => [
    { path: '/', label: 'Home', isCurrent: false },
    { path: '/calendar', label: 'Calendar', isCurrent: true },
  ]),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('@/shared/brand', () => ({
  BRAND: { name: 'DOFTool' },
  DOFToolLogo: () => <div data-testid="doftool-logo">Logo</div>,
}));

vi.mock('../components/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center">Notifications</div>,
}));

vi.mock('../components/SyncStatusPopover', () => ({
  SyncStatusPopover: () => <div data-testid="sync-status">Sync Status</div>,
}));

vi.mock('../components/VersionBanner', () => ({
  VersionBanner: () => <div data-testid="version-banner">Version</div>,
}));

const renderWithRouter = (props = {}): ReturnType<typeof render> => {
  return render(
    <MemoryRouter>
      <Header {...props} />
    </MemoryRouter>
  );
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header element', () => {
    renderWithRouter();
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('should render logo', () => {
    renderWithRouter();
    expect(screen.getByTestId('doftool-logo')).toBeDefined();
  });

  it('should render notification center', () => {
    renderWithRouter();
    expect(screen.getByTestId('notification-center')).toBeDefined();
  });

  it('should render sync status popover', () => {
    renderWithRouter();
    expect(screen.getByTestId('sync-status')).toBeDefined();
  });

  it('should render version banner', () => {
    renderWithRouter();
    expect(screen.getByTestId('version-banner')).toBeDefined();
  });

  it('should render breadcrumbs', () => {
    renderWithRouter();
    expect(screen.getByText('Calendar')).toBeDefined();
  });

  it('should show menu button on mobile', () => {
    renderWithRouter({ isMobile: true });
    expect(screen.getByLabelText('Toggle navigation')).toBeDefined();
  });

  it('should call onToggleSidebar when menu button is clicked', async () => {
    const onToggleSidebar = vi.fn();
    const user = userEvent.setup();
    renderWithRouter({ isMobile: true, onToggleSidebar });

    await user.click(screen.getByLabelText('Toggle navigation'));

    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it('should show collapse button on desktop', () => {
    renderWithRouter({ isMobile: false, onToggleCollapse: vi.fn() });
    const buttons = screen.getAllByRole('button');
    const collapseButton = buttons.find(
      (btn) =>
        btn.getAttribute('title') === 'Collapse sidebar' ||
        btn.getAttribute('title') === 'Expand sidebar'
    );
    expect(collapseButton).toBeDefined();
  });

  it('should call onToggleCollapse when collapse button is clicked', async () => {
    const onToggleCollapse = vi.fn();
    const user = userEvent.setup();
    renderWithRouter({ isMobile: false, onToggleCollapse });

    const collapseButton = screen.getByTitle('Collapse sidebar');
    await user.click(collapseButton);

    expect(onToggleCollapse).toHaveBeenCalled();
  });

  it('should show expand button when sidebar is collapsed', () => {
    renderWithRouter({
      isMobile: false,
      isSidebarCollapsed: true,
      onToggleCollapse: vi.fn(),
    });
    expect(screen.getByTitle('Expand sidebar')).toBeDefined();
  });
});
