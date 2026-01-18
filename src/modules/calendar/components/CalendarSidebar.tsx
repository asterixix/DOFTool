/**
 * CalendarSidebar - Calendar list and mini calendar
 */

import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { CALENDAR_COLORS, type Calendar, type CalendarColor } from '../types/Calendar.types';

interface CalendarSidebarProps {
  calendars: Calendar[];
  selectedCalendarIds: string[];
  onToggleCalendar: (calendarId: string) => void;
  onCreateCalendar: (name: string, color: CalendarColor) => Promise<void>;
  onShareCalendar?: (calendarId: string) => void;
  onImportExportCalendar?: (calendarId: string) => void;
  onExternalSubscription?: (calendarId: string) => void;
  onDeleteCalendar?: (calendarId: string) => Promise<void> | void;
  isCreating?: boolean;
}

export function CalendarSidebar({
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
  onCreateCalendar,
  onShareCalendar,
  onImportExportCalendar,
  onExternalSubscription,
  onDeleteCalendar,
  isCreating,
}: CalendarSidebarProps): JSX.Element {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState<CalendarColor>('blue');

  // Reset form state when opening the create form
  useEffect(() => {
    if (showCreateForm) {
      setNewCalendarName('');
      setNewCalendarColor('blue');
    }
  }, [showCreateForm]);

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newCalendarName.trim() || isCreating) {
      return;
    }

    try {
      await onCreateCalendar(newCalendarName.trim(), newCalendarColor);
      setNewCalendarName('');
      setShowCreateForm(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Failed to create calendar:', error);
    }
  };

  const colorOptions: CalendarColor[] = [
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
  ];

  return (
    <div className="space-y-4">
      {/* Calendars list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">My Calendars</CardTitle>
            <Button
              className="h-6 w-6"
              size="icon"
              variant="ghost"
              onClick={() => setShowCreateForm(!showCreateForm)}
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
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {/* Create form */}
          {showCreateForm && (
            <form
              key="calendar-create-form"
              className="mb-3 space-y-2 rounded-md border p-2"
              onSubmit={(e) => void handleCreate(e)}
            >
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="newCalName">
                  Name
                </Label>
                <Input
                  className="h-8 text-sm"
                  disabled={isCreating}
                  id="newCalName"
                  placeholder="Calendar name"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`h-5 w-5 rounded-full ${CALENDAR_COLORS[color].bg} ${
                        newCalendarColor === color ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      type="button"
                      onClick={() => setNewCalendarColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  className="h-7 text-xs"
                  disabled={isCreating ?? !newCalendarName.trim()}
                  size="sm"
                  type="submit"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  className="h-7 text-xs"
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setNewCalendarName('');
                    setShowCreateForm(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Calendar list */}
          {calendars.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              No calendars yet. Create one to get started.
            </p>
          ) : (
            calendars.map((calendar) => {
              const isSelected = selectedCalendarIds.includes(calendar.id);
              const colorClasses = CALENDAR_COLORS[calendar.color] ?? CALENDAR_COLORS.blue;

              return (
                <ContextMenu key={calendar.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                        isSelected ? '' : 'opacity-50'
                      }`}
                      onClick={() => onToggleCalendar(calendar.id)}
                    >
                      {/* External sync indicator */}
                      {calendar.externalSyncEnabled && (
                        <div className="relative shrink-0">
                          <div
                            className={`h-3 w-3 rounded-sm ${colorClasses.bg} ${colorClasses.border} border`}
                          />
                          <svg
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 8 8"
                          >
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                        </div>
                      )}
                      {!calendar.externalSyncEnabled && (
                        <div
                          className={`h-3 w-3 shrink-0 rounded-sm ${colorClasses.bg} ${colorClasses.border} border`}
                        />
                      )}
                      <span className="flex-1 truncate">{calendar.name}</span>
                      {isSelected && (
                        <svg
                          className="h-4 w-4 shrink-0 text-primary"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {onExternalSubscription && (
                      <ContextMenuItem
                        onClick={() => {
                          onExternalSubscription(calendar.id);
                        }}
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15,3 21,3 21,9" />
                          <line x1="10" x2="21" y1="14" y2="3" />
                        </svg>
                        External subscription
                      </ContextMenuItem>
                    )}
                    {onImportExportCalendar && (
                      <ContextMenuItem
                        onClick={() => {
                          onImportExportCalendar(calendar.id);
                        }}
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17,8 12,3 7,8" />
                          <line x1="12" x2="12" y1="3" y2="15" />
                        </svg>
                        Import/Export
                      </ContextMenuItem>
                    )}
                    {onShareCalendar && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            onShareCalendar(calendar.id);
                          }}
                        >
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16,6 12,2 8,6" />
                            <line x1="12" x2="12" y1="2" y2="15" />
                          </svg>
                          Share calendar
                        </ContextMenuItem>
                      </>
                    )}
                    {onDeleteCalendar && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={async () => {
                            if (
                              confirm(`Delete calendar "${calendar.name}"? This cannot be undone.`)
                            ) {
                              await onDeleteCalendar(calendar.id);
                            }
                          }}
                        >
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                          Delete calendar
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      {calendars.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Calendars</span>
              <Badge variant="secondary">{calendars.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Showing</span>
              <Badge variant="secondary">
                {selectedCalendarIds.length} of {calendars.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
