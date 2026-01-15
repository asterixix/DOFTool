/**
 * LabelBadge Component
 * Displays an email label with color
 */

import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { EmailLabel } from '../types/Email.types';

interface LabelBadgeProps {
  label: EmailLabel;
  onRemove?: (labelId: string) => void;
  variant?: 'default' | 'outline';
  className?: string;
}

export function LabelBadge({
  label,
  onRemove,
  variant = 'default',
  className,
}: LabelBadgeProps): JSX.Element {
  return (
    <Badge
      className={cn('group flex items-center gap-1', className)}
      style={{
        backgroundColor: variant === 'default' ? label.color : undefined,
        borderColor: variant === 'outline' ? label.color : undefined,
        color: variant === 'default' ? '#ffffff' : label.color,
      }}
      variant={variant}
    >
      {label.icon && <span className="text-xs">{label.icon}</span>}
      <span>{label.name}</span>
      {onRemove && (
        <Button
          className="h-4 w-4 p-0 hover:bg-transparent hover:opacity-70"
          size="sm"
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(label.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}
