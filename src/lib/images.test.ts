import { describe, expect, it } from 'vitest';
import { MAX_SIDE_PX, resizeDims } from './images';

describe('resizeDims', () => {
  it('keeps small images as is', () => {
    expect(resizeDims(800, 600)).toEqual({ width: 800, height: 600 });
    expect(resizeDims(1200, 1200)).toEqual({ width: 1200, height: 1200 });
  });
  it('scales the longest side down to the limit, keeping aspect', () => {
    expect(resizeDims(4000, 3000)).toEqual({ width: 1200, height: 900 });
    expect(resizeDims(1000, 4000)).toEqual({ width: 300, height: 1200 });
    expect(resizeDims(2400, 1200, 600)).toEqual({ width: 600, height: 300 });
  });
  it('never returns a zero side', () => {
    expect(resizeDims(5000, 2).height).toBeGreaterThanOrEqual(1);
  });
  it('rejects invalid input', () => {
    expect(() => resizeDims(0, 100)).toThrow();
    expect(() => resizeDims(-5, 100)).toThrow();
    expect(() => resizeDims(Number.NaN, 100)).toThrow();
  });
  it('default limit is 1200 px', () => {
    expect(MAX_SIDE_PX).toBe(1200);
  });
});
