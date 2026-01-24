import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTokenExpired, setClientId, saveTokens, loadTokens, clearTokens } from './auth.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock config
vi.mock('./config.js', () => ({
  CONFIG_DIR: '/mock/config',
  TOKENS_FILE: '/mock/config/tokens.json',
  SETTINGS_FILE: '/mock/config/settings.json',
  DEVICE_CODE_URL: 'https://mock/devicecode',
  TOKEN_URL: 'https://mock/token',
  SCOPES: ['User.Read'],
}));

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setClientId', () => {
    it('creates config dir and saves client ID', () => {
      existsSync.mockReturnValue(false);

      setClientId('test-client-id');

      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalledWith(
        '/mock/config/settings.json',
        expect.stringContaining('test-client-id')
      );
    });

    it('preserves existing settings when adding client ID', () => {
      existsSync.mockImplementation((path) => path === '/mock/config/settings.json');
      readFileSync.mockReturnValue(JSON.stringify({ otherSetting: 'value' }));

      setClientId('test-client-id');

      expect(writeFileSync).toHaveBeenCalledWith(
        '/mock/config/settings.json',
        expect.stringContaining('otherSetting')
      );
    });
  });

  describe('saveTokens', () => {
    it('saves tokens with timestamp', () => {
      existsSync.mockReturnValue(true);

      saveTokens({ access_token: 'test-token' });

      expect(writeFileSync).toHaveBeenCalledWith(
        '/mock/config/tokens.json',
        expect.stringContaining('saved_at')
      );
    });
  });

  describe('loadTokens', () => {
    it('returns null when tokens file does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = loadTokens();

      expect(result).toBeNull();
    });

    it('returns parsed tokens when file exists', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(JSON.stringify({ access_token: 'test' }));

      const result = loadTokens();

      expect(result).toEqual({ access_token: 'test' });
    });

    it('returns null on parse error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('invalid json');

      const result = loadTokens();

      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('removes tokens file when it exists', () => {
      existsSync.mockReturnValue(true);

      clearTokens();

      expect(unlinkSync).toHaveBeenCalledWith('/mock/config/tokens.json');
    });

    it('does nothing when tokens file does not exist', () => {
      existsSync.mockReturnValue(false);

      clearTokens();

      expect(unlinkSync).not.toHaveBeenCalled();
    });
  });
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
