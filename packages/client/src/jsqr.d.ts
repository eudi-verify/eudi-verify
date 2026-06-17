/** jsqr types declare `export default` but runtime is CJS (`jsQR.js`); NodeNext needs `export =`. */
declare module 'jsqr' {
  export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: unknown;
    version: number;
    location: unknown;
  }
  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    providedOptions?: {
      inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
    },
  ): QRCode | null;
  export = jsQR;
}
