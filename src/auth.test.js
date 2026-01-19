import { describe, it, expect } from 'vitest';
import { isTokenExpired } from './auth.js';

describe('auth', () => {
  describe('isTokenExpired', () => {
    it('returns true for null tokens', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it('returns true for undefined tokens', () => {
      expect(isTokenExpired(undefined)).toBe(true);
    });

    it('returns true for tokens without saved_at', () => {
      expect(isTokenExpired({ expires_in: 3600 })).toBe(true);
    });

    it('returns true for tokens without expires_in', () => {
      expect(isTokenExpired({ saved_at: Date.now() })).toBe(true);
    });

    it('returns true for expired tokens', () => {
      const tokens = {
        saved_at: Date.now() - 7200000, // 2 hours ago
        expires_in: 3600, // 1 hour
      };
      expect(isTokenExpired(tokens)).toBe(true);
    });

    it('returns true for tokens expiring within 5 minutes', () => {
      const tokens = {
        saved_at: Date.now() - 3400000, // ~56.6 minutes ago
        expires_in: 3600, // 1 hour
      };
      expect(isTokenExpired(tokens)).toBe(true);
    });

    it('returns false for valid non-expired tokens', () => {
      const tokens = {
        saved_at: Date.now() - 1800000, // 30 minutes ago
        expires_in: 3600, // 1 hour
      };
      expect(isTokenExpired(tokens)).toBe(false);
    });

    it('returns false for freshly saved tokens', () => {
      const tokens = {
        saved_at: Date.now(),
        expires_in: 3600,
      };
      expect(isTokenExpired(tokens)).toBe(false);
    });
  });
});
