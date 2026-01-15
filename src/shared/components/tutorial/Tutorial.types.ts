/**
 * Tutorial Types
 */

import type { LucideIcon } from 'lucide-react';

import type { TutorialStep } from '@/stores/settings.store';

export interface TutorialStepContent {
  id: TutorialStep;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  tip?: string;
}

export interface TutorialOverlayProps {
  className?: string;
}
