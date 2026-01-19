/**
 * brand - Unit tests
 * Tests for brand constants
 */

import { describe, it, expect } from 'vitest';

import { BRAND } from './brand';

import type { Brand } from './brand';

describe('brand', () => {
  describe('BRAND constant', () => {
    it('should have the correct name', () => {
      expect(BRAND.name).toBe('DOFTool');
    });

    it('should have the correct long name', () => {
      expect(BRAND.longName).toBe('Decentralized Organization Family Tool');
    });

    it('should have a tagline', () => {
      expect(BRAND.tagline).toBe('Decentralized coordination for modern families.');
    });

    it('should have the correct domain', () => {
      expect(BRAND.domain).toBe('doftool.app');
    });

    it('should have the correct theme storage key', () => {
      expect(BRAND.themeStorageKey).toBe('doftool-theme');
    });

    it('should have the correct window background hex color', () => {
      expect(BRAND.windowBackgroundHex).toBe('#fffaf5');
      expect(BRAND.windowBackgroundHex).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should have all string values', () => {
      for (const value of Object.values(BRAND)) {
        expect(typeof value).toBe('string');
      }
    });

    it('should contain all expected keys', () => {
      const expectedKeys = [
        'name',
        'longName',
        'tagline',
        'domain',
        'themeStorageKey',
        'windowBackgroundHex',
      ];

      expect(Object.keys(BRAND).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('Brand type', () => {
    it('should match typeof BRAND', () => {
      const brand: Brand = BRAND;
      expect(brand.name).toBe('DOFTool');
    });
  });
});
