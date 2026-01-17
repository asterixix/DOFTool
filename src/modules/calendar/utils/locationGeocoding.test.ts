import { describe, it, expect } from 'vitest';
import {
  getOpenStreetMapEmbedUrl,
  getOpenStreetMapViewUrl,
  getGoogleMapsUrl,
} from './locationGeocoding';

describe('locationGeocoding', () => {
  describe('getOpenStreetMapEmbedUrl', () => {
    it('should generate embed URL with coordinates', () => {
      const url = getOpenStreetMapEmbedUrl(40.7128, -74.006);
      expect(url).toContain('openstreetmap.org');
      expect(url).toContain('embed');
      expect(url).toContain('40.7128');
      expect(url).toContain('-74.006');
    });

    it('should include marker parameter', () => {
      const url = getOpenStreetMapEmbedUrl(40.7128, -74.006);
      expect(url).toContain('marker=');
    });

    it('should include bbox parameter', () => {
      const url = getOpenStreetMapEmbedUrl(40.7128, -74.006);
      expect(url).toContain('bbox=');
    });

    it('should include layer parameter', () => {
      const url = getOpenStreetMapEmbedUrl(40.7128, -74.006);
      expect(url).toContain('layer=mapnik');
    });
  });

  describe('getOpenStreetMapViewUrl', () => {
    it('should generate view URL with coordinates', () => {
      const url = getOpenStreetMapViewUrl(40.7128, -74.006);
      expect(url).toContain('openstreetmap.org');
      expect(url).toContain('mlat=40.7128');
      expect(url).toContain('mlon=-74.006');
    });

    it('should include default zoom level', () => {
      const url = getOpenStreetMapViewUrl(40.7128, -74.006);
      expect(url).toContain('zoom=15');
    });

    it('should accept custom zoom level', () => {
      const url = getOpenStreetMapViewUrl(40.7128, -74.006, 18);
      expect(url).toContain('zoom=18');
    });

    it('should include map hash', () => {
      const url = getOpenStreetMapViewUrl(40.7128, -74.006, 15);
      expect(url).toContain('#map=');
    });
  });

  describe('getGoogleMapsUrl', () => {
    it('should generate search URL for address', () => {
      const url = getGoogleMapsUrl('123 Main St, New York, NY');
      expect(url).toContain('google.com/maps');
      expect(url).toContain('query=');
    });

    it('should encode address properly', () => {
      const url = getGoogleMapsUrl('123 Main St, New York, NY');
      expect(url).toContain('123%20Main%20St');
    });

    it('should generate coordinate URL when useCoordinates is true', () => {
      const url = getGoogleMapsUrl('40.7128,-74.006', true);
      expect(url).toContain('google.com/maps');
      expect(url).toContain('q=');
    });

    it('should use search API for address lookup', () => {
      const url = getGoogleMapsUrl('123 Main St', false);
      expect(url).toContain('search');
      expect(url).toContain('api=1');
    });
  });
});
