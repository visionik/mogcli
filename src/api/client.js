import { GRAPH_BASE_URL } from '../config.js';
import { getValidAccessToken } from '../auth.js';

/**
 * Make an authenticated request to Microsoft Graph API
 */
export async function graphRequest(endpoint, options = {}) {
  const accessToken = await getValidAccessToken();

  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null; // No content
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error?.message || `API request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get raw response (for downloads)
 */
export async function graphRequestRaw(endpoint, options = {}) {
  const accessToken = await getValidAccessToken();

  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error?.message || `API request failed: ${response.status}`;
    throw new Error(message);
  }

  return response;
}

/**
 * Get user info
 */
export async function getUserInfo() {
  return graphRequest('/me');
}
