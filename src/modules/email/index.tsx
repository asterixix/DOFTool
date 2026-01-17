/**
 * Email Module - Main entry point
 *
 * NOTE: This module is currently blocked/building. Functionality is disabled
 * and shows a building state instead. See STATUS.md for more information.
 *
 * Planned features:
 * - IMAP/SMTP integration for external email accounts
 * - Multi-account support
 * - Threading and conversation grouping
 * - Rich text composition
 * - Secure HTML rendering with XSS protection
 * - Internal family messaging
 */

import { Mail } from 'lucide-react';

import { LoadingSpinner } from '@/shared/components';

// Re-export all public APIs (types only - functionality is blocked)
export type * from './types';
// Note: hooks, stores, and components are not exported during building phase
// export * from './hooks';
// export * from './stores';
// export { EmailClient, EmailSidebar, MessageList, MessageView, MessageComposer } from './components';
// export * from './utils';

/**
 * EmailModule - Currently shows building state
 *
 * This module is temporarily disabled while being rebuilt.
 * All routes show the building placeholder instead of actual functionality.
 */
function EmailBuildingPlaceholder(): JSX.Element {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background p-8">
      <div className="flex flex-col items-center gap-4">
        <Mail className="h-16 w-16 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold">Email Module Building</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The email module is currently being rebuilt. Please check back soon.
          </p>
        </div>
        <LoadingSpinner fullScreen={false} size="lg" text="Building email functionality..." />
      </div>
    </div>
  );
}

export default function EmailModule(): JSX.Element {
  // Temporarily blocked - show building state instead of actual functionality
  return <EmailBuildingPlaceholder />;

  // Original implementation (disabled):
  // return (
  //   <Routes>
  //     <Route index element={<EmailClient />} />
  //     <Route element={<EmailClient />} path="compose" />
  //     <Route element={<EmailClient />} path="message/:id" />
  //     <Route element={<EmailClient />} path="folder/:folder" />
  //   </Routes>
  // );
}
