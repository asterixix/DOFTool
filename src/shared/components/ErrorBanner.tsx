/**
 * ErrorBanner - Unified error display component
 * Used across all modules for consistent error handling UX
 */

import { AlertCircle, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
  className?: string;
}

export function ErrorBanner({ error, onDismiss, className }: ErrorBannerProps): JSX.Element | null {
  if (!error) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 sm:p-4',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-destructive">{error}</p>
      <button
        className="shrink-0 rounded-md p-1 text-destructive hover:bg-destructive/20"
        title="Dismiss error"
        type="button"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
