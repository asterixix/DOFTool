/**
 * VersionBanner - Popover showing current app version and update status
 */

import { useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Download, Package, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useVersionInfo } from '@/hooks/useVersionInfo';
import { cn } from '@/lib/utils';

export function VersionBanner(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const {
    currentVersion,
    updateInfo,
    isChecking,
    lastCheckedAt,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useVersionInfo();

  const hasUpdate = updateInfo?.hasUpdate ?? false;

  const handleCheckForUpdates = (): void => {
    void checkForUpdates(false);
  };

  const handleDownloadUpdate = async (): Promise<void> => {
    const releaseUrl = updateInfo?.release
      ? `https://github.com/asterixix/DOFTool/releases/tag/${updateInfo.release.tag_name}`
      : undefined;
    await downloadUpdate(releaseUrl);
  };

  const handleInstallUpdate = async (): Promise<void> => {
    await installUpdate();
  };

  const lastCheckedText = lastCheckedAt
    ? `Last checked ${formatDistanceToNow(new Date(lastCheckedAt), { addSuffix: true })}`
    : 'Never checked';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            hasUpdate
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          )}
          type="button"
        >
          {hasUpdate ? <Download className="h-3 w-3" /> : <Package className="h-3 w-3" />}
          <span>v{currentVersion}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Version Information</h3>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Current version: <span className="font-medium">v{currentVersion}</span>
            </span>
          </div>
        </div>

        {hasUpdate && updateInfo && (
          <>
            <div className="border-b bg-blue-50 px-4 py-3 dark:bg-blue-950/20">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Update Available
                  </p>
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    Version {updateInfo.version} is now available
                  </p>
                </div>
              </div>
              {updateInfo.release?.body && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded bg-white p-2 text-xs text-muted-foreground dark:bg-gray-900">
                  {updateInfo.release.body.substring(0, 200)}
                  {updateInfo.release.body.length > 200 ? '...' : ''}
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <Button className="w-full" size="sm" variant="default" onClick={handleDownloadUpdate}>
                <Download className="mr-2 h-4 w-4" />
                Download Update
              </Button>
              <Button className="w-full" size="sm" variant="outline" onClick={handleInstallUpdate}>
                Install & Restart
              </Button>
            </div>
            <Separator />
          </>
        )}

        {!hasUpdate && updateInfo && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span>You are running the latest version</span>
            </div>
          </div>
        )}

        <Separator />
        <div className="space-y-2 p-3">
          <div className="text-xs text-muted-foreground">{lastCheckedText}</div>
          <Button
            className="w-full"
            disabled={isChecking}
            size="sm"
            variant="outline"
            onClick={handleCheckForUpdates}
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
