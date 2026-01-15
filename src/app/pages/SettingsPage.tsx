import { useState } from 'react';

import { BookOpen, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailSettingsSection } from '@/modules/email/components/settings';
import { BRAND } from '@/shared/brand';
import { useSettingsStore } from '@/stores/settings.store';

import type { ThemeMode, DateFormat, TimeFormat, WeekStartDay } from '@/stores/settings.store';

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

  const [displayName, setDisplayName] = useState(user.displayName);

  const handleSaveUserSettings = (): void => {
    updateUserSettings({ displayName });
  };

  const handleResetSettings = (): void => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setDisplayName('');
    }
  };

  return (
    <div className="space-y-6 h-full p-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your {BRAND.name} preferences</p>
      </div>

      <Separator />

      <Tabs className="space-y-6" defaultValue="general">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent className="space-y-6" value="general">
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

          <Card>
            <CardHeader>
              <CardTitle>App Tour</CardTitle>
              <CardDescription>Learn about {BRAND.name}&apos;s features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {tutorial.hasSeenTutorial
                  ? 'You\'ve completed the tutorial. Want to see it again?'
                  : 'Take a guided tour of all the features.'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  resetTutorial();
                  startTutorial();
                }}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {tutorial.hasSeenTutorial ? 'Restart Tutorial' : 'Start Tutorial'}
              </Button>
            </CardContent>
          </Card>

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
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent className="space-y-6" value="appearance">
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
                  onValueChange={(value: ThemeMode) =>
                    updateAppearanceSettings({ theme: value })
                  }
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
                  onCheckedChange={(checked: boolean) =>
                    updateAppearanceSettings({ reducedMotion: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use more compact layout
                  </p>
                </div>
                <Switch
                  checked={appearance.compactMode}
                  onCheckedChange={(checked: boolean) =>
                    updateAppearanceSettings({ compactMode: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Settings */}
        <TabsContent className="space-y-6" value="regional">
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
                  onValueChange={(value: DateFormat) =>
                    updateRegionalSettings({ dateFormat: value })
                  }
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
                  onValueChange={(value: TimeFormat) =>
                    updateRegionalSettings({ timeFormat: value })
                  }
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
                  onValueChange={(value: WeekStartDay) =>
                    updateRegionalSettings({ weekStartDay: value })
                  }
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
                  onValueChange={(value) => updateRegionalSettings({ timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Intl.supportedValuesOf('timeZone').slice(0, 10).map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent className="space-y-6" value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent className="space-y-6" value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Preferences
              </CardTitle>
              <CardDescription>Configure email notifications and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about important emails
                  </p>
                </div>
                <Switch
                  checked={notifications.emailReminders}
                  onCheckedChange={(checked: boolean) =>
                    updateNotificationSettings({ emailReminders: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Account Settings */}
          <EmailSettingsSection />
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent className="space-y-6" value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy and data sharing preferences</CardDescription>
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
                  onCheckedChange={(checked: boolean) =>
                    updatePrivacySettings({ analyticsEnabled: checked })
                  }
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
                  onCheckedChange={(checked: boolean) =>
                    updatePrivacySettings({ crashReportsEnabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
