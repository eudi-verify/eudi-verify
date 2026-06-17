/**
 * @eudi-verify/client - QR Code Generator
 *
 * Minimal QR code generation for OpenID4VP URLs.
 * Implements ISO/IEC 18004 (QR Code) with byte mode encoding.
 */

export interface QRCodeOptions {
  /** Size in pixels (default: 200) */
  size?: number;
  /** Error correction level (default: 'M') */
  errorCorrection?: "L" | "M" | "Q" | "H";
  /** Quiet zone modules (default: 4) */
  quietZone?: number;
}

const EC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 } as const;

type ECLevel = keyof typeof EC_LEVELS;

interface VersionInfo {
  version: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
}

const VERSION_TABLE: Record<ECLevel, VersionInfo[]> = {
  L: [
    { version: 1, totalCodewords: 19, ecCodewordsPerBlock: 7, numBlocks: 1 },
    { version: 2, totalCodewords: 34, ecCodewordsPerBlock: 10, numBlocks: 1 },
    { version: 3, totalCodewords: 55, ecCodewordsPerBlock: 15, numBlocks: 1 },
    { version: 4, totalCodewords: 80, ecCodewordsPerBlock: 20, numBlocks: 1 },
    { version: 5, totalCodewords: 108, ecCodewordsPerBlock: 26, numBlocks: 1 },
    { version: 6, totalCodewords: 136, ecCodewordsPerBlock: 18, numBlocks: 2 },
    { version: 7, totalCodewords: 156, ecCodewordsPerBlock: 20, numBlocks: 2 },
    { version: 8, totalCodewords: 194, ecCodewordsPerBlock: 24, numBlocks: 2 },
    { version: 9, totalCodewords: 232, ecCodewordsPerBlock: 30, numBlocks: 2 },
    { version: 10, totalCodewords: 274, ecCodewordsPerBlock: 18, numBlocks: 4 },
    { version: 11, totalCodewords: 401, ecCodewordsPerBlock: 20, numBlocks: 4 },
    { version: 12, totalCodewords: 466, ecCodewordsPerBlock: 24, numBlocks: 4 },
    { version: 13, totalCodewords: 532, ecCodewordsPerBlock: 26, numBlocks: 4 },
    { version: 14, totalCodewords: 588, ecCodewordsPerBlock: 30, numBlocks: 4 },
  ],
  M: [
    { version: 1, totalCodewords: 16, ecCodewordsPerBlock: 10, numBlocks: 1 },
    { version: 2, totalCodewords: 28, ecCodewordsPerBlock: 16, numBlocks: 1 },
    { version: 3, totalCodewords: 44, ecCodewordsPerBlock: 26, numBlocks: 1 },
    { version: 4, totalCodewords: 64, ecCodewordsPerBlock: 18, numBlocks: 2 },
    { version: 5, totalCodewords: 86, ecCodewordsPerBlock: 24, numBlocks: 2 },
    { version: 6, totalCodewords: 108, ecCodewordsPerBlock: 16, numBlocks: 4 },
    { version: 7, totalCodewords: 124, ecCodewordsPerBlock: 18, numBlocks: 4 },
    { version: 8, totalCodewords: 154, ecCodewordsPerBlock: 22, numBlocks: 4 },
    { version: 9, totalCodewords: 182, ecCodewordsPerBlock: 22, numBlocks: 5 },
    { version: 10, totalCodewords: 216, ecCodewordsPerBlock: 26, numBlocks: 5 },
  ],
  Q: [
    { version: 1, totalCodewords: 13, ecCodewordsPerBlock: 13, numBlocks: 1 },
    { version: 2, totalCodewords: 22, ecCodewordsPerBlock: 22, numBlocks: 1 },
    { version: 3, totalCodewords: 34, ecCodewordsPerBlock: 18, numBlocks: 2 },
    { version: 4, totalCodewords: 48, ecCodewordsPerBlock: 26, numBlocks: 2 },
    { version: 5, totalCodewords: 62, ecCodewordsPerBlock: 18, numBlocks: 4 },
    { version: 6, totalCodewords: 76, ecCodewordsPerBlock: 24, numBlocks: 4 },
    { version: 7, totalCodewords: 88, ecCodewordsPerBlock: 18, numBlocks: 6 },
    { version: 8, totalCodewords: 110, ecCodewordsPerBlock: 22, numBlocks: 6 },
    { version: 9, totalCodewords: 132, ecCodewordsPerBlock: 20, numBlocks: 8 },
    { version: 10, totalCodewords: 154, ecCodewordsPerBlock: 24, numBlocks: 8 },
  ],
  H: [
    { version: 1, totalCodewords: 9, ecCodewordsPerBlock: 17, numBlocks: 1 },
    { version: 2, totalCodewords: 16, ecCodewordsPerBlock: 28, numBlocks: 1 },
    { version: 3, totalCodewords: 26, ecCodewordsPerBlock: 22, numBlocks: 2 },
    { version: 4, totalCodewords: 36, ecCodewordsPerBlock: 16, numBlocks: 4 },
    { version: 5, totalCodewords: 46, ecCodewordsPerBlock: 22, numBlocks: 4 },
    { version: 6, totalCodewords: 60, ecCodewordsPerBlock: 28, numBlocks: 4 },
    { version: 7, totalCodewords: 66, ecCodewordsPerBlock: 26, numBlocks: 5 },
    { version: 8, totalCodewords: 86, ecCodewordsPerBlock: 26, numBlocks: 6 },
    { version: 9, totalCodewords: 100, ecCodewordsPerBlock: 24, numBlocks: 8 },
    { version: 10, totalCodewords: 122, ecCodewordsPerBlock: 28, numBlocks: 8 },
  ],
};

const FORMAT_INFO_STRINGS: Record<number, number[]> = {
  0: [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0],
  1: [1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1],
  2: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
  3: [1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1],
  4: [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1],
  5: [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
  6: [1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  7: [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  8: [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
  9: [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1],
  10: [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0],
  11: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1],
  12: [1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  13: [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0],
  14: [1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1],
  15: [1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  16: [0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  17: [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0],
  18: [0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1],
  19: [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  20: [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
  21: [0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1],
  22: [0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0],
  23: [0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  24: [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  25: [0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
  26: [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1],
  27: [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
  28: [0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0],
  29: [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
  30: [0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0],
  31: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1],
};

const ALIGNMENT_PATTERNS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
];

function getVersionInfo(dataLength: number, ecLevel: ECLevel): VersionInfo {
  const table = VERSION_TABLE[ecLevel];
  for (const info of table) {
    const dataCodewords =
      info.totalCodewords - info.ecCodewordsPerBlock * info.numBlocks;
    const maxBytes = dataCodewords - (info.version < 10 ? 2 : 3);
    if (maxBytes >= dataLength) {
      return info;
    }
  }
  throw new Error(
    `Data too long for QR code (max ~270 bytes with ${ecLevel} EC)`,
  );
}

function createByteData(data: string, version: number): number[] {
  const bytes = new TextEncoder().encode(data);
  const bits: number[] = [];

  bits.push(0, 1, 0, 0);

  const countBits = version < 10 ? 8 : 16;
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push((bytes.length >> i) & 1);
  }

  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  bits.push(0, 0, 0, 0);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    codewords.push(byte);
  }

  return codewords;
}

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function generateECCodewords(data: number[], numECCodewords: number): number[] {
  const gen: number[] = [1];
  for (let i = 0; i < numECCodewords; i++) {
    const newGen: number[] = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j];
      newGen[j + 1] ^= gfMul(gen[j], GF_EXP[i]);
    }
    gen.length = newGen.length;
    for (let j = 0; j < newGen.length; j++) gen[j] = newGen[j];
  }

  const msg = [...data, ...new Array(numECCodewords).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }

  return msg.slice(data.length);
}

function interleaveBlocks(
  dataCodewords: number[],
  info: VersionInfo,
): number[] {
  const { numBlocks, ecCodewordsPerBlock, totalCodewords } = info;
  const totalDataCodewords = totalCodewords - numBlocks * ecCodewordsPerBlock;
  const smallBlockSize = Math.floor(totalDataCodewords / numBlocks);
  const largeBlockCount = totalDataCodewords % numBlocks;

  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;

  for (let i = 0; i < numBlocks; i++) {
    const blockSize =
      smallBlockSize + (i >= numBlocks - largeBlockCount ? 1 : 0);
    const block = dataCodewords.slice(offset, offset + blockSize);
    offset += blockSize;
    dataBlocks.push(block);
    ecBlocks.push(generateECCodewords(block, ecCodewordsPerBlock));
  }

  const result: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      result.push(block[i]);
    }
  }

  return result;
}

function createMatrix(version: number): (number | null)[][] {
  const size = version * 4 + 17;
  const matrix: (number | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null),
  );

  function setFinderPattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

        const isOuter = r === -1 || r === 7 || c === -1 || c === 7;
        const isInner = r >= 1 && r <= 5 && c >= 1 && c <= 5;
        const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;

        matrix[nr][nc] = isOuter ? 0 : isCore ? 1 : isInner ? 0 : 1;
      }
    }
  }

  setFinderPattern(0, 0);
  setFinderPattern(0, size - 7);
  setFinderPattern(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  matrix[size - 8][8] = 1;

  if (version >= 2) {
    const positions = ALIGNMENT_PATTERNS[version];
    for (const row of positions) {
      for (const col of positions) {
        if (matrix[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
            const isCore = r === 0 && c === 0;
            matrix[row + r][col + c] = isOuter || isCore ? 1 : 0;
          }
        }
      }
    }
  }

  return matrix;
}

function placeData(matrix: (number | null)[][], codewords: number[]): void {
  const size = matrix.length;
  let bitIndex = 0;
  const bits: number[] = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) {
      bits.push((cw >> i) & 1);
    }
  }

  let col = size - 1;
  let goingUp = true;

  while (col > 0) {
    if (col === 6) col--;

    for (
      let row = goingUp ? size - 1 : 0;
      goingUp ? row >= 0 : row < size;
      row += goingUp ? -1 : 1
    ) {
      for (const offset of [0, -1]) {
        const c = col + offset;
        if (c < 0 || matrix[row][c] !== null) continue;
        matrix[row][c] = bitIndex < bits.length ? bits[bitIndex++] : 0;
      }
    }

    col -= 2;
    goingUp = !goingUp;
  }
}

function applyMask(matrix: number[][], maskPattern: number): void {
  const size = matrix.length;
  const maskFns: ((r: number, c: number) => boolean)[] = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  const maskFn = maskFns[maskPattern];
  const reserved = createReservedMask(size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && maskFn(r, c)) {
        matrix[r][c] ^= 1;
      }
    }
  }
}

function createReservedMask(size: number): boolean[][] {
  const reserved = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      reserved[i][j] = true;
      reserved[i][size - 8 + j] = true;
      reserved[size - 8 + i][j] = true;
    }
  }

  for (let i = 0; i < 9; i++) {
    reserved[i][8] = true;
    reserved[8][i] = true;
    reserved[size - 8 + i - 1][8] = true;
    reserved[8][size - 8 + i - 1] = true;
  }

  for (let i = 0; i < size; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  return reserved;
}

function addFormatInfo(
  matrix: number[][],
  ecLevel: ECLevel,
  maskPattern: number,
): void {
  const formatIndex = EC_LEVELS[ecLevel] * 8 + maskPattern;
  const bits = FORMAT_INFO_STRINGS[formatIndex];
  const size = matrix.length;

  for (let i = 0; i < 6; i++) {
    matrix[8][i] = bits[i];
    matrix[i][8] = bits[14 - i];
  }
  matrix[8][7] = bits[6];
  matrix[8][8] = bits[7];
  matrix[7][8] = bits[8];

  for (let i = 0; i < 7; i++) {
    matrix[8][size - 1 - i] = bits[14 - i];
    matrix[size - 1 - i][8] = bits[i];
  }
  matrix[size - 8][8] = bits[7];
}

function evaluatePenalty(matrix: number[][]): number {
  const size = matrix.length;
  let penalty = 0;

  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        count++;
        if (count === 5) penalty += 3;
        else if (count > 5) penalty++;
      } else {
        count = 1;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        count++;
        if (count === 5) penalty += 3;
        else if (count > 5) penalty++;
      } else {
        count = 1;
      }
    }
  }

  return penalty;
}

function generateQRMatrix(data: string, ecLevel: ECLevel): number[][] {
  const info = getVersionInfo(data.length, ecLevel);
  const dataCodewords = createByteData(data, info.version);

  const totalDataCodewords =
    info.totalCodewords - info.numBlocks * info.ecCodewordsPerBlock;
  while (dataCodewords.length < totalDataCodewords) {
    dataCodewords.push(dataCodewords.length % 2 === 0 ? 0xec : 0x11);
  }

  const codewords = interleaveBlocks(dataCodewords, info);
  const baseMatrix = createMatrix(info.version);

  placeData(baseMatrix, codewords);

  let bestMatrix: number[][] | null = null;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const matrix = baseMatrix.map((row) =>
      row.map((cell) => (cell === null ? 0 : cell)),
    );
    applyMask(matrix, mask);
    addFormatInfo(matrix, ecLevel, mask);

    const penalty = evaluatePenalty(matrix);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMatrix = matrix;
    }
  }

  return bestMatrix!;
}

/**
 * Generate a QR code as an SVG string.
 */
export function generateQRSvg(
  data: string,
  options: QRCodeOptions = {},
): string {
  const { size = 200, errorCorrection = "L", quietZone = 4 } = options;
  const matrix = generateQRMatrix(data, errorCorrection);
  const moduleCount = matrix.length;
  const totalModules = moduleCount + quietZone * 2;
  const moduleSize = size / totalModules;

  let paths = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + quietZone) * moduleSize;
        const y = (r + quietZone) * moduleSize;
        paths += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="white"/><path d="${paths}" fill="black"/></svg>`;
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
