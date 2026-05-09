import { toCanvas } from 'qrcode';

export async function renderQR(
  canvas: HTMLCanvasElement,
  text: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  },
): Promise<void> {
  const { width = 256, margin, errorCorrectionLevel = 'H' } = options ?? {};

  const toCanvasOptions: {
    width: number;
    color: { dark: string; light: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
  } = {
    width,
    color: { dark: '#150D08', light: '#F7EFD2' },
    errorCorrectionLevel,
  };

  if (margin !== undefined) {
    toCanvasOptions.margin = margin;
  }

  await toCanvas(canvas, text, toCanvasOptions);

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = '/kopicat-logo.png';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load logo image'));
    });

    const size = 82;
    const logoSize = Math.round(size * 0.9); // 74
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = size / 2 + 5;

    // Carve out a circular blank space in the center for the logo
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#F7EFD2';
    ctx.fill();

    // Draw the logo clipped to a circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, 2 * Math.PI);
    ctx.clip();
    const logoX = (canvas.width - logoSize) / 2;
    const logoY = (canvas.height - logoSize) / 2;
    ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    // Draw accent border around the outer edge of the blank circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(197, 150, 69, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } catch {
    // getContext may not be available in test environments (jsdom)
  }
}
