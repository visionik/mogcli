import { graphRequest, graphRequestRaw } from './client.js';

/**
 * List all notebooks
 */
export async function listNotebooks(options = {}) {
  const max = options.max || 50;
  const params = new URLSearchParams();
  params.append('$top', max.toString());
  params.append('$select', 'id,displayName,createdDateTime,lastModifiedDateTime,isDefault,userRole,sectionsUrl,sectionGroupsUrl');
  params.append('$orderby', 'lastModifiedDateTime desc');

  const data = await graphRequest(`/me/onenote/notebooks?${params.toString()}`);
  return data.value || [];
}

/**
 * Get a specific notebook
 */
export async function getNotebook(notebookId) {
  return graphRequest(`/me/onenote/notebooks/${notebookId}`);
}

/**
 * List sections in a notebook
 */
export async function listSections(notebookId, options = {}) {
  const max = options.max || 50;
  const params = new URLSearchParams();
  params.append('$top', max.toString());
  params.append('$select', 'id,displayName,createdDateTime,lastModifiedDateTime,pagesUrl,isDefault');
  params.append('$orderby', 'lastModifiedDateTime desc');

  const data = await graphRequest(`/me/onenote/notebooks/${notebookId}/sections?${params.toString()}`);
  return data.value || [];
}

/**
 * Get a specific section
 */
export async function getSection(sectionId) {
  return graphRequest(`/me/onenote/sections/${sectionId}`);
}

/**
 * List pages in a section
 */
export async function listPages(sectionId, options = {}) {
  const max = options.max || 50;
  const params = new URLSearchParams();
  params.append('$top', max.toString());
  params.append('$select', 'id,title,createdDateTime,lastModifiedDateTime,level,order,contentUrl');
  params.append('$orderby', 'lastModifiedDateTime desc');

  const data = await graphRequest(`/me/onenote/sections/${sectionId}/pages?${params.toString()}`);
  return data.value || [];
}

/**
 * Get a specific page metadata
 */
export async function getPage(pageId) {
  return graphRequest(`/me/onenote/pages/${pageId}`);
}

/**
 * Get page content (HTML)
 */
export async function getPageContent(pageId) {
  const response = await graphRequestRaw(`/me/onenote/pages/${pageId}/content`);
  return response.text();
}

/**
 * Create a new notebook
 * @param {string} displayName - Notebook name
 */
export async function createNotebook(displayName) {
  return graphRequest('/me/onenote/notebooks', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
}

/**
 * Create a new section in a notebook
 * @param {string} notebookId - Notebook ID
 * @param {string} displayName - Section name
 */
export async function createSection(notebookId, displayName) {
  return graphRequest(`/me/onenote/notebooks/${notebookId}/sections`, {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
}

/**
 * Create a new page in a section
 * @param {string} sectionId - Section ID
 * @param {string} title - Page title
 * @param {string} content - Page content (plain text or HTML)
 */
export async function createPage(sectionId, title, content = '') {
  // OneNote requires HTML presentation format
  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <p>${escapeHtml(content)}</p>
  </body>
</html>`;

  return graphRequest(`/me/onenote/sections/${sectionId}/pages`, {
    method: 'POST',
    body: htmlContent,
    headers: {
      'Content-Type': 'application/xhtml+xml',
    },
  });
}

/**
 * Update page content using PATCH
 * Note: OneNote PATCH uses a specific JSON format with commands
 * @param {string} pageId - Page ID
 * @param {string} content - New content to append
 */
export async function updatePage(pageId, content) {
  const patchCommands = [
    {
      target: 'body',
      action: 'append',
      position: 'after',
      content: `<p>${escapeHtml(content)}</p>`,
    },
  ];

  return graphRequest(`/me/onenote/pages/${pageId}/content`, {
    method: 'PATCH',
    body: JSON.stringify(patchCommands),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Delete a page
 * @param {string} pageId - Page ID
 */
export async function deletePage(pageId) {
  return graphRequest(`/me/onenote/pages/${pageId}`, {
    method: 'DELETE',
  });
}

/**
 * Search pages across all notebooks
 * @param {string} query - Search query
 * @param {object} options - Search options
 */
export async function searchPages(query, options = {}) {
  // OneNote Graph API search is limited; use client-side filtering
  // Fetch all pages and filter by title (case-insensitive)
  const max = options.max || 100;
  const data = await graphRequest(`/me/onenote/pages?$top=${max}&$orderby=lastModifiedDateTime desc`);
  const pages = data.value || [];
  const lowerQuery = query.toLowerCase();
  return pages.filter((page) => page.title?.toLowerCase().includes(lowerQuery));
}

/**
 * Convert HTML to plain text for display
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
export function htmlToText(html) {
  if (!html) {
    return '';
  }

  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Replace list items with bullets BEFORE removing other tags
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // Replace common block elements with newlines
  text = text.replace(/<\/?(div|p|br|h[1-6]|tr)[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");

  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) {
    return '';
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
