declare module 'qrcode' {
  export function toCanvas(
    canvas: HTMLCanvasElement | null,
    text: string,
    options?: QRCode.QRCodeToCanvasOptions,
    callback?: (err: Error | null) => void,
  ): Promise<HTMLCanvasElement>;
}

declare namespace QRCode {
  interface QRCodeToCanvasOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: {
      dark?: string;
      light?: string;
    };
  }
}
