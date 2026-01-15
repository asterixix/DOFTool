/**
 * MessageComposer Component
 * Email composition with rich text editing using Dialog
 */

import { useState, useRef, useEffect } from 'react';

import {
  Bold,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  Trash2,
  Underline,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { useEmailPreferencesStore } from '../stores/emailPreferences.store';

import type { EmailMessage } from '../types/Email.types';

type ComposerMode = 'new' | 'reply' | 'reply_all' | 'forward';

interface MessageComposerProps {
  isOpen: boolean;
  mode: ComposerMode;
  replyTo?: EmailMessage | null;
  accountId: string;
  accountEmail: string;
  onSend: (message: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text: string;
    html: string;
    attachments?: { filename: string; content: string; contentType: string }[];
    inReplyTo?: string;
    references?: string[];
  }) => Promise<void>;
  onClose: () => void;
  onSaveDraft: () => void;
}

interface RecipientInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function RecipientInput({ label, value, onChange, placeholder }: RecipientInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addRecipient = (email: string): void => {
    const trimmed = email.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeRecipient = (email: string): void => {
    onChange(value.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        addRecipient(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const lastValue = value[value.length - 1];
      if (lastValue) {
        removeRecipient(lastValue);
      }
    }
  };

  const handleBlur = (): void => {
    if (inputValue.trim()) {
      addRecipient(inputValue);
    }
  };

  const handleContainerClick = (): void => {
    inputRef.current?.focus();
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex items-start gap-2">
      <Label className="w-12 pt-2 text-right text-muted-foreground">{label}</Label>
      <div
        className={cn(
          'flex min-h-[38px] flex-1 flex-wrap items-center gap-1 px-3 py-1',
          'rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring'
        )}
        role="button"
        tabIndex={0}
        onClick={handleContainerClick}
        onKeyDown={handleContainerKeyDown}
      >
        {value.map((email) => (
          <Badge key={email} className="gap-1" variant="secondary">
            {email}
            <button
              className="ml-1 rounded-full hover:bg-muted"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeRecipient(email);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-sm outline-none"
          placeholder={value.length === 0 ? placeholder : ''}
          type="text"
          value={inputValue}
          onBlur={handleBlur}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
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

export function MessageComposer({
  isOpen,
  mode,
  replyTo,
  accountId: _accountId,
  accountEmail,
  onSend,
  onClose,
  onSaveDraft: _onSaveDraft,
}: MessageComposerProps): JSX.Element | null {
  // Get preferences for compose window mode
  const composePreferences = useEmailPreferencesStore((state) => state.preferences.compose);
  const windowMode = composePreferences.windowMode;

  // Initialize state based on mode and replyTo
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(windowMode === 'fullscreen');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when mode or replyTo changes
  useEffect(() => {
    if (isOpen) {
      // Set recipients
      if (mode === 'reply' || mode === 'reply_all') {
        setTo(replyTo ? [replyTo.from.address] : []);
      } else {
        setTo([]);
      }

      // Set CC recipients for reply all
      if (mode === 'reply_all' && replyTo?.cc) {
        const ccAddresses = replyTo.cc.map((r) => r.address).filter((a) => a !== accountEmail);
        setCc(ccAddresses);
        setShowCc(ccAddresses.length > 0);
      } else {
        setCc([]);
        setShowCc(false);
      }

      setBcc([]);
      setShowBcc(false);

      // Set subject
      if (!replyTo) {
        setSubject('');
      } else if (mode === 'forward') {
        setSubject(`Fwd: ${replyTo.subject}`);
      } else {
        setSubject(replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`);
      }

      // Set body with quote - properly format the quoted content
      if (!replyTo) {
        setBody('');
      } else {
        const date = new Date(replyTo.date).toLocaleString();
        const senderName = replyTo.from.name ?? replyTo.from.address;
        
        // Use text body if available, otherwise extract text from HTML
        let quotedContent = replyTo.textBody ?? '';
        if (!quotedContent && replyTo.htmlBody) {
          // Strip HTML tags and extract text content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = replyTo.htmlBody;
          quotedContent = tempDiv.textContent ?? tempDiv.innerText ?? '';
        }
        
        // Clean up the quoted content - remove excessive whitespace and URLs from images
        quotedContent = quotedContent
          .replace(/View image: \(https?:\/\/[^\)]+\)/gi, '[Image]')
          .replace(/Follow image link: \(https?:\/\/[^\)]+\)/gi, '')
          .replace(/Caption:=[^\n]*/gi, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        // Format the quote with proper line prefix
        const quotedLines = quotedContent.split('\n').map(line => `> ${line}`).join('\n');
        
        if (mode === 'forward') {
          const forwardHeader = `---------- Forwarded message ----------\nFrom: ${senderName} <${replyTo.from.address}>\nDate: ${date}\nSubject: ${replyTo.subject}\nTo: ${replyTo.to.map(r => r.address).join(', ')}\n\n`;
          setBody(`\n\n${forwardHeader}${quotedContent}`);
        } else {
          setBody(`\n\nOn ${date}, ${senderName} wrote:\n${quotedLines}`);
        }
      }

      setAttachments([]);
    }
  }, [isOpen, mode, replyTo, accountEmail]);

  const handleSend = async (): Promise<void> => {
    if (to.length === 0) {
      return;
    }

    setIsSending(true);
    try {
      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file),
          contentType: file.type,
        }))
      );

      const messageData: Parameters<typeof onSend>[0] = {
        to,
        subject,
        text: body,
        html: `<div>${body.replace(/\n/g, '<br>')}</div>`,
      };

      // Only add optional properties if they have values (exactOptionalPropertyTypes)
      if (cc.length > 0) {
        messageData.cc = cc;
      }
      if (bcc.length > 0) {
        messageData.bcc = bcc;
      }
      if (attachmentData.length > 0) {
        messageData.attachments = attachmentData;
      }
      if (replyTo?.messageId) {
        messageData.inReplyTo = replyTo.messageId;
      }
      if (replyTo?.references) {
        messageData.references = replyTo.references;
      }

      await onSend(messageData);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number): void => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Get dialog title based on mode
  const getDialogTitle = (): string => {
    switch (mode) {
      case 'new':
        return 'New Message';
      case 'reply':
        return 'Reply';
      case 'reply_all':
        return 'Reply All';
      case 'forward':
        return 'Forward';
      default:
        return 'Compose';
    }
  };

  // Compose form content (shared between dialog and inline modes)
  const composeContent = (
    <div className="flex h-full flex-col">
      {/* Recipients */}
      <div className="space-y-2 border-b p-3">
        <RecipientInput label="To" placeholder="Recipients" value={to} onChange={setTo} />

        {showCc && (
          <RecipientInput label="Cc" placeholder="Cc recipients" value={cc} onChange={setCc} />
        )}

        {showBcc && (
          <RecipientInput label="Bcc" placeholder="Bcc recipients" value={bcc} onChange={setBcc} />
        )}

        <div className="flex items-center gap-2 pl-14">
          {!showCc && (
            <Button className="text-xs" size="sm" variant="ghost" onClick={() => setShowCc(true)}>
              Add Cc
            </Button>
          )}
          {!showBcc && (
            <Button className="text-xs" size="sm" variant="ghost" onClick={() => setShowBcc(true)}>
              Add Bcc
            </Button>
          )}
        </div>

        {/* Subject */}
        <div className="flex items-center gap-2">
          <Label className="w-12 text-right text-muted-foreground">Subject</Label>
          <Input
            className="flex-1"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-3 py-1">
        <Button className="h-8 w-8" size="icon" title="Bold" variant="ghost">
          <Bold className="h-4 w-4" />
        </Button>
        <Button className="h-8 w-8" size="icon" title="Italic" variant="ghost">
          <Italic className="h-4 w-4" />
        </Button>
        <Button className="h-8 w-8" size="icon" title="Underline" variant="ghost">
          <Underline className="h-4 w-4" />
        </Button>
        <Separator className="mx-1 h-6" orientation="vertical" />
        <Button className="h-8 w-8" size="icon" title="Bullet list" variant="ghost">
          <List className="h-4 w-4" />
        </Button>
        <Button className="h-8 w-8" size="icon" title="Numbered list" variant="ghost">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Separator className="mx-1 h-6" orientation="vertical" />
        <Button className="h-8 w-8" size="icon" title="Insert link" variant="ghost">
          <Link2 className="h-4 w-4" />
        </Button>
        <Button className="h-8 w-8" size="icon" title="Insert image" variant="ghost">
          <Image className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Fullscreen toggle */}
        <Button
          className="h-8 w-8"
          size="icon"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          variant="ghost"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <Textarea
          className="h-full min-h-[200px] w-full resize-none border-0 bg-transparent p-3 text-sm focus-visible:ring-0"
          placeholder="Write your message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t bg-muted/30 px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded border bg-background px-2 py-1"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-[150px] truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                <button
                  className="rounded p-0.5 hover:bg-muted"
                  type="button"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 border-t p-3">
        <Button disabled={isSending || to.length === 0} onClick={handleSend}>
          <Send className="mr-2 h-4 w-4" />
          {isSending ? 'Sending...' : 'Send'}
        </Button>

        <input
          ref={fileInputRef}
          className="hidden"
          multiple={true}
          type="file"
          onChange={handleFileSelect}
        />
        <Button
          size="icon"
          title="Attach file"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button size="icon" title="Discard" variant="ghost" onClick={onClose}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Render as Dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0',
          isFullscreen
            ? 'h-[90vh] max-h-[90vh] w-[90vw] max-w-[90vw]'
            : 'h-[600px] max-h-[80vh] w-[700px] max-w-[calc(100vw-2rem)]'
        )}
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription className="sr-only">
            Compose and send an email message
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">{composeContent}</div>
      </DialogContent>
    </Dialog>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
