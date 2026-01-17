import { describe, it, expect } from 'vitest';
import { detectMeetingLink, isLikelyAddress } from './meetingLinks';

describe('meetingLinks', () => {
  describe('detectMeetingLink', () => {
    it('should return null for null/undefined/empty input', () => {
      expect(detectMeetingLink(null)).toBeNull();
      expect(detectMeetingLink(undefined)).toBeNull();
      expect(detectMeetingLink('')).toBeNull();
    });

    it('should return null for non-URL text', () => {
      expect(detectMeetingLink('Conference Room A')).toBeNull();
      expect(detectMeetingLink('123 Main Street')).toBeNull();
    });

    it('should detect Zoom meeting links', () => {
      const result = detectMeetingLink('https://zoom.us/j/123456789');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('zoom');
      expect(result?.id).toBe('123456789');
      expect(result?.displayName).toBe('Zoom Meeting');
    });

    it('should detect Zoom join links', () => {
      const result = detectMeetingLink('https://zoom.us/join/987654321');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('zoom');
      expect(result?.id).toBe('987654321');
    });

    it('should detect Microsoft Teams meeting links', () => {
      const result = detectMeetingLink(
        'https://teams.microsoft.com/l/meetup-join/19%3ameeting'
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe('teams');
      expect(result?.displayName).toBe('Microsoft Teams');
    });

    it('should detect Teams Live links', () => {
      const result = detectMeetingLink('https://teams.live.com/meet/abc123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('teams');
      expect(result?.id).toBe('abc123');
    });

    it('should detect Google Meet links', () => {
      const result = detectMeetingLink('https://meet.google.com/abc-defg-hij');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('google-meet');
      expect(result?.id).toBe('abc-defg-hij');
      expect(result?.displayName).toBe('Google Meet');
    });

    it('should detect Webex links', () => {
      const result = detectMeetingLink('https://company.webex.com/meet/username');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('webex');
      expect(result?.displayName).toBe('Webex');
    });

    it('should detect Cisco Webex links', () => {
      const result = detectMeetingLink('https://cisco.webex.com/join/meeting123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('webex');
    });

    it('should detect Jitsi Meet links', () => {
      const result = detectMeetingLink('https://meet.jit.si/MyMeetingRoom');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('jitsi');
      expect(result?.id).toBe('MyMeetingRoom');
      expect(result?.displayName).toBe('Jitsi Meet');
    });

    it('should detect generic video meeting URLs', () => {
      const result = detectMeetingLink('https://example.com/meeting/123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('other');
      expect(result?.displayName).toBe('Video Meeting');
    });

    it('should detect URLs with /join path', () => {
      const result = detectMeetingLink('https://example.com/join/room123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('other');
    });

    it('should detect URLs with video keyword', () => {
      const result = detectMeetingLink('https://video.example.com/room123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('other');
    });

    it('should detect URLs with conference keyword', () => {
      const result = detectMeetingLink('https://conference.example.com/room123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('other');
    });

    it('should extract URL from text with URL', () => {
      const result = detectMeetingLink('Join meeting at https://zoom.us/j/123456789');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('zoom');
    });

    it('should return null for non-meeting URLs', () => {
      expect(detectMeetingLink('https://google.com')).toBeNull();
      expect(detectMeetingLink('https://example.com/page')).toBeNull();
    });

    it('should handle URLs with query parameters', () => {
      const result = detectMeetingLink('https://zoom.us/j/123456789?pwd=abc123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('zoom');
    });
  });

  describe('isLikelyAddress', () => {
    it('should return false for null/undefined/empty input', () => {
      expect(isLikelyAddress(null)).toBe(false);
      expect(isLikelyAddress(undefined)).toBe(false);
      expect(isLikelyAddress('')).toBe(false);
    });

    it('should return false for meeting links', () => {
      expect(isLikelyAddress('https://zoom.us/j/123456789')).toBe(false);
      expect(isLikelyAddress('https://meet.google.com/abc-def-ghi')).toBe(false);
    });

    it('should return true for street addresses', () => {
      expect(isLikelyAddress('123 Main Street')).toBe(true);
      expect(isLikelyAddress('456 Oak Avenue')).toBe(true);
      expect(isLikelyAddress('789 Park Road')).toBe(true);
      expect(isLikelyAddress('100 Broadway Drive')).toBe(true);
    });

    it('should return true for addresses with abbreviations', () => {
      expect(isLikelyAddress('123 Main St')).toBe(true);
      expect(isLikelyAddress('456 Oak Ave')).toBe(true);
      expect(isLikelyAddress('789 Park Rd')).toBe(true);
      expect(isLikelyAddress('100 Broadway Dr')).toBe(true);
    });

    it('should return true for addresses with ZIP codes', () => {
      expect(isLikelyAddress('New York, NY 10001')).toBe(true);
      expect(isLikelyAddress('Los Angeles, CA 90001')).toBe(true);
    });

    it('should return true for international addresses with postal codes', () => {
      expect(isLikelyAddress('London, UK 12345')).toBe(true);
    });

    it('should return false for plain location names', () => {
      expect(isLikelyAddress('Conference Room A')).toBe(false);
      expect(isLikelyAddress('Building 5')).toBe(false);
    });
  });
});
