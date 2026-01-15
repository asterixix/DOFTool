/**
 * Family Module Types
 */

// Permission roles for family members
export type PermissionRole = 'admin' | 'member' | 'viewer';

// Role display labels
export const ROLE_LABELS: Record<PermissionRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<PermissionRole, string> = {
  admin: 'Full access to all features and settings',
  member: 'Can create, edit, and delete content',
  viewer: 'Can only view content, no editing',
};

// Family info stored in Yjs
export interface FamilyInfo {
  id: string;
  name: string;
  createdAt: number;
  adminDeviceId: string;
}

// Device info stored in Yjs
export interface DeviceInfo {
  id: string;
  name: string;
  addedAt: number;
  lastSeen: number;
  isCurrent: boolean;
}

// Permission info stored in Yjs
export interface PermissionInfo {
  memberId: string;
  role: PermissionRole;
  createdAt: number;
}

// Invitation info stored in Yjs
export interface InvitationInfo {
  token: string;
  role: PermissionRole;
  createdAt: number;
  createdBy: string;
  expiresAt: number;
  used: boolean;
}

// Complete family state
export interface FamilyState {
  family: FamilyInfo | null;
  devices: DeviceInfo[];
  permissions: PermissionInfo[];
  invitations: InvitationInfo[];
}

// API response types
export interface CreateFamilyResponse {
  family: FamilyInfo | null;
  devices: DeviceInfo[];
  permissions: PermissionInfo[];
}

export interface InviteResponse {
  token: string;
  role: PermissionRole;
}

export interface JoinFamilyResponse {
  success: boolean;
  family?: FamilyInfo;
  error?: string;
}

// Form input types
export interface CreateFamilyInput {
  name: string;
}

export interface JoinFamilyInput {
  token: string;
}

export interface SetPermissionInput {
  memberId: string;
  role: PermissionRole;
}
