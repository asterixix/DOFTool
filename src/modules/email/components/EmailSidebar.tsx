/**
 * EmailSidebar Component
 * Navigation sidebar with accounts, folders, and compose button
 */

import { useState } from 'react';

import {
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronRight,
  File,
  FolderPlus,
  Inbox,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Star,
  Trash2,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import type { EmailAccount, EmailFolder } from '../types/Email.types';
import type { LucideIcon } from 'lucide-react';

interface EmailSidebarProps {
  accounts: EmailAccount[];
  selectedAccountId: string | null;
  folders: EmailFolder[];
  selectedFolder: string;
  onAccountChange: (accountId: string) => void;
  onFolderSelect: (folder: string) => void;
  onCompose: () => void;
  onSync: () => void;
  onManageAccounts: () => void;
  onManageFolders?: () => void;
  isSyncing: boolean;
}

// Standard folder icons
const FOLDER_ICONS: Record<string, LucideIcon> = {
  INBOX: Inbox,
  Sent: Send,
  'Sent Mail': Send,
  'Sent Messages': Send,
  Drafts: File,
  Trash: Trash2,
  'Deleted Items': Trash2,
  Archive: Archive,
  'All Mail': Mail,
  Spam: AlertCircle,
  Junk: AlertCircle,
  Starred: Star,
};

// Folder display order
const FOLDER_ORDER = ['INBOX', 'Starred', 'Drafts', 'Sent', 'Archive', 'Spam', 'Trash'];

function getFolderIcon(folderName: string): LucideIcon {
  // Check exact match
  if (FOLDER_ICONS[folderName]) {
    return FOLDER_ICONS[folderName];
  }

  // Check partial match
  for (const [key, icon] of Object.entries(FOLDER_ICONS)) {
    if (folderName.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }

  return Mail;
}

function sortFolders(folders: EmailFolder[]): EmailFolder[] {
  return [...folders].sort((a, b) => {
    const aIndex = FOLDER_ORDER.findIndex((f) => a.path.toLowerCase().includes(f.toLowerCase()));
    const bIndex = FOLDER_ORDER.findIndex((f) => b.path.toLowerCase().includes(f.toLowerCase()));

    // Known folders come first
    if (aIndex !== -1 && bIndex === -1) {
      return -1;
    }
    if (aIndex === -1 && bIndex !== -1) {
      return 1;
    }
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Alphabetical for custom folders
    return a.name.localeCompare(b.name);
  });
}

export function EmailSidebar({
  accounts,
  selectedAccountId,
  folders,
  selectedFolder,
  onAccountChange,
  onFolderSelect,
  onCompose,
  onSync,
  onManageAccounts,
  onManageFolders,
  isSyncing,
}: EmailSidebarProps): JSX.Element {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleAccountSelect = (value: string): void => {
    if (value === '__manage__') {
      onManageAccounts();
      return;
    }
    onAccountChange(value);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const sortedFolders = sortFolders(folders);

  // Separate top-level folders from nested
  const topLevelFolders = sortedFolders.filter((f) => !f.path.includes('/'));
  const nestedFolders = sortedFolders.filter((f) => f.path.includes('/'));

  const toggleFolder = (path: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderFolder = (folder: EmailFolder, depth: number = 0): JSX.Element => {
    const Icon = getFolderIcon(folder.name);
    const isSelected = selectedFolder === folder.path;
    const hasChildren = nestedFolders.some((f) => f.path.startsWith(folder.path + '/'));
    const isExpanded = expandedFolders.has(folder.path);

    return (
      <div key={folder.path}>
        <div
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            'hover:bg-accent/50',
            isSelected && 'bg-accent font-medium text-accent-foreground',
            depth > 0 && 'ml-4'
          )}
        >
          {hasChildren ? (
            <button
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
              className="rounded p-0.5 hover:bg-accent"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.path);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <button
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            type="button"
            onClick={() => onFolderSelect(folder.path)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">{folder.name}</span>
            {folder.unreadMessages > 0 && (
              <Badge className="ml-auto px-1.5 text-xs" variant="secondary">
                {folder.unreadMessages > 999 ? '999+' : folder.unreadMessages}
              </Badge>
            )}
          </button>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {nestedFolders
              .filter((f) => {
                const parentPath = folder.path + '/';
                return (
                  f.path.startsWith(parentPath) && !f.path.slice(parentPath.length).includes('/')
                );
              })
              .map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Account Selector */}
      <div className="space-y-3 p-3">
        <div className="space-y-2">
          <Select value={selectedAccountId ?? ''} onValueChange={handleAccountSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account">
                {selectedAccount && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{selectedAccount.email}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{account.displayName ?? account.email}</span>
                      <span className="text-xs text-muted-foreground">{account.email}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Manage Accounts Button */}
          <Button
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            size="sm"
            variant="ghost"
            onClick={onManageAccounts}
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage accounts
          </Button>
        </div>

        {/* Compose Button */}
        <Button className="w-full" size="sm" onClick={onCompose}>
          <Plus className="mr-2 h-4 w-4" />
          Compose
        </Button>
      </div>

      <Separator />

      {/* Folders List */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {topLevelFolders.map((folder) => renderFolder(folder))}

        {/* Manage Folders Button */}
        {onManageFolders && selectedAccountId && (
          <button
            className={cn(
              'mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              'text-muted-foreground hover:bg-accent/50'
            )}
            onClick={onManageFolders}
          >
            <FolderPlus className="h-4 w-4" />
            <span>Manage Folders</span>
          </button>
        )}
      </div>

      <Separator />

      {/* Internal Messages Section */}
      <div className="p-2">
        <button
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            'hover:bg-accent/50',
            selectedFolder === 'internal' && 'bg-accent font-medium text-accent-foreground'
          )}
          onClick={() => onFolderSelect('internal')}
        >
          <Users className="h-4 w-4" />
          <span>Family Messages</span>
        </button>
      </div>

      <Separator />

      {/* Sync Button */}
      <div className="p-3">
        <Button
          className="w-full justify-start"
          disabled={isSyncing || !selectedAccountId}
          size="sm"
          variant="ghost"
          onClick={onSync}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
          {isSyncing ? 'Syncing...' : 'Sync now'}
        </Button>
      </div>
    </div>
  );
}
