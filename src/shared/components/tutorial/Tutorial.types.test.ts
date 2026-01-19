/**
 * Tutorial.types - Unit tests
 * Tests for tutorial type definitions
 */

import { Calendar, CheckSquare } from 'lucide-react';
import { describe, it, expect } from 'vitest';

import type { TutorialStepContent, TutorialOverlayProps } from './Tutorial.types';

describe('Tutorial.types', () => {
  describe('TutorialStepContent', () => {
    it('should accept valid tutorial step content', () => {
      const step: TutorialStepContent = {
        id: 'calendar',
        title: 'Calendar',
        description: 'Manage your family calendar',
        icon: Calendar,
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
      };

      expect(step.id).toBe('calendar');
      expect(step.title).toBe('Calendar');
      expect(step.description).toBe('Manage your family calendar');
      expect(step.icon).toBe(Calendar);
      expect(step.features).toHaveLength(3);
    });

    it('should accept tutorial step with optional tip', () => {
      const step: TutorialStepContent = {
        id: 'tasks',
        title: 'Tasks',
        description: 'Manage tasks',
        icon: CheckSquare,
        features: ['Create tasks', 'Assign to members'],
        tip: 'Pro tip: Use keyboard shortcuts for faster navigation',
      };

      expect(step.tip).toBe('Pro tip: Use keyboard shortcuts for faster navigation');
    });

    it('should work without optional tip', () => {
      const step: TutorialStepContent = {
        id: 'welcome',
        title: 'Welcome',
        description: 'Welcome to the app',
        icon: Calendar,
        features: [],
      };

      expect(step.tip).toBeUndefined();
    });

    it('should accept empty features array', () => {
      const step: TutorialStepContent = {
        id: 'welcome',
        title: 'Welcome',
        description: 'Welcome message',
        icon: Calendar,
        features: [],
      };

      expect(step.features).toEqual([]);
      expect(step.features).toHaveLength(0);
    });

    it('should have required properties', () => {
      const step: TutorialStepContent = {
        id: 'family',
        title: 'Family',
        description: 'Manage family',
        icon: Calendar,
        features: ['Invite members'],
      };

      expect(step).toHaveProperty('id');
      expect(step).toHaveProperty('title');
      expect(step).toHaveProperty('description');
      expect(step).toHaveProperty('icon');
      expect(step).toHaveProperty('features');
    });
  });

  describe('TutorialOverlayProps', () => {
    it('should accept empty props', () => {
      const props: TutorialOverlayProps = {};

      expect(props.className).toBeUndefined();
    });

    it('should accept className prop', () => {
      const props: TutorialOverlayProps = {
        className: 'custom-class',
      };

      expect(props.className).toBe('custom-class');
    });

    it('should accept multiple class names', () => {
      const props: TutorialOverlayProps = {
        className: 'class-1 class-2 class-3',
      };

      expect(props.className).toBe('class-1 class-2 class-3');
    });
  });
});
