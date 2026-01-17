/**
 * Calendar Settings Section - Component for calendar reminder settings
 */

import { useEffect, useState } from 'react';

import { Bell, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import type { ReminderSettingsData } from '@/types/electron';

export function CalendarSettingsSection(): JSX.Element {
  const [settings, setSettings] = useState<ReminderSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await window.electronAPI.calendar.reminderSettings.get();
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reminder settings';
      setError(message);
      console.error('Failed to load reminder settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<ReminderSettingsData>): Promise<void> => {
    if (!settings) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updated = await window.electronAPI.calendar.reminderSettings.update(updates);
      setSettings(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update reminder settings';
      setError(message);
      console.error('Failed to update reminder settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean): void => {
    void updateSettings({
      global: {
        ...settings?.global,
        enabled,
      },
    });
  };

  const handleMinMinutesChange = (value: string): void => {
    const minMinutes = value === '' ? undefined : Math.max(0, parseInt(value, 10));
    if (isNaN(minMinutes ?? 0)) {
      return;
    }
    void updateSettings({
      global: {
        enabled: settings?.global.enabled ?? true,
        ...settings?.global,
        minMinutesBefore: minMinutes,
      },
    });
  };

  const handleMaxRemindersChange = (value: string): void => {
    const maxReminders = value === '' ? undefined : Math.max(1, parseInt(value, 10));
    if (isNaN(maxReminders ?? 0)) {
      return;
    }
    void updateSettings({
      global: {
        enabled: settings?.global.enabled ?? true,
        ...settings?.global,
        maxRemindersPerEvent: maxReminders,
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Calendar Reminder Settings
          </CardTitle>
          <CardDescription>Configure how calendar reminders work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Calendar Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load reminder settings
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Calendar Reminder Settings
        </CardTitle>
        <CardDescription>Configure how calendar reminders work</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Turn calendar event reminders on or off globally
              </p>
            </div>
            <Switch
              checked={settings.global.enabled}
              disabled={isSaving}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {settings.global.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="minMinutes">Minimum Minutes Before Event</Label>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t trigger reminders less than this many minutes before an event
                </p>
                <Input
                  id="minMinutes"
                  min="0"
                  placeholder="0 (no minimum)"
                  type="number"
                  value={settings.global.minMinutesBefore ?? ''}
                  onChange={(e) => handleMinMinutesChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxReminders">Maximum Reminders Per Event</Label>
                <p className="text-sm text-muted-foreground">
                  Limit the number of reminders that can be set for a single event
                </p>
                <Input
                  id="maxReminders"
                  min="1"
                  placeholder="No limit"
                  type="number"
                  value={settings.global.maxRemindersPerEvent ?? ''}
                  onChange={(e) => handleMaxRemindersChange(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving settings...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
