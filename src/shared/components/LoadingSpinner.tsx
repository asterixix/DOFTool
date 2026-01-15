/**
 * LoadingSpinner - Unified loading indicator component
 * Used across all modules for consistent loading UX
 */

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({
  size = 'md',
  text,
  className,
  fullScreen = false,
}: LoadingSpinnerProps): JSX.Element {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="flex flex-1 items-center justify-center">{content}</div>;
  }

  return content;
}
