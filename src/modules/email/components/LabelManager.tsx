/**
 * LabelManager Component
 * Dialog for creating and editing email labels
 */

import { useEffect, useState } from 'react';

import { X, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { LabelBadge } from './LabelBadge';
import { useEmailLabels } from '../hooks/useEmailLabels';

import type { EmailLabel } from '../types/Email.types';

interface LabelManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string | null;
}

export function LabelManager({ open, onOpenChange, accountId }: LabelManagerProps): JSX.Element {
  const { labels, isLoading, error, loadLabels, createLabel, updateLabel, deleteLabel } =
    useEmailLabels(accountId);
  const [editingLabel, setEditingLabel] = useState<EmailLabel | null>(null);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#3b82f6'); // Default blue
  const [labelIcon, setLabelIcon] = useState('');

  useEffect(() => {
    if (open) {
      void loadLabels();
      setEditingLabel(null);
      setLabelName('');
      setLabelColor('#3b82f6');
      setLabelIcon('');
    }
  }, [open, loadLabels]);

  const handleCreateOrUpdate = async (): Promise<void> => {
    if (!labelName.trim()) {
      return;
    }

    try {
      if (editingLabel) {
        await updateLabel(editingLabel.id, {
          name: labelName.trim(),
          color: labelColor,
          icon: labelIcon.trim() ? labelIcon.trim() : undefined,
        });
      } else {
        await createLabel({
          accountId: accountId ?? null,
          name: labelName.trim(),
          color: labelColor,
          icon: labelIcon.trim() ? labelIcon.trim() : undefined,
        });
      }
      setEditingLabel(null);
      setLabelName('');
      setLabelColor('#3b82f6');
      setLabelIcon('');
    } catch (err) {
      console.error('Failed to save label:', err);
    }
  };

  const handleEdit = (label: EmailLabel): void => {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelColor(label.color);
    setLabelIcon(label.icon ?? '');
  };

  const handleDelete = async (labelId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this label?')) {
      return;
    }

    try {
      await deleteLabel(labelId);
      if (editingLabel?.id === labelId) {
        setEditingLabel(null);
        setLabelName('');
        setLabelColor('#3b82f6');
        setLabelIcon('');
      }
    } catch (err) {
      console.error('Failed to delete label:', err);
    }
  };

  const handleCancel = (): void => {
    setEditingLabel(null);
    setLabelName('');
    setLabelColor('#3b82f6');
    setLabelIcon('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
          <DialogDescription>
            Create and manage labels for organizing your emails. Labels can be account-specific or
            global.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create/Edit Form */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">
              {editingLabel ? 'Edit Label' : 'Create New Label'}
            </h3>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="label-name">Label Name</Label>
                <Input
                  id="label-name"
                  placeholder="Enter label name"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="label-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-10 w-20 cursor-pointer"
                    id="label-color"
                    type="color"
                    value={labelColor}
                    onChange={(e) => setLabelColor(e.target.value)}
                  />
                  <div
                    className="h-10 w-10 rounded border"
                    style={{ backgroundColor: labelColor }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="label-icon">Icon (Optional)</Label>
                <Input
                  id="label-icon"
                  maxLength={2}
                  placeholder="Emoji or icon"
                  value={labelIcon}
                  onChange={(e) => setLabelIcon(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button disabled={!labelName.trim() || isLoading} onClick={handleCreateOrUpdate}>
                  {editingLabel ? 'Update' : 'Create'} Label
                </Button>
                {editingLabel && (
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Labels List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Existing Labels</h3>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">Loading labels...</p>}
            {!isLoading && labels.length === 0 && (
              <p className="text-sm text-muted-foreground">No labels created yet.</p>
            )}
            {!isLoading && labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-1">
                    <LabelBadge label={label} />
                    <Button
                      className="h-6 w-6"
                      size="icon"
                      title="Edit label"
                      variant="ghost"
                      onClick={() => handleEdit(label)}
                    >
                      <Tag className="h-3 w-3" />
                    </Button>
                    <Button
                      className="h-6 w-6"
                      size="icon"
                      title="Delete label"
                      variant="ghost"
                      onClick={() => void handleDelete(label.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
