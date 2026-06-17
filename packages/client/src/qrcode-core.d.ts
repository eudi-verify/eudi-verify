declare module 'qrcode/lib/core/qrcode.js' {
  export interface QRCodeSymbol {
    modules: { size: number; get(row: number, col: number): boolean };
  }
  export function create(
    data: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ): QRCodeSymbol;
}
