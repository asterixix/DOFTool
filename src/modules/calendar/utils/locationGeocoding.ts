/**
 * Location Geocoding Utilities
 * Uses OpenStreetMap Nominatim API for address geocoding
 */

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  address?:
    | {
        houseNumber?: string | undefined;
        road?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postcode?: string | undefined;
        country?: string | undefined;
      }
    | undefined;
}

/**
 * Geocode an address using OpenStreetMap Nominatim API
 * @param address - The address to geocode
 * @returns Geocode result with coordinates, or null if not found
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    // Rate limit: 1 request per second (we'll implement basic rate limiting)
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DOFTool/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.warn('Geocoding request failed:', response.status, response.statusText);
      return null;
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: Record<string, string>;
    }>;

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    if (!result) {
      return null;
    }
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
      address: result.address
        ? {
            houseNumber: result.address['house_number'],
            road: result.address['road'],
            city: result.address['city'] ?? result.address['town'] ?? result.address['village'],
            state: result.address['state'],
            postcode: result.address['postcode'],
            country: result.address['country'],
          }
        : undefined,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Generate OpenStreetMap embed URL for a location
 * @param lat - Latitude
 * @param lon - Longitude
 * @param zoom - Zoom level (1-18, default 15)
 * @returns OpenStreetMap embed URL
 */
export function getOpenStreetMapEmbedUrl(lat: number, lon: number, _zoom = 15): string {
  // Use OpenStreetMap embed URL format
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
}

/**
 * Generate OpenStreetMap view URL for opening in browser
 * @param lat - Latitude
 * @param lon - Longitude
 * @param zoom - Zoom level (1-18, default 15)
 * @returns OpenStreetMap view URL
 */
export function getOpenStreetMapViewUrl(lat: number, lon: number, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=${zoom}#map=${zoom}/${lat}/${lon}`;
}

/**
 * Generate Google Maps URL as fallback/alternative
 * @param address - Address string or coordinates
 * @param useCoordinates - If true, address should be "lat,lon"
 * @returns Google Maps URL
 */
export function getGoogleMapsUrl(address: string, useCoordinates = false): string {
  const encoded = encodeURIComponent(address);
  if (useCoordinates) {
    return `https://www.google.com/maps?q=${encoded}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
