import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PageTracker } from './PageTracker';

const mockTrackScreen = vi.fn();

vi.mock('@/shared/services/analytics', () => ({
  trackScreen: (name: string) => mockTrackScreen(name),
}));

const renderWithRouter = (route: string): void => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <PageTracker />
    </MemoryRouter>
  );
};

describe('PageTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null (render nothing)', () => {
    const { container } = render(
      <MemoryRouter>
        <PageTracker />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should track calendar screen for /calendar route', () => {
    renderWithRouter('/calendar');
    expect(mockTrackScreen).toHaveBeenCalledWith('calendar');
  });

  it('should track tasks screen for /tasks route', () => {
    renderWithRouter('/tasks');
    expect(mockTrackScreen).toHaveBeenCalledWith('tasks');
  });

  it('should track email screen for /email route', () => {
    renderWithRouter('/email');
    expect(mockTrackScreen).toHaveBeenCalledWith('email');
  });

  it('should track family screen for /family route', () => {
    renderWithRouter('/family');
    expect(mockTrackScreen).toHaveBeenCalledWith('family');
  });

  it('should track settings screen for /settings route', () => {
    renderWithRouter('/settings');
    expect(mockTrackScreen).toHaveBeenCalledWith('settings');
  });

  it('should track welcome screen for / route', () => {
    renderWithRouter('/');
    expect(mockTrackScreen).toHaveBeenCalledWith('welcome');
  });

  it('should track welcome screen for /welcome route', () => {
    renderWithRouter('/welcome');
    expect(mockTrackScreen).toHaveBeenCalledWith('welcome');
  });

  it('should track home screen for unknown routes', () => {
    renderWithRouter('/unknown-route');
    expect(mockTrackScreen).toHaveBeenCalledWith('home');
  });

  it('should track nested calendar routes correctly', () => {
    renderWithRouter('/calendar/event/123');
    expect(mockTrackScreen).toHaveBeenCalledWith('calendar');
  });

  it('should track nested tasks routes correctly', () => {
    renderWithRouter('/tasks/list/456');
    expect(mockTrackScreen).toHaveBeenCalledWith('tasks');
  });
});
