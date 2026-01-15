/**
 * Calendar Module - Main entry point
 */

import { useState } from 'react';

import { Calendar } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useFamily } from '@/modules/family/hooks/useFamily';
import { useFamilyStore } from '@/modules/family/stores/family.store';
import { ErrorBanner } from '@/shared/components';

import {
  AgendaView,
  CalendarHeader,
  CalendarSidebar,
  DayEventsDialog,
  DayView,
  EventEditor,
  ExternalCalendarSubscription,
  ICalImportExport,
  MonthView,
  ShareDialog,
  WeekView,
} from './components';
import { useCalendar } from './hooks/useCalendar';
import { useCalendarStore } from './stores';

import type { EventFormData } from './components/EventEditor';
import type { ExpandedEvent, CalendarColor, CalendarView } from './types/Calendar.types';

function CalendarPage(): JSX.Element {
  // Local state for dialogs
  const [dayEventsDialogOpen, setDayEventsDialogOpen] = useState(false);
  const [dayEventsDialogDate, setDayEventsDialogDate] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if we're on desktop
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Get family data for sharing
  const { devices, currentDevice } = useFamily();
  const getDevicePermission = useFamilyStore((state) => state.getDevicePermission);

  const {
    calendars,
    expandedEvents,
    currentView,
    currentDate,
    selectedDate,
    selectedCalendarIds,
    isLoadingCalendars,
    isLoadingEvents,
    isSaving,
    error,
    isEditorOpen,
    editingEvent,
    editingDate,
    editingEndDate,
    isShareDialogOpen,
    sharingCalendar,
    isICalDialogOpen,
    icalCalendar,
    isExternalSubscriptionDialogOpen,
    externalSubscriptionCalendar,
    createCalendar,
    toggleCalendarVisibility,
    deleteCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    setView,
    setCurrentDate,
    setSelectedDate,
    navigateToday,
    navigatePrev,
    navigateNext,
    openEventEditor,
    closeEventEditor,
    openShareDialog,
    closeShareDialog,
    openICalDialog,
    closeICalDialog,
    openExternalSubscriptionDialog,
    closeExternalSubscriptionDialog,
    subscribeExternalCalendar,
    unsubscribeExternalCalendar,
    syncExternalCalendar,
    getCalendarById,
    clearError,
    importICal,
    exportICal,
    shareCalendar,
    updateCalendarShare,
    unshareCalendar,
  } = useCalendar();

  const setSelectedCalendarIds = useCalendarStore((state) => state.setSelectedCalendarIds);

  // Map devices to the format expected by ShareDialog
  const familyMembers = devices.map((device) => {
    const permission = getDevicePermission(device.id);
    return {
      id: device.id,
      name: device.name,
      role: permission?.role ?? 'member',
    };
  });

  const currentUserId = currentDevice?.id ?? '';

  const handleEventClick = (event: ExpandedEvent): void => {
    // Get the master event for editing (not the instance)
    const masterEvent = event.masterEventId
      ? getCalendarById(event.calendarId) // This needs fixing - should get event
      : event;
    openEventEditor(masterEvent as unknown as Parameters<typeof openEventEditor>[0], null);
  };

  const handleCreateCalendar = async (name: string, color: CalendarColor): Promise<void> => {
    await createCalendar({
      name,
      color,
      visibility: 'family',
    });
  };

  const handleSaveEvent = async (data: EventFormData): Promise<void> => {
    if (data.id) {
      await updateEvent({
        id: data.id,
        updateScope: undefined,
        title: data.title,
        description: data.description,
        location: data.location,
        start: data.start,
        end: data.end,
        allDay: data.allDay,
        timezone: undefined,
        recurrence: data.recurrence,
        category: data.category,
        color: data.color,
        reminders: data.reminders,
        attendees: undefined,
      });
    } else {
      await createEvent({
        calendarId: data.calendarId,
        title: data.title,
        description: data.description,
        location: data.location,
        start: data.start,
        end: data.end,
        allDay: data.allDay,
        timezone: undefined,
        recurrence: data.recurrence,
        category: data.category,
        color: data.color,
        reminders: data.reminders,
        attendees: undefined,
      });
    }
  };

  const handleDeleteEvent = async (eventId: string): Promise<void> => {
    await deleteEvent(eventId);
    closeEventEditor();
  };

  const handleTimeSlotClick = (timestamp: number): void => {
    openEventEditor(null, timestamp);
  };

  const handleShareCalendar = (calendarId: string): void => {
    const calendar = getCalendarById(calendarId);
    if (calendar) {
      openShareDialog(calendar);
    }
  };

  const handleImportExportCalendar = (calendarId: string): void => {
    const calendar = getCalendarById(calendarId);
    if (calendar) {
      openICalDialog(calendar);
    }
  };

  const handleDeleteCalendar = async (calendarId: string): Promise<void> => {
    await deleteCalendar(calendarId);

    if (selectedCalendarIds.includes(calendarId)) {
      const remaining = selectedCalendarIds.filter((id) => id !== calendarId);
      const fallback = calendars.find((cal) => cal.id !== calendarId);

      if (remaining.length > 0) {
        setSelectedCalendarIds(remaining);
      } else if (fallback) {
        setSelectedCalendarIds([fallback.id]);
      } else {
        setSelectedCalendarIds([]);
      }
    }
  };

  const handleExternalSubscription = (calendarId: string): void => {
    const calendar = getCalendarById(calendarId);
    if (calendar) {
      openExternalSubscriptionDialog(calendar);
    }
  };

  // Handle closing any open dialog
  const handleCloseDialog = (): void => {
    if (isEditorOpen) {
      closeEventEditor();
    } else if (isShareDialogOpen) {
      closeShareDialog();
    } else if (isICalDialogOpen) {
      closeICalDialog();
    } else if (isExternalSubscriptionDialogOpen) {
      closeExternalSubscriptionDialog();
    }
  };

  // Handle saving dialog (Enter key)
  const handleSaveDialog = (): void => {
    // This will be handled by individual dialog components
    // The EventEditor handles its own Enter key for submission
  };

  // Handle toggle state (Spacebar) - toggle calendar visibility
  const handleToggleState = (): void => {
    // Could be used for toggling calendar visibility or other state
    // For now, we'll skip this as it requires a selected calendar
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onViewChange: (view: 'month' | 'week' | 'day' | 'agenda' | 'list' | 'board') => {
      if (['month', 'week', 'day', 'agenda'].includes(view)) {
        setView(view as CalendarView);
      }
    },
    onNewEvent: () => {
      openEventEditor(null, selectedDate ?? currentDate);
    },
    onNavigatePrev: navigatePrev,
    onNavigateNext: navigateNext,
    onCloseDialog: handleCloseDialog,
    onSaveDialog: handleSaveDialog,
    onToggleState: handleToggleState,
  });

  // Render the current view
  const renderView = (): JSX.Element => {
    switch (currentView) {
      case 'day':
        return (
          <DayView
            calendars={calendars}
            currentDate={currentDate}
            events={expandedEvents}
            selectedCalendarIds={selectedCalendarIds}
            onAddEvent={(timestamp: number) => {
              openEventEditor(null, timestamp);
            }}
            onDeleteEvent={async (event: ExpandedEvent) => {
              await handleDeleteEvent(event.id);
            }}
            onEditEvent={(event: ExpandedEvent) => {
              openEventEditor(event, null);
            }}
            onEventClick={handleEventClick}
            onTimeRangeSelect={(start: number, end: number) => {
              // Create event with the selected time range
              openEventEditor(null, start, end);
            }}
            onTimeSlotClick={handleTimeSlotClick}
          />
        );
      case 'week':
        return (
          <WeekView
            calendars={calendars}
            currentDate={currentDate}
            events={expandedEvents}
            selectedCalendarIds={selectedCalendarIds}
            selectedDate={selectedDate}
            onAddEvent={(timestamp: number) => {
              openEventEditor(null, timestamp);
            }}
            onDateClick={(date: number) => {
              setSelectedDate(date);
              setView('day');
              setCurrentDate(date);
            }}
            onDeleteEvent={async (event: ExpandedEvent) => {
              await handleDeleteEvent(event.id);
            }}
            onEditEvent={(event: ExpandedEvent) => {
              openEventEditor(event, null);
            }}
            onEventClick={handleEventClick}
            onTimeRangeSelect={(start: number, end: number) => {
              openEventEditor(null, start, end);
            }}
            onTimeSlotClick={(timestamp: number) => {
              openEventEditor(null, timestamp);
            }}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            calendars={calendars}
            events={expandedEvents}
            selectedCalendarIds={selectedCalendarIds}
            onEventClick={handleEventClick}
          />
        );
      case 'month':
      default:
        return (
          <MonthView
            calendars={calendars}
            currentDate={currentDate}
            events={expandedEvents}
            selectedCalendarIds={selectedCalendarIds}
            selectedDate={selectedDate}
            onAddEvent={(date: number) => {
              openEventEditor(null, date);
            }}
            onDateClick={(date: number) => {
              setSelectedDate(date);
              setView('day');
              setCurrentDate(date);
            }}
            onDeleteEvent={async (event: ExpandedEvent) => {
              await handleDeleteEvent(event.id);
            }}
            onEditEvent={(event: ExpandedEvent) => {
              openEventEditor(event, null);
            }}
            onEventClick={handleEventClick}
            onShowAllEvents={(date: number) => {
              setDayEventsDialogDate(date);
              setDayEventsDialogOpen(true);
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-4">
      {/* Error display */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        currentView={currentView}
        isLoading={isLoadingCalendars || isLoadingEvents}
        onDateSelect={(date: number) => {
          setCurrentDate(date);
        }}
        onNavigateNext={navigateNext}
        onNavigatePrev={navigatePrev}
        onNavigateToday={navigateToday}
        onNewEvent={() => openEventEditor(null, selectedDate ?? currentDate)}
        onViewChange={setView}
      />

      {/* Mobile calendar sidebar button */}
      {!isDesktop && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button className="w-full" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              My Calendars
              {selectedCalendarIds.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {selectedCalendarIds.length} selected
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[320px] overflow-y-auto" side="left">
            <SheetHeader>
              <SheetTitle>Calendars</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <CalendarSidebar
                calendars={calendars}
                isCreating={isSaving}
                selectedCalendarIds={selectedCalendarIds}
                onCreateCalendar={handleCreateCalendar}
                onDeleteCalendar={handleDeleteCalendar}
                onExternalSubscription={handleExternalSubscription}
                onImportExportCalendar={handleImportExportCalendar}
                onShareCalendar={handleShareCalendar}
                onToggleCalendar={(calendarId: string) => {
                  toggleCalendarVisibility(calendarId);
                  // Keep drawer open when toggling calendars
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Desktop sidebar */}
        {isDesktop && (
          <div className="w-64 shrink-0">
            <CalendarSidebar
              calendars={calendars}
              isCreating={isSaving}
              selectedCalendarIds={selectedCalendarIds}
              onCreateCalendar={handleCreateCalendar}
              onDeleteCalendar={handleDeleteCalendar}
              onExternalSubscription={handleExternalSubscription}
              onImportExportCalendar={handleImportExportCalendar}
              onShareCalendar={handleShareCalendar}
              onToggleCalendar={toggleCalendarVisibility}
            />
          </div>
        )}

        {/* Calendar view */}
        <div className="min-h-0 flex-1">{renderView()}</div>
      </div>

      {/* Event editor modal */}
      {isEditorOpen && (
        <EventEditor
          calendars={calendars}
          defaultCalendarId={undefined}
          defaultDate={editingDate}
          defaultEndDate={editingEndDate}
          event={editingEvent}
          isSaving={isSaving}
          onClose={closeEventEditor}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
          onSave={handleSaveEvent}
        />
      )}

      {/* Share dialog */}
      <ShareDialog
        calendar={sharingCalendar}
        currentUserId={currentUserId}
        familyMembers={familyMembers}
        isLoading={isSaving}
        isOpen={isShareDialogOpen}
        onClose={closeShareDialog}
        onShare={shareCalendar}
        onUnshare={unshareCalendar}
        onUpdateShare={updateCalendarShare}
      />

      {/* Import/Export dialog */}
      <ICalImportExport
        calendar={icalCalendar}
        isLoading={isSaving}
        isOpen={isICalDialogOpen}
        onClose={closeICalDialog}
        onExport={exportICal}
        onImport={importICal}
      />

      {/* External subscription dialog */}
      <ExternalCalendarSubscription
        calendar={externalSubscriptionCalendar}
        isLoading={isSaving}
        isOpen={isExternalSubscriptionDialogOpen}
        onClose={closeExternalSubscriptionDialog}
        onSubscribe={async (calendarId: string, url: string) => {
          await subscribeExternalCalendar(calendarId, url);
        }}
        onSync={async (calendarId: string) => {
          return await syncExternalCalendar(calendarId);
        }}
        onUnsubscribe={async (calendarId: string) => {
          await unsubscribeExternalCalendar(calendarId);
        }}
      />

      {/* Day events dialog */}
      {dayEventsDialogDate !== null && (
        <DayEventsDialog
          calendars={calendars}
          date={dayEventsDialogDate}
          events={expandedEvents}
          isOpen={dayEventsDialogOpen}
          onAddEvent={(date: number) => {
            openEventEditor(null, date);
          }}
          onClose={() => {
            setDayEventsDialogOpen(false);
            setDayEventsDialogDate(null);
          }}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  );
}

export default function CalendarModule(): JSX.Element {
  return (
    <Routes>
      <Route index element={<CalendarPage />} />
    </Routes>
  );
}

// Re-export types and hooks for external use
export * from './types';
export * from './hooks';
export * from './stores';
