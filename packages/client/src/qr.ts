/**
 * @eudi-verify/client - QR Code Generator
 *
 * Uses `qrcode` (MIT) for matrix generation; renders crisp SVG locally.
 */

import { create as createQRCode } from "qrcode/lib/core/qrcode.js";

export interface QRCodeOptions {
  /** Size in pixels (default: 200) */
  size?: number;
  /** Error correction level (default: 'L') */
  errorCorrection?: "L" | "M" | "Q" | "H";
  /** Quiet zone modules (default: 4) */
  quietZone?: number;
}

/**
 * Generate a QR code as an SVG string.
 */
export function generateQRSvg(
  data: string,
  options: QRCodeOptions = {},
): string {
  const { size = 200, errorCorrection = "L", quietZone = 4 } = options;
  const qr = createQRCode(data, { errorCorrectionLevel: errorCorrection });
  const moduleCount = qr.modules.size;
  const totalModules = moduleCount + quietZone * 2;
  const modulePx = Math.max(1, Math.floor(size / totalModules));
  const pad = Math.floor((size - modulePx * totalModules) / 2);

  let paths = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.modules.get(r, c)) {
        const x = pad + (c + quietZone) * modulePx;
        const y = pad + (r + quietZone) * modulePx;
        paths += `M${x},${y}h${modulePx}v${modulePx}h-${modulePx}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${paths}" fill="black"/></svg>`;
}

/**
 * Generate a QR code as a data URL (PNG via canvas).
 */
export function generateQRDataUrl(
  data: string,
  options: QRCodeOptions = {},
): string {
  const svg = generateQRSvg(data, options);
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}
