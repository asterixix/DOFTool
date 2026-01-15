/**
 * Email HTML Sanitization Utilities
 * Uses DOMPurify to sanitize HTML email content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitization configuration presets
 */
export const SANITIZE_CONFIG = {
  /**
   * Strict mode - only allows basic formatting
   * Blocks: images, links, scripts, styles, forms
   */
  STRICT: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'b',
      'i',
      'span',
      'div',
      'blockquote',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'code',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    ALLOWED_ATTR: ['style', 'class', 'dir'],
    ALLOWED_STYLES: {
      '*': {
        color: [/^#[0-9A-Fa-f]+$/, /^rgb\(/],
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'background-color': [/^#[0-9A-Fa-f]+$/, /^rgb\(/],
        'font-size': [/^[0-9]+px$/, /^[0-9]+pt$/],
        'font-weight': [/^bold$/, /^normal$/, /^[0-9]+$/],
        'font-style': [/^italic$/, /^normal$/],
        'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
      },
    },
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: true,
  },

  /**
   * Default mode - allows images and links but blocks external content
   * Optimized for better email rendering
   */
  DEFAULT: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'b',
      'i',
      'span',
      'div',
      'blockquote',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'code',
      'hr',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'font',
      'center',
      'small',
      'big',
      'sub',
      'sup',
      'del',
      'ins',
      'strike',
      'tt',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'style',
      'class',
      'dir',
      'width',
      'height',
      'color',
      'size',
      'face',
      'align',
      'bgcolor',
      'background',
      'border',
      'cellpadding',
      'cellspacing',
      'valign',
      'rowspan',
      'colspan',
      'nowrap',
      'vspace',
      'hspace',
      'target',
      'rel',
      'type',
      'id',
      'name',
      'lang',
    ],
    ALLOWED_STYLES: {
      '*': {
        // Allow most CSS properties for better email rendering
        color: true,
        background: true,
        'background-color': true,
        'background-image': true,
        'font-size': true,
        'font-weight': true,
        'font-style': true,
        'text-decoration': true,
        'text-align': true,
        'font-family': true,
        'line-height': true,
        'letter-spacing': true,
        margin: true,
        'margin-top': true,
        'margin-bottom': true,
        'margin-left': true,
        'margin-right': true,
        padding: true,
        'padding-top': true,
        'padding-bottom': true,
        'padding-left': true,
        'padding-right': true,
        border: true,
        'border-color': true,
        'border-width': true,
        'border-style': true,
        'border-radius': true,
        width: true,
        height: true,
        'max-width': true,
        'min-width': true,
        'max-height': true,
        'min-height': true,
        display: true,
        float: true,
        clear: true,
        'vertical-align': true,
        'white-space': true,
        'word-wrap': true,
        'word-break': true,
        'text-indent': true,
        'list-style': true,
        'list-style-type': true,
        'list-style-position': true,
        'text-transform': true,
        'text-shadow': true,
        'box-shadow': true,
        opacity: true,
        transform: true,
        transition: true,
      },
    },
    ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto|tel):\/|data:image\/|data:font\/|cid:)/i,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'select',
      'textarea',
      'meta',
      'link',
      'base',
    ],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onreset',
      'onselect',
      'onunload',
      'onabort',
      'ondblclick',
      'onmousedown',
      'onmouseup',
      'onmousemove',
      'onmouseout',
      'onkeypress',
      'onkeydown',
      'onkeyup',
      'onresize',
      'onscroll',
      'ontouchstart',
      'ontouchend',
      'ontouchmove',
      'javascript:',
      'vbscript:',
      'data:text/html',
      'data:text/javascript',
    ],
    KEEP_CONTENT: true,
  },

  /**
   * Allow external mode - allows external images (privacy concern)
   * Use only when user explicitly allows external content
   */
  ALLOW_EXTERNAL: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'b',
      'i',
      'span',
      'div',
      'blockquote',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'code',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'font',
      'center',
      'align',
      'bgcolor',
      'color',
      'size',
      'face',
      'background',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'style',
      'class',
      'dir',
      'width',
      'height',
      'color',
      'size',
      'face',
      'align',
      'bgcolor',
      'background',
      'border',
      'cellpadding',
      'cellspacing',
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'select',
      'textarea',
    ],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onreset',
      'onselect',
      'onunload',
      'onabort',
      'ondblclick',
      'onmousedown',
      'onmouseup',
      'onmousemove',
      'onmouseout',
      'onkeypress',
      'onkeydown',
      'onkeyup',
      'onresize',
      'onscroll',
      'javascript:',
      'vbscript:',
      'data:text/html',
    ],
    KEEP_CONTENT: true,
  },
} as const;

export type SanitizeMode = 'strict' | 'default' | 'allow_external';

/**
 * Decode quoted-printable content
 */
function decodeQuotedPrintable(text: string): string {
  if (!text) {
    return '';
  }

  // Replace =XX hex codes with actual characters
  let decoded = text.replace(/=([0-9A-Fa-f]{2})/g, (_match: string, hex: string) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Replace soft line breaks (= at end of line)
  decoded = decoded.replace(/=\r?\n/g, '');
  decoded = decoded.replace(/=\n/g, '');

  return decoded;
}

/**
 * Fix broken HTML entities after quoted-printable decoding
 */
function fixHtmlEntities(html: string): string {
  if (!html) {
    return '';
  }

  // Fix broken entities like &nb= sp; -> &nbsp;
  let fixed = html.replace(/&nb= sp;/gi, '&nbsp;');

  // Fix broken numeric entities like &#= 204; -> &#204;
  fixed = fixed.replace(/&#=\s*(\d+);/gi, '&#$1;');
  fixed = fixed.replace(/&#=\s*([0-9A-Fa-f]+);/gi, '&#x$1;');

  // Fix other common broken entities
  fixed = fixed.replace(/&lt=;/gi, '&lt;');
  fixed = fixed.replace(/&gt=;/gi, '&gt;');
  fixed = fixed.replace(/&amp=;/gi, '&amp;');
  fixed = fixed.replace(/&quot=;/gi, '&quot;');

  return fixed;
}

/**
 * Normalize HTML entities and special characters
 */
export function normalizeHtmlEntities(html: string): string {
  if (!html) {
    return '';
  }

  // Create a temporary element to decode HTML entities
  const temp = document.createElement('textarea');
  temp.innerHTML = html;
  const decoded = temp.value;

  // Ensure proper encoding meta tag if missing
  if (!decoded.includes('charset') && !decoded.includes('encoding')) {
    // Add meta tag right after <head> if it exists, or at the beginning
    const headMatch = decoded.match(/<head[^>]*>/i);
    if (headMatch) {
      return decoded.replace(headMatch[0], `${headMatch[0]}<meta charset="utf-8">`);
    } else {
      // Insert at the beginning of the document
      return `<meta charset="utf-8">${decoded}`;
    }
  }

  return decoded;
}

/**
 * Remove inline event handlers and dangerous attributes before sanitization
 */
function removeInlineEventHandlers(html: string): string {
  if (!html) {
    return '';
  }

  // First decode quoted-printable content
  let decoded = decodeQuotedPrintable(html);

  // Fix broken HTML entities
  decoded = fixHtmlEntities(decoded);

  // Remove all on* event handlers
  let cleaned = decoded.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: and vbscript: protocols
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/vbscript:/gi, '');
  cleaned = cleaned.replace(/data:text\/html/gi, '');

  // Remove script tags completely
  cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gis, '');
  cleaned = cleaned.replace(/<script[^>]*>/gi, '');

  return cleaned;
}

/**
 * Sanitize HTML email content
 */
export function sanitizeHtml(
  html: string,
  mode: SanitizeMode = 'default',
  options?: Partial<DOMPurify.Config>
): string {
  if (!html) {
    return '';
  }

  // Pre-clean HTML to handle entities and remove inline event handlers
  const normalized = normalizeHtmlEntities(html);
  const preCleaned = removeInlineEventHandlers(normalized);

  // Get base config for mode
  const baseConfig = SANITIZE_CONFIG[mode.toUpperCase() as keyof typeof SANITIZE_CONFIG];

  // Merge with custom options - spread base config to make it mutable
  // Use type assertion to avoid exactOptionalPropertyTypes conflicts with DOMPurify
  type ConfigWithAllowedUri = { readonly ALLOWED_URI_REGEXP: RegExp };
  const allowedUriRegexp =
    'ALLOWED_URI_REGEXP' in baseConfig
      ? (baseConfig as ConfigWithAllowedUri).ALLOWED_URI_REGEXP
      : undefined;

  const config = {
    ALLOWED_TAGS: [...baseConfig.ALLOWED_TAGS],
    ALLOWED_ATTR: [...baseConfig.ALLOWED_ATTR],
    ALLOW_DATA_ATTR: baseConfig.ALLOW_DATA_ATTR,
    FORBID_TAGS: [...baseConfig.FORBID_TAGS],
    FORBID_ATTR: [...baseConfig.FORBID_ATTR],
    KEEP_CONTENT: baseConfig.KEEP_CONTENT,
    ...(allowedUriRegexp ? { ALLOWED_URI_REGEXP: allowedUriRegexp } : {}),
    ...options,
  };

  // Sanitize - use unknown cast to bypass exactOptionalPropertyTypes strict checking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean = DOMPurify.sanitize(
    preCleaned,
    config as unknown as Parameters<typeof DOMPurify.sanitize>[1]
  );

  return clean;
}

/**
 * Extract plain text from HTML
 * Strips all HTML tags and returns clean text
 */
export function htmlToPlainText(html: string): string {
  if (!html) {
    return '';
  }

  // First sanitize to remove dangerous content
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });

  // Clean up whitespace
  return sanitized
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
    .trim();
}

/**
 * Generate email preview snippet (first N characters of plain text)
 */
export function generatePreview(html: string, maxLength: number = 150): string {
  const plainText = htmlToPlainText(html);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Truncate at word boundary
  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    // If we can truncate at a word boundary without losing too much
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Check if HTML contains external images
 * Returns true if email has images from external sources
 */
export function hasExternalImages(html: string): boolean {
  if (!html) {
    return false;
  }

  // Look for img tags with external src
  const imgRegex = /<img[^>]+src=["']?(https?:\/\/[^"'\s>]+)["']?[^>]*>/gi;
  const matches = html.match(imgRegex);

  return matches !== null && matches.length > 0;
}

/**
 * Block external images by replacing src with placeholder
 */
export function blockExternalImages(html: string): string {
  if (!html) {
    return '';
  }

  // Replace external image sources with data URI placeholder
  const placeholder =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-size="12" text-anchor="middle" dy=".3em" fill="%23999"%3EImage blocked%3C/text%3E%3C/svg%3E';

  return html.replace(
    /<img([^>]+)src=["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi,
    `<img$1src="${placeholder}"$3 data-original-src="$2">`
  );
}

/**
 * Unblock external images (restore original src from data attribute)
 */
export function unblockExternalImages(html: string): string {
  if (!html) {
    return '';
  }

  return html.replace(
    /<img([^>]+)src=["'][^"']*["']([^>]+)data-original-src=["']([^"']+)["']([^>]*)>/gi,
    '<img$1src="$3"$2$4>'
  );
}

/**
 * Sanitize and prepare email for display
 * Main function that combines sanitization with image blocking
 */
export function prepareEmailForDisplay(
  html: string,
  options: {
    mode?: SanitizeMode;
    blockImages?: boolean;
    maxImageSize?: number;
  } = {}
): {
  html: string;
  hasExternalImages: boolean;
  snippet: string;
} {
  const { mode = 'default', blockImages = true } = options;

  if (!html) {
    return {
      html: '',
      hasExternalImages: false,
      snippet: '',
    };
  }

  // Check for external images
  const hasExternal = hasExternalImages(html);

  // Sanitize HTML
  let sanitized = sanitizeHtml(html, mode);

  // Block external images if requested
  if (blockImages && hasExternal) {
    sanitized = blockExternalImages(sanitized);
  }

  // Generate preview snippet
  const snippet = generatePreview(html);

  const result = {
    html: sanitized,
    hasExternalImages: hasExternal,
    snippet,
  };

  return result;
}

/**
 * Sanitize email for composing/reply
 * More permissive than display mode
 */
export function sanitizeForCompose(html: string): string {
  // Use allow_external mode for compose
  return sanitizeHtml(html, 'allow_external');
}

/**
 * Remove tracking pixels and beacons
 */
export function removeTrackingPixels(html: string): string {
  if (!html) {
    return '';
  }

  // Remove 1x1 images (common tracking pixels)
  let cleaned = html.replace(/<img[^>]*width=["']?1["']?[^>]*height=["']?1["']?[^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*height=["']?1["']?[^>]*width=["']?1["']?[^>]*>/gi, '');

  // Remove images with tracking domains (common trackers)
  const trackingDomains = [
    'track',
    'analytics',
    'pixel',
    'beacon',
    'tracking',
    'counter',
    'open',
    'click',
  ];

  const trackingRegex = new RegExp(
    `<img[^>]*src=["']?https?://[^"']*(?:${trackingDomains.join('|')})[^"']*["']?[^>]*>`,
    'gi'
  );

  cleaned = cleaned.replace(trackingRegex, '');

  return cleaned;
}

/**
 * Validate HTML doesn't contain malicious content
 * Returns error message if content is dangerous, null otherwise
 */
export function validateEmailHtml(html: string): string | null {
  if (!html) {
    return null;
  }

  // Check for common XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /onmouseover=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /@import/i,
    /expression\(/i,
    /vbscript:/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(html)) {
      return `Potentially dangerous content detected: ${pattern.source}`;
    }
  }

  return null;
}
