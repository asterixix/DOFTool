/**
 * Base.types - Unit tests
 * Tests for base entity type definitions and utility types
 */

import { describe, it, expect } from 'vitest';

import type {
  BaseEntity,
  SoftDeletable,
  WithSoftDelete,
  ISODateString,
  UnixTimestamp,
} from './Base.types';

describe('Base.types', () => {
  describe('BaseEntity', () => {
    it('should accept valid base entity data', () => {
      const entity: BaseEntity = {
        id: 'uuid-1234-5678-9abc',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        createdBy: 'user-123',
        updatedBy: 'user-456',
      };

      expect(entity.id).toBe('uuid-1234-5678-9abc');
      expect(entity.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(entity.updatedAt).toBe('2024-01-15T11:00:00Z');
      expect(entity.createdBy).toBe('user-123');
      expect(entity.updatedBy).toBe('user-456');
    });

    it('should have all required fields', () => {
      const entity: BaseEntity = {
        id: 'test-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'creator',
        updatedBy: 'updater',
      };

      expect(Object.keys(entity)).toHaveLength(5);
      expect(entity).toHaveProperty('id');
      expect(entity).toHaveProperty('createdAt');
      expect(entity).toHaveProperty('updatedAt');
      expect(entity).toHaveProperty('createdBy');
      expect(entity).toHaveProperty('updatedBy');
    });
  });

  describe('SoftDeletable', () => {
    it('should accept non-deleted entity', () => {
      const deletable: SoftDeletable = {
        deleted: false,
      };

      expect(deletable.deleted).toBe(false);
      expect(deletable.deletedAt).toBeUndefined();
      expect(deletable.deletedBy).toBeUndefined();
    });

    it('should accept deleted entity with optional fields', () => {
      const deletable: SoftDeletable = {
        deleted: true,
        deletedAt: '2024-01-15T12:00:00Z',
        deletedBy: 'user-789',
      };

      expect(deletable.deleted).toBe(true);
      expect(deletable.deletedAt).toBe('2024-01-15T12:00:00Z');
      expect(deletable.deletedBy).toBe('user-789');
    });
  });

  describe('WithSoftDelete<T>', () => {
    it('should combine base entity with soft delete properties', () => {
      interface TestEntity {
        name: string;
        value: number;
      }

      const entity: WithSoftDelete<TestEntity> = {
        name: 'Test',
        value: 42,
        deleted: false,
      };

      expect(entity.name).toBe('Test');
      expect(entity.value).toBe(42);
      expect(entity.deleted).toBe(false);
    });

    it('should work with BaseEntity', () => {
      const entity: WithSoftDelete<BaseEntity> = {
        id: 'test-id',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        deleted: true,
        deletedAt: '2024-01-15T12:00:00Z',
        deletedBy: 'user-2',
      };

      expect(entity.id).toBe('test-id');
      expect(entity.deleted).toBe(true);
      expect(entity.deletedBy).toBe('user-2');
    });
  });

  describe('ISODateString', () => {
    it('should accept ISO 8601 formatted strings', () => {
      const date1: ISODateString = '2024-01-15T10:30:00Z';
      const date2: ISODateString = '2024-01-15T10:30:00.000Z';
      const date3: ISODateString = '2024-01-15';

      expect(typeof date1).toBe('string');
      expect(typeof date2).toBe('string');
      expect(typeof date3).toBe('string');
    });

    it('should be parseable by Date constructor', () => {
      const isoDate: ISODateString = '2024-01-15T10:30:00Z';
      const parsed = new Date(isoDate);

      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(0); // January
      expect(parsed.getDate()).toBe(15);
    });
  });

  describe('UnixTimestamp', () => {
    it('should accept numeric timestamps', () => {
      const timestamp: UnixTimestamp = Date.now();

      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should be usable with Date constructor', () => {
      const timestamp: UnixTimestamp = 1705314600000; // 2024-01-15T10:30:00Z
      const date = new Date(timestamp);

      expect(date.getFullYear()).toBe(2024);
    });

    it('should support arithmetic operations', () => {
      const timestamp: UnixTimestamp = 1705314600000;
      const oneHourLater: UnixTimestamp = timestamp + 3600000;

      expect(oneHourLater - timestamp).toBe(3600000);
    });
  });
});
