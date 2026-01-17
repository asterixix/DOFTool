/**
 * Meeting Link Utilities
 * Detects and handles various video meeting platforms
 */

export interface MeetingLinkInfo {
  type: 'zoom' | 'teams' | 'google-meet' | 'webex' | 'jitsi' | 'other' | null;
  url: string;
  id?: string | undefined;
  displayName: string;
}

/**
 * Detect if a location string contains a meeting link
 */
export function detectMeetingLink(location: string | undefined | null): MeetingLinkInfo | null {
  if (!location) {
    return null;
  }

  const trimmed = location.trim();

  // Check if it's a URL
  let url: string | null = null;
  try {
    const urlObj = new URL(trimmed);
    url = urlObj.href;
  } catch {
    // Not a valid URL, check if it contains http/https
    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const urlObj = new URL(urlMatch[0]);
        url = urlObj.href;
      } catch {
        // Invalid URL
      }
    }
  }

  if (!url) {
    return null;
  }

  const lowerUrl = url.toLowerCase();

  // Zoom detection
  if (lowerUrl.includes('zoom.us/j/') || lowerUrl.includes('zoom.us/join/')) {
    const match = url.match(/zoom\.us\/(?:j|join)\/(\d+)/);
    return {
      type: 'zoom',
      url,
      id: match?.[1],
      displayName: 'Zoom Meeting',
    };
  }

  // Microsoft Teams detection
  if (lowerUrl.includes('teams.microsoft.com/l/meetup-join')) {
    return {
      type: 'teams',
      url,
      displayName: 'Microsoft Teams',
    };
  }
  if (lowerUrl.includes('teams.live.com/meet/')) {
    const match = url.match(/teams\.live\.com\/meet\/([^/?]+)/);
    return {
      type: 'teams',
      url,
      id: match?.[1],
      displayName: 'Microsoft Teams',
    };
  }

  // Google Meet detection
  if (lowerUrl.includes('meet.google.com/')) {
    const match = url.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/);
    return {
      type: 'google-meet',
      url,
      id: match?.[1],
      displayName: 'Google Meet',
    };
  }

  // Webex detection
  if (lowerUrl.includes('webex.com/') || lowerUrl.includes('cisco.webex.com/')) {
    const match = url.match(/webex\.com\/(?:meet|join)\/([^/?]+)/);
    return {
      type: 'webex',
      url,
      id: match?.[1],
      displayName: 'Webex',
    };
  }

  // Jitsi detection
  if (lowerUrl.includes('meet.jit.si/') || lowerUrl.includes('jitsi.org/')) {
    const match = url.match(/(?:meet\.jit\.si|jitsi\.org)\/([^/?]+)/);
    return {
      type: 'jitsi',
      url,
      id: match?.[1],
      displayName: 'Jitsi Meet',
    };
  }

  // Generic video meeting URL (has video-related keywords)
  if (
    lowerUrl.includes('/meet') ||
    lowerUrl.includes('/join') ||
    lowerUrl.includes('video') ||
    lowerUrl.includes('conference') ||
    lowerUrl.includes('meeting')
  ) {
    return {
      type: 'other',
      url,
      displayName: 'Video Meeting',
    };
  }

  return null;
}

/**
 * Check if a location is likely an address (not a meeting link)
 */
export function isLikelyAddress(location: string | undefined | null): boolean {
  if (!location) {
    return false;
  }

  // If it's detected as a meeting link, it's not an address
  if (detectMeetingLink(location)) {
    return false;
  }

  // Check if it looks like a physical address
  // Contains street numbers, street names, or city/state patterns
  const addressPatterns = [
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way|circle|cir)/i,
    /,\s*\w{2,}\s+\d{5}/, // City, State ZIP
    /,\s*\w{2,}\s+\d{4,}/, // City, State ZIP (international)
  ];

  return addressPatterns.some((pattern) => pattern.test(location));
}
