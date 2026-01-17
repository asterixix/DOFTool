/**
 * EventPreview - Detailed event preview dialog with map integration and meeting links
 */

import { useState, useEffect } from 'react';

import { format } from 'date-fns';
import {
  Clock,
  MapPin,
  Repeat,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Video,
  Map,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import {
  CALENDAR_COLORS,
  EVENT_CATEGORY_ICONS,
  ATTENDEE_RESPONSE_LABELS,
  type ExpandedEvent,
  type Calendar as CalendarType,
} from '../types/Calendar.types';
import {
  geocodeAddress,
  getOpenStreetMapEmbedUrl,
  getOpenStreetMapViewUrl,
} from '../utils/locationGeocoding';
import { detectMeetingLink, isLikelyAddress } from '../utils/meetingLinks';
import {
  getSystemTimezone,
  getTimezoneDisplayName,
  getTimezoneShortName,
  parseTimestampInTimezone,
  formatInTimezone,
} from '../utils/timezoneHelpers';

interface EventPreviewProps {
  event: ExpandedEvent;
  calendar: CalendarType | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

export function EventPreview({
  event,
  calendar,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: EventPreviewProps): JSX.Element {
  const [geocodeResult, setGeocodeResult] =
    useState<Awaited<ReturnType<typeof geocodeAddress>>>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [copied, setCopied] = useState(false);

  const color = event.color ?? calendar?.color ?? 'blue';
  const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
  const categoryIcon = event.category ? EVENT_CATEGORY_ICONS[event.category] : '📅';
  const meetingLink = detectMeetingLink(event.location);
  const hasAddress = event.location && isLikelyAddress(event.location) && !meetingLink;

  // Geocode address when location changes
  useEffect(() => {
    if (hasAddress && event.location) {
      setIsGeocoding(true);
      geocodeAddress(event.location)
        .then((result) => {
          setGeocodeResult(result);
        })
        .catch((error) => {
          console.error('Geocoding error:', error);
          setGeocodeResult(null);
        })
        .finally(() => {
          setIsGeocoding(false);
        });
    } else {
      setGeocodeResult(null);
    }
  }, [hasAddress, event.location]);

  const handleOpenMeeting = async (): Promise<void> => {
    if (!meetingLink) {
      return;
    }

    if (window.electronAPI?.openExternal) {
      const result = await window.electronAPI.openExternal(meetingLink.url);
      if (!result.success) {
        console.error('Failed to open meeting link:', result.error);
        // Fallback to window.open if IPC fails
        window.open(meetingLink.url, '_blank');
      }
    } else {
      // Fallback for non-Electron environment
      window.open(meetingLink.url, '_blank');
    }
  };

  const handleOpenMap = async (): Promise<void> => {
    if (!geocodeResult) {
      return;
    }

    const mapUrl = getOpenStreetMapViewUrl(geocodeResult.lat, geocodeResult.lon);

    if (window.electronAPI?.openExternal) {
      const result = await window.electronAPI.openExternal(mapUrl);
      if (!result.success) {
        console.error('Failed to open map:', result.error);
        window.open(mapUrl, '_blank');
      }
    } else {
      window.open(mapUrl, '_blank');
    }
  };

  const handleCopyEventDetails = async (): Promise<void> => {
    const details = [
      `Title: ${event.title}`,
      event.allDay
        ? `Date: ${format(new Date(event.start), 'EEEE, MMMM d, yyyy')}`
        : `Date: ${format(new Date(event.start), 'EEEE, MMMM d, yyyy')}`,
      !event.allDay &&
        `Time: ${format(new Date(event.start), 'h:mm a')} - ${format(new Date(event.end), 'h:mm a')}`,
      event.location && `Location: ${event.location}`,
      event.description && `Description: ${event.description}`,
      calendar && `Calendar: ${calendar.name}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy event details:', error);
    }
  };

  // Format times with timezone support
  const eventTimezone = event.timezone ?? calendar?.timezone ?? getSystemTimezone();
  const systemTimezone = getSystemTimezone();
  const showTimezone = !event.allDay && eventTimezone && eventTimezone !== systemTimezone;

  const formatEventTime = (timestamp: number): string => {
    if (event.allDay || !eventTimezone) {
      return format(new Date(timestamp), 'h:mm a');
    }
    try {
      return formatInTimezone(timestamp, 'h:mm a', eventTimezone);
    } catch {
      return format(new Date(timestamp), 'h:mm a');
    }
  };

  const formatEventDate = (timestamp: number): string => {
    if (eventTimezone) {
      try {
        const parsed = parseTimestampInTimezone(timestamp, eventTimezone);
        const date = new Date(parsed.date + 'T00:00:00');
        return format(date, 'EEEE, MMMM d, yyyy');
      } catch {
        return format(new Date(timestamp), 'EEEE, MMMM d, yyyy');
      }
    }
    return format(new Date(timestamp), 'EEEE, MMMM d, yyyy');
  };

  const duration = event.allDay
    ? 'All day'
    : `${formatEventTime(event.start)} - ${formatEventTime(event.end)}${showTimezone ? ` ${getTimezoneShortName(eventTimezone)}` : ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn('mt-1 h-4 w-4 shrink-0 rounded-full', colorClasses.bg)} />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl leading-tight">{event.title}</DialogTitle>
              {calendar && <DialogDescription className="mt-1">{calendar.name}</DialogDescription>}
            </div>
            {event.category && (
              <span aria-label={event.category} className="shrink-0 text-2xl">
                {categoryIcon}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time */}
          <div className="flex items-start gap-3 text-sm">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <div className="font-medium text-foreground">{formatEventDate(event.start)}</div>
              <div className="text-muted-foreground">{duration}</div>
              {!event.allDay && formatEventDate(event.start) !== formatEventDate(event.end) && (
                <div className="text-muted-foreground">Ends: {formatEventDate(event.end)}</div>
              )}
              {showTimezone && (
                <div className="text-xs text-muted-foreground">
                  Time zone: {getTimezoneDisplayName(eventTimezone)}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location with meeting link or map */}
          {event.location && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground">{event.location}</div>
                </div>
              </div>

              {/* Meeting link button */}
              {meetingLink && (
                <div className="ml-7">
                  <Button
                    className="w-full sm:w-auto"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenMeeting}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Join {meetingLink.displayName}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Map integration for addresses */}
              {hasAddress && (
                <div className="ml-7 space-y-2">
                  {isGeocoding ? (
                    <div className="text-xs text-muted-foreground">Loading map...</div>
                  ) : geocodeResult ? (
                    <>
                      <iframe
                        className="h-64 w-full rounded-md border"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={getOpenStreetMapEmbedUrl(geocodeResult.lat, geocodeResult.lon)}
                        title="Location map"
                      />
                      <Button
                        className="w-full sm:w-auto"
                        size="sm"
                        variant="outline"
                        onClick={handleOpenMap}
                      >
                        <Map className="mr-2 h-4 w-4" />
                        Open in OpenStreetMap
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                      {geocodeResult.displayName !== event.location && (
                        <div className="text-xs text-muted-foreground">
                          {geocodeResult.displayName}
                        </div>
                      )}
                    </>
                  ) : (
                    <Button
                      className="w-full sm:w-auto"
                      size="sm"
                      variant="outline"
                      onClick={handleOpenMap}
                    >
                      <Map className="mr-2 h-4 w-4" />
                      View on map
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Generic location link (if it's a URL but not a detected meeting link) */}
              {!meetingLink &&
                !hasAddress &&
                event.location &&
                (event.location.startsWith('http://') || event.location.startsWith('https://')) && (
                  <div className="ml-7">
                    <Button
                      className="w-full sm:w-auto"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (window.electronAPI?.openExternal) {
                          const result = await window.electronAPI.openExternal(
                            event.location ?? ''
                          );
                          if (!result.success) {
                            window.open(event.location, '_blank');
                          }
                        } else {
                          window.open(event.location, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open link
                    </Button>
                  </div>
                )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Description</div>
                <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {event.description}
                </div>
              </div>
            </>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Users className="h-4 w-4" />
                  <span>Attendees</span>
                </div>
                <div className="space-y-1">
                  {event.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-foreground">{attendee.name}</span>
                        {attendee.email && (
                          <span className="ml-2 text-muted-foreground">({attendee.email})</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ATTENDEE_RESPONSE_LABELS[attendee.responseStatus]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recurrence indicator */}
          {event.isRecurrenceInstance && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Repeat className="h-4 w-4 shrink-0" />
                <span>Recurring event</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyEventDetails}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? 'Copied!' : 'Copy Details'}
            </Button>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button size="sm" variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
