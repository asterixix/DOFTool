/**
 * Tutorial Content - Step-by-step module introduction content
 */

import { Calendar, CheckSquare, Mail, Users, Sparkles } from 'lucide-react';

import type { TutorialStepContent } from './Tutorial.types';

export const TUTORIAL_CONTENT: TutorialStepContent[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Family Hub',
    description:
      "Let's take a quick tour of the features that will help your family stay organized and connected.",
    icon: Sparkles,
    features: [
      'Offline-first design — works without internet',
      'End-to-end encrypted — your data stays private',
      'Peer-to-peer sync — share directly between devices',
      'No cloud required — you control your data',
    ],
    tip: 'You can restart this tutorial anytime from Settings.',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Keep track of family events, appointments, and important dates all in one place.',
    icon: Calendar,
    features: [
      'Shared family calendar with color coding',
      'Import events from external calendars (iCal)',
      'Set reminders for important events',
      'View by day, week, or month',
    ],
    tip: 'Try creating your first event by clicking the + button in the calendar view.',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Manage household tasks, assign responsibilities, and track progress together.',
    icon: CheckSquare,
    features: [
      'Create task lists for different categories',
      'Assign tasks to family members',
      'Set due dates and priorities',
      'Track completion with checklists',
    ],
    tip: 'Create lists for groceries, chores, or projects to stay organized.',
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Connect email accounts and communicate privately within your family.',
    icon: Mail,
    features: [
      'Connect IMAP email accounts',
      'Internal family messaging',
      'Share email accounts with family members',
      'Unified inbox for easy management',
    ],
    tip: 'Start with internal messaging — no email setup required!',
  },
  {
    id: 'family',
    title: 'Family',
    description: 'Manage your family group, invite members, and control permissions.',
    icon: Users,
    features: [
      'Invite family members via secure QR code',
      'Manage member roles and permissions',
      'See connected devices at a glance',
      'Control who can access what',
    ],
    tip: 'Share the invite QR code with family members to get them connected.',
  },
];

export function getTutorialStepContent(stepId: string): TutorialStepContent | undefined {
  return TUTORIAL_CONTENT.find((step) => step.id === stepId);
}

export function getTutorialProgress(currentStep: string): { current: number; total: number } {
  const currentIndex = TUTORIAL_CONTENT.findIndex((step) => step.id === currentStep);
  return {
    current: currentIndex + 1,
    total: TUTORIAL_CONTENT.length,
  };
}
