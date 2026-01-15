/**
 * Email Module - Main entry point
 *
 * Provides a complete email client with:
 * - IMAP/SMTP integration for external email accounts
 * - Multi-account support
 * - Threading and conversation grouping
 * - Rich text composition
 * - Secure HTML rendering with XSS protection
 * - Internal family messaging
 */

import { Routes, Route } from 'react-router-dom';

import { EmailClient } from './components';

// Re-export all public APIs
export type * from './types';
export * from './hooks';
export * from './stores';
export { EmailClient, EmailSidebar, MessageList, MessageView, MessageComposer } from './components';
export * from './utils';

export default function EmailModule(): JSX.Element {
  return (
    <Routes>
      <Route index element={<EmailClient />} />
      <Route element={<EmailClient />} path="compose" />
      <Route element={<EmailClient />} path="message/:id" />
      <Route element={<EmailClient />} path="folder/:folder" />
    </Routes>
  );
}
