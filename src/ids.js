/**
 * Slug system for Microsoft Graph's long GUIDs.
 *
 * Maps 8-character slugs to full Microsoft IDs.
 * Slugs are the first 8 chars of MD5 hash of the full ID.
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { CONFIG_DIR } from './config.js';
import { join } from 'path';

const SLUGS_FILE = join(CONFIG_DIR, 'slugs.json');
const MAX_CACHE_SIZE = 10000; // Prevent unbounded growth

let cache = null;

/**
 * Generate slug from full Microsoft ID.
 * @param {string} fullId - Full Microsoft Graph ID
 * @returns {string} 8-character slug
 */
export function generateSlug(fullId) {
  if (!fullId) {
    return null;
  }
  return createHash('md5').update(fullId).digest('hex').substring(0, 8);
}

/**
 * Load slugs from disk.
 */
function loadSlugs() {
  if (cache !== null) {
    return cache;
  }

  if (existsSync(SLUGS_FILE)) {
    try {
      cache = JSON.parse(readFileSync(SLUGS_FILE, 'utf8'));
    } catch {
      cache = { slugToFull: {}, fullToSlug: {} };
    }
  } else {
    cache = { slugToFull: {}, fullToSlug: {} };
  }

  return cache;
}

/**
 * Save slugs to disk.
 */
function saveSlugs() {
  if (!cache) {
    return;
  }

  // Prune if too large (keep most recent entries)
  const entries = Object.entries(cache.slugToFull);
  if (entries.length > MAX_CACHE_SIZE) {
    const toKeep = entries.slice(-MAX_CACHE_SIZE / 2);
    cache.slugToFull = Object.fromEntries(toKeep);
    cache.fullToSlug = {};
    for (const [slug, full] of toKeep) {
      cache.fullToSlug[full] = slug;
    }
  }

  try {
    writeFileSync(SLUGS_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // Ignore write errors (read-only fs, etc.)
  }
}

/**
 * Register an ID and return its slug.
 * @param {string} fullId - Full Microsoft Graph ID
 * @returns {string} 8-character slug
 */
export function registerSlug(fullId) {
  if (!fullId) {
    return null;
  }

  const c = loadSlugs();

  // Already registered?
  if (c.fullToSlug[fullId]) {
    return c.fullToSlug[fullId];
  }

  const slug = generateSlug(fullId);

  // Handle collision (very rare with 8 hex chars)
  if (c.slugToFull[slug] && c.slugToFull[slug] !== fullId) {
    // Collision - use longer prefix
    const longerSlug = createHash('md5').update(fullId).digest('hex').substring(0, 12);
    c.slugToFull[longerSlug] = fullId;
    c.fullToSlug[fullId] = longerSlug;
    saveSlugs();
    return longerSlug;
  }

  c.slugToFull[slug] = fullId;
  c.fullToSlug[fullId] = slug;
  saveSlugs();

  return slug;
}

// Aliases for backwards compatibility
export const registerId = registerSlug;
export const generateShortId = generateSlug;

/**
 * Resolve an ID - accepts either slug or full form.
 * @param {string} id - Slug or full ID
 * @returns {string} Full Microsoft Graph ID
 */
export function resolveId(id) {
  if (!id) {
    return null;
  }

  // If it looks like a slug (8-12 hex chars), try to resolve
  if (/^[a-f0-9]{8,12}$/i.test(id)) {
    const c = loadSlugs();
    if (c.slugToFull[id.toLowerCase()]) {
      return c.slugToFull[id.toLowerCase()];
    }
  }

  // Otherwise treat as full ID
  return id;
}

/**
 * Get slug for display, registering if needed.
 * @param {string} fullId - Full Microsoft Graph ID
 * @returns {string} Slug
 */
export function slug(fullId) {
  return registerSlug(fullId);
}

/**
 * Format ID for display - shows slug with optional full ID hint.
 * @param {string} fullId - Full Microsoft Graph ID
 * @param {boolean} showFull - Also show truncated full ID
 * @returns {string} Formatted ID string
 */
export function formatId(fullId, showFull = false) {
  if (!fullId) {
    return '';
  }

  const s = registerSlug(fullId);

  if (showFull) {
    const truncated = fullId.length > 20 ? fullId.substring(0, 20) + '...' : fullId;
    return `${s} (${truncated})`;
  }

  return s;
}

/**
 * Clear all slugs.
 */
export function clearSlugs() {
  cache = { slugToFull: {}, fullToSlug: {} };
  saveSlugs();
}

/**
 * Get slug stats.
 * @returns {{ count: number, file: string }}
 */
export function slugStats() {
  const c = loadSlugs();
  return {
    count: Object.keys(c.slugToFull).length,
    file: SLUGS_FILE,
  };
}
