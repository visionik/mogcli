import { describe, it, expect, vi } from 'vitest';
import { generateSlug, resolveId, formatId } from './ids.js';

// Mock fs to avoid writing to disk during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
}));

describe('slugs', () => {
  describe('generateSlug', () => {
    it('returns null for null input', () => {
      expect(generateSlug(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(generateSlug(undefined)).toBeNull();
    });

    it('returns 8-character hex string', () => {
      const result = generateSlug('test-id');
      expect(result).toMatch(/^[a-f0-9]{8}$/);
    });

    it('returns consistent results for same input', () => {
      const id = 'AQMkADAwATMzAGZmAS04MDViLTRiNzgt';
      expect(generateSlug(id)).toBe(generateSlug(id));
    });

    it('returns different results for different inputs', () => {
      const id1 = 'AQMkADAwATMzAGZmAS04MDViLTRiNzgt';
      const id2 = 'BQMkADAwATMzAGZmAS04MDViLTRiNzgt';
      expect(generateSlug(id1)).not.toBe(generateSlug(id2));
    });
  });

  describe('resolveId', () => {
    it('returns null for null input', () => {
      expect(resolveId(null)).toBeNull();
    });

    it('returns full ID as-is when not in cache', () => {
      const fullId = 'AQMkADAwATMzAGZmAS04MDViLTRiNzgt';
      expect(resolveId(fullId)).toBe(fullId);
    });

    it('returns input as-is for non-short-id format', () => {
      const id = 'not-a-short-id-but-longer';
      expect(resolveId(id)).toBe(id);
    });
  });

  describe('formatId', () => {
    it('returns empty string for null input', () => {
      expect(formatId(null)).toBe('');
    });

    it('returns slug by default', () => {
      const result = formatId('test-full-id');
      expect(result).toMatch(/^[a-f0-9]{8,12}$/);
    });

    it('includes truncated full ID when showFull is true', () => {
      const fullId = 'AQMkADAwATMzAGZmAS04MDViLTRiNzgtMDACLTAwCgBG';
      const result = formatId(fullId, true);
      expect(result).toContain('(');
      expect(result).toContain('...');
    });
  });
});
