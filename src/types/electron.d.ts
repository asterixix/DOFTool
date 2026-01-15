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
  count: number | undefined;
  until: number | undefined;
  byDay: Array<{ day: string; position: number | undefined }> | undefined;
  byMonthDay: number[] | undefined;
  byMonth: number[] | undefined;
  exdates: number[] | undefined;
}

interface AttendeeData {
  id: string;
  name: string;
  email: string | undefined;
  isFamilyMember: boolean;
  memberId: string | undefined;
  responseStatus: string;
  role: string;
  optional: boolean;
}

interface CreateEventData {
  calendarId: string;
  title: string;
  description: string | undefined;
  location: string | undefined;
  start: number;
  end: number;
  allDay: boolean;
  timezone: string | undefined;
  recurrence: RecurrenceData | undefined;
  category: string | undefined;
  color: string | undefined;
  reminders: Array<{ id: string; type: string; minutes: number }> | undefined;
  attendees: AttendeeData[] | undefined;
}

interface EventsQueryData {
  calendarIds?: string[];
  start: number;
  end: number;
}

interface CalendarShare {
  calendarId: string;
  memberId: string;
  permission: string;
  sharedAt: number;
  sharedBy: string;
}

// Task types for IPC
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
  sharedWith: Array<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
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
  labels: Array<{ id: string; name: string; color: string; createdAt: number }>;
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

// Email settings types for IPC
interface EmailLabelData {
  id: string;
  accountId: string | null;
  familyId: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

interface EmailSettingsData {
  defaultSyncInterval: number;
  defaultTimeout: number;
  defaultRetry: RetryConfigData;
  defaultRateLimit: RateLimitConfigData;
  connectionPool: ConnectionPoolConfigData;
  enableLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxMessageSize: number;
  enableCaching: boolean;
  cacheTtl: number;
  accounts: EmailAccountSettingsData[];
}

interface RetryConfigData {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryOnConnectionError: boolean;
  retryOnTimeout: boolean;
}

interface RateLimitConfigData {
  maxRequests: number;
  windowMs: number;
  enabled: boolean;
}

interface ConnectionPoolConfigData {
  maxConnections: number;
  minIdle: number;
  idleTimeout: number;
  maxLifetime: number;
  enabled: boolean;
}

interface OAuth2ConfigData {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface IncomingServerConfigData {
  protocol: 'imap' | 'pop3';
  host: string;
  port: number;
  encryption: 'none' | 'ssl' | 'tls' | 'starttls';
  authMethod: 'password' | 'oauth2' | 'app-password';
  username: string;
  password?: string;
  oauth2?: OAuth2ConfigData;
  timeout: number;
  retry: RetryConfigData;
  allowInsecure?: boolean;
}

interface OutgoingServerConfigData {
  host: string;
  port: number;
  encryption: 'none' | 'ssl' | 'tls' | 'starttls';
  authMethod: 'password' | 'oauth2' | 'app-password';
  username: string;
  password?: string;
  oauth2?: OAuth2ConfigData;
  timeout: number;
  retry: RetryConfigData;
  rateLimit: RateLimitConfigData;
  allowInsecure?: boolean;
}

interface EmailAccountSettingsData {
  id: string;
  email: string;
  displayName: string;
  provider: string;
  incoming: IncomingServerConfigData;
  outgoing: OutgoingServerConfigData;
  syncInterval: number;
  signature?: string;
  status: 'active' | 'disabled' | 'error';
  lastError?: string;
  lastSyncAt?: number;
  deleteAfterDownload?: boolean;
  connectionPool?: ConnectionPoolConfigData;
}

interface CreateEmailAccountSettingsInput {
  email: string;
  displayName: string;
  provider: string;
  incoming: Omit<IncomingServerConfigData, 'retry'> & {
    retry?: Partial<RetryConfigData>;
  };
  outgoing: Omit<OutgoingServerConfigData, 'retry' | 'rateLimit'> & {
    retry?: Partial<RetryConfigData>;
    rateLimit?: Partial<RateLimitConfigData>;
  };
  syncInterval?: number;
  signature?: string;
  deleteAfterDownload?: boolean;
  connectionPool?: Partial<ConnectionPoolConfigData>;
}

interface UpdateEmailAccountSettingsInput {
  id: string;
  displayName?: string;
  incoming?: Partial<IncomingServerConfigData>;
  outgoing?: Partial<OutgoingServerConfigData>;
  syncInterval?: number;
  signature?: string;
  status?: 'active' | 'disabled' | 'error';
  deleteAfterDownload?: boolean;
  connectionPool?: Partial<ConnectionPoolConfigData>;
}

interface TestConnectionInput {
  accountId?: string;
  incoming?: Partial<IncomingServerConfigData>;
  outgoing?: Partial<OutgoingServerConfigData>;
  testType: 'incoming' | 'outgoing' | 'both';
}

interface TestConnectionResult {
  success: boolean;
  incoming?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
  outgoing?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
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

interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;

  notifications: {
    getPreferences: () => Promise<NotificationPreferences>;
    updatePreferences: (update: NotificationPreferencesUpdate) => Promise<NotificationPreferences>;
    getHistory: () => Promise<NotificationHistoryItem[]>;
    clearHistory: () => Promise<{ success: boolean }>;
    emit: (event: NotificationEvent) => Promise<NotificationHistoryItem | null>;
  };

  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;

  // Encryption operations
  encryption: {
    generateKey: () => Promise<{ id: string; key: number[] }>;
    deriveKey: (passphrase: string, salt: number[]) => Promise<{ id: string; key: number[] }>;
    generateSalt: () => Promise<number[]>;
    encrypt: (
      data: number[],
      keyId: string,
      keyBytes: number[]
    ) => Promise<{ ciphertext: number[]; nonce: number[]; keyId: string }>;
    decrypt: (
      encrypted: { ciphertext: number[]; nonce: number[]; keyId: string },
      keyId: string,
      keyBytes: number[]
    ) => Promise<number[]>;
    hash: (data: number[]) => Promise<number[]>;
    hashString: (text: string) => Promise<string>;
    generateToken: (length?: number) => Promise<string>;
  };

  // Yjs operations
  yjs: {
    getDocumentState: () => Promise<{ stateVector: number[]; update: number[] }>;
    applyUpdate: (update: number[]) => Promise<boolean>;
    getMap: (mapName: string) => Promise<Record<string, unknown>>;
    forceUnlock: () => Promise<boolean>;
  };

  // Storage operations
  storage: {
    get: (key: string) => Promise<string | undefined>;
    set: (key: string, value: string) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
    getKeysByPrefix: (prefix: string) => Promise<string[]>;
  };

  // Family operations
  family: {
    get: () => Promise<{
      family: { id: string; name: string; createdAt: number; adminDeviceId: string } | null;
      devices: Array<{
        id: string;
        name: string;
        addedAt: number;
        lastSeen: number;
        isCurrent: boolean;
      }>;
      permissions: Array<{ memberId: string; role: string; createdAt: number }>;
    }>;
    create: (name: string) => Promise<{
      family: { id: string; name: string; createdAt: number; adminDeviceId: string } | null;
      devices: Array<{
        id: string;
        name: string;
        addedAt: number;
        lastSeen: number;
        isCurrent: boolean;
      }>;
      permissions: Array<{ memberId: string; role: string; createdAt: number }>;
    }>;
    invite: (role: string) => Promise<{ token: string; role: string }>;
    join: (token: string) => Promise<{ success: boolean; family?: { id: string; name: string } }>;
    devices: () => Promise<
      Array<{ id: string; name: string; addedAt: number; lastSeen: number; isCurrent: boolean }>
    >;
    removeDevice: (
      deviceId: string
    ) => Promise<
      Array<{ id: string; name: string; addedAt: number; lastSeen: number; isCurrent: boolean }>
    >;
    getPermissions: () => Promise<Array<{ memberId: string; role: string; createdAt: number }>>;
    setPermission: (
      memberId: string,
      role: string
    ) => Promise<{ memberId: string; role: string; createdAt: number }>;
  };

  // Calendar operations
  calendar: {
    getAll: () => Promise<CalendarData[]>;
    get: (calendarId: string) => Promise<CalendarData | null>;
    create: (data: CreateCalendarData) => Promise<CalendarData>;
    update: (calendarId: string, data: Partial<CreateCalendarData>) => Promise<CalendarData>;
    delete: (calendarId: string) => Promise<{ success: boolean }>;
    getEvents: (query: EventsQueryData) => Promise<EventData[]>;
    getEvent: (eventId: string) => Promise<EventData | null>;
    createEvent: (data: CreateEventData) => Promise<EventData>;
    updateEvent: (eventId: string, data: Partial<CreateEventData>) => Promise<EventData>;
    deleteEvent: (eventId: string) => Promise<{ success: boolean }>;
    importICal: (
      calendarId: string,
      icalData: string
    ) => Promise<{ imported: number; errors: string[] }>;
    exportICal: (calendarId: string) => Promise<string>;
    share: (calendarId: string, memberId: string, permission: string) => Promise<CalendarShare>;
    updateShare: (
      calendarId: string,
      memberId: string,
      permission: string
    ) => Promise<CalendarShare>;
    unshare: (calendarId: string, memberId: string) => Promise<boolean>;
    getShares: (calendarId: string) => Promise<CalendarShare[]>;
    subscribeExternal: (
      calendarId: string,
      url: string,
      syncInterval?: number
    ) => Promise<CalendarData>;
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
  };

  // Task operations
  tasks: {
    getLists: () => Promise<TaskListData[]>;
    getList: (listId: string) => Promise<TaskListData | null>;
    createList: (data: CreateTaskListData) => Promise<TaskListData>;
    updateList: (listId: string, data: Partial<CreateTaskListData>) => Promise<TaskListData>;
    deleteList: (listId: string) => Promise<{ success: boolean }>;
    getTasks: (listId: string) => Promise<TaskData[]>;
    getTask: (taskId: string) => Promise<TaskData | null>;
    createTask: (data: CreateTaskData) => Promise<TaskData>;
    updateTask: (taskId: string, data: Partial<CreateTaskData>) => Promise<TaskData>;
    deleteTask: (taskId: string) => Promise<{ success: boolean }>;
    import: (listId: string, jsonData: string) => Promise<{ imported: number; errors: string[] }>;
    export: (listId: string) => Promise<string>;
    shareList: (
      listId: string,
      memberId: string,
      permission: string
    ) => Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
    updateListShare: (
      listId: string,
      memberId: string,
      permission: string
    ) => Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
    unshareList: (listId: string, memberId: string) => Promise<{ success: boolean }>;
    getListShares: (
      listId: string
    ) => Promise<
      Array<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>
    >;
  };

  // Email operations
  email: {
    getAccounts: () => Promise<unknown[]>;
    addAccount: (config: unknown) => Promise<unknown>;
    removeAccount: (id: string) => Promise<void>;
    fetchMessages: (accountId: string, folder: string) => Promise<unknown[]>;
    fetchMessage: (accountId: string, folder: string, uid: number) => Promise<unknown>;
    sendMessage: (accountId: string, message: unknown) => Promise<void>;
    search: (query: {
      query: string;
      accountId?: string;
      folder?: string;
      from?: string;
      to?: string;
      dateFrom?: number;
      dateTo?: number;
      hasAttachments?: boolean;
      limit?: number;
    }) => Promise<Array<{ messageId: string; accountId: string; score: number }>>;
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
  };

  // Email labels operations
  emailLabels: {
    getAll: (accountId?: string | null) => Promise<EmailLabelData[]>;
    create: (data: {
      accountId: string | null;
      name: string;
      color: string;
      icon?: string;
    }) => Promise<EmailLabelData>;
    update: (
      labelId: string,
      updates: {
        name?: string;
        color?: string;
        icon?: string;
      }
    ) => Promise<EmailLabelData>;
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
  };

  // Email settings operations
  emailSettings: {
    getSettings: () => Promise<EmailSettingsData>;
    updateSettings: (settings: Partial<EmailSettingsData>) => Promise<EmailSettingsData>;
    createAccount: (input: CreateEmailAccountSettingsInput) => Promise<{ id: string }>;
    updateAccount: (input: UpdateEmailAccountSettingsInput) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    testConnection: (input: TestConnectionInput) => Promise<TestConnectionResult>;
  };

  // Sync operations
  sync: {
    getStatus: () => Promise<{ status: string; peers: number }>;
    forceSync: () => Promise<void>;
    getPeers: () => Promise<unknown[]>;
  };

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { ElectronAPI };
