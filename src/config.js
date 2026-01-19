import { homedir } from 'os';
import { join } from 'path';

export const CONFIG_DIR = join(homedir(), '.config', 'mic');
export const TOKENS_FILE = join(CONFIG_DIR, 'tokens.json');
export const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

// Microsoft Graph API
export const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

// Azure AD endpoints
export const AUTHORITY = 'https://login.microsoftonline.com/common';
export const DEVICE_CODE_URL = `${AUTHORITY}/oauth2/v2.0/devicecode`;
export const TOKEN_URL = `${AUTHORITY}/oauth2/v2.0/token`;

// Required scopes for full mic functionality
export const SCOPES = [
  'User.Read',
  'offline_access',
  // To-Do
  'Tasks.ReadWrite',
  // Mail
  'Mail.ReadWrite',
  'Mail.Send',
  // Calendar
  'Calendars.ReadWrite',
  // OneDrive / Files
  'Files.ReadWrite.All',
  // Contacts / People
  'Contacts.Read',
  'People.Read',
];
