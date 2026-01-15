/**
 * ICalImportExport - File upload/download for iCal import/export
 */

import { useRef, useState } from 'react';

import { AlertCircle, Download, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import type { Calendar } from '../types/Calendar.types';

interface ICalImportExportProps {
  calendar: Calendar | null;
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    calendarId: string,
    icalData: string
  ) => Promise<{ imported: number; errors: string[] }>;
  onExport: (calendarId: string) => Promise<string>;
  isLoading?: boolean;
}

export function ICalImportExport({
  calendar,
  isOpen,
  onClose,
  onImport,
  onExport,
  isLoading,
}: ICalImportExportProps): JSX.Element {
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(
    null
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!calendar) {
    return <></>;
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.ics') && !file.name.toLowerCase().endsWith('.ical')) {
      setImportResult({ imported: 0, errors: ['Please select a valid .ics or .ical file'] });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const result = await onImport(calendar.id, content);
      setImportResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setImportResult({ imported: 0, errors: [message] });
    } finally {
      setIsImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const icalData = await onExport(calendar.id);

      // Create and download file
      const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${calendar.name.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      // In a real app, show error toast
    } finally {
      setIsExporting(false);
    }
  };

  const clearResults = (): void => {
    setImportResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import/Export Calendar</DialogTitle>
          <DialogDescription>
            Import events from or export events to standard iCalendar (.ics) files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <h4 className="text-sm font-medium">Import Events</h4>
            </div>

            <p className="text-xs text-muted-foreground">
              Import events from an iCalendar (.ics) file. Existing events will not be affected.
            </p>

            <input
              ref={fileInputRef}
              accept=".ics,.ical"
              className="hidden"
              disabled={isImporting || isLoading}
              type="file"
              onChange={handleFileSelect}
            />

            <Button
              className="w-full"
              disabled={isImporting || isLoading}
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="mr-2 h-4 w-4" />
              {isImporting ? 'Importing...' : 'Select .ics file'}
            </Button>
          </div>

          <Separator />

          {/* Export Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <h4 className="text-sm font-medium">Export Events</h4>
            </div>

            <p className="text-xs text-muted-foreground">
              Export all events from &ldquo;{calendar.name}&rdquo; to an iCalendar file.
            </p>

            <Button
              className="w-full"
              disabled={isExporting || isLoading}
              variant="outline"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Download .ics file'}
            </Button>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center gap-2">
                {importResult.errors.length === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <h4 className="text-sm font-medium">Import Results</h4>
              </div>

              <div className="space-y-2">
                {importResult.imported > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Events imported</span>
                    <Badge variant="secondary">{importResult.imported}</Badge>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm text-red-600">Errors:</span>
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                        <span className="text-red-600">{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full" size="sm" variant="ghost" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
