/**
 * SecureEmailRenderer Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { SecureEmailRenderer } from './SecureEmailRenderer';

// Mock the email preparation utility
vi.mock('../utils/sanitize', () => ({
  prepareEmailForDisplay: vi
    .fn()
    .mockImplementation((html: string, options: Record<string, unknown>) => {
      let processedHtml = html;

      // Remove dangerous content
      processedHtml = processedHtml.replace(/<script[^>]*>.*?<\/script>/gis, '');
      processedHtml = processedHtml.replace(/on\w+="[^"]*"/gi, '');

      // Remove dangerous hrefs (handle both single and double quotes)
      processedHtml = processedHtml.replace(/href="javascript:[^"]*"/gi, 'href="#"');
      processedHtml = processedHtml.replace(/href='javascript:[^']*'/gi, "href='#'");
      processedHtml = processedHtml.replace(/href="data:[^"]*"/gi, 'href="#"');
      processedHtml = processedHtml.replace(/href='data:[^']*'/gi, "href='#'");

      // Block external images if requested
      if (options && options['blockImages']) {
        processedHtml = processedHtml.replace(
          /src="https?:\/\/[^"]+"/g,
          'src="data:image/gif;base64,blocked"'
        );
        processedHtml = processedHtml.replace(
          /src='https?:\/\/[^']+'/g,
          "src='data:image/gif;base64,blocked'"
        );
      }

      return { html: processedHtml, hasExternalImages: false, snippet: '' };
    }),
}));

describe('SecureEmailRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering HTML content', () => {
    it('should render simple HTML content', () => {
      render(<SecureEmailRenderer html="<div>Content</div>" />);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render formatted HTML elements', () => {
      render(<SecureEmailRenderer html="<p><strong>Bold</strong> and <em>italic</em></p>" />);

      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('and')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('should render links', () => {
      render(<SecureEmailRenderer html='<p><a href="https://example.com">Click here</a></p>' />);

      const link = screen.getByRole('link', { name: 'Click here' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('rendering plain text content', () => {
    it('should render plain text when no HTML is provided', () => {
      render(<SecureEmailRenderer html="" textBody="Plain text content" />);

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });

    it('should prefer HTML over text when both are provided', () => {
      render(<SecureEmailRenderer html="<p>HTML content</p>" textBody="Plain text fallback" />);

      expect(screen.getByText('HTML content')).toBeInTheDocument();
      expect(screen.queryByText('Plain text fallback')).not.toBeInTheDocument();
    });

    it('should fallback to text when HTML is empty', () => {
      render(<SecureEmailRenderer html="" textBody="Fallback text" />);

      expect(screen.getByText('Fallback text')).toBeInTheDocument();
    });

    it('should preserve line breaks in plain text', () => {
      render(<SecureEmailRenderer html="" textBody="Line 1\nLine 2\nLine 3" />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no content is provided', () => {
      render(<SecureEmailRenderer html="" textBody="" />);

      expect(screen.getByText('No content to display')).toBeInTheDocument();
    });

    it('should show empty message when both html and text are empty', () => {
      render(<SecureEmailRenderer html="" textBody="" />);

      expect(screen.getByText('No content to display')).toBeInTheDocument();
    });
  });

  describe('external image blocking', () => {
    it('should block external images by default', () => {
      const { container } = render(
        <SecureEmailRenderer html="<img src='http://example.com/image.jpg' alt='test' />" />
      );

      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).not.toBe('http://example.com/image.jpg');
    });

    it('should allow external images when blockExternalImages is false', () => {
      const { container } = render(
        <SecureEmailRenderer
          html="<img src='http://example.com/image.jpg' alt='test' />"
          blockExternalImages={false}
        />
      );

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'http://example.com/image.jpg');
    });

    it('should block tracking pixels', () => {
      const { container } = render(
        <SecureEmailRenderer html="<img src='http://malicious.com/track.png' width='1' height='1' />" />
      );

      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).not.toBe('http://malicious.com/track.png');
    });
  });

  describe('iframe rendering for complex HTML', () => {
    it('should use iframe for content with styles', () => {
      const { container } = render(
        <SecureEmailRenderer html="<html><head><style>body { color: red; }</style></head><body><p>Styled content</p></body></html>" />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should use iframe for content with scripts (which will be removed)', () => {
      const { container } = render(
        <SecureEmailRenderer html="<style>body { color: red; }</style><p>Content with styles</p>" />
      );

      // Should use iframe for complex HTML with style tags
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should sandbox iframe for security', () => {
      const { container } = render(
        <SecureEmailRenderer html="<html><head><style>body { color: red; }</style></head><body><p>Content</p></body></html>" />
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveAttribute('sandbox');
    });
  });

  describe('error handling', () => {
    it('should show error state on render error', () => {
      // Render with invalid content that might cause issues
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SecureEmailRenderer html={undefined as unknown as string} />);

      // Should gracefully handle and show empty state
      expect(screen.getByText('No content to display')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('XSS prevention', () => {
    it('should remove script tags', () => {
      render(<SecureEmailRenderer html='<p>Safe content</p><script>alert("xss")</script>' />);

      expect(screen.getByText('Safe content')).toBeInTheDocument();
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('should remove onclick handlers', () => {
      const { container } = render(
        <SecureEmailRenderer html='<p onclick="alert("xss")">Click me</p>' />
      );

      const paragraph = container.querySelector('p');
      expect(paragraph).not.toHaveAttribute('onclick');
    });

    it('should remove javascript: hrefs', () => {
      const { container } = render(
        <SecureEmailRenderer html='<a href="javascript:alert("xss")">Click</a>' />
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute('href')).not.toContain('javascript:');
    });

    it('should remove data: hrefs', () => {
      const { container } = render(
        <SecureEmailRenderer html="<a href='data:text/html,<script>alert(1)</script>'>Click</a>" />
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute('href')).not.toContain('data:');
    });
  });

  describe('accessibility', () => {
    it('should render content in a div element', () => {
      const { container } = render(
        <SecureEmailRenderer html="<p>Test content</p>" blockExternalImages={true} />
      );

      const emailRenderer = container.querySelector('.email-renderer');
      expect(emailRenderer).toBeInTheDocument();
    });

    it('should allow custom className', () => {
      const { container } = render(
        <SecureEmailRenderer
          html="<div class='test-class'>Content</div>"
          className="custom-wrapper"
        />
      );

      const wrapper = container.querySelector('.custom-wrapper');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('print styling', () => {
    it('should apply base styles', () => {
      const { container } = render(<SecureEmailRenderer html="<p>Simple content</p>" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('email-renderer');
    });
  });
});
