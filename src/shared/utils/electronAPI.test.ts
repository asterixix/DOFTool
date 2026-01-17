import { describe, it, expect } from 'vitest';

import {
  getElectronAPI,
  getTasksAPI,
  getCalendarAPI,
  getFamilyAPI,
  getEmailAPI,
} from './electronAPI';

describe('electronAPI', () => {
  // Note: window.electronAPI is mocked in tests/setup.ts

  describe('getElectronAPI', () => {
    it('should return electronAPI when available', () => {
      const api = getElectronAPI();
      expect(api).toBeDefined();
    });
  });

  describe('getTasksAPI', () => {
    it('should return tasks API when available', () => {
      const api = getTasksAPI();
      expect(api).toBeDefined();
    });
  });

  describe('getCalendarAPI', () => {
    it('should return calendar API when available', () => {
      const api = getCalendarAPI();
      expect(api).toBeDefined();
    });
  });

  describe('getFamilyAPI', () => {
    it('should return family API when available', () => {
      const api = getFamilyAPI();
      expect(api).toBeDefined();
    });
  });

  describe('getEmailAPI', () => {
    it('should return email API when available', () => {
      const api = getEmailAPI();
      expect(api).toBeDefined();
    });
  });
});
