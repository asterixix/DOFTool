/**
 * ImportExportDialog - Import/Export tasks functionality
 */

import { useState } from 'react';

import { Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import type { TaskList } from '../types/Task.types';

interface ImportExportDialogProps {
  taskList: TaskList | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onImport?: (listId: string, data: string, format: 'json' | 'csv') => Promise<void>;
  onExport?: (listId: string, format: 'json' | 'csv') => Promise<string>;
}

export function ImportExportDialog({
  taskList,
  isOpen,
  isLoading,
  onClose,
  onImport,
  onExport,
}: ImportExportDialogProps): JSX.Element {
  const [importFormat] = useState<'json' | 'csv'>('json');

  const handleExport = async (format: 'json' | 'csv'): Promise<void> => {
    if (!taskList || !onExport) {
      return;
    }

    try {
      const data = await onExport(taskList.id, format);
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskList.name.toLowerCase().replace(/\s+/g, '-')}-tasks.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Error handling will be managed by parent component
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file || !taskList || !onImport) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        await onImport(taskList.id, content, importFormat);
      }
    };
    reader.readAsText(file);
  };

  if (!taskList) {
    return <div />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import/Export Tasks</DialogTitle>
          <DialogDescription>
            Import or export tasks for <span className="font-semibold">{taskList.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Export Tasks</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Download tasks from this list in your preferred format.
            </p>
            <div className="flex gap-2">
              <Button
                disabled={isLoading || !onExport}
                size="sm"
                variant="outline"
                onClick={() => void handleExport('json')}
              >
                Export as JSON
              </Button>
              <Button
                disabled={isLoading || !onExport}
                size="sm"
                variant="outline"
                onClick={() => void handleExport('csv')}
              >
                Export as CSV
              </Button>
            </div>
          </div>

          <Separator />

          {/* Import Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Import Tasks</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a JSON file to import tasks into this list.
            </p>
            <div className="flex items-center gap-2">
              <input
                accept=".json"
                className="hidden"
                disabled={isLoading || !onImport}
                id="import-file"
                type="file"
                onChange={(e) => void handleImportFile(e)}
              />
              <Button asChild disabled={isLoading || !onImport} size="sm" variant="outline">
                <label className="cursor-pointer" htmlFor="import-file">
                  Choose File
                </label>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Imported tasks will be added to the existing tasks in this list.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isLoading} variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
