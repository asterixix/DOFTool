/**
 * EventEditor - Create/Edit event dialog
 */

import { useState, useEffect } from 'react';

import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  CALENDAR_COLORS,
  RECURRENCE_PRESETS,
  REMINDER_PRESETS,
  EVENT_CATEGORY_LABELS,
  type CalendarEvent,
  type Calendar,
  type CalendarColor,
  type RecurrenceRule,
  type EventReminder,
  type EventCategory,
  type EventAttendee,
} from '../types/Calendar.types';
import { describeRecurrence } from '../utils/recurrence';
import {
  getSystemTimezone,
  getCommonTimezones,
  parseTimestampInTimezone,
  createTimestampInTimezone,
  getTimezoneDisplayName,
} from '../utils/timezoneHelpers';

interface EventEditorProps {
  event: CalendarEvent | null;
  calendars: Calendar[];
  defaultDate: number | null;
  defaultEndDate: number | null;
  defaultCalendarId: string | undefined;
  onSave: (eventData: EventFormData) => Promise<void>;
  onDelete: ((eventId: string) => Promise<void>) | undefined;
  onClose: () => void;
  isSaving: boolean | undefined;
}

export interface EventFormData {
  id: string | undefined;
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
  reminders: EventReminder[];
  attendees: EventAttendee[] | undefined;
}

export function EventEditor({
  event,
  calendars,
  defaultDate,
  defaultEndDate,
  defaultCalendarId,
  onSave,
  onDelete,
  onClose,
  isSaving,
}: EventEditorProps): JSX.Element {
  const isEditing = !!event;

  // Form state
  const [calendarId, setCalendarId] = useState(
    event?.calendarId ?? defaultCalendarId ?? calendars[0]?.id ?? ''
  );
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(event?.recurrence ?? null);
  const [category, setCategory] = useState<EventCategory | undefined>(event?.category);
  const [color, setColor] = useState<CalendarColor | undefined>(event?.color);
  const [reminders, setReminders] = useState<EventReminder[]>(
    event?.reminders?.length
      ? event.reminders
      : [{ id: crypto.randomUUID(), minutes: 15, enabled: true }]
  );

  // Get calendar timezone or default to system timezone
  const selectedCalendar = calendars.find((cal) => cal.id === calendarId);
  const defaultTimezone = event?.timezone ?? selectedCalendar?.timezone ?? getSystemTimezone();
  const [timezone, setTimezone] = useState<string>(defaultTimezone);

  // Initialize dates
  useEffect(() => {
    const defaultStart = event?.start ?? defaultDate ?? Date.now();
    // Use provided end date, or event end, or default to 1 hour after start
    const defaultEnd = event?.end ?? defaultEndDate ?? defaultStart + 60 * 60 * 1000; // 1 hour later

    // Parse dates in the event's timezone (or calendar/system timezone)
    const eventTimezone = event?.timezone ?? selectedCalendar?.timezone ?? getSystemTimezone();

    if (eventTimezone && !event?.allDay) {
      // Parse in the event's timezone
      const startParts = parseTimestampInTimezone(defaultStart, eventTimezone);
      const endParts = parseTimestampInTimezone(defaultEnd, eventTimezone);
      setStartDate(startParts.date);
      setStartTime(startParts.time);
      setEndDate(endParts.date);
      setEndTime(endParts.time);
      setTimezone(eventTimezone);
    } else {
      // Use local time (legacy behavior for all-day events or no timezone)
      const start = new Date(defaultStart);
      const end = new Date(defaultEnd);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(format(end, 'HH:mm'));
    }
  }, [event, defaultDate, defaultEndDate, selectedCalendar]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't handle if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="textbox"]') !== null
      ) {
        // Allow Escape to close even when typing
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!title.trim() || !calendarId) {
      return;
    }

    // Build timestamps
    let start: number;
    let end: number;

    if (allDay) {
      // All-day events are timezone-independent (use local time for simplicity)
      start = new Date(startDate + 'T00:00:00').getTime();
      end = new Date(endDate + 'T23:59:59').getTime();
    } else {
      // For timed events, interpret the date/time in the selected timezone
      try {
        start = createTimestampInTimezone(startDate, startTime, timezone);
        end = createTimestampInTimezone(endDate, endTime, timezone);
      } catch (error) {
        // Fallback to local time if timezone conversion fails
        console.warn('Timezone conversion failed, using local time:', error);
        start = new Date(startDate + 'T' + startTime).getTime();
        end = new Date(endDate + 'T' + endTime).getTime();
      }
    }

    const formData: EventFormData = {
      id: event?.id,
      calendarId,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      start,
      end,
      allDay,
      timezone: allDay ? undefined : timezone,
      recurrence: recurrence ?? undefined,
      category,
      color,
      reminders: reminders.filter((r) => r.enabled !== false),
      attendees: event?.attendees,
    };

    await onSave(formData);
  };

  const handleDelete = async (): Promise<void> => {
    if (event && onDelete && confirm('Are you sure you want to delete this event?')) {
      await onDelete(event.id);
    }
  };

  const addReminder = (): void => {
    if (reminders.length < 5) {
      setReminders([...reminders, { id: crypto.randomUUID(), minutes: 15, enabled: true }]);
    }
  };

  const removeReminder = (index: number): void => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const updateReminderMinutes = (index: number, minutes: number): void => {
    const newReminders = [...reminders];
    const existing = newReminders[index];
    if (existing) {
      newReminders[index] = { ...existing, minutes };
      setReminders(newReminders);
    }
  };

  const colorOptions: CalendarColor[] = [
    'red',
    'orange',
    'amber',
    'green',
    'teal',
    'blue',
    'indigo',
    'purple',
    'pink',
  ];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    // Close dialog if clicking on the backdrop (not on the card or its children)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="button"
      tabIndex={0}
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <Card
        className="max-h-[90vh] w-full max-w-lg overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{isEditing ? 'Edit Event' : 'New Event'}</CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </Button>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                required
                id="title"
                placeholder="Event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Calendar selector */}
            <div className="space-y-2">
              <Label htmlFor="calendar">Calendar</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="calendar"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>

            {/* All day toggle */}
            <div className="flex items-center gap-2">
              <input
                checked={allDay}
                className="h-4 w-4 rounded border-gray-300"
                id="allDay"
                type="checkbox"
                onChange={(e) => setAllDay(e.target.checked)}
              />
              <Label className="font-normal" htmlFor="allDay">
                All day event
              </Label>
            </div>

            {/* Date/Time */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  {!allDay && (
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  {!allDay && (
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  )}
                </div>
              </div>
              {!allDay && (
                <div className="space-y-2">
                  <Label htmlFor="timezone">Time Zone</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {getCommonTimezones().map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label} ({tz.offset})
                      </option>
                    ))}
                  </select>
                  {timezone && (
                    <p className="text-xs text-muted-foreground">
                      Times will be displayed in {getTimezoneDisplayName(timezone)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Recurrence */}
            <div className="space-y-2">
              <Label>Repeat</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={recurrence ? JSON.stringify(recurrence) : 'none'}
                onChange={(e) => {
                  if (e.target.value === 'none') {
                    setRecurrence(null);
                  } else {
                    try {
                      const parsed = JSON.parse(e.target.value) as RecurrenceRule;
                      setRecurrence(parsed);
                    } catch {
                      setRecurrence(null);
                    }
                  }
                }}
              >
                {RECURRENCE_PRESETS.filter((p) => p.value !== 'custom').map((preset, index) => (
                  <option
                    key={index}
                    value={preset.value === null ? 'none' : JSON.stringify(preset.value)}
                  >
                    {preset.label}
                  </option>
                ))}
              </select>
              {recurrence && (
                <p className="text-xs text-muted-foreground">{describeRecurrence(recurrence)}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="description"
                placeholder="Add description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={category ?? ''}
                onChange={(e) => setCategory((e.target.value as EventCategory) || undefined)}
              >
                <option value="">No category</option>
                {Object.entries(EVENT_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Color override */}
            <div className="space-y-2">
              <Label>Color (optional)</Label>
              <div className="flex gap-1">
                <button
                  className={`h-6 w-6 rounded-full border-2 ${!color ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  title="Use calendar color"
                  type="button"
                  onClick={() => setColor(undefined)}
                >
                  <span className="sr-only">Default</span>
                </button>
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    className={`h-6 w-6 rounded-full ${CALENDAR_COLORS[c].bg} ${
                      color === c ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    type="button"
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Reminders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Reminders</Label>
                {reminders.length < 5 && (
                  <Button size="sm" type="button" variant="ghost" onClick={addReminder}>
                    + Add
                  </Button>
                )}
              </div>
              {reminders.map((reminder, index) => (
                <div key={reminder.id ?? index} className="flex items-center gap-2">
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    value={reminder.minutes}
                    onChange={(e) => updateReminderMinutes(index, parseInt(e.target.value))}
                  >
                    {REMINDER_PRESETS.map((preset) => (
                      <option key={preset.minutes} value={preset.minutes}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-8 w-8"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => removeReminder(index)}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              {isEditing && onDelete ? (
                <Button
                  disabled={isSaving}
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button disabled={isSaving ?? !title.trim()} type="submit">
                  {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
