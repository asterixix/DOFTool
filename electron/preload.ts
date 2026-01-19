import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object

// Calendar types for IPC
interface CalendarData {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  visibility: string;
  defaultPermission: string;
  sharedWith: Array<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
  defaultReminders: Array<{ id: string; type: string; minutes: number }>;
  timezone: string;
  createdAt: number;
  updatedAt: number;
  externalSyncEnabled?: boolean;
  externalSource?: {
    type: 'ical_url' | 'google' | 'outlook' | 'icloud' | 'caldav';
    url?: string;
    accountId?: string;
    calendarId?: string;
    syncDirection: 'one_way' | 'bidirectional';
  };
  lastSyncAt?: number;
  syncInterval?: number;
}

interface CreateCalendarData {
  name: string;
  description?: string;
  color: string;
  visibility: string;
  timezone?: string;
}

interface EventData {
  id: string;
  calendarId: string;
  familyId: string;
  title: string;
  description?: string;
  location?: string;
  start: number;
  end: number;
  allDay: boolean;
  timezone?: string;
  recurrence?: RecurrenceData;
  status: string;
  busyStatus: string;
  category?: string;
  color?: string;
  attendees: AttendeeData[];
  reminders: Array<{ id: string; type: string; minutes: number }>;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

interface RecurrenceData {
  frequency: string;
  interval: number;
  count?: number;
  until?: number;
  byDay?: Array<{ day: string; position?: number }>;
  byMonthDay?: number[];
  byMonth?: number[];
  exdates?: number[];
}

interface AttendeeData {
  id: string;
  name: string;
  email?: string;
  isFamilyMember: boolean;
  memberId?: string;
  responseStatus: string;
  role: string;
  optional: boolean;
}

interface CreateEventData {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: number;
  end: number;
  allDay: boolean;
  timezone?: string;
  recurrence?: RecurrenceData;
  category?: string;
  color?: string;
  reminders?: Array<{ id: string; type: string; minutes: number }>;
  attendees?: AttendeeData[];
}

interface EventsQueryData {
  calendarIds?: string[];
  start: number;
  end: number;
}

interface TaskListData {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  ownerId: string;
  visibility: string;
  defaultPermission: string;
  sharedWith: Array<{
    memberId: string;
    permission: string;
    sharedAt: number;
    sharedBy: string;
  }>;
  defaultAssigneeId?: string;
  autoSort?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  totalTasks: number;
  completedTasks: number;
  createdAt: number;
  updatedAt: number;
}

interface CreateTaskListData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility?: string;
  defaultPermission?: string;
}

interface TaskData {
  id: string;
  taskListId: string;
  familyId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  assignedBy?: string;
  dueDate?: number;
  dueTime?: string;
  startDate?: number;
  completedAt?: number;
  completedBy?: string;
  labels: Array<{
    id: string;
    name: string;
    color: string;
    createdAt: number;
  }>;
  tags: string[];
  subtasks: Array<{
    id: string;
    taskId: string;
    title: string;
    completed: boolean;
    completedAt?: number;
    position: number;
    createdAt: number;
    updatedAt: number;
  }>;
  checklist: Array<{
    id: string;
    text: string;
    checked: boolean;
    checkedAt?: number;
    position: number;
  }>;
  dependsOn: string[];
  blocks: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: number;
    count?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  location?: string;
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedAt: number;
    uploadedBy: string;
  }>;
  comments: Array<{
    id: string;
    taskId: string;
    authorId: string;
    authorName?: string;
    content: string;
    edited: boolean;
    createdAt: number;
    updatedAt: number;
  }>;
  position: number;
  createdAt: number;
  updatedAt: number;
}

interface CreateTaskData {
  taskListId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeIds?: string[];
  dueDate?: number;
  dueTime?: string;
  startDate?: number;
  labels?: Array<{ name: string; color: string }>;
  tags?: string[];
  subtasks?: Array<{ title: string; position: number }>;
  checklist?: Array<{ text: string; position: number }>;
  dependsOn?: string[];
  estimatedMinutes?: number;
  recurrence?: TaskData['recurrence'];
  location?: string;
  position?: number;
}

type NotificationModule = 'calendar' | 'tasks' | 'email' | 'family' | 'system';
type NotificationPriority = 'silent' | 'normal' | 'urgent';

interface NotificationModulePreferences {
  enabled: boolean;
  allowUrgent: boolean;
  allowSound: boolean;
}

interface NotificationPreferences {
  paused: boolean;
  modules: Record<NotificationModule, NotificationModulePreferences>;
  historyLimit: number;
}

interface NotificationPreferencesUpdate {
  paused?: boolean;
  historyLimit?: number;
  modules?: Partial<Record<NotificationModule, Partial<NotificationModulePreferences>>>;
}

interface NotificationEvent {
  module: NotificationModule;
  title: string;
  body?: string;
  priority: NotificationPriority;
  data?: Record<string, unknown>;
}

interface NotificationHistoryItem {
  id: string;
  module: NotificationModule;
  title: string;
  body?: string;
  priority: NotificationPriority;
  createdAt: number;
  data?: Record<string, unknown>;
}

interface ReminderPreferencesData {
  enabled: boolean;
  categories?: string[];
  minMinutesBefore?: number;
  maxRemindersPerEvent?: number;
}

interface ReminderSettingsData {
  global: ReminderPreferencesData;
  calendarOverrides?: Record<string, Partial<ReminderPreferencesData>>;
}

interface UpdateInfo {
  version: string;
  currentVersion: string;
  hasUpdate: boolean;
  release?: {
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    assets: Array<{
      name: string;
      browser_download_url: string;
      size: number;
    }>;
    prerelease: boolean;
    draft: boolean;
  };
  downloadUrl?: string;
}

const electronAPI = {
  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:platform'),
  openExternal: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('app:openExternal', url),
  resetAllData: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('app:resetAllData'),

  // Analytics - routes to main process Aptabase SDK
  analytics: {
    track: (
      eventName: string,
      props?: Record<string, string | number | boolean>
    ): Promise<{ success: boolean }> => ipcRenderer.invoke('analytics:track', eventName, props),
  },

  updater: {
    check: (notifyIfAvailable?: boolean): Promise<UpdateInfo> =>
      ipcRenderer.invoke('updater:check', notifyIfAvailable),
    download: (releaseUrl?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('updater:download', releaseUrl),
    install: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('updater:install'),
    getLastChecked: (): Promise<number | null> => ipcRenderer.invoke('updater:lastChecked'),
  },

  notifications: {
    getPreferences: (): Promise<NotificationPreferences> =>
      ipcRenderer.invoke('notifications:getPreferences'),
    updatePreferences: (update: NotificationPreferencesUpdate): Promise<NotificationPreferences> =>
      ipcRenderer.invoke('notifications:updatePreferences', update),
    getHistory: (): Promise<NotificationHistoryItem[]> =>
      ipcRenderer.invoke('notifications:getHistory'),
    clearHistory: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('notifications:clearHistory'),
    emit: (event: NotificationEvent): Promise<NotificationHistoryItem | null> =>
      ipcRenderer.invoke('notifications:emit', event),
  },

  // Encryption operations
  encryption: {
    generateKey: (): Promise<{ id: string; key: number[] }> =>
      ipcRenderer.invoke('encryption:generateKey'),
    deriveKey: (passphrase: string, salt: number[]): Promise<{ id: string; key: number[] }> =>
      ipcRenderer.invoke('encryption:deriveKey', passphrase, salt),
    generateSalt: (): Promise<number[]> => ipcRenderer.invoke('encryption:generateSalt'),
    encrypt: (
      data: number[],
      keyId: string,
      keyBytes: number[]
    ): Promise<{ ciphertext: number[]; nonce: number[]; keyId: string }> =>
      ipcRenderer.invoke('encryption:encrypt', data, keyId, keyBytes),
    decrypt: (
      encrypted: { ciphertext: number[]; nonce: number[]; keyId: string },
      keyId: string,
      keyBytes: number[]
    ): Promise<number[]> => ipcRenderer.invoke('encryption:decrypt', encrypted, keyId, keyBytes),
    hash: (data: number[]): Promise<number[]> => ipcRenderer.invoke('encryption:hash', data),
    hashString: (text: string): Promise<string> =>
      ipcRenderer.invoke('encryption:hashString', text),
    generateToken: (length?: number): Promise<string> =>
      ipcRenderer.invoke('encryption:generateToken', length),
  },

  // Yjs operations
  yjs: {
    getDocumentState: (): Promise<{
      stateVector: number[];
      update: number[];
    }> => ipcRenderer.invoke('yjs:getDocumentState'),
    applyUpdate: (update: number[]): Promise<boolean> =>
      ipcRenderer.invoke('yjs:applyUpdate', update),
    getMap: (mapName: string): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke('yjs:getMap', mapName),
    forceUnlock: (): Promise<boolean> => ipcRenderer.invoke('yjs:forceUnlock'),
  },

  // Storage operations
  storage: {
    get: (key: string): Promise<string | undefined> => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: string): Promise<boolean> =>
      ipcRenderer.invoke('storage:set', key, value),
    delete: (key: string): Promise<boolean> => ipcRenderer.invoke('storage:delete', key),
    getKeysByPrefix: (prefix: string): Promise<string[]> =>
      ipcRenderer.invoke('storage:getKeysByPrefix', prefix),
  },

  // Family operations
  family: {
    get: (): Promise<{
      family: { id: string; name: string; createdAt: number; adminDeviceId: string } | null;
      devices: Array<{
        id: string;
        name: string;
        addedAt: number;
        lastSeen: number;
        isCurrent: boolean;
      }>;
      permissions: Array<{ memberId: string; role: string; createdAt: number }>;
    }> => ipcRenderer.invoke('family:get'),
    create: (
      name: string
    ): Promise<{
      family: { id: string; name: string; createdAt: number; adminDeviceId: string } | null;
      devices: Array<{
        id: string;
        name: string;
        addedAt: number;
        lastSeen: number;
        isCurrent: boolean;
      }>;
      permissions: Array<{ memberId: string; role: string; createdAt: number }>;
    }> => ipcRenderer.invoke('family:create', name),
    invite: (role: string): Promise<{ token: string; role: string }> =>
      ipcRenderer.invoke('family:invite', role),
    join: (token: string): Promise<{ success: boolean; family?: { id: string; name: string } }> =>
      ipcRenderer.invoke('family:join', token),
    devices: (): Promise<
      Array<{ id: string; name: string; addedAt: number; lastSeen: number; isCurrent: boolean }>
    > => ipcRenderer.invoke('family:devices'),
    removeDevice: (
      deviceId: string
    ): Promise<
      Array<{ id: string; name: string; addedAt: number; lastSeen: number; isCurrent: boolean }>
    > => ipcRenderer.invoke('family:removeDevice', deviceId),
    getPermissions: (): Promise<Array<{ memberId: string; role: string; createdAt: number }>> =>
      ipcRenderer.invoke('family:getPermissions'),
    setPermission: (
      memberId: string,
      role: string
    ): Promise<{ memberId: string; role: string; createdAt: number }> =>
      ipcRenderer.invoke('family:setPermission', memberId, role),
  },

  // Family Discovery operations (mDNS-based local network discovery)
  discovery: {
    startDiscovering: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('discovery:startDiscovering'),
    stopDiscovering: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('discovery:stopDiscovering'),
    getDiscoveredFamilies: (): Promise<
      Array<{
        id: string;
        name: string;
        adminDeviceName: string;
        host: string;
        port: number;
        discoveredAt: number;
      }>
    > => ipcRenderer.invoke('discovery:getDiscoveredFamilies'),
    requestJoin: (
      familyId: string
    ): Promise<{
      id: string;
      deviceId: string;
      deviceName: string;
      requestedAt: number;
      status: 'pending' | 'approved' | 'rejected';
    }> => ipcRenderer.invoke('discovery:requestJoin', familyId),
    getPendingJoinRequests: (): Promise<
      Array<{
        id: string;
        deviceId: string;
        deviceName: string;
        requestedAt: number;
        status: 'pending' | 'approved' | 'rejected';
      }>
    > => ipcRenderer.invoke('discovery:getPendingJoinRequests'),
    approveJoinRequest: (
      requestId: string,
      role: 'admin' | 'member' | 'viewer'
    ): Promise<{
      requestId: string;
      approved: boolean;
      role?: 'admin' | 'member' | 'viewer';
      familyId?: string;
      familyName?: string;
      syncToken?: string;
    } | null> => ipcRenderer.invoke('discovery:approveJoinRequest', requestId, role),
    rejectJoinRequest: (requestId: string): Promise<boolean> =>
      ipcRenderer.invoke('discovery:rejectJoinRequest', requestId),
    startPublishing: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('discovery:startPublishing'),
    stopPublishing: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('discovery:stopPublishing'),
    receiveJoinRequest: (
      deviceId: string,
      deviceName: string
    ): Promise<{
      id: string;
      deviceId: string;
      deviceName: string;
      requestedAt: number;
      status: 'pending' | 'approved' | 'rejected';
    }> => ipcRenderer.invoke('discovery:receiveJoinRequest', deviceId, deviceName),
    // Event listeners for discovery notifications
    onFamilyDiscovered: (
      callback: (family: {
        id: string;
        name: string;
        adminDeviceName: string;
        host: string;
        port: number;
        discoveredAt: number;
      }) => void
    ): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, family: unknown): void => {
        callback(
          family as {
            id: string;
            name: string;
            adminDeviceName: string;
            host: string;
            port: number;
            discoveredAt: number;
          }
        );
      };
      ipcRenderer.on('discovery:familyDiscovered', handler);
      return () => ipcRenderer.removeListener('discovery:familyDiscovered', handler);
    },
    onNewJoinRequest: (
      callback: (request: {
        id: string;
        deviceId: string;
        deviceName: string;
        requestedAt: number;
        status: 'pending' | 'approved' | 'rejected';
      }) => void
    ): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, request: unknown): void => {
        callback(
          request as {
            id: string;
            deviceId: string;
            deviceName: string;
            requestedAt: number;
            status: 'pending' | 'approved' | 'rejected';
          }
        );
      };
      ipcRenderer.on('discovery:newJoinRequest', handler);
      return () => ipcRenderer.removeListener('discovery:newJoinRequest', handler);
    },
    onJoinRequestApproved: (
      callback: (approval: {
        requestId: string;
        approved: boolean;
        role?: 'admin' | 'member' | 'viewer';
        familyId?: string;
        familyName?: string;
        syncToken?: string;
      }) => void
    ): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, approval: unknown): void => {
        callback(
          approval as {
            requestId: string;
            approved: boolean;
            role?: 'admin' | 'member' | 'viewer';
            familyId?: string;
            familyName?: string;
            syncToken?: string;
          }
        );
      };
      ipcRenderer.on('discovery:joinRequestApproved', handler);
      return () => ipcRenderer.removeListener('discovery:joinRequestApproved', handler);
    },
    onJoinRequestRejected: (callback: (requestId: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, requestId: unknown): void => {
        callback(requestId as string);
      };
      ipcRenderer.on('discovery:joinRequestRejected', handler);
      return () => ipcRenderer.removeListener('discovery:joinRequestRejected', handler);
    },
  },

  // Calendar operations
  calendar: {
    getAll: (): Promise<CalendarData[]> => ipcRenderer.invoke('calendar:getAll'),
    get: (calendarId: string): Promise<CalendarData | null> =>
      ipcRenderer.invoke('calendar:get', calendarId),
    create: (data: CreateCalendarData): Promise<CalendarData> =>
      ipcRenderer.invoke('calendar:create', data),
    update: (calendarId: string, data: Partial<CreateCalendarData>): Promise<CalendarData> =>
      ipcRenderer.invoke('calendar:update', calendarId, data),
    delete: (calendarId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('calendar:delete', calendarId),
    getEvents: (query: EventsQueryData): Promise<EventData[]> =>
      ipcRenderer.invoke('calendar:getEvents', query),
    getEvent: (eventId: string): Promise<EventData | null> =>
      ipcRenderer.invoke('calendar:getEvent', eventId),
    createEvent: (data: CreateEventData): Promise<EventData> =>
      ipcRenderer.invoke('calendar:createEvent', data),
    updateEvent: (eventId: string, data: Partial<CreateEventData>): Promise<EventData> =>
      ipcRenderer.invoke('calendar:updateEvent', eventId, data),
    deleteEvent: (eventId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('calendar:deleteEvent', eventId),
    importICal: (
      calendarId: string,
      icalData: string
    ): Promise<{ imported: number; errors: string[] }> =>
      ipcRenderer.invoke('calendar:importICal', calendarId, icalData),
    exportICal: (calendarId: string): Promise<string> =>
      ipcRenderer.invoke('calendar:exportICal', calendarId),
    subscribeExternal: (
      calendarId: string,
      url: string,
      syncInterval?: number
    ): Promise<CalendarData> =>
      ipcRenderer.invoke('calendar:subscribeExternal', calendarId, url, syncInterval),
    unsubscribeExternal: (calendarId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('calendar:unsubscribeExternal', calendarId),
    syncExternal: (
      calendarId: string
    ): Promise<{ success: boolean; imported: number; errors: string[] }> =>
      ipcRenderer.invoke('calendar:syncExternal', calendarId),
    getSyncStatus: (
      calendarId: string
    ): Promise<{
      externalSyncEnabled: boolean;
      externalSource?: {
        type: string;
        url?: string;
        syncDirection: string;
      };
      lastSyncAt?: number;
      syncInterval: number;
    }> => ipcRenderer.invoke('calendar:getSyncStatus', calendarId),
    share: (
      calendarId: string,
      memberId: string,
      permission: string
    ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> =>
      ipcRenderer.invoke('calendar:share', calendarId, memberId, permission),
    updateShare: (
      calendarId: string,
      memberId: string,
      permission: string
    ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> =>
      ipcRenderer.invoke('calendar:updateShare', calendarId, memberId, permission),
    unshare: (calendarId: string, memberId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('calendar:unshare', calendarId, memberId),
    reminderSettings: {
      get: (): Promise<ReminderSettingsData> => ipcRenderer.invoke('calendar:reminderSettings:get'),
      update: (update: Partial<ReminderSettingsData>): Promise<ReminderSettingsData> =>
        ipcRenderer.invoke('calendar:reminderSettings:update', update),
    },
    getShares: (
      calendarId: string
    ): Promise<
      Array<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>
    > => ipcRenderer.invoke('calendar:getShares', calendarId),
  },

  // Task operations
  tasks: {
    getLists: (): Promise<TaskListData[]> => ipcRenderer.invoke('tasks:getLists'),
    getList: (listId: string): Promise<TaskListData | null> =>
      ipcRenderer.invoke('tasks:getList', listId),
    createList: (data: CreateTaskListData): Promise<TaskListData> =>
      ipcRenderer.invoke('tasks:createList', data),
    updateList: (listId: string, data: Partial<CreateTaskListData>): Promise<TaskListData> =>
      ipcRenderer.invoke('tasks:updateList', listId, data),
    deleteList: (listId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('tasks:deleteList', listId),
    getTasks: (listId: string): Promise<TaskData[]> => ipcRenderer.invoke('tasks:getTasks', listId),
    getTask: (taskId: string): Promise<TaskData | null> =>
      ipcRenderer.invoke('tasks:getTask', taskId),
    createTask: (data: CreateTaskData): Promise<TaskData> =>
      ipcRenderer.invoke('tasks:createTask', data),
    updateTask: (taskId: string, data: Partial<CreateTaskData>): Promise<TaskData> =>
      ipcRenderer.invoke('tasks:updateTask', taskId, data),
    deleteTask: (taskId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('tasks:deleteTask', taskId),
    import: (listId: string, jsonData: string): Promise<{ imported: number; errors: string[] }> =>
      ipcRenderer.invoke('tasks:import', listId, jsonData),
    export: (listId: string): Promise<string> => ipcRenderer.invoke('tasks:export', listId),
    shareList: (
      listId: string,
      memberId: string,
      permission: string
    ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> =>
      ipcRenderer.invoke('tasks:shareList', listId, memberId, permission),
    updateListShare: (
      listId: string,
      memberId: string,
      permission: string
    ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> =>
      ipcRenderer.invoke('tasks:updateListShare', listId, memberId, permission),
    unshareList: (listId: string, memberId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('tasks:unshareList', listId, memberId),
    getListShares: (
      listId: string
    ): Promise<
      Array<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>
    > => ipcRenderer.invoke('tasks:getListShares', listId),
  },

  // Email operations
  email: {
    getAccounts: (): Promise<unknown[]> => ipcRenderer.invoke('email:getAccounts'),
    addAccount: (config: unknown): Promise<unknown> =>
      ipcRenderer.invoke('email:addAccount', config),
    removeAccount: (id: string): Promise<void> => ipcRenderer.invoke('email:removeAccount', id),
    fetchMessages: (accountId: string, folder: string): Promise<unknown[]> =>
      ipcRenderer.invoke('email:fetchMessages', accountId, folder),
    fetchMessage: (accountId: string, folder: string, uid: number): Promise<unknown> =>
      ipcRenderer.invoke('email:fetchMessage', accountId, folder, uid),
    sendMessage: (accountId: string, message: unknown): Promise<void> =>
      ipcRenderer.invoke('email:sendMessage', accountId, message),
    search: (query: unknown): Promise<unknown[]> => ipcRenderer.invoke('email:search', query),
    rebuildSearchIndex: (accountId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:searchIndex:rebuild', accountId),
    getFolders: (accountId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('email:getFolders', accountId),
    createFolder: (accountId: string, folderPath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:folders:create', accountId, folderPath),
    renameFolder: (
      accountId: string,
      oldPath: string,
      newPath: string
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:folders:rename', accountId, oldPath, newPath),
    deleteFolder: (
      accountId: string,
      folderPath: string,
      moveMessagesTo?: string
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:folders:delete', accountId, folderPath, moveMessagesTo),
    moveMessagesToFolder: (
      accountId: string,
      messageUids: number[],
      sourceFolder: string,
      targetFolder: string
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:folders:move', accountId, messageUids, sourceFolder, targetFolder),
    markAsRead: (accountId: string, uid: number, read: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:markAsRead', accountId, uid, read),
    markAsStarred: (
      accountId: string,
      uid: number,
      starred: boolean
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:markAsStarred', accountId, uid, starred),
    deleteMessage: (
      accountId: string,
      uid: number,
      folder: string
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:deleteMessage', accountId, uid, folder),
    moveMessage: (
      accountId: string,
      uid: number,
      sourceFolder: string,
      targetFolder: string
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:moveMessage', accountId, uid, sourceFolder, targetFolder),
  },

  // Email labels operations
  emailLabels: {
    getAll: (accountId?: string | null): Promise<unknown[]> =>
      ipcRenderer.invoke('email:labels:getAll', accountId),
    create: (data: {
      accountId: string | null;
      name: string;
      color: string;
      icon?: string;
    }): Promise<unknown> => ipcRenderer.invoke('email:labels:create', data),
    update: (
      labelId: string,
      updates: {
        name?: string;
        color?: string;
        icon?: string;
      }
    ): Promise<unknown> => ipcRenderer.invoke('email:labels:update', labelId, updates),
    delete: (labelId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('email:labels:delete', labelId),
    apply: (
      accountId: string,
      messageIds: string[],
      labelId: string
    ): Promise<{
      success: boolean;
      messageIds: string[];
    }> => ipcRenderer.invoke('email:labels:apply', accountId, messageIds, labelId),
    remove: (
      accountId: string,
      messageIds: string[],
      labelId: string
    ): Promise<{
      success: boolean;
      messageIds: string[];
    }> => ipcRenderer.invoke('email:labels:remove', accountId, messageIds, labelId),
  },

  // Email settings operations
  emailSettings: {
    getSettings: (): Promise<unknown> => ipcRenderer.invoke('emailSettings:getSettings'),
    updateSettings: (settings: unknown): Promise<unknown> =>
      ipcRenderer.invoke('emailSettings:updateSettings', settings),
    createAccount: (input: unknown): Promise<{ id: string }> =>
      ipcRenderer.invoke('emailSettings:createAccount', input),
    updateAccount: (input: unknown): Promise<void> =>
      ipcRenderer.invoke('emailSettings:updateAccount', input),
    deleteAccount: (id: string): Promise<void> =>
      ipcRenderer.invoke('emailSettings:deleteAccount', id),
    testConnection: (
      input: unknown
    ): Promise<{
      success: boolean;
      incoming?: { success: boolean; error?: string; latency?: number };
      outgoing?: { success: boolean; error?: string; latency?: number };
    }> => ipcRenderer.invoke('emailSettings:testConnection', input),
  },

  // P2P Sync operations
  sync: {
    getStatus: (): Promise<{
      status: 'offline' | 'discovering' | 'connecting' | 'connected' | 'syncing';
      peerCount: number;
      lastSyncAt: number | null;
      error?: string;
      isInitialized?: boolean;
    }> => ipcRenderer.invoke('sync:status'),
    forceSync: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:force'),
    getPeers: (): Promise<
      Array<{
        deviceId: string;
        deviceName: string;
        status: string;
        lastSeen: number;
        lastSyncAt: number | null;
      }>
    > => ipcRenderer.invoke('sync:peers'),
    start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('sync:start'),
    stop: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('sync:stop'),
    getDiscoveredPeers: (): Promise<
      Array<{
        deviceId: string;
        deviceName: string;
        host: string;
        port: number;
        discoveredAt: number;
      }>
    > => ipcRenderer.invoke('sync:discovered-peers'),
    initialize: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:initialize'),
  },

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    const validChannels = [
      'sync:status-changed',
      'sync:peer-connected',
      'sync:peer-disconnected',
      'notifications:updated',
      'calendar:updated',
      'tasks:updated',
      'email:new-message',
      'family:member-joined',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args: unknown[]) => callback(...args));
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, callback);
  },
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Type definition for renderer process
export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('FamilySync preload script loaded');
