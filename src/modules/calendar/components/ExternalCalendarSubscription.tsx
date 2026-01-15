/**
 * ExternalCalendarSubscription - Subscribe to external iCal URLs
 */

import { useEffect, useState } from 'react';

import { format } from 'date-fns';
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import type { Calendar } from '../types/Calendar.types';

interface ExternalCalendarSubscriptionProps {
  calendar: Calendar | null;
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (calendarId: string, url: string) => Promise<void>;
  onUnsubscribe: (calendarId: string) => Promise<void>;
  onSync: (calendarId: string) => Promise<{ success: boolean; imported: number; errors: string[] }>;
  isLoading?: boolean;
}

export function ExternalCalendarSubscription({
  calendar,
  isOpen,
  onClose,
  onSubscribe,
  onUnsubscribe,
  onSync,
  isLoading,
}: ExternalCalendarSubscriptionProps): JSX.Element {
  const [url, setUrl] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
  } | null>(null);

  // Load current subscription status when dialog opens
  useEffect(() => {
    if (calendar && isOpen) {
      setUrl(calendar.externalSource?.url ?? '');
      setSyncResult(null);
    }
  }, [calendar, isOpen]);

  if (!calendar) {
    return <></>;
  }

  const isSubscribed = calendar.externalSyncEnabled && calendar.externalSource?.type === 'ical_url';

  const handleSubscribe = async (): Promise<void> => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setSyncResult({
        success: false,
        imported: 0,
        errors: ['Please enter a URL'],
      });
      return;
    }

    // Validate URL - check for valid format and protocol
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(trimmedUrl);
      // Ensure it's http or https
      if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
        setSyncResult({
          success: false,
          imported: 0,
          errors: ['URL must use http:// or https:// protocol'],
        });
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid URL format';
      setSyncResult({
        success: false,
        imported: 0,
        errors: [`Please enter a valid URL: ${errorMessage}`],
      });
      return;
    }

    setIsSubscribing(true);
    setSyncResult(null);

    try {
      await onSubscribe(calendar.id, validatedUrl.href);
      setUrl('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to subscribe';
      setSyncResult({
        success: false,
        imported: 0,
        errors: [message],
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribe = async (): Promise<void> => {
    setIsUnsubscribing(true);
    setSyncResult(null);

    try {
      await onUnsubscribe(calendar.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setSyncResult({
        success: false,
        imported: 0,
        errors: [message],
      });
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const handleSync = async (): Promise<void> => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await onSync(calendar.id);
      setSyncResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync';
      setSyncResult({
        success: false,
        imported: 0,
        errors: [message],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp?: number): string => {
    if (!timestamp) {
      return 'Never';
    }
    const date = new Date(timestamp);
    return format(date, 'PPp'); // e.g., "Jan 15, 2024, 3:30 PM"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>External Calendar Subscription</DialogTitle>
          <DialogDescription>
            Subscribe to an external iCal URL to automatically sync events. The calendar will sync
            every 24 hours and when the app opens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Subscription Status */}
          {isSubscribed && calendar.externalSource?.url && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Subscribed</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Events sync automatically every 24 hours
                  </p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">iCal URL</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      readOnly
                      className="font-mono text-xs"
                      value={calendar.externalSource.url}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        window.open(calendar.externalSource?.url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last sync:</span>
                  <span className="font-medium">{formatLastSync(calendar.lastSyncAt)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isSyncing || isLoading}
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
                <Button
                  className="flex-1"
                  disabled={isUnsubscribing || isLoading}
                  size="sm"
                  variant="destructive"
                  onClick={handleUnsubscribe}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Unsubscribe
                </Button>
              </div>
            </div>
          )}

          {/* Subscribe Form */}
          {!isSubscribed && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ical-url">iCal URL</Label>
                <Input
                  disabled={isSubscribing || isLoading}
                  id="ical-url"
                  placeholder="https://page.com/calendar.ics"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim()) {
                      void handleSubscribe();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a public iCal URL. The calendar will sync automatically every 24 hours.
                </p>
              </div>

              <Button
                className="w-full"
                disabled={!url.trim() || isSubscribing || isLoading}
                onClick={handleSubscribe}
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </div>
          )}

          {/* Sync Results */}
          {syncResult && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <h4 className="text-sm font-medium">Sync Results</h4>
                </div>

                {syncResult.success && syncResult.imported > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-green-50 p-2 dark:bg-green-950">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Imported {syncResult.imported} event{syncResult.imported !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {syncResult.errors.length > 0 && (
                  <div className="space-y-1 rounded-md bg-red-50 p-2 dark:bg-red-950">
                    {syncResult.errors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                        <span className="text-red-700 dark:text-red-300">{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
