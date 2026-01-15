/**
 * Base entity types used across all modules
 */

export interface BaseEntity {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** ID of the user who created this entity */
  createdBy: string;

  /** ID of the user who last modified this entity */
  updatedBy: string;
}

export interface SoftDeletable {
  /** Whether this entity is deleted */
  deleted: boolean;

  /** Deletion timestamp (ISO 8601) */
  deletedAt?: string;

  /** ID of the user who deleted this entity */
  deletedBy?: string;
}

export type WithSoftDelete<T> = T & SoftDeletable;

/** ISO 8601 date string */
export type ISODateString = string;

/** Unix timestamp in milliseconds */
export type UnixTimestamp = number;
