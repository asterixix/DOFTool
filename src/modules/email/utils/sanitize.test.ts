import { describe, it, expect } from 'vitest';

import {
  sanitizeHtml,
  htmlToPlainText,
  generatePreview,
  hasExternalImages,
  blockExternalImages,
  unblockExternalImages,
  prepareEmailForDisplay,
  sanitizeForCompose,
  removeTrackingPixels,
  validateEmailHtml,
  SANITIZE_CONFIG,
} from './sanitize';

describe('sanitize', () => {
  describe('SANITIZE_CONFIG', () => {
    it('should have STRICT config', () => {
      expect(SANITIZE_CONFIG.STRICT).toBeDefined();
      expect(SANITIZE_CONFIG.STRICT.ALLOWED_TAGS).toBeDefined();
      expect(SANITIZE_CONFIG.STRICT.FORBID_TAGS).toContain('script');
    });

    it('should have DEFAULT config', () => {
      expect(SANITIZE_CONFIG.DEFAULT).toBeDefined();
      expect(SANITIZE_CONFIG.DEFAULT.ALLOWED_TAGS).toContain('a');
      expect(SANITIZE_CONFIG.DEFAULT.ALLOWED_TAGS).toContain('img');
    });

    it('should have ALLOW_EXTERNAL config', () => {
      expect(SANITIZE_CONFIG.ALLOW_EXTERNAL).toBeDefined();
    });
  });

  describe('sanitizeHtml', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should allow basic formatting tags', () => {
      const html = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove onclick handlers', () => {
      const html = '<button onclick="alert(1)">Click</button>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    it('should apply strict mode', () => {
      const html = '<p>Text</p><img src="http://example.com/img.jpg">';
      const result = sanitizeHtml(html, 'strict');
      expect(result).not.toContain('<img');
    });

    it('should allow images in default mode', () => {
      const html = '<img src="data:image/png;base64,abc" alt="test">';
      const result = sanitizeHtml(html, 'default');
      expect(result).toContain('<img');
    });

    it('should preserve table structure', () => {
      const html = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<table>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<td>');
    });

    it('should remove iframe tags', () => {
      const html = '<iframe src="http://evil.com"></iframe>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<iframe');
    });
  });

  describe('htmlToPlainText', () => {
    it('should return empty string for empty input', () => {
      expect(htmlToPlainText('')).toBe('');
    });

    it('should strip HTML tags', () => {
      const html = '<p><strong>Hello</strong> <em>World</em></p>';
      const result = htmlToPlainText(html);
      expect(result).toBe('Hello World');
    });

    it('should collapse whitespace', () => {
      const html = '<p>Hello    World</p>';
      const result = htmlToPlainText(html);
      expect(result).not.toContain('    ');
    });

    it('should handle nested elements', () => {
      const html = '<div><p><span>Nested</span></p></div>';
      const result = htmlToPlainText(html);
      expect(result).toBe('Nested');
    });
  });

  describe('generatePreview', () => {
    it('should return short text as-is', () => {
      const html = '<p>Short text</p>';
      const result = generatePreview(html);
      expect(result).toBe('Short text');
    });

    it('should truncate long text', () => {
      const longText = 'A'.repeat(200);
      const html = `<p>${longText}</p>`;
      const result = generatePreview(html, 150);
      expect(result.length).toBeLessThanOrEqual(154); // 150 + "..."
      expect(result).toContain('...');
    });

    it('should respect maxLength parameter', () => {
      const html = '<p>This is a longer text that should be truncated</p>';
      const result = generatePreview(html, 20);
      expect(result.length).toBeLessThanOrEqual(24);
    });
  });

  describe('hasExternalImages', () => {
    it('should return false for empty input', () => {
      expect(hasExternalImages('')).toBe(false);
    });

    it('should return false for text without images', () => {
      expect(hasExternalImages('<p>No images here</p>')).toBe(false);
    });

    it('should return true for external http images', () => {
      const html = '<img src="http://example.com/image.jpg">';
      expect(hasExternalImages(html)).toBe(true);
    });

    it('should return true for external https images', () => {
      const html = '<img src="https://example.com/image.jpg">';
      expect(hasExternalImages(html)).toBe(true);
    });

    it('should return false for data URI images', () => {
      const html = '<img src="data:image/png;base64,abc123">';
      expect(hasExternalImages(html)).toBe(false);
    });

    it('should return false for cid images', () => {
      const html = '<img src="cid:image001@example.com">';
      expect(hasExternalImages(html)).toBe(false);
    });
  });

  describe('blockExternalImages', () => {
    it('should return empty string for empty input', () => {
      expect(blockExternalImages('')).toBe('');
    });

    it('should replace external image sources', () => {
      const html = '<img src="https://example.com/image.jpg">';
      const result = blockExternalImages(html);
      // Original URL is preserved in data-original-src but removed from src attribute
      // Check that src attribute now has placeholder, not the original URL
      expect(result).toMatch(/src="data:image\/svg\+xml/);
      expect(result).toContain('data-original-src');
    });

    it('should preserve original src in data attribute', () => {
      const html = '<img src="https://example.com/image.jpg">';
      const result = blockExternalImages(html);
      expect(result).toContain('data-original-src');
      expect(result).toContain('https://example.com/image.jpg');
    });

    it('should not block data URI images', () => {
      const html = '<img src="data:image/png;base64,abc">';
      const result = blockExternalImages(html);
      expect(result).toContain('data:image/png;base64,abc');
    });
  });

  describe('unblockExternalImages', () => {
    it('should return empty string for empty input', () => {
      expect(unblockExternalImages('')).toBe('');
    });

    it('should restore original image sources', () => {
      const blocked =
        '<img src="data:image/svg+xml,..." data-original-src="https://example.com/image.jpg">';
      const result = unblockExternalImages(blocked);
      expect(result).toContain('src="https://example.com/image.jpg"');
    });
  });

  describe('prepareEmailForDisplay', () => {
    it('should return empty result for empty input', () => {
      const result = prepareEmailForDisplay('');
      expect(result.html).toBe('');
      expect(result.hasExternalImages).toBe(false);
      expect(result.snippet).toBe('');
    });

    it('should sanitize HTML', () => {
      const html = '<p>Hello</p><script>evil()</script>';
      const result = prepareEmailForDisplay(html);
      expect(result.html).not.toContain('<script>');
    });

    it('should detect external images', () => {
      const html = '<p>Hello</p><img src="https://example.com/img.jpg">';
      const result = prepareEmailForDisplay(html);
      expect(result.hasExternalImages).toBe(true);
    });

    it('should block external images by default', () => {
      const html = '<img src="https://example.com/img.jpg">';
      const result = prepareEmailForDisplay(html, { blockImages: true });
      // Original URL is preserved in data-original-src but src now has placeholder
      expect(result.html).toMatch(/src="data:image\/svg\+xml/);
      expect(result.html).toContain('data-original-src');
    });

    it('should not block images when option is false', () => {
      const html = '<img src="https://example.com/img.jpg">';
      const result = prepareEmailForDisplay(html, { blockImages: false });
      expect(result.html).toContain('https://example.com');
    });

    it('should generate snippet', () => {
      const html = '<p>This is the email content</p>';
      const result = prepareEmailForDisplay(html);
      expect(result.snippet).toContain('This is the email content');
    });
  });

  describe('sanitizeForCompose', () => {
    it('should use allow_external mode', () => {
      const html = '<img src="https://example.com/img.jpg">';
      const result = sanitizeForCompose(html);
      expect(result).toContain('<img');
    });
  });

  describe('removeTrackingPixels', () => {
    it('should return empty string for empty input', () => {
      expect(removeTrackingPixels('')).toBe('');
    });

    it('should remove 1x1 images', () => {
      const html = '<img width="1" height="1" src="https://track.example.com/pixel.gif">';
      const result = removeTrackingPixels(html);
      expect(result).not.toContain('<img');
    });

    it('should remove tracking domain images', () => {
      const html = '<img src="https://tracking.example.com/image.gif">';
      const result = removeTrackingPixels(html);
      expect(result).not.toContain('<img');
    });

    it('should preserve regular images', () => {
      const html = '<img src="https://example.com/photo.jpg" width="200" height="150">';
      const result = removeTrackingPixels(html);
      expect(result).toContain('<img');
    });
  });

  describe('validateEmailHtml', () => {
    it('should return null for safe HTML', () => {
      const html = '<p>Safe content</p>';
      expect(validateEmailHtml(html)).toBeNull();
    });

    it('should return null for empty input', () => {
      expect(validateEmailHtml('')).toBeNull();
    });

    it('should detect script tags', () => {
      const html = '<script>alert(1)</script>';
      const result = validateEmailHtml(html);
      expect(result).not.toBeNull();
      expect(result).toContain('script');
    });

    it('should detect javascript: protocol', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = validateEmailHtml(html);
      expect(result).not.toBeNull();
    });

    it('should detect onerror handlers', () => {
      const html = '<img onerror="alert(1)">';
      const result = validateEmailHtml(html);
      expect(result).not.toBeNull();
    });

    it('should detect onclick handlers', () => {
      const html = '<div onclick="alert(1)">Click</div>';
      const result = validateEmailHtml(html);
      expect(result).not.toBeNull();
    });

    it('should detect iframe tags', () => {
      const html = '<iframe src="http://evil.com"></iframe>';
      const result = validateEmailHtml(html);
      expect(result).not.toBeNull();
    });

    it('should detect CSS expression', () => {
      const html = '<div style="width:expression(alert(1))">Test</div>';
      const result = validateEmailHtml(html);
      expect(result).not.toBeNull();
    });
  });
});
