import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppLayout } from './AppLayout';

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => true),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('@/shared/components/tutorial', () => ({
  TutorialOverlay: () => <div data-testid="tutorial-overlay">Tutorial</div>,
}));

vi.mock('@/shared/utils/debugLogger', () => ({
  logToDebug: vi.fn(),
}));

vi.mock('./Header', () => ({
  Header: ({
    onToggleSidebar,
    onToggleCollapse,
  }: {
    onToggleSidebar?: () => void;
    onToggleCollapse?: () => void;
  }) => (
    <header data-testid="header">
      <button data-testid="toggle-sidebar" type="button" onClick={onToggleSidebar}>
        Toggle Sidebar
      </button>
      <button data-testid="toggle-collapse" type="button" onClick={onToggleCollapse}>
        Toggle Collapse
      </button>
    </header>
  ),
}));

vi.mock('./Sidebar', () => ({
  Sidebar: ({ isCollapsed }: { isCollapsed: boolean }) => (
    <aside data-collapsed={isCollapsed} data-testid="sidebar">
      Sidebar
    </aside>
  ),
  SidebarContent: () => <div data-testid="sidebar-content">Sidebar Content</div>,
}));

const renderWithRouter = (): ReturnType<typeof render> => {
  return render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>
  );
};

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('desktop view', () => {
    beforeEach(async () => {
      const { useMediaQuery } = vi.mocked(await import('@/hooks/useMediaQuery'));
      useMediaQuery.mockReturnValue(true);
    });

    it('should render header', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeDefined();
      });
    });

    it('should render sidebar on desktop', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeDefined();
      });
    });

    it('should render tutorial overlay', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId('tutorial-overlay')).toBeDefined();
      });
    });

    it('should toggle sidebar collapse when button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const toggleButton = screen.getByTestId('toggle-collapse');
      await user.click(toggleButton);

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar.getAttribute('data-collapsed')).toBe('true');
      });
    });

    it('should persist sidebar collapse state to localStorage', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await user.click(screen.getByTestId('toggle-collapse'));

      await waitFor(() => {
        expect(localStorage.getItem('app-sidebar-collapsed')).toBe('true');
      });
    });

    it('should restore collapsed state from localStorage', async () => {
      localStorage.setItem('app-sidebar-collapsed', 'true');
      renderWithRouter();

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar.getAttribute('data-collapsed')).toBe('true');
      });
    });
  });

  describe('mobile view', () => {
    beforeEach(async () => {
      const { useMediaQuery } = vi.mocked(await import('@/hooks/useMediaQuery'));
      useMediaQuery.mockReturnValue(false);
    });

    it('should not render sidebar directly on mobile', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar')).toBeNull();
      });
    });

    it('should render header on mobile', async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeDefined();
      });
    });
  });
});
