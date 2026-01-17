import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { Bell, BookOpen, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trackModuleAction } from '@/hooks/useAnalytics';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
// Email Settings hidden for current build
// import { EmailSettingsSection } from '@/modules/email/components/settings/EmailSettingsSection';
import { SyncSettingsSection } from '@/modules/sync/components/SyncSettingsSection';
import { BRAND } from '@/shared/brand';
import { useSettingsStore } from '@/stores/settings.store';

import type { DateFormat, TimeFormat, ThemeMode, WeekStartDay } from '@/stores/settings.store';
import type { ReminderSettingsData } from '@/types/electron';

/**
 * Calendar Reminder Settings Component - Integrated into Notifications
 */
function CalendarReminderSettings(): JSX.Element {
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
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
        Failed to load calendar reminder settings
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Calendar Reminders</Label>
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
          <Separator />
          <div className="space-y-4">
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
          </div>
        </>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving settings...
        </div>
      )}
    </div>
  );
}

export default function SettingsPage(): JSX.Element {
  const {
    user,
    appearance,
    regional,
    notifications,
    privacy,
    tutorial,
    updateUserSettings,
    updateAppearanceSettings,
    updateRegionalSettings,
    updateNotificationSettings,
    updatePrivacySettings,
    resetSettings,
    startTutorial,
    resetTutorial,
  } = useSettingsStore();

  const shouldReduceMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [displayName, setDisplayName] = useState(user.displayName);

  // Sync displayName when user settings change (e.g., after reset)
  useEffect(() => {
    setDisplayName(user.displayName);
  }, [user.displayName]);

  const handleSaveUserSettings = (): void => {
    trackModuleAction('settings', 'user_settings_updated', { hasDisplayName: !!displayName });
    updateUserSettings({ displayName });
  };

  const handleResetSettings = (): void => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setDisplayName('');
    }
  };

  const pageVariants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? {} : { opacity: 0, y: -10 },
  };

  const cardVariants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  };

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <motion.div
        animate="animate"
        className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-4 pb-8 md:space-y-6"
        exit="exit"
        initial="initial"
        transition={transition}
        variants={pageVariants}
      >
        <motion.div
          animate="animate"
          initial="initial"
          transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.05 }}
          variants={cardVariants}
        >
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your {BRAND.name} preferences</p>
        </motion.div>

        <Separator />

        <Tabs
          className="flex min-h-0 flex-1 flex-col space-y-4 md:space-y-6"
          defaultValue="general"
        >
          <div className="overflow-x-auto">
            <TabsList
              className={`grid w-full ${
                isMobile
                  ? 'grid-cols-3 grid-rows-3 gap-1 md:grid-cols-6 md:grid-rows-1'
                  : 'grid-cols-6'
              }`}
            >
              <TabsTrigger className="text-xs md:text-sm" value="general">
                General
              </TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="appearance">
                Appearance
              </TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="regional">
                Regional
              </TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="notifications">
                Notifications
              </TabsTrigger>
              {/* Calendar tab removed - settings integrated into Notifications */}
              <TabsTrigger className="text-xs md:text-sm" value="sync">
                Sync
              </TabsTrigger>
              <TabsTrigger className="text-xs md:text-sm" value="privacy">
                Privacy
              </TabsTrigger>
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent className="min-h-0 flex-1 space-y-4 md:space-y-6" value="general">
            <motion.div
              animate="animate"
              initial="initial"
              transition={transition}
              variants={{
                initial: shouldReduceMotion ? {} : { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
              }}
            >
              <div className="space-y-4 md:space-y-6">
                <motion.div
                  animate="animate"
                  initial="initial"
                  transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.05 }}
                  variants={cardVariants}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>User Profile</CardTitle>
                      <CardDescription>Manage your personal information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          placeholder="Enter your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSaveUserSettings}>Save Profile</Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  animate="animate"
                  initial="initial"
                  transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.1 }}
                  variants={cardVariants}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>App Tour</CardTitle>
                      <CardDescription>Learn about {BRAND.name}&apos;s features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {tutorial.hasSeenTutorial
                          ? "You've completed the tutorial. Want to see it again?"
                          : 'Take a guided tour of all the features.'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetTutorial();
                          startTutorial();
                        }}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        {tutorial.hasSeenTutorial ? 'Restart Tutorial' : 'Start Tutorial'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  animate="animate"
                  initial="initial"
                  transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.15 }}
                  variants={cardVariants}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Reset Settings</CardTitle>
                      <CardDescription>Reset all settings to their default values</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="destructive" onClick={handleResetSettings}>
                        Reset All Settings
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent className="min-h-0 flex-1 space-y-4 md:space-y-6" value="appearance">
            <motion.div
              animate="animate"
              initial="initial"
              transition={transition}
              variants={{
                initial: shouldReduceMotion ? {} : { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
              }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Customize the appearance of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Theme Mode</Label>
                    <Select
                      value={appearance.theme}
                      onValueChange={(value: ThemeMode) => {
                        trackModuleAction('settings', 'appearance_changed', { theme: value });
                        updateAppearanceSettings({ theme: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reduced Motion</Label>
                      <p className="text-sm text-muted-foreground">
                        Reduce animations and transitions
                      </p>
                    </div>
                    <Switch
                      checked={appearance.reducedMotion}
                      onCheckedChange={(checked: boolean) => {
                        trackModuleAction('settings', 'appearance_changed', {
                          reducedMotion: checked,
                        });
                        updateAppearanceSettings({ reducedMotion: checked });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Use more compact layout</p>
                    </div>
                    <Switch
                      checked={appearance.compactMode}
                      onCheckedChange={(checked: boolean) => {
                        trackModuleAction('settings', 'appearance_changed', {
                          compactMode: checked,
                        });
                        updateAppearanceSettings({ compactMode: checked });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Regional Settings */}
          <TabsContent className="min-h-0 flex-1 space-y-4 md:space-y-6" value="regional">
            <motion.div
              animate="animate"
              initial="initial"
              transition={transition}
              variants={{
                initial: shouldReduceMotion ? {} : { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
              }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Regional Preferences</CardTitle>
                  <CardDescription>Configure date, time, and regional settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={regional.dateFormat}
                      onValueChange={(value: DateFormat) => {
                        trackModuleAction('settings', 'regional_changed', { dateFormat: value });
                        updateRegionalSettings({ dateFormat: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Format</Label>
                    <Select
                      value={regional.timeFormat}
                      onValueChange={(value: TimeFormat) => {
                        trackModuleAction('settings', 'regional_changed', { timeFormat: value });
                        updateRegionalSettings({ timeFormat: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Week Starts On</Label>
                    <Select
                      value={regional.weekStartDay}
                      onValueChange={(value: WeekStartDay) => {
                        trackModuleAction('settings', 'regional_changed', { weekStartDay: value });
                        updateRegionalSettings({ weekStartDay: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={regional.timezone}
                      onValueChange={(value) => {
                        trackModuleAction('settings', 'regional_changed', { timezone: value });
                        updateRegionalSettings({ timezone: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Intl.supportedValuesOf('timeZone').map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notification Settings - Now includes Calendar Reminder Settings */}
          <TabsContent className="min-h-0 flex-1 space-y-4 md:space-y-6" value="notifications">
            <motion.div
              animate="animate"
              initial="initial"
              transition={transition}
              variants={{
                initial: shouldReduceMotion ? {} : { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
              }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Manage how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* General Notification Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Turn notifications on or off
                        </p>
                      </div>
                      <Switch
                        checked={notifications.enabled}
                        onCheckedChange={(checked: boolean) =>
                          updateNotificationSettings({ enabled: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sound Effects</Label>
                        <p className="text-sm text-muted-foreground">
                          Play sound for notifications
                        </p>
                      </div>
                      <Switch
                        checked={notifications.soundEnabled}
                        onCheckedChange={(checked: boolean) =>
                          updateNotificationSettings({ soundEnabled: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Task Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminded about upcoming tasks
                        </p>
                      </div>
                      <Switch
                        checked={notifications.taskReminders}
                        onCheckedChange={(checked: boolean) =>
                          updateNotificationSettings({ taskReminders: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Calendar Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminded about calendar events
                        </p>
                      </div>
                      <Switch
                        checked={notifications.calendarReminders}
                        onCheckedChange={(checked: boolean) =>
                          updateNotificationSettings({ calendarReminders: checked })
                        }
                      />
                    </div>
                  </div>

                  {/* Calendar Reminder Advanced Settings */}
                  <Separator />
                  <div>
                    <h3 className="mb-4 text-sm font-semibold">Calendar Reminder Settings</h3>
                    <CalendarReminderSettings />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Sync Settings */}
          <TabsContent className="min-h-0 flex-1 space-y-4 md:space-y-6" value="sync">
            <motion.div
              animate="animate"
              initial="initial"
              transition={transition}
              variants={{
                initial: shouldReduceMotion ? {} : { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
              }}
            >
              <SyncSettingsSection />
            </motion.div>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent className="min-h-0 flex-1 space-y-4 md:space-y-6" value="privacy">
            <motion.div
              animate="animate"
              initial="initial"
              transition={transition}
              variants={{
                initial: shouldReduceMotion ? {} : { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
              }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Help improve {BRAND.name} with anonymous usage data
                      </p>
                    </div>
                    <Switch
                      checked={privacy.analyticsEnabled}
                      onCheckedChange={(checked: boolean) => {
                        trackModuleAction('settings', 'privacy_changed', {
                          analyticsEnabled: checked,
                        });
                        updatePrivacySettings({ analyticsEnabled: checked });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Crash Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically send crash reports to help fix bugs
                      </p>
                    </div>
                    <Switch
                      checked={privacy.crashReportsEnabled}
                      onCheckedChange={(checked: boolean) => {
                        trackModuleAction('settings', 'privacy_changed', {
                          crashReportsEnabled: checked,
                        });
                        updatePrivacySettings({ crashReportsEnabled: checked });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
