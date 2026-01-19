import { describe, it, expect } from 'vitest';
import {
  CONFIG_DIR,
  TOKENS_FILE,
  SETTINGS_FILE,
  GRAPH_BASE_URL,
  AUTHORITY,
  DEVICE_CODE_URL,
  TOKEN_URL,
  SCOPES,
} from './config.js';
import { homedir } from 'os';
import { join } from 'path';

describe('config', () => {
  describe('paths', () => {
    it('CONFIG_DIR is in user home .config/mog', () => {
      expect(CONFIG_DIR).toBe(join(homedir(), '.config', 'mog'));
    });

    it('TOKENS_FILE is in CONFIG_DIR', () => {
      expect(TOKENS_FILE).toBe(join(CONFIG_DIR, 'tokens.json'));
    });

    it('SETTINGS_FILE is in CONFIG_DIR', () => {
      expect(SETTINGS_FILE).toBe(join(CONFIG_DIR, 'settings.json'));
    });
  });

  describe('API endpoints', () => {
    it('GRAPH_BASE_URL is Microsoft Graph v1.0', () => {
      expect(GRAPH_BASE_URL).toBe('https://graph.microsoft.com/v1.0');
    });

    it('AUTHORITY is Azure AD common endpoint', () => {
      expect(AUTHORITY).toBe('https://login.microsoftonline.com/common');
    });

    it('DEVICE_CODE_URL is derived from AUTHORITY', () => {
      expect(DEVICE_CODE_URL).toContain(AUTHORITY);
      expect(DEVICE_CODE_URL).toContain('devicecode');
    });

    it('TOKEN_URL is derived from AUTHORITY', () => {
      expect(TOKEN_URL).toContain(AUTHORITY);
      expect(TOKEN_URL).toContain('token');
    });
  });

  describe('scopes', () => {
    it('includes required base scopes', () => {
      expect(SCOPES).toContain('User.Read');
      expect(SCOPES).toContain('offline_access');
    });

    it('includes mail scopes', () => {
      expect(SCOPES).toContain('Mail.ReadWrite');
      expect(SCOPES).toContain('Mail.Send');
    });

    it('includes calendar scope', () => {
      expect(SCOPES).toContain('Calendars.ReadWrite');
    });

    it('includes files scope', () => {
      expect(SCOPES).toContain('Files.ReadWrite.All');
    });

    it('includes todo scope', () => {
      expect(SCOPES).toContain('Tasks.ReadWrite');
    });

    it('includes contacts scopes', () => {
      expect(SCOPES).toContain('Contacts.Read');
      expect(SCOPES).toContain('People.Read');
    });
  });
});
