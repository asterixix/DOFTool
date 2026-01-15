/**
 * EmailPreferencesPanel Component
 * Settings panel for customizing email display, compose, and security preferences
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { useEmailPreferencesStore } from '../../stores/emailPreferences.store';

import type {
  MessageListDensity,
  PreviewPanePosition,
  DateFormat,
  ThreadDisplayMode,
  ComposeWindowMode,
  DefaultReplyBehavior,
  ExternalContentPolicy,
} from '../../types/EmailPreferences.types';

interface SwitchRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SwitchRow({ label, description, checked, onCheckedChange }: SwitchRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        aria-checked={checked}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-input'
        )}
        role="switch"
        onClick={() => onCheckedChange(!checked)}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

export function EmailPreferencesPanel(): JSX.Element {
  const preferences = useEmailPreferencesStore((state) => state.preferences);
  const updateDisplayPreferences = useEmailPreferencesStore(
    (state) => state.updateDisplayPreferences
  );
  const updateComposePreferences = useEmailPreferencesStore(
    (state) => state.updateComposePreferences
  );
  const updateSecurityPreferences = useEmailPreferencesStore(
    (state) => state.updateSecurityPreferences
  );
  const updateNotificationPreferences = useEmailPreferencesStore(
    (state) => state.updateNotificationPreferences
  );

  return (
    <div className="space-y-6">
      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Display</CardTitle>
          <CardDescription>Customize how emails are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Density */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Message density</Label>
              <p className="text-xs text-muted-foreground">
                Adjust spacing between messages in the list
              </p>
            </div>
            <Select
              value={preferences.display.density}
              onValueChange={(value: MessageListDensity) =>
                updateDisplayPreferences({ density: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preview Pane */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Preview pane</Label>
              <p className="text-xs text-muted-foreground">Position of the message preview</p>
            </div>
            <Select
              value={preferences.display.previewPane}
              onValueChange={(value: PreviewPanePosition) =>
                updateDisplayPreferences({ previewPane: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Date Format */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Date format</Label>
              <p className="text-xs text-muted-foreground">How dates are displayed</p>
            </div>
            <Select
              value={preferences.display.dateFormat}
              onValueChange={(value: DateFormat) => updateDisplayPreferences({ dateFormat: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relative">Relative (2h ago)</SelectItem>
                <SelectItem value="absolute">Absolute</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Thread Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Thread display</Label>
              <p className="text-xs text-muted-foreground">
                Group related messages as conversations
              </p>
            </div>
            <Select
              value={preferences.display.threadMode}
              onValueChange={(value: ThreadDisplayMode) =>
                updateDisplayPreferences({ threadMode: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversation">Conversations</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Toggle options */}
          <SwitchRow
            checked={preferences.display.showSnippets}
            description="Display preview text in message list"
            label="Show message snippets"
            onCheckedChange={(checked) => updateDisplayPreferences({ showSnippets: checked })}
          />

          <SwitchRow
            checked={preferences.display.showAvatars}
            description="Display sender avatars in message list"
            label="Show avatars"
            onCheckedChange={(checked) => updateDisplayPreferences({ showAvatars: checked })}
          />

          <SwitchRow
            checked={preferences.display.keyboardShortcuts}
            description="Enable keyboard navigation and shortcuts"
            label="Keyboard shortcuts"
            onCheckedChange={(checked) => updateDisplayPreferences({ keyboardShortcuts: checked })}
          />
        </CardContent>
      </Card>

      {/* Compose Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compose</CardTitle>
          <CardDescription>Customize email composition behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Window Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Compose window</Label>
              <p className="text-xs text-muted-foreground">Default compose window style</p>
            </div>
            <Select
              value={preferences.compose.windowMode}
              onValueChange={(value: ComposeWindowMode) =>
                updateComposePreferences({ windowMode: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dialog">Dialog</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
                <SelectItem value="inline">Inline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Default Reply */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Default reply</Label>
              <p className="text-xs text-muted-foreground">Behavior when pressing reply</p>
            </div>
            <Select
              value={preferences.compose.defaultReply}
              onValueChange={(value: DefaultReplyBehavior) =>
                updateComposePreferences({ defaultReply: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reply">Reply</SelectItem>
                <SelectItem value="reply_all">Reply All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Toggle options */}
          <SwitchRow
            checked={preferences.compose.includeOriginal}
            description="Quote original message in replies"
            label="Include original message"
            onCheckedChange={(checked) => updateComposePreferences({ includeOriginal: checked })}
          />

          <SwitchRow
            checked={preferences.compose.richTextEditor}
            description="Enable formatting options in composer"
            label="Rich text editor"
            onCheckedChange={(checked) => updateComposePreferences({ richTextEditor: checked })}
          />

          <SwitchRow
            checked={preferences.compose.confirmBeforeSend}
            description="Show confirmation dialog before sending"
            label="Confirm before sending"
            onCheckedChange={(checked) => updateComposePreferences({ confirmBeforeSend: checked })}
          />
        </CardContent>
      </Card>

      {/* Security Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security & Privacy</CardTitle>
          <CardDescription>Control how external content is handled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* External Images */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">External images</Label>
              <p className="text-xs text-muted-foreground">
                How to handle images from external sources
              </p>
            </div>
            <Select
              value={preferences.security.externalImages}
              onValueChange={(value: ExternalContentPolicy) =>
                updateSecurityPreferences({ externalImages: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="ask">Ask each time</SelectItem>
                <SelectItem value="allow">Always allow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Toggle options */}
          <SwitchRow
            checked={preferences.security.blockTrackingPixels}
            description="Hide invisible tracking images"
            label="Block tracking pixels"
            onCheckedChange={(checked) =>
              updateSecurityPreferences({ blockTrackingPixels: checked })
            }
          />

          <SwitchRow
            checked={preferences.security.showPhishingWarnings}
            description="Alert for suspicious emails"
            label="Show phishing warnings"
            onCheckedChange={(checked) =>
              updateSecurityPreferences({ showPhishingWarnings: checked })
            }
          />

          <SwitchRow
            checked={preferences.security.externalSenderWarnings}
            description="Highlight emails from outside contacts"
            label="External sender warnings"
            onCheckedChange={(checked) =>
              updateSecurityPreferences({ externalSenderWarnings: checked })
            }
          />
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>Configure email notification settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            checked={preferences.notifications.desktopNotifications}
            description="Show notifications for new emails"
            label="Desktop notifications"
            onCheckedChange={(checked) =>
              updateNotificationPreferences({ desktopNotifications: checked })
            }
          />

          <SwitchRow
            checked={preferences.notifications.soundEnabled}
            description="Play a sound for new emails"
            label="Notification sound"
            onCheckedChange={(checked) =>
              updateNotificationPreferences({ soundEnabled: checked })
            }
          />

          <SwitchRow
            checked={preferences.notifications.showPreview}
            description="Include message preview in notifications"
            label="Show preview"
            onCheckedChange={(checked) =>
              updateNotificationPreferences({ showPreview: checked })
            }
          />

          <SwitchRow
            checked={preferences.notifications.importantOnly}
            description="Only notify for important messages"
            label="Important only"
            onCheckedChange={(checked) =>
              updateNotificationPreferences({ importantOnly: checked })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
