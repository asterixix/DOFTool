import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const FOCUSABLE_SELECTORS = [
  'button',
  '[href]',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Combines class names with Tailwind CSS merge support
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Delays execution for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Formats a date to a locale string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, options);
}

/**
 * Formats a time to a locale string
 */
export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

const isVisible = (element: HTMLElement): boolean => {
  if (element.hidden) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  return element.getClientRects().length > 0;
};

/**
 * Returns focusable elements within a scope, filtered for visibility and enabled state
 */
export function getFocusableElements(scope: Document | HTMLElement = document): HTMLElement[] {
  const root: Document | HTMLElement = scope instanceof Document ? scope : scope;
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

  return candidates.filter((el) => {
    if (el.hasAttribute('disabled')) {
      return false;
    }
    if (el.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    if (el.tabIndex < 0) {
      return false;
    }
    return isVisible(el);
  });
}

/**
 * Moves focus to the previous or next focusable element within a scope
 */
export function moveFocus(
  direction: 'prev' | 'next',
  options?: { current?: HTMLElement | null; scope?: Document | HTMLElement }
): boolean {
  const scope = options?.scope ?? document;
  const activeElement =
    options?.current ?? (scope instanceof Document ? scope.activeElement : document.activeElement);
  const focusables = getFocusableElements(scope);

  if (focusables.length === 0) {
    return false;
  }

  const currentIndex =
    activeElement instanceof HTMLElement ? focusables.indexOf(activeElement) : -1;
  const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  const clampedIndex = Math.min(Math.max(targetIndex, 0), focusables.length - 1);
  const target = focusables[clampedIndex];

  if (target) {
    target.focus();
    return true;
  }

  return false;
}
