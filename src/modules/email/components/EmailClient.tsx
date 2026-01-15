/**
 * EmailClient Component
 * Main email client interface with 3-column layout
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Mail, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { EmptyState, LoadingSpinner } from '@/shared/components';
import { getEmailAPI } from '@/shared/utils/electronAPI';
import { useResizablePanel } from '@/hooks/useResizablePanel';

import { EmailSidebar } from './EmailSidebar';
import { FolderManager } from './FolderManager';
import { MessageComposer } from './MessageComposer';
import { MessageList } from './MessageList';
import { MessageView } from './MessageView';
import { useEmail } from '../hooks/useEmail';
import { groupIntoThreads } from '../utils/threading';

import type { EmailAttachment, EmailMessage } from '../types/Email.types';

type ComposerMode = 'new' | 'reply' | 'reply_all' | 'forward';

function isEmailMessage(value: unknown): value is EmailMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['accountId'] === 'string' &&
    typeof record['uid'] === 'number' &&
    typeof record['subject'] === 'string'
  );
}

export function EmailClient(): JSX.Element {
  const navigate = useNavigate();

  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    folders,
    messages,
    selectedMessageId,
    setSelectedMessageId,
    isLoadingAccounts,
    isLoadingMessages,
    isSyncing,
    loadMessages,
    loadFolders,
    sendEmail,
    markAsRead,
    markAsStarred,
    moveMessage,
    deleteMessage,
  } = useEmail();

  // Check if desktop
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Both sidebar and message list are resizable
  const sidebarPanel = useResizablePanel({
    defaultWidth: 280,
    minWidth: 200,
    maxWidth: 500,
    storageKey: 'email-sidebar-width',
  });
  
  const messageListPanel = useResizablePanel({
    defaultWidth: 400,
    minWidth: 250,
    maxWidth: 700,
    storageKey: 'email-message-list-width',
  });

  // Local state
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [showThreads] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>('new');
  const [replyToMessage, setReplyToMessage] = useState<EmailMessage | null>(null);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [loadedMessageId, setLoadedMessageId] = useState<string | null>(null);
  const [fullMessage, setFullMessage] = useState<EmailMessage | null>(null);

  // Group messages into threads (memoized)
  const threads = useMemo(
    () => (showThreads ? groupIntoThreads(messages) : []),
    [messages, showThreads]
  );

  // Get selected message - use full message if loaded, otherwise use from list
  const selectedMessage =
    fullMessage?.id === selectedMessageId
      ? fullMessage
      : (messages.find((m) => m.id === selectedMessageId) ?? null);

  // Get selected account
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Auto-select first account if none selected
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const firstAccount = accounts[0];
      if (firstAccount) {
        setSelectedAccountId(firstAccount.id);
      }
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  // Fetch messages when account or folder changes
  useEffect(() => {
    if (selectedAccountId && selectedFolder) {
      void loadMessages(selectedAccountId, selectedFolder);
    }
  }, [selectedAccountId, selectedFolder, loadMessages]);

  // Fetch full message content when selected
  useEffect(() => {
    if (selectedMessageId && selectedMessageId !== loadedMessageId && selectedAccountId) {
      const message = messages.find((m) => m.id === selectedMessageId);

      if (message && !message.htmlBody && !message.textBody) {
        // Message doesn't have body content, fetch it
        void (async () => {
          try {
            const emailAPI = getEmailAPI();
            const fullMsg = await emailAPI.fetchMessage(
              selectedAccountId,
              selectedFolder,
              message.uid
            );
            if (isEmailMessage(fullMsg)) {
              setFullMessage(fullMsg);
            } else {
              setFullMessage(message);
            }
            setLoadedMessageId(selectedMessageId);
          } catch {
            setFullMessage(message);
          }
        })();
      } else {
        // Message already has body content
        setFullMessage(message ?? null);
        setLoadedMessageId(selectedMessageId);
      }
    } else if (!selectedMessageId) {
      setFullMessage(null);
      setLoadedMessageId(null);
    }
  }, [selectedMessageId, selectedAccountId, selectedFolder, messages, loadedMessageId]);

  // Mark message as read when selected
  useEffect(() => {
    if (selectedMessage && !selectedMessage.read) {
      void markAsRead(selectedMessage.id, true);
    }
  }, [selectedMessage, markAsRead]);

  // Handlers
  const handleAccountChange = useCallback(
    (accountId: string) => {
      setSelectedAccountId(accountId);
      setSelectedMessageId(null);
      setSelectedThreadId(null);
      setSelectedIds([]);
    },
    [setSelectedAccountId, setSelectedMessageId]
  );

  const handleFolderSelect = useCallback(
    (folder: string) => {
      setSelectedFolder(folder);
      setSelectedMessageId(null);
      setSelectedThreadId(null);
      setSelectedIds([]);
    },
    [setSelectedMessageId]
  );

  const handleMessageSelect = useCallback(
    (messageId: string) => {
      setSelectedMessageId(messageId);
      setSelectedThreadId(null);
    },
    [setSelectedMessageId]
  );

  const handleThreadSelect = useCallback(
    (threadId: string) => {
      setSelectedThreadId(threadId);
      // Select the first message in the thread
      const thread = threads.find((t) => t.id === threadId);

      if (thread?.messages?.length) {
        // Use the first message from the thread's messages array
        const firstMessage = thread.messages[0];
        if (firstMessage) {
          setSelectedMessageId(firstMessage.id);
        }
      } else if (thread?.messageIds?.length) {
        // Fallback: try matching with global messages array
        const firstMessage = messages.find((m) => thread.messageIds.includes(m.id));
        if (firstMessage) {
          setSelectedMessageId(firstMessage.id);
        }
      }
    },
    [threads, messages, setSelectedMessageId]
  );

  const handleCompose = useCallback(() => {
    setComposerMode('new');
    setReplyToMessage(null);
    setComposerOpen(true);
  }, []);

  const handleReply = useCallback(() => {
    if (selectedMessage) {
      setComposerMode('reply');
      setReplyToMessage(selectedMessage);
      setComposerOpen(true);
    }
  }, [selectedMessage]);

  const handleReplyAll = useCallback(() => {
    if (selectedMessage) {
      setComposerMode('reply_all');
      setReplyToMessage(selectedMessage);
      setComposerOpen(true);
    }
  }, [selectedMessage]);

  const handleForward = useCallback(() => {
    if (selectedMessage) {
      setComposerMode('forward');
      setReplyToMessage(selectedMessage);
      setComposerOpen(true);
    }
  }, [selectedMessage]);

  const handleDelete = useCallback(async () => {
    if (selectedMessageId) {
      await deleteMessage(selectedMessageId);
      setSelectedMessageId(null);
    }
  }, [selectedMessageId, deleteMessage, setSelectedMessageId]);

  const handleArchive = useCallback(async () => {
    if (selectedMessageId) {
      await moveMessage(selectedMessageId, 'Archive');
      setSelectedMessageId(null);
    }
  }, [selectedMessageId, moveMessage, setSelectedMessageId]);

  const handleToggleStar = useCallback(async () => {
    if (selectedMessage) {
      await markAsStarred(selectedMessage.id, !selectedMessage.starred);
    }
  }, [selectedMessage, markAsStarred]);

  const handleToggleMessageStar = useCallback(
    async (messageId: string, starred: boolean) => {
      await markAsStarred(messageId, starred);
    },
    [markAsStarred]
  );

  const handleToggleMessageRead = useCallback(
    async (messageId: string, read: boolean) => {
      await markAsRead(messageId, read);
    },
    [markAsRead]
  );

  const handleMarkAsRead = useCallback(
    async (read: boolean) => {
      if (selectedMessageId) {
        await markAsRead(selectedMessageId, read);
      }
    },
    [selectedMessageId, markAsRead]
  );

  const handleSync = useCallback(async () => {
    if (selectedAccountId) {
      await loadFolders(selectedAccountId);
      await loadMessages(selectedAccountId, selectedFolder);
    }
  }, [selectedAccountId, selectedFolder, loadMessages, loadFolders]);

  const handleManageFolders = useCallback(() => {
    setFolderManagerOpen(true);
  }, []);

  const handleFolderCreated = useCallback(async () => {
    if (selectedAccountId) {
      await loadFolders(selectedAccountId);
    }
  }, [selectedAccountId, loadFolders]);

  const handleFolderRenamed = useCallback(async () => {
    if (selectedAccountId) {
      await loadFolders(selectedAccountId);
    }
  }, [selectedAccountId, loadFolders]);

  const handleFolderDeleted = useCallback(async () => {
    if (selectedAccountId) {
      await loadFolders(selectedAccountId);
    }
  }, [selectedAccountId, loadFolders]);

  const handleManageAccounts = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const handleSend = useCallback(
    async (message: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      text: string;
      html: string;
      attachments?: { filename: string; content: string; contentType: string }[];
      inReplyTo?: string;
      references?: string[];
    }) => {
      if (selectedAccountId) {
        await sendEmail({
          accountId: selectedAccountId,
          to: message.to.map((addr) => ({ address: addr })),
          ...(message.cc && { cc: message.cc.map((addr) => ({ address: addr })) }),
          ...(message.bcc && { bcc: message.bcc.map((addr) => ({ address: addr })) }),
          subject: message.subject,
          textBody: message.text,
          htmlBody: message.html,
          ...(message.attachments && {
            attachments: message.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
            })),
          }),
          ...(message.inReplyTo && { inReplyTo: message.inReplyTo }),
          ...(message.references && { references: message.references }),
        });
      }
    },
    [selectedAccountId, sendEmail]
  );

  const handleDownloadAttachment = useCallback((_attachment: EmailAttachment) => {
    // TODO: Implement attachment download via IPC
  }, []);

  const handleBack = useCallback(() => {
    setSelectedMessageId(null);
  }, [setSelectedMessageId]);

  // Loading state
  if (isLoadingAccounts) {
    return <LoadingSpinner fullScreen text="Loading accounts..." />;
  }

  // No accounts - use EmptyState
  if (accounts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          actionLabel="Add Account"
          description="Connect your email account to get started with DOFTool Mail."
          icon={Mail}
          title="No email accounts"
          onAction={handleManageAccounts}
        />
      </div>
    );
  }

  // Sidebar content for reuse
  const sidebarContent = (
    <EmailSidebar
      accounts={accounts}
      folders={folders}
      isSyncing={isSyncing}
      selectedAccountId={selectedAccountId}
      selectedFolder={selectedFolder}
      onAccountChange={handleAccountChange}
      onCompose={handleCompose}
      onFolderSelect={(folder) => {
        handleFolderSelect(folder);
        setIsSidebarOpen(false);
      }}
      onManageAccounts={handleManageAccounts}
      onManageFolders={handleManageFolders}
      onSync={handleSync}
    />
  );

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Mobile Layout */}
      {!isDesktop && (
        <>
          {/* Mobile Header with Sidebar Toggle */}
          <div className="flex items-center gap-2 border-b p-3">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[280px] p-0" side="left">
                {sidebarContent}
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              <h2 className="font-semibold">{selectedFolder}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedAccount?.email ?? 'No account selected'}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleCompose}>
              Compose
            </Button>
          </div>

          {/* Mobile Message List */}
          <div className="flex flex-col border-r">
            {/* List Header */}
            <div className="border-b p-4">
              <h2 className="font-semibold">{selectedFolder}</h2>
              <p className="text-sm text-muted-foreground">{messages.length} messages</p>
            </div>

            {/* Message List */}
            <MessageList
              isLoading={isLoadingMessages}
              messages={messages}
              selectedIds={selectedIds}
              selectedMessageId={selectedMessageId}
              selectedThreadId={selectedThreadId}
              showThreads={showThreads}
              threads={threads}
              onMessageSelect={handleMessageSelect}
              onSelectionChange={setSelectedIds}
              onThreadSelect={handleThreadSelect}
              onToggleRead={handleToggleMessageRead}
              onToggleStar={handleToggleMessageStar}
            />
          </div>

          {/* Mobile Message View */}
          {selectedMessageId && (
            <div className="flex flex-1 flex-col">
              <MessageView
                message={selectedMessage}
                onBack={() => setSelectedMessageId(null)}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onToggleStar={handleToggleStar}
                onMarkAsRead={handleMarkAsRead}
                onDownloadAttachment={handleDownloadAttachment}
              />
            </div>
          )}
        </>
      )}

      {/* Desktop Layout */}
      {isDesktop && (
        <>
          {/* Desktop Sidebar - Resizable */}
          <div 
            ref={sidebarPanel.panelRef}
            className="relative shrink-0 bg-muted/30"
            style={{ width: `${sidebarPanel.width}px` }}
          >
            {sidebarContent}
          </div>
          {/* Resize handle - between sidebar and message list */}
          <div
            className={cn(
              'w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 transition-colors',
              sidebarPanel.isResizing && 'bg-primary'
            )}
            onMouseDown={sidebarPanel.handleMouseDown}
            title="Drag to resize"
          />

          {/* Message List - Resizable on desktop, always visible */}
          <div
            ref={messageListPanel.panelRef}
            className="relative flex flex-col bg-background shrink-0"
            style={{ width: `${messageListPanel.width}px` }}
          >
            {/* List Header */}
            <div className="border-b p-4">
              <h2 className="font-semibold">{selectedFolder}</h2>
              <p className="text-sm text-muted-foreground">{messages.length} messages</p>
            </div>

            {/* Message List */}
            <MessageList
              isLoading={isLoadingMessages}
              messages={messages}
              selectedIds={selectedIds}
              selectedMessageId={selectedMessageId}
              selectedThreadId={selectedThreadId}
              showThreads={showThreads}
              threads={threads}
              onMessageSelect={handleMessageSelect}
              onSelectionChange={setSelectedIds}
              onThreadSelect={handleThreadSelect}
              onToggleRead={handleToggleMessageRead}
              onToggleStar={handleToggleMessageStar}
            />
          </div>
          {/* Second resize handle - between message list and message view */}
          <div
            className={cn(
              'w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 transition-colors',
              messageListPanel.isResizing && 'bg-primary'
            )}
            onMouseDown={messageListPanel.handleMouseDown}
            title="Drag to resize message list"
          />

          {/* Message View - Takes remaining space */}
          <div className="flex flex-1 flex-col">
            <MessageView
              message={selectedMessage}
              onArchive={handleArchive}
              onBack={handleBack}
              onDelete={handleDelete}
              onDownloadAttachment={handleDownloadAttachment}
              onForward={handleForward}
              onMarkAsRead={handleMarkAsRead}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onToggleStar={handleToggleStar}
            />
          </div>
        </>
      )}
      
      {/* Message Composer Dialog */}
      {composerOpen && selectedAccountId && (
        <MessageComposer
          isOpen={composerOpen}
          mode={composerMode}
          replyTo={replyToMessage}
          accountId={selectedAccountId}
          accountEmail={selectedAccount?.email ?? ''}
          onClose={() => setComposerOpen(false)}
          onSaveDraft={() => {}}
          onSend={handleSend}
        />
      )}

      {/* Folder Manager Dialog */}
      {folderManagerOpen && selectedAccountId && (
        <FolderManager
          accountId={selectedAccountId}
          folders={folders}
          open={folderManagerOpen}
          onFolderCreated={handleFolderCreated}
          onFolderDeleted={handleFolderDeleted}
          onFolderRenamed={handleFolderRenamed}
          onOpenChange={setFolderManagerOpen}
        />
      )}
    </div>
  );
}
