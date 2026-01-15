/**
 * Type-safe helpers for ElectronAPI access
 */

// Define the structure we expect from electronAPI for tasks
interface TaskAPI {
  getLists: () => Promise<unknown[]>;
  getList: (listId: string) => Promise<unknown>;
  createList: (data: unknown) => Promise<unknown>;
  updateList: (listId: string, data: unknown) => Promise<unknown>;
  deleteList: (listId: string) => Promise<{ success: boolean }>;
  getTasks: (listId: string) => Promise<unknown[]>;
  getTask: (taskId: string) => Promise<unknown>;
  createTask: (data: unknown) => Promise<unknown>;
  updateTask: (taskId: string, data: unknown) => Promise<unknown>;
  deleteTask: (taskId: string) => Promise<{ success: boolean }>;
  import: (listId: string, jsonData: string) => Promise<{ imported: number; errors: string[] }>;
  export: (listId: string) => Promise<string>;
  shareList: (
    listId: string,
    memberId: string,
    permission: string
  ) => Promise<{
    memberId: string;
    permission: string;
    sharedAt: number;
    sharedBy: string;
  }>;
  updateListShare: (
    listId: string,
    memberId: string,
    permission: string
  ) => Promise<{
    memberId: string;
    permission: string;
    sharedAt: number;
    sharedBy: string;
  }>;
  unshareList: (listId: string, memberId: string) => Promise<{ success: boolean }>;
  getListShares: (listId: string) => Promise<
    Array<{
      memberId: string;
      permission: string;
      sharedAt: number;
      sharedBy: string;
    }>
  >;
}

// Define the structure we expect from electronAPI for calendar
interface CalendarAPI {
  getAll: () => Promise<unknown[]>;
  get: (calendarId: string) => Promise<unknown>;
  create: (data: unknown) => Promise<unknown>;
  update: (calendarId: string, data: unknown) => Promise<unknown>;
  delete: (calendarId: string) => Promise<{ success: boolean }>;
  getEvents: (query: unknown) => Promise<unknown[]>;
  getEvent: (eventId: string) => Promise<unknown>;
  createEvent: (data: unknown) => Promise<unknown>;
  updateEvent: (eventId: string, data: unknown) => Promise<unknown>;
  deleteEvent: (eventId: string) => Promise<{ success: boolean }>;
  importICal: (
    calendarId: string,
    icalData: string
  ) => Promise<{ imported: number; errors: string[] }>;
  exportICal: (calendarId: string) => Promise<string>;
  subscribeExternal: (calendarId: string, url: string, syncInterval?: number) => Promise<unknown>;
  unsubscribeExternal: (calendarId: string) => Promise<{ success: boolean }>;
  syncExternal: (
    calendarId: string
  ) => Promise<{ success: boolean; imported: number; errors: string[] }>;
  getSyncStatus: (calendarId: string) => Promise<{
    externalSyncEnabled: boolean;
    externalSource?: {
      type: string;
      url?: string;
      syncDirection: string;
    };
    lastSyncAt?: number;
    syncInterval: number;
  }>;
  share: (
    calendarId: string,
    memberId: string,
    permission: string
  ) => Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
  updateShare: (
    calendarId: string,
    memberId: string,
    permission: string
  ) => Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
  unshare: (calendarId: string, memberId: string) => Promise<{ success: boolean }>;
  getShares: (calendarId: string) => Promise<
    Array<{
      memberId: string;
      permission: string;
      sharedAt: number;
      sharedBy: string;
    }>
  >;
}

// Define the structure we expect from electronAPI for family
interface FamilyAPI {
  get: () => Promise<unknown>;
  create: (name: string) => Promise<unknown>;
  invite: (role: string) => Promise<{ token: string; role: string }>;
  join: (token: string) => Promise<{ success: boolean; family?: { id: string; name: string } }>;
  devices: () => Promise<unknown[]>;
  removeDevice: (deviceId: string) => Promise<unknown[]>;
  getPermissions: () => Promise<unknown[]>;
  setPermission: (memberId: string, role: string) => Promise<unknown>;
}

// Define the structure we expect from electronAPI for email
interface EmailAPI {
  getAccounts: () => Promise<unknown[]>;
  addAccount: (config: unknown) => Promise<unknown>;
  removeAccount: (id: string) => Promise<void>;
  fetchMessages: (accountId: string, folder: string) => Promise<unknown[]>;
  fetchMessage: (accountId: string, folder: string, uid: number) => Promise<unknown>;
  sendMessage: (accountId: string, message: unknown) => Promise<void>;
  search: (query: unknown) => Promise<unknown[]>;
  rebuildSearchIndex: (accountId: string) => Promise<{ success: boolean }>;
  getFolders: (accountId: string) => Promise<unknown[]>;
  createFolder: (accountId: string, folderPath: string) => Promise<{ success: boolean }>;
  renameFolder: (
    accountId: string,
    oldPath: string,
    newPath: string
  ) => Promise<{ success: boolean }>;
  deleteFolder: (
    accountId: string,
    folderPath: string,
    moveMessagesTo?: string
  ) => Promise<{ success: boolean }>;
  moveMessagesToFolder: (
    accountId: string,
    messageUids: number[],
    sourceFolder: string,
    targetFolder: string
  ) => Promise<{ success: boolean }>;
  markAsRead: (accountId: string, uid: number, read: boolean) => Promise<{ success: boolean }>;
  markAsStarred: (
    accountId: string,
    uid: number,
    starred: boolean
  ) => Promise<{ success: boolean }>;
  deleteMessage: (accountId: string, uid: number, folder: string) => Promise<{ success: boolean }>;
  moveMessage: (
    accountId: string,
    uid: number,
    sourceFolder: string,
    targetFolder: string
  ) => Promise<{ success: boolean }>;
}

// Define the structure we expect from electronAPI for email labels
interface EmailLabelsAPI {
  getAll: (accountId?: string | null) => Promise<unknown[]>;
  create: (data: {
    accountId: string | null;
    name: string;
    color: string;
    icon?: string | undefined;
  }) => Promise<unknown>;
  update: (
    labelId: string,
    updates: {
      name?: string;
      color?: string;
      icon?: string | undefined;
    }
  ) => Promise<unknown>;
  delete: (labelId: string) => Promise<{ success: boolean }>;
  apply: (
    accountId: string,
    messageIds: string[],
    labelId: string
  ) => Promise<{
    success: boolean;
    messageIds: string[];
  }>;
  remove: (
    accountId: string,
    messageIds: string[],
    labelId: string
  ) => Promise<{
    success: boolean;
    messageIds: string[];
  }>;
}

interface ElectronAPIWithAllModules {
  tasks: TaskAPI;
  calendar: CalendarAPI;
  family: FamilyAPI;
  email: EmailAPI;
  emailLabels: EmailLabelsAPI;
  [key: string]: unknown;
}

/**
 * Get typed access to electronAPI with proper error handling
 */
export function getElectronAPI(): ElectronAPIWithAllModules {
  if (!window.electronAPI) {
    throw new Error('ElectronAPI not available');
  }

  return window.electronAPI as unknown as ElectronAPIWithAllModules;
}

/**
 * Get typed access to tasks API
 */
export function getTasksAPI(): TaskAPI {
  const api = getElectronAPI();
  if (!api.tasks) {
    throw new Error('Tasks API not available');
  }

  return api.tasks;
}

/**
 * Get typed access to calendar API
 */
export function getCalendarAPI(): CalendarAPI {
  const api = getElectronAPI();
  if (!api.calendar) {
    throw new Error('Calendar API not available');
  }

  return api.calendar;
}

/**
 * Get typed access to family API
 */
export function getFamilyAPI(): FamilyAPI {
  const api = getElectronAPI();
  if (!api.family) {
    throw new Error('Family API not available');
  }

  return api.family;
}

/**
 * Get typed access to email API
 */
export function getEmailAPI(): EmailAPI {
  const api = getElectronAPI();
  if (!api.email) {
    throw new Error('Email API not available');
  }

  return api.email;
}

/**
 * Get typed access to email labels API
 */
export function getEmailLabelsAPI(): EmailLabelsAPI {
  const api = getElectronAPI();
  if (!api.emailLabels) {
    throw new Error('Email Labels API not available');
  }

  return api.emailLabels;
}
