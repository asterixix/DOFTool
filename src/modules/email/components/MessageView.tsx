/**
 * MessageView Component
 * Displays email message content with sanitized HTML
 */

import { useState, useMemo } from 'react';

import { format } from 'date-fns';
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  MoreVertical,
  Paperclip,
  Download,
  Eye,
  EyeOff,
  Printer,
  ArrowLeft,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { SecureEmailRenderer } from './SecureEmailRenderer';

import type { EmailMessage, EmailAttachment } from '../types/Email.types';

interface MessageViewProps {
  message: EmailMessage | null;
  onArchive: () => void;
  onBack: () => void;
  onDelete: () => void;
  onDownloadAttachment: (attachment: EmailAttachment) => void;
  onForward: () => void;
  onMarkAsRead: (read: boolean) => void;
  onReply: () => void;
  onReplyAll: () => void;
  onToggleStar: () => void;
}

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.split(' ');
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    if (parts.length >= 2 && firstPart && lastPart) {
      const firstChar = firstPart[0] ?? '';
      const lastChar = lastPart[0] ?? '';
      return (firstChar + lastChar).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentItem({
  attachment,
  onDownload,
}: {
  attachment: EmailAttachment;
  onDownload: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
      <Paperclip className="h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.filename}</p>
        <p className="text-sm text-muted-foreground">{formatFileSize(attachment.size)}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={onDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function MessageView({
  message,
  onArchive,
  onBack,
  onDelete,
  onDownloadAttachment,
  onForward,
  onMarkAsRead,
  onReply,
  onReplyAll,
  onToggleStar,
}: MessageViewProps): JSX.Element {
  const [showExternalImages, setShowExternalImages] = useState(false);

  // Check if email has external images
  const hasExternalImages = useMemo(() => {
    if (!message?.htmlBody) {
      return false;
    }
    const imgRegex = /<img[^>]+src=["']?(https?:\/\/[^"'\s>]+)["']?[^>]*>/gi;
    return imgRegex.test(message.htmlBody);
  }, [message]);

  // Mark as read when viewing
  // useEffect is omitted since the parent component should handle this

  if (!message) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
        <p>Select a message to read</p>
      </div>
    );
  }

  const recipients = [
    ...message.to.map((r) => r.name ?? r.address),
    ...(message.cc?.map((r) => r.name ?? r.address) ?? []),
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-2 sm:gap-2 sm:px-4">
        <Button className="lg:hidden" size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1" />

        {/* Actions - Primary actions */}
        <div className="flex items-center rounded-lg border bg-background p-1">
          <Button size="icon" title="Reply" variant="ghost" onClick={onReply}>
            <Reply className="h-4 w-4" />
          </Button>
          <Button size="icon" title="Reply All" variant="ghost" onClick={onReplyAll}>
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button size="icon" title="Forward" variant="ghost" onClick={onForward}>
            <Forward className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="mx-1 h-6" orientation="vertical" />

        {/* Secondary actions */}
        <Button size="icon" title="Archive" variant="ghost" onClick={onArchive}>
          <Archive className="h-4 w-4" />
        </Button>
        <Button size="icon" title="Delete" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          title={message.starred ? 'Remove star' : 'Add star'}
          variant="ghost"
          onClick={onToggleStar}
        >
          <Star className={cn('h-4 w-4', message.starred && 'fill-yellow-400 text-yellow-400')} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMarkAsRead(!message.read)}>
              {message.read ? 'Mark as unread' : 'Mark as read'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
          {/* Subject */}
          <h1 className="text-2xl font-semibold">{message.subject || '(no subject)'}</h1>

          {/* Sender info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {getInitials(message.from.name, message.from.address)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{message.from.name ?? message.from.address}</span>
                {message.from.name && (
                  <span className="text-sm text-muted-foreground">
                    &lt;{message.from.address}&gt;
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>to {recipients.slice(0, 3).join(', ')}</span>
                {recipients.length > 3 && (
                  <Badge variant="secondary">+{recipients.length - 3} more</Badge>
                )}
              </div>
            </div>

            <div className="whitespace-nowrap text-sm text-muted-foreground">
              {format(new Date(message.date), 'MMM d, yyyy h:mm a')}
            </div>
          </div>

          {/* External images warning */}
          {hasExternalImages && !showExternalImages && (
            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30">
              <EyeOff className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  External images are hidden
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Images from external sources may be used for tracking
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowExternalImages(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Show images
              </Button>
            </div>
          )}

          {/* Attachments */}
          {message.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Attachments ({message.attachments.length})
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {message.attachments.map((attachment) => (
                  <AttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    onDownload={() => onDownloadAttachment(attachment)}
                  />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Email body */}
          <SecureEmailRenderer
            blockExternalImages={!showExternalImages}
            className="prose prose-sm dark:prose-invert max-w-none"
            html={message.htmlBody ?? ''}
            textBody={message.textBody}
          />
        </div>
      </div>
    </div>
  );
}
