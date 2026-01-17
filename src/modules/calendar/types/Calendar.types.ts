/**
 * Calendar Module Types
 * Based on RFC 5545 (iCalendar) standards
 */

// ============================================================================
// Calendar Types
// ============================================================================

export interface Calendar {
  id: string;
  familyId: string;
  name: string;
  description: string | undefined;
  color: CalendarColor;
  icon: string | undefined;

  // Ownership
  ownerId: string;
  ownerName: string | undefined;

  // Visibility & Sharing
  visibility: CalendarVisibility;
  defaultPermission: CalendarPermission;
  sharedWith: CalendarShare[];

  // Settings
  defaultReminders: EventReminder[];
  timezone: string;
  showDeclined: boolean | undefined;

  // Sync
  externalSyncEnabled: boolean | undefined;
  externalSource: ExternalCalendarSource | undefined;
  lastSyncAt: number | undefined;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export type CalendarVisibility = 'private' | 'family' | 'public';

export type CalendarPermission = 'none' | 'view' | 'edit' | 'admin';

export interface CalendarShare {
  memberId: string;
  memberName?: string;
  permission: CalendarPermission;
  sharedAt: number;
  sharedBy: string;
}

export interface ExternalCalendarSource {
  type: 'google' | 'outlook' | 'icloud' | 'ical_url' | 'caldav';
  url?: string;
  accountId?: string;
  calendarId?: string;
  syncDirection: 'one_way' | 'bidirectional';
}

// Calendar colors - matches Tailwind palette
export type CalendarColor =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

export const CALENDAR_COLORS: Record<CalendarColor, { bg: string; text: string; border: string }> =
  {
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    lime: { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-300' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    sky: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    fuchsia: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-300' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  };

// ============================================================================
// Event Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  calendarId: string;
  familyId: string;

  // Basic info
  title: string;
  description: string | undefined;
  location: string | undefined;
  url: string | undefined;

  // Timing
  start: number; // Unix timestamp
  end: number;
  allDay: boolean;
  timezone: string | undefined;

  // Recurrence (RFC 5545 RRULE)
  recurrence: RecurrenceRule | undefined;
  recurrenceId: string | undefined; // For exception instances
  originalStart: number | undefined; // For exception instances

  // Status
  status: EventStatus;
  busyStatus: BusyStatus;

  // Categorization
  category: EventCategory | undefined;
  color: CalendarColor | undefined; // Override calendar color

  // Attendees
  organizer: EventAttendee | undefined;
  attendees: EventAttendee[];

  // Reminders
  reminders: EventReminder[];

  // Metadata
  createdBy: string;
  lastModifiedBy: string | undefined;

  // External sync
  externalId: string | undefined;
  externalEtag: string | undefined;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export type BusyStatus = 'free' | 'busy' | 'tentative' | 'out_of_office';

export type EventCategory =
  | 'default'
  | 'birthday'
  | 'anniversary'
  | 'appointment'
  | 'meeting'
  | 'reminder'
  | 'task'
  | 'travel'
  | 'holiday'
  | 'family'
  | 'school'
  | 'medical'
  | 'sports'
  | 'social';

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  default: 'Event',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  appointment: 'Appointment',
  meeting: 'Meeting',
  reminder: 'Reminder',
  task: 'Task',
  travel: 'Travel',
  holiday: 'Holiday',
  family: 'Family',
  school: 'School',
  medical: 'Medical',
  sports: 'Sports',
  social: 'Social',
};

export const EVENT_CATEGORY_ICONS: Record<EventCategory, string> = {
  default: '📅',
  birthday: '🎂',
  anniversary: '💍',
  appointment: '📋',
  meeting: '👥',
  reminder: '🔔',
  task: '✓',
  travel: '✈️',
  holiday: '🎉',
  family: '👨‍👩‍👧‍👦',
  school: '🎓',
  medical: '🏥',
  sports: '⚽',
  social: '🎭',
};

// ============================================================================
// Attendee Types
// ============================================================================

export interface EventAttendee {
  id: string;
  name: string;
  email: string | undefined;
  isFamilyMember: boolean;
  memberId: string | undefined;

  // RSVP status
  responseStatus: AttendeeResponse;
  respondedAt: number | undefined;

  // Role
  role: AttendeeRole;
  optional: boolean;
}

export type AttendeeResponse = 'needs_action' | 'accepted' | 'declined' | 'tentative';

export type AttendeeRole = 'required' | 'optional' | 'chair' | 'non_participant';

export const ATTENDEE_RESPONSE_LABELS: Record<AttendeeResponse, string> = {
  needs_action: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  tentative: 'Maybe',
};

// ============================================================================
// Reminder Types
// ============================================================================

export interface EventReminder {
  id: string;
  minutes: number; // Minutes before event
  sent?: boolean;
  sentAt?: number;
  enabled?: boolean; // Allow disabling individual reminders
}

export interface ReminderPreferences {
  enabled: boolean;
  categories?: EventCategory[] | undefined; // Only trigger for specific categories (undefined = all)
  minMinutesBefore?: number | undefined; // Don't trigger reminders less than X minutes before
  maxRemindersPerEvent?: number | undefined; // Limit number of reminders per event
}

export interface ReminderSettings {
  global: ReminderPreferences;
  calendarOverrides?: Record<string, Partial<ReminderPreferences>>; // Per-calendar overrides
}

export const REMINDER_PRESETS = [
  { label: 'At time of event', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '10 minutes before', minutes: 10 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
  { label: '2 days before', minutes: 2880 },
  { label: '1 week before', minutes: 10080 },
];

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: true,
  categories: undefined,
  minMinutesBefore: 0,
  maxRemindersPerEvent: 5,
};

// ============================================================================
// Recurrence Types (RFC 5545)
// ============================================================================

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // Every N frequency units

  // End conditions (at most one)
  count?: number; // End after N occurrences
  until?: number; // End by date (Unix timestamp)

  // Filters
  byDay?: RecurrenceByDay[]; // e.g., ["MO", "WE", "FR"] or ["1MO", "-1FR"]
  byMonthDay?: number[]; // 1-31 or -1 to -31
  byMonth?: number[]; // 1-12
  bySetPos?: number[]; // e.g., [1, -1] for first and last
  byWeekNo?: number[]; // 1-53
  byYearDay?: number[]; // 1-366 or -1 to -366

  // Week start
  weekStart?: WeekDay;

  // Exceptions
  exdates?: number[]; // Excluded dates (Unix timestamps)
  rdates?: number[]; // Additional dates
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type WeekDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface RecurrenceByDay {
  day: WeekDay;
  position: number | undefined; // e.g., 1 for first, -1 for last, 2 for second
}

export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
};

export const WEEKDAY_SHORT_LABELS: Record<WeekDay, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

// Recurrence presets for quick selection
export const RECURRENCE_PRESETS = [
  { label: 'Does not repeat', value: null },
  { label: 'Daily', value: { frequency: 'daily', interval: 1 } as RecurrenceRule },
  { label: 'Weekly', value: { frequency: 'weekly', interval: 1 } as RecurrenceRule },
  { label: 'Monthly', value: { frequency: 'monthly', interval: 1 } as RecurrenceRule },
  { label: 'Yearly', value: { frequency: 'yearly', interval: 1 } as RecurrenceRule },
  {
    label: 'Every weekday',
    value: {
      frequency: 'weekly',
      interval: 1,
      byDay: [{ day: 'MO' }, { day: 'TU' }, { day: 'WE' }, { day: 'TH' }, { day: 'FR' }],
    } as RecurrenceRule,
  },
  { label: 'Custom...', value: 'custom' },
];

// ============================================================================
// View Types
// ============================================================================

export type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'year';

export interface CalendarViewState {
  view: CalendarView;
  currentDate: number; // Unix timestamp for current view anchor
  selectedDate?: number;
  selectedEventId?: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface CreateCalendarInput {
  name: string;
  description?: string;
  color: CalendarColor;
  visibility: CalendarVisibility;
  timezone?: string;
}

export interface UpdateCalendarInput extends Partial<CreateCalendarInput> {
  id: string;
}

export interface CreateEventInput {
  calendarId: string;
  title: string;
  description: string | undefined;
  location: string | undefined;
  start: number;
  end: number;
  allDay: boolean;
  timezone: string | undefined;
  recurrence: RecurrenceRule | undefined;
  category: EventCategory | undefined;
  color: CalendarColor | undefined;
  reminders: EventReminder[] | undefined;
  attendees: EventAttendee[] | undefined;
}

export interface UpdateEventInput {
  id: string;
  updateScope: 'this' | 'this_and_future' | 'all' | undefined;
  title: string | undefined;
  description: string | undefined;
  location: string | undefined;
  start: number | undefined;
  end: number | undefined;
  allDay: boolean | undefined;
  timezone: string | undefined;
  recurrence: RecurrenceRule | undefined;
  category: EventCategory | undefined;
  color: CalendarColor | undefined;
  reminders: EventReminder[] | undefined;
  attendees: EventAttendee[] | undefined;
}

// ============================================================================
// Query Types
// ============================================================================

export interface EventsQuery {
  calendarIds?: string[];
  start: number;
  end: number;
  includeRecurring?: boolean;
  status?: EventStatus[];
  categories?: EventCategory[];
  searchTerm?: string;
}

export interface ExpandedEvent extends CalendarEvent {
  isRecurrenceInstance: boolean;
  instanceDate?: number; // For recurring events
  masterEventId?: string; // For recurring event instances
}
