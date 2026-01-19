/**
 * Email Search Indexer Utilities
 * Helper functions for building and maintaining search indexes
 */

import type { EmailMessage } from '../types/Email.types';

/**
 * Extract searchable text from email message
 */
export function extractSearchableText(message: EmailMessage): {
  subject: string;
  bodyText: string;
  sender: string;
  recipients: string[];
  attachmentNames: string[];
} {
  // Extract text from HTML body if needed
  let bodyText = message.textBody ?? '';
  if (!bodyText && message.htmlBody) {
    // Simple HTML stripping (basic implementation)
    bodyText = message.htmlBody
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract recipients
  const recipients = [
    ...message.to.map((addr) => addr.address),
    ...(message.cc?.map((addr) => addr.address) ?? []),
  ];

  // Extract attachment names
  const attachmentNames = message.attachments.map((att) => att.filename);

  return {
    subject: message.subject,
    bodyText,
    sender: message.from.address,
    recipients,
    attachmentNames,
  };
}

/**
 * Tokenize search query for boolean operators
 */
export function parseSearchQuery(query: string): {
  terms: string[];
  excludeTerms: string[];
  requiredTerms: string[];
} {
  const terms: string[] = [];
  const excludeTerms: string[] = [];
  const requiredTerms: string[] = [];

  // Split query by spaces, preserving quoted strings and prefixed quoted strings
  // Matches: -"quoted", +"quoted", "quoted", or non-whitespace sequences
  const tokens = query.match(/[-+]?"[^"]+"|"[^"]+"|\S+/g) ?? [];

  for (const token of tokens) {
    if (token.startsWith('-"') || token.startsWith('-')) {
      // Exclude term - handle both -"quoted" and -unquoted
      const content = token.startsWith('-"')
        ? token.slice(2, -1) // Remove -" and trailing "
        : token.slice(1).replace(/^"|"$/g, '');
      if (content) {
        excludeTerms.push(content);
      }
    } else if (token.startsWith('+"') || token.startsWith('+')) {
      // Required term - handle both +"quoted" and +unquoted
      const content = token.startsWith('+"')
        ? token.slice(2, -1) // Remove +" and trailing "
        : token.slice(1).replace(/^"|"$/g, '');
      if (content) {
        requiredTerms.push(content);
      }
    } else {
      // Regular term
      const content = token.replace(/^"|"$/g, '');
      if (content) {
        terms.push(content);
      }
    }
  }

  return { terms, excludeTerms, requiredTerms };
}

/**
 * Build search query string from parsed terms
 */
export function buildSearchQuery(parsed: {
  terms: string[];
  excludeTerms: string[];
  requiredTerms: string[];
}): string {
  const parts: string[] = [];

  for (const term of parsed.requiredTerms) {
    parts.push(`+${term}`);
  }

  for (const term of parsed.terms) {
    parts.push(term);
  }

  for (const term of parsed.excludeTerms) {
    parts.push(`-${term}`);
  }

  return parts.join(' ');
}
