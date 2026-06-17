/**
 * Rasterize our QR SVG output and decode with jsQR (test-only helper).
 */

import jsQR = require('jsqr');

/** ponytail: test helper — rasterizes our fixed SVG path format, no canvas native dep */
export function rasterizeQRSvg(svg: string, size: number): Uint8ClampedArray {
  const pathMatch = svg.match(/d="([^"]+)"/);
  if (!pathMatch) {
    throw new Error('QR SVG missing path data');
  }

  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }

  const re = /M([0-9.]+),([0-9.]+)h([0-9.]+)v([0-9.]+)h-([0-9.]+)z/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pathMatch[1])) !== null) {
    const x = Math.round(Number(match[1]));
    const y = Math.round(Number(match[2]));
    const w = Math.round(Number(match[3]));
    const h = Math.round(Number(match[4]));
    for (let py = y; py < y + h && py < size; py++) {
      for (let px = x; px < x + w && px < size; px++) {
        const offset = (py * size + px) * 4;
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 255;
      }
    }
  }

  return pixels;
}

export function decodeQRSvg(svg: string, size = 400): string | null {
  const pixels = rasterizeQRSvg(svg, size);
  return jsQR(pixels, size, size)?.data ?? null;
}

export function decodeQRDataUrl(dataUrl: string, size = 400): string | null {
  const prefix = 'data:image/svg+xml,';
  if (!dataUrl.startsWith(prefix)) {
    throw new Error('Expected data:image/svg+xml data URL');
  }
  const svg = decodeURIComponent(dataUrl.slice(prefix.length));
  return decodeQRSvg(svg, size);
}
