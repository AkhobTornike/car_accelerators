export const MAX_SIDE_PX = 1200;
export const UPLOAD_QUALITY = 0.82;

export interface ResizeDims {
  width: number;
  height: number;
}

export function resizeDims(srcWidth: number, srcHeight: number, maxSide = MAX_SIDE_PX): ResizeDims {
  if (!Number.isFinite(srcWidth) || !Number.isFinite(srcHeight) || srcWidth <= 0 || srcHeight <= 0) {
    throw new Error('invalid image dimensions');
  }
  const longest = Math.max(srcWidth, srcHeight);
  if (longest <= maxSide) return { width: Math.round(srcWidth), height: Math.round(srcHeight) };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(srcWidth * scale)), height: Math.max(1, Math.round(srcHeight * scale)) };
}
