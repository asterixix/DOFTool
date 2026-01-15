/**
 * Email Threading Utilities
 * Implements conversation threading based on Message-ID, In-Reply-To, and References headers
 */

import type { EmailMessage, EmailThread, ThreadNode } from '../types/Email.types';

/**
 * Extract thread ID from email headers
 * Uses References header to find the root message ID
 */
export function extractThreadId(message: EmailMessage): string {
  // If message has references, use the first one (root message)
  const firstReference = message.references?.[0];
  if (firstReference) {
    return firstReference;
  }

  // If message has In-Reply-To, use that
  if (message.inReplyTo) {
    return message.inReplyTo;
  }

  // Otherwise, this is the root message
  return message.messageId;
}

/**
 * Parse References header into array of message IDs
 */
export function parseReferences(references?: string[]): string[] {
  if (!references || references.length === 0) {
    return [];
  }

  // References is an array of message IDs
  return references.filter(Boolean);
}

/**
 * Build thread tree from flat list of messages
 */
export function buildThreadTree(messages: EmailMessage[]): ThreadNode[] {
  // Create a map of all messages by message ID
  const messageMap = new Map<string, EmailMessage>();
  const nodeMap = new Map<string, ThreadNode>();

  // First pass: Create nodes for all messages
  for (const message of messages) {
    messageMap.set(message.messageId, message);
    nodeMap.set(message.messageId, {
      message,
      children: [],
      depth: 0,
    });
  }

  // Second pass: Build parent-child relationships
  const roots: ThreadNode[] = [];

  for (const message of messages) {
    const node = nodeMap.get(message.messageId);
    if (!node) {
      continue;
    }

    // Find parent
    const parentId = message.inReplyTo ?? message.references?.[message.references.length - 1];

    const parentNode = parentId ? nodeMap.get(parentId) : undefined;
    if (parentNode) {
      // This message is a reply
      parentNode.children.push(node);
      node.depth = parentNode.depth + 1;
    } else {
      // This message is a root (no parent in current set)
      roots.push(node);
    }
  }

  // Sort roots by date (newest first)
  roots.sort((a, b) => b.message.date - a.message.date);

  // Sort children recursively
  function sortChildren(node: ThreadNode): void {
    node.children.sort((a, b) => a.message.date - b.message.date);
    node.children.forEach(sortChildren);
  }

  roots.forEach(sortChildren);

  return roots;
}

/**
 * Group messages into threads
 */
export function groupIntoThreads(messages: EmailMessage[]): EmailThread[] {
  // Group messages by thread ID
  const threadGroups = new Map<string, EmailMessage[]>();

  for (const message of messages) {
    const threadId = extractThreadId(message);
    const existingGroup = threadGroups.get(threadId);

    if (existingGroup) {
      existingGroup.push(message);
    } else {
      threadGroups.set(threadId, [message]);
    }
  }

  // Convert groups to threads
  const threads: EmailThread[] = [];

  for (const [threadId, threadMessages] of threadGroups.entries()) {
    // Sort messages by date
    threadMessages.sort((a, b) => a.date - b.date);

    // Skip empty groups (shouldn't happen but be safe)
    if (threadMessages.length === 0) {
      continue;
    }

    // Find root message (first message in thread)
    const rootMessage = threadMessages[0];

    // Calculate thread metadata
    const unreadCount = threadMessages.filter((m) => !m.read).length;
    const latestMessage = threadMessages[threadMessages.length - 1];
    const participantEmails = new Set<string>();

    // Collect all participants
    for (const msg of threadMessages) {
      participantEmails.add(msg.from.address);
      msg.to.forEach((addr) => participantEmails.add(addr.address));
      msg.cc?.forEach((addr) => participantEmails.add(addr.address));
    }

    threads.push({
      id: threadId,
      subject: rootMessage?.subject ?? 'No Subject',
      messageIds: threadMessages.map((m) => m.messageId),
      messages: threadMessages,
      participantCount: participantEmails.size,
      messageCount: threadMessages.length,
      unreadCount,
      latestDate: latestMessage?.date ?? Date.now(),
      snippet: latestMessage?.snippet ?? '',
      hasAttachments: threadMessages.some((m) => m.attachments.length > 0),
      isStarred: threadMessages.some((m) => m.starred),
    });
  }

  // Sort threads by latest message date (newest first)
  threads.sort((a, b) => b.latestDate - a.latestDate);

  return threads;
}

/**
 * Get all messages in a thread
 */
export function getThreadMessages(threadId: string, allMessages: EmailMessage[]): EmailMessage[] {
  return allMessages.filter((message) => {
    const msgThreadId = extractThreadId(message);
    return msgThreadId === threadId;
  });
}

/**
 * Get thread hierarchy (nested structure)
 */
export function getThreadHierarchy(
  threadId: string,
  allMessages: EmailMessage[]
): ThreadNode | null {
  const threadMessages = getThreadMessages(threadId, allMessages);

  if (threadMessages.length === 0) {
    return null;
  }

  // Build tree
  const trees = buildThreadTree(threadMessages);

  // For a thread, there should be one root
  // If there are multiple roots, create a virtual root
  const firstTree = trees[0];
  if (trees.length === 1 && firstTree) {
    return firstTree;
  }

  // Multiple roots - create virtual root
  const rootMessage = threadMessages[0];
  if (!rootMessage) {
    return null;
  }
  return {
    message: rootMessage,
    children: trees,
    depth: 0,
  };
}

/**
 * Flatten thread tree into linear list (depth-first)
 */
export function flattenThreadTree(root: ThreadNode): EmailMessage[] {
  const result: EmailMessage[] = [root.message];

  for (const child of root.children) {
    result.push(...flattenThreadTree(child));
  }

  return result;
}

/**
 * Get reply chain for a message (all ancestors)
 */
export function getReplyChain(message: EmailMessage, allMessages: EmailMessage[]): EmailMessage[] {
  const chain: EmailMessage[] = [message];
  const messageMap = new Map(allMessages.map((m) => [m.messageId, m]));

  let current = message;

  while (current.inReplyTo) {
    const parent = messageMap.get(current.inReplyTo);
    if (!parent) {
      break;
    }
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

/**
 * Check if message is part of a thread
 */
export function isThreaded(message: EmailMessage): boolean {
  return !!(message.inReplyTo ?? (message.references && message.references.length > 0));
}

/**
 * Calculate thread depth (how many replies deep)
 */
export function calculateThreadDepth(message: EmailMessage): number {
  if (!message.references) {
    return 0;
  }
  return message.references.length;
}

/**
 * Generate thread subject (strip Re: / Fwd: prefixes)
 */
export function normalizeThreadSubject(subject: string): string {
  if (!subject) {
    return '';
  }

  // Remove Re: and Fwd: prefixes (case insensitive, multiple occurrences)
  let normalized = subject;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const before = normalized;
    normalized = normalized.replace(/^(Re:|Fwd?:)\s*/i, '').trim();

    if (normalized === before) {
      break;
    }
  }

  return normalized;
}

/**
 * Check if two messages belong to the same thread
 */
export function isSameThread(msg1: EmailMessage, msg2: EmailMessage): boolean {
  return extractThreadId(msg1) === extractThreadId(msg2);
}

/**
 * Get thread statistics
 */
export function getThreadStats(
  threadId: string,
  allMessages: EmailMessage[]
): {
  messageCount: number;
  unreadCount: number;
  participantCount: number;
  hasAttachments: boolean;
  dateRange: { start: number; end: number };
} {
  const threadMessages = getThreadMessages(threadId, allMessages);

  const unreadCount = threadMessages.filter((m) => !m.read).length;
  const hasAttachments = threadMessages.some((m) => m.attachments.length > 0);

  const participants = new Set<string>();
  for (const msg of threadMessages) {
    participants.add(msg.from.address);
    msg.to.forEach((addr) => participants.add(addr.address));
    msg.cc?.forEach((addr) => participants.add(addr.address));
  }

  const dates = threadMessages.map((m) => m.date).sort((a, b) => a - b);
  const now = Date.now();

  return {
    messageCount: threadMessages.length,
    unreadCount,
    participantCount: participants.size,
    hasAttachments,
    dateRange: {
      start: dates[0] ?? now,
      end: dates[dates.length - 1] ?? now,
    },
  };
}

/**
 * Mark entire thread as read/unread
 */
export function getThreadMessageIds(threadId: string, allMessages: EmailMessage[]): string[] {
  return getThreadMessages(threadId, allMessages).map((m) => m.id);
}

/**
 * Find related threads (same participants or subject)
 */
export function findRelatedThreads(
  threadId: string,
  allThreads: EmailThread[],
  allMessages: EmailMessage[]
): EmailThread[] {
  const threadMessages = getThreadMessages(threadId, allMessages);
  if (threadMessages.length === 0) {
    return [];
  }

  // Get participants from current thread
  const threadParticipants = new Set<string>();
  for (const msg of threadMessages) {
    threadParticipants.add(msg.from.address);
    msg.to.forEach((addr) => threadParticipants.add(addr.address));
    msg.cc?.forEach((addr) => threadParticipants.add(addr.address));
  }

  // Get normalized subject
  const firstMessage = threadMessages[0];
  if (!firstMessage) {
    return [];
  }
  const normalizedSubject = normalizeThreadSubject(firstMessage.subject);

  // Find threads with overlapping participants or similar subject
  return allThreads.filter((thread) => {
    if (thread.id === threadId) {
      return false; // Skip self
    }

    const otherMessages = getThreadMessages(thread.id, allMessages);
    const firstOtherMessage = otherMessages[0];
    if (!firstOtherMessage) {
      return false;
    }

    // Check subject similarity
    const otherSubject = normalizeThreadSubject(firstOtherMessage.subject);
    if (otherSubject === normalizedSubject) {
      return true;
    }

    // Check participant overlap
    const otherParticipants = new Set<string>();
    for (const msg of otherMessages) {
      otherParticipants.add(msg.from.address);
      msg.to.forEach((addr) => otherParticipants.add(addr.address));
      msg.cc?.forEach((addr) => otherParticipants.add(addr.address));
    }

    // Calculate overlap
    const overlap = [...threadParticipants].filter((p) => otherParticipants.has(p));
    const overlapPercentage = overlap.length / threadParticipants.size;

    return overlapPercentage > 0.5; // 50% participant overlap
  });
}
