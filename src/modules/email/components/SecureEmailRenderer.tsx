/**
 * SecureEmailRenderer Component
 * Renders HTML email content with enhanced security and performance
 */

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';

import { AlertCircle, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';

import { prepareEmailForDisplay } from '../utils/sanitize';

interface SecureEmailRendererProps {
  html: string;
  textBody?: string | undefined;
  blockExternalImages?: boolean;
  className?: string;
  onError?: (error: string) => void;
}

export function SecureEmailRenderer({
  html,
  textBody,
  blockExternalImages = true,
  className = '',
  onError,
}: SecureEmailRendererProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [renderMode, setRenderMode] = useState<'inline' | 'iframe' | 'text'>('inline');
  const [iframeHeight, setIframeHeight] = useState(300);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Determine if content needs iframe (only for very complex HTML)
  const needsIframe = useMemo(() => {
    if (!html) {return false;}
    // Only use iframe for emails with embedded styles or complex layouts
    const hasStyleTags = /<style[\s\S]*?>[\s\S]*?<\/style>/i.test(html);
    const hasComplexLayout = /<table[\s\S]*?>[\s\S]*?<\/table>[\s\S]*?<table/i.test(html);
    return hasStyleTags || hasComplexLayout;
  }, [html]);

  // Prepare email content with sanitization
  const { sanitizedHtml, displayMode, hasContent } = useMemo(() => {
    try {
      // No content at all
      if (!html && !textBody) {
        return { sanitizedHtml: '', displayMode: 'empty' as const, hasContent: false };
      }

      // Prefer HTML if available
      if (html && html.trim().length > 0) {
        const result = prepareEmailForDisplay(html, {
          mode: blockExternalImages ? 'default' : 'allow_external',
          blockImages: blockExternalImages,
        });
        return { sanitizedHtml: result.html, displayMode: 'html' as const, hasContent: true };
      }

      // Fall back to text body
      if (textBody && textBody.trim().length > 0) {
        const escapedText = escapeHtml(textBody);
        const htmlFromText = `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escapedText}</pre>`;
        return { sanitizedHtml: htmlFromText, displayMode: 'text' as const, hasContent: true };
      }

      return { sanitizedHtml: '', displayMode: 'empty' as const, hasContent: false };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process email content';
      setRenderError(errorMsg);
      onError?.(errorMsg);
      return { sanitizedHtml: '', displayMode: 'error' as const, hasContent: false };
    }
  }, [html, textBody, blockExternalImages, onError]);

  // Update render mode based on content analysis
  useEffect(() => {
    if (!hasContent) {
      setRenderMode('text');
    } else if (needsIframe && displayMode === 'html') {
      setRenderMode('iframe');
    } else {
      setRenderMode('inline');
    }
  }, [hasContent, needsIframe, displayMode]);

  // Handle iframe content and height adjustment
  const updateIframeContent = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || renderMode !== 'iframe' || !sanitizedHtml) {return;}

    const doc = iframe.contentDocument;
    if (!doc) {return;}

    // Build iframe document with minimal, optimized styling
    const isDark = document.documentElement.classList.contains('dark');
    const iframeContent = `
      <!DOCTYPE html>
      <html class="${isDark ? 'dark' : ''}">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob: cid:; style-src 'self' 'unsafe-inline';">
        <style>
          /* Minimal reset - let email styles shine through */
          html, body { 
            margin: 0; 
            padding: 16px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: ${isDark ? '#e5e7eb' : '#1f2937'};
            background: ${isDark ? '#1f2937' : '#ffffff'};
            word-wrap: break-word;
          }
          
          /* Responsive images */
          img { 
            max-width: 100% !important; 
            height: auto !important; 
          }
          
          /* Links */
          a { 
            color: ${isDark ? '#60a5fa' : '#2563eb'} !important; 
            text-decoration: underline; 
          }
          
          /* Dark mode adjustments */
          ${isDark ? `
            img:not([src^="data:"]) { opacity: 0.9; }
            table { border-color: #374151 !important; }
          ` : ''}
        </style>
      </head>
      <body>${sanitizedHtml}</body>
      </html>
    `;

    doc.open();
    doc.write(iframeContent);
    doc.close();

    // Simple height adjustment - no need to wait for all images
    const adjustHeight = (): void => {
      const body = doc.body;
      if (body) {
        const newHeight = Math.min(Math.max(body.scrollHeight + 32, 100), 2000);
        setIframeHeight(newHeight);
      }
    };

    // Adjust height immediately and once more after images load
    adjustHeight();
    if (doc.images.length > 0) {
      setTimeout(adjustHeight, 1000);
    }
  }, [renderMode, sanitizedHtml]);

  useEffect(() => {
    if (renderMode === 'iframe') {
      updateIframeContent();
    }
  }, [renderMode, updateIframeContent]);

  // Apply dark mode styles for inline rendering
  useEffect(() => {
    const container = containerRef.current;
    if (!container || renderMode !== 'inline') {return;}

    const isDarkMode =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDarkMode) {
      container.classList.add('email-dark-mode');
    } else {
      container.classList.remove('email-dark-mode');
    }

    // Simple image error handling for inline mode
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.hasAttribute('data-error-handled')) {
        img.setAttribute('data-error-handled', 'true');
        img.onerror = () => {
          // Simple placeholder
          img.style.display = 'none';
          const placeholder = document.createElement('div');
          placeholder.className = 'inline-block px-2 py-1 text-xs text-muted-foreground bg-muted border border-dashed rounded';
          placeholder.textContent = `Image: ${img.alt || 'Could not load'}`;
          img.parentNode?.replaceChild(placeholder, img);
        };
      }
    });
  }, [sanitizedHtml, renderMode]);

  // Empty state
  if (!hasContent || displayMode === 'empty') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', className)}>
        <FileText className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No content to display</p>
      </div>
    );
  }

  // Error state
  if (renderError || displayMode === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-4', className)}>
        <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">{renderError ?? 'Failed to render email content'}</p>
      </div>
    );
  }

  // Iframe rendering for complex HTML
  if (renderMode === 'iframe') {
    return (
      <iframe
        ref={iframeRef}
        className={cn('w-full rounded border-0', className)}
        sandbox="allow-same-origin allow-scripts"
        style={{ height: iframeHeight, minHeight: 100 }}
        title="Email content"
      />
    );
  }

  // Inline rendering (default)
  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      ref={containerRef}
      className={cn(
        'email-renderer max-w-full',
        // Minimal prose styles that don't interfere
        'prose-img:max-w-full prose-img:h-auto',
        'prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:underline',
        'prose-table:max-w-full prose-table:border-collapse',
        'prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-2 prose-pre:rounded',
        'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4',
        className
      )}
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        fontSize: '14px',
        lineHeight: '1.5',
        color: 'inherit',
      }}
    />
  );
}

/**
 * Escape HTML to prevent XSS when rendering text as HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
