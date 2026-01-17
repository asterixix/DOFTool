import { describe, it, expect } from 'vitest';
import { TUTORIAL_CONTENT, getTutorialProgress } from './tutorialContent';

describe('tutorialContent', () => {
  describe('TUTORIAL_CONTENT', () => {
    it('should be an array', () => {
      expect(Array.isArray(TUTORIAL_CONTENT)).toBe(true);
    });

    it('should have at least one step', () => {
      expect(TUTORIAL_CONTENT.length).toBeGreaterThan(0);
    });

    it('should have required properties for each step', () => {
      TUTORIAL_CONTENT.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('features');
        expect(step).toHaveProperty('icon');
      });
    });

    it('should have unique IDs', () => {
      const ids = TUTORIAL_CONTENT.map((step) => step.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have features array for each step', () => {
      TUTORIAL_CONTENT.forEach((step) => {
        expect(Array.isArray(step.features)).toBe(true);
      });
    });

    it('should include welcome step', () => {
      const welcomeStep = TUTORIAL_CONTENT.find((step) => step.id === 'welcome');
      expect(welcomeStep).toBeDefined();
    });

    it('should include family step', () => {
      const familyStep = TUTORIAL_CONTENT.find((step) => step.id === 'family');
      expect(familyStep).toBeDefined();
    });
  });

  describe('getTutorialProgress', () => {
    it('should return progress object', () => {
      const progress = getTutorialProgress('welcome');
      expect(progress).toHaveProperty('current');
      expect(progress).toHaveProperty('total');
    });

    it('should return current as 1 for welcome step', () => {
      const progress = getTutorialProgress('welcome');
      expect(progress.current).toBe(1);
    });

    it('should return total equal to TUTORIAL_CONTENT length', () => {
      const progress = getTutorialProgress('welcome');
      expect(progress.total).toBe(TUTORIAL_CONTENT.length);
    });

    it('should increment current for each step', () => {
      const progress1 = getTutorialProgress(TUTORIAL_CONTENT[0]?.id ?? 'welcome');
      const progress2 = getTutorialProgress(TUTORIAL_CONTENT[1]?.id ?? 'calendar');
      expect(progress2.current).toBe(progress1.current + 1);
    });

    it('should return last position for family step', () => {
      const progress = getTutorialProgress('family');
      expect(progress.current).toBe(TUTORIAL_CONTENT.length);
    });

    it('should handle unknown step ID by returning 0', () => {
      const progress = getTutorialProgress('unknown' as never);
      // findIndex returns -1 for not found, so current will be 0
      expect(progress.current).toBe(0);
    });
  });
});
