/**
 * EventTriggerButton - A button wrapper that properly forwards refs for use with HoverCardTrigger
 */

import { forwardRef } from 'react';

import type { ButtonHTMLAttributes } from 'react';

interface EventTriggerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const EventTriggerButton = forwardRef<HTMLButtonElement, EventTriggerButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <button ref={ref} type="button" {...props}>
        {children}
      </button>
    );
  }
);
EventTriggerButton.displayName = 'EventTriggerButton';
