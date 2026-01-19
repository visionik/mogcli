import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import {
  CONFIG_DIR,
  TOKENS_FILE,
  SETTINGS_FILE,
  DEVICE_CODE_URL,
  TOKEN_URL,
  SCOPES,
} from './config.js';

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function getClientId() {
  if (existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
      if (settings.clientId) {
        return settings.clientId;
      }
    } catch {
      // Ignore parse errors, fall through to env var check
    }
  }

  if (process.env.MIC_CLIENT_ID) {
    return process.env.MIC_CLIENT_ID;
  }

  return null;
}

export function setClientId(clientId) {
  ensureConfigDir();
  const settings = existsSync(SETTINGS_FILE) ? JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) : {};
  settings.clientId = clientId;
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function saveTokens(tokens) {
  ensureConfigDir();
  tokens.saved_at = Date.now();
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export function loadTokens() {
  if (!existsSync(TOKENS_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function clearTokens() {
  if (existsSync(TOKENS_FILE)) {
    unlinkSync(TOKENS_FILE);
    return true;
  }
  return false;
}

export function isTokenExpired(tokens) {
  if (!tokens || !tokens.saved_at || !tokens.expires_in) {
    return true;
  }
  const expiresAt = tokens.saved_at + tokens.expires_in * 1000;
  // Consider expired 5 minutes early
  return Date.now() > expiresAt - 300000;
}

export async function refreshAccessToken(tokens) {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Client ID not configured');
  }
  if (!tokens.refresh_token) {
    throw new Error('No refresh token available');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    scope: SCOPES.join(' '),
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  const newTokens = await response.json();
  saveTokens(newTokens);
  return newTokens;
}

export async function getValidAccessToken() {
  let tokens = loadTokens();
  if (!tokens) {
    throw new Error('Not authenticated. Run: mstodo auth login');
  }

  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken(tokens);
  }

  return tokens.access_token;
}

export async function startDeviceCodeFlow(clientId) {
  setClientId(clientId);

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES.join(' '),
  });

  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to start device code flow');
  }

  return response.json();
}

export async function pollForToken(clientId, deviceCode, interval = 5) {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceCode,
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      saveTokens(data);
      return data;
    }

    if (data.error === 'authorization_pending') {
      continue;
    } else if (data.error === 'slow_down') {
      interval += 5;
      continue;
    } else if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    } else {
      throw new Error(data.error_description || data.error || 'Authentication failed');
    }
  }
}

export function getAuthStatus() {
  const clientId = getClientId();
  const tokens = loadTokens();

  return {
    hasClientId: !!clientId,
    clientId: clientId ? `${clientId.substring(0, 8)}...` : null,
    isAuthenticated: !!tokens,
    isExpired: tokens ? isTokenExpired(tokens) : null,
    savedAt: tokens?.saved_at ? new Date(tokens.saved_at).toISOString() : null,
  };
}
