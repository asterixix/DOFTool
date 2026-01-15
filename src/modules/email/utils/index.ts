/**
 * Email Utilities - Barrel Export
 */

export {
  sanitizeHtml,
  prepareEmailForDisplay,
  htmlToPlainText,
  generatePreview,
  hasExternalImages,
  blockExternalImages,
  unblockExternalImages,
  removeTrackingPixels,
  validateEmailHtml,
  sanitizeForCompose,
  SANITIZE_CONFIG,
  type SanitizeMode,
} from './sanitize';

export {
  groupIntoThreads,
  extractThreadId,
  buildThreadTree,
  getThreadMessages,
  getThreadHierarchy,
  flattenThreadTree,
  getReplyChain,
  isThreaded,
  calculateThreadDepth,
  normalizeThreadSubject,
  isSameThread,
  getThreadStats,
  getThreadMessageIds,
  findRelatedThreads,
} from './threading';

export {
  validateEmail,
  validateHost,
  validatePort,
  validateTimeout,
  validateRetryConfig,
  validateRateLimitConfig,
  validateConnectionPoolConfig,
  validateOAuth2Config,
  validateIncomingServerConfig,
  validateOutgoingServerConfig,
  validateEmailAccountSettings,
  validateCreateEmailAccountInput,
  sanitizeEmailConfig,
  type ValidationError,
  type ValidationResult,
} from './emailSettingsValidation';
