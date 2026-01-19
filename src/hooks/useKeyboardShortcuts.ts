/**
 * Global keyboard shortcuts hook
 */

import { useEffect } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import { moveFocus } from '@/shared/lib/utils';

interface KeyboardShortcutsOptions {
  onViewChange?: (view: 'day' | 'week' | 'month' | 'agenda' | 'list' | 'board') => void;
  onNewEvent?: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onCloseDialog?: () => void;
  onSaveDialog?: () => void;
  onToggleState?: () => void;
  onOpenNotifications?: () => void;
  onBack?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const navigate = useNavigate();
  const location = useLocation();

  const activateKeyboardNavigation = (): void => {
    document.body.dataset['navigation'] = 'keyboard';
  };

  const deactivateKeyboardNavigation = (): void => {
    delete document.body.dataset['navigation'];
  };

  const isFormField = (element: HTMLElement): boolean => {
    if (!element?.tagName) {
      return false;
    }
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable ||
      (typeof element.closest === 'function' && element.closest('[role="textbox"]') !== null)
    );
  };

  const shouldHandleArrowNavigation = (element: HTMLElement | null): boolean => {
    if (!element) {
      return true;
    }
    if (element.isContentEditable) {
      return false;
    }

    const tag = element.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'option') {
      return false;
    }

    const role = element.getAttribute('role');
    if (
      role &&
      [
        'listbox',
        'option',
        'menu',
        'menubar',
        'menuitem',
        'tree',
        'treeitem',
        'grid',
        'row',
        'cell',
        'combobox',
        'slider',
        'spinbutton',
        'textbox',
      ].includes(role)
    ) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Skip if already handled by a local component handler
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target as HTMLElement;

      // Mark keyboard navigation once Tab is used
      if (event.key === 'Tab') {
        activateKeyboardNavigation();
        return;
      }

      const inFormField = isFormField(target);

      // Check if any dialog/modal is open
      const isDialogOpen =
        document.querySelector('[role="dialog"]') !== null ||
        document.querySelector('[data-state="open"]') !== null ||
        document.querySelector('.fixed.inset-0.z-50') !== null;

      // Allow Escape anywhere to close an open dialog
      if (event.key === 'Escape') {
        if (isDialogOpen) {
          event.preventDefault();
          options.onCloseDialog?.();
        }
        return;
      }

      // Ignore most shortcuts while typing
      if (inFormField) {
        return;
      }

      // Handle back navigation with Backspace when not typing
      if (event.key === 'Backspace') {
        event.preventDefault();
        if (isDialogOpen) {
          options.onCloseDialog?.();
          return;
        }
        if (options.onBack) {
          options.onBack();
        } else {
          navigate(-1);
        }
        return;
      }

      // Arrow key focus navigation across the app
      if (
        (event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight') &&
        !event.ctrlKey &&
        !event.metaKey &&
        shouldHandleArrowNavigation(target) &&
        !inFormField
      ) {
        const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? 'prev' : 'next';
        const moved = moveFocus(direction, { current: target });
        if (moved) {
          event.preventDefault();
          activateKeyboardNavigation();
          return;
        }
      }

      // Handle Enter/Space for dialogs
      if (isDialogOpen) {
        if (event.key === 'Enter') {
          event.preventDefault();
          options.onSaveDialog?.();
        }
        return;
      }

      // Enter activates focused element (button, link, etc.)
      if (event.key === 'Enter') {
        const role = target.getAttribute('role');
        if (
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          role === 'button' ||
          role === 'link' ||
          role === 'menuitem'
        ) {
          // Let native behavior fire; no preventDefault
          return;
        }
      }

      // Space toggles checkboxes, switches, and toggle buttons
      if (event.key === ' ') {
        const role = target.getAttribute('role');
        if (
          target.tagName === 'BUTTON' ||
          role === 'checkbox' ||
          role === 'switch' ||
          role === 'radio' ||
          target.getAttribute('aria-pressed') !== null
        ) {
          // Let native behavior handle the toggle
          return;
        }
      }

      // Handle Ctrl/Cmd combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            options.onOpenNotifications?.();
            break;
          case 'arrowleft':
            if (location.pathname.includes('/calendar')) {
              event.preventDefault();
              options.onNavigatePrev?.();
            }
            break;
          case 'arrowright':
            if (location.pathname.includes('/calendar')) {
              event.preventDefault();
              options.onNavigateNext?.();
            }
            break;
          default:
            break;
        }
        return;
      }

      // Handle single key shortcuts (only when not in input)
      switch (event.key.toLowerCase()) {
        // View shortcuts - Calendar
        case 'd':
          if (location.pathname.includes('/calendar')) {
            event.preventDefault();
            options.onViewChange?.('day');
          }
          break;
        case 'w':
          if (location.pathname.includes('/calendar')) {
            event.preventDefault();
            options.onViewChange?.('week');
          }
          break;
        case 'm':
          if (location.pathname.includes('/calendar')) {
            event.preventDefault();
            options.onViewChange?.('month');
          }
          break;
        case 'a':
          if (location.pathname.includes('/calendar')) {
            event.preventDefault();
            options.onViewChange?.('agenda');
          }
          break;
        // View shortcuts - Tasks
        case 'l':
          if (location.pathname.includes('/tasks')) {
            event.preventDefault();
            options.onViewChange?.('list');
          }
          break;
        case 'b':
          if (location.pathname.includes('/tasks')) {
            event.preventDefault();
            options.onViewChange?.('board');
          }
          break;

        // Module navigation shortcuts
        case 'c':
          event.preventDefault();
          navigate('/calendar');
          break;
        case 't':
          event.preventDefault();
          navigate('/tasks');
          break;
        case 'e':
          event.preventDefault();
          navigate('/email');
          break;
        case 'f':
          event.preventDefault();
          navigate('/family');
          break;
        case 's':
          event.preventDefault();
          navigate('/settings');
          break;

        // Action shortcuts
        case 'n':
          if (location.pathname.includes('/calendar') || location.pathname.includes('/tasks')) {
            event.preventDefault();
            options.onNewEvent?.();
          }
          break;

        // State toggle
        case ' ':
          if (location.pathname.includes('/calendar')) {
            event.preventDefault();
            options.onToggleState?.();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', deactivateKeyboardNavigation);
    window.addEventListener('touchstart', deactivateKeyboardNavigation);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', deactivateKeyboardNavigation);
      window.removeEventListener('touchstart', deactivateKeyboardNavigation);
    };
  }, [navigate, location.pathname, options]);
}
