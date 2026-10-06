import { describe, expect, it } from 'vitest';
import { checkImage } from '@/server/image-store';

describe('checkImage', () => {
  it('accepts webp/jpeg/png up to 1 MB', () => {
    expect(() => checkImage('image/webp', 100_000)).not.toThrow();
    expect(() => checkImage('image/png', 1_000_000)).not.toThrow();
  });
  it('rejects other types, empty and oversized files', () => {
    expect(() => checkImage('image/svg+xml', 100)).toThrow();
    expect(() => checkImage('application/pdf', 100)).toThrow();
    expect(() => checkImage('image/webp', 0)).toThrow();
    expect(() => checkImage('image/webp', 1_000_001)).toThrow();
  });
});
