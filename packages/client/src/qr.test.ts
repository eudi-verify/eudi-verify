import { describe, it, expect } from 'vitest';
import { generateQRSvg, generateQRDataUrl } from './qr.js';

describe('QR Code Generation', () => {
  describe('generateQRSvg', () => {
    it('generates valid SVG', () => {
      const svg = generateQRSvg('https://example.com');

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<path');
      expect(svg).toContain('fill="black"');
    });

    it('uses specified size', () => {
      const svg = generateQRSvg('test', { size: 300 });

      expect(svg).toContain('width="300"');
      expect(svg).toContain('height="300"');
      expect(svg).toContain('viewBox="0 0 300 300"');
    });

    it('uses default size of 200', () => {
      const svg = generateQRSvg('test');

      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="200"');
    });

    it('handles different error correction levels', () => {
      const svgL = generateQRSvg('test', { errorCorrection: 'L' });
      const svgM = generateQRSvg('test', { errorCorrection: 'M' });

      expect(svgL).toContain('<svg');
      expect(svgM).toContain('<svg');
    });

    it('generates consistent output for same input', () => {
      const svg1 = generateQRSvg('https://example.com/test');
      const svg2 = generateQRSvg('https://example.com/test');

      expect(svg1).toBe(svg2);
    });

    it('generates different output for different input', () => {
      const svg1 = generateQRSvg('https://example.com/session/abc123');
      const svg2 = generateQRSvg('https://example.com/session/xyz789');

      expect(svg1).not.toEqual(svg2);
    });

    it('handles longer OpenID4VP URLs', () => {
      const url = 'openid4vp://verify?request_uri=https://verifier.example.com/request/abc123def456';
      const svg = generateQRSvg(url);

      expect(svg).toContain('<svg');
      expect(svg).toContain('<path');
    });

    it('handles Unicode characters', () => {
      const svg = generateQRSvg('https://example.com/test?name=测试');

      expect(svg).toContain('<svg');
    });

    it('handles empty string', () => {
      const svg = generateQRSvg('');

      expect(svg).toContain('<svg');
    });
  });

  describe('generateQRDataUrl', () => {
    it('generates valid data URL', () => {
      const dataUrl = generateQRDataUrl('https://example.com');

      expect(dataUrl).toMatch(/^data:image\/svg\+xml,/);
    });

    it('contains encoded SVG', () => {
      const dataUrl = generateQRDataUrl('test');

      expect(dataUrl).toContain('%3Csvg');
      expect(dataUrl).toContain('%3C%2Fsvg%3E');
    });

    it('respects options', () => {
      const dataUrl = generateQRDataUrl('test', { size: 400 });

      expect(dataUrl).toContain('width%3D%22400%22');
    });

    it('is usable as image src', () => {
      const dataUrl = generateQRDataUrl('https://example.com');

      expect(() => new URL(dataUrl)).not.toThrow();
    });
  });

  describe('QR code correctness', () => {
    it('produces scannable QR code structure', () => {
      const svg = generateQRSvg('TEST');

      const pathMatch = svg.match(/d="([^"]+)"/);
      expect(pathMatch).toBeTruthy();

      const pathData = pathMatch![1];
      const moduleCount = (pathData.match(/M/g) || []).length;
      expect(moduleCount).toBeGreaterThan(50);
    });

    it('handles version 1 QR (small data)', () => {
      const svg = generateQRSvg('AB');
      expect(svg).toContain('<svg');
    });

    it('handles larger versions (longer data)', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(50);
      const svg = generateQRSvg(longUrl, { errorCorrection: 'L' });
      expect(svg).toContain('<svg');
    });

    it('throws for data too long', () => {
      const tooLong = 'a'.repeat(500);
      expect(() => generateQRSvg(tooLong)).toThrow(/Data too long/);
    });
  });

  describe('quiet zone', () => {
    it('applies default quiet zone', () => {
      const svg = generateQRSvg('test', { size: 200 });

      expect(svg).toContain('<rect width="100%" height="100%" fill="white"/>');
    });

    it('allows custom quiet zone', () => {
      const svgSmall = generateQRSvg('test', { quietZone: 1 });
      const svgLarge = generateQRSvg('test', { quietZone: 8 });

      expect(svgSmall).not.toBe(svgLarge);
    });
  });
});
