/**
 * Tutorial Types
 */

import type { TutorialStep } from '@/stores/settings.store';
import type { LucideIcon } from 'lucide-react';

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
