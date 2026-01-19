import { graphRequest, graphRequestRaw } from './client.js';

/**
 * List items in root or folder
 */
export async function listItems(path, options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 50).toString());
  params.append('$select', 'id,name,size,lastModifiedDateTime,folder,file,webUrl');

  let endpoint;
  if (!path || path === '/' || path === 'root') {
    endpoint = '/me/drive/root/children';
  } else if (path.startsWith('/')) {
    // Path-based access
    endpoint = `/me/drive/root:${path}:/children`;
  } else {
    // Assume it's an item ID
    endpoint = `/me/drive/items/${path}/children`;
  }

  const data = await graphRequest(`${endpoint}?${params.toString()}`);
  return data.value;
}

/**
 * Search files
 */
export async function searchFiles(query, options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append('$select', 'id,name,size,lastModifiedDateTime,folder,file,webUrl,parentReference');

  const data = await graphRequest(
    `/me/drive/root/search(q='${encodeURIComponent(query)}')?${params.toString()}`
  );
  return data.value;
}

/**
 * Get item metadata
 */
export async function getItem(itemId) {
  return graphRequest(`/me/drive/items/${itemId}`);
}

/**
 * Get item by path
 */
export async function getItemByPath(path) {
  return graphRequest(`/me/drive/root:${path}`);
}

/**
 * Download file content
 */
export async function downloadFile(itemId) {
  const item = await getItem(itemId);
  if (!item['@microsoft.graph.downloadUrl']) {
    throw new Error('Item is not downloadable (might be a folder)');
  }

  const response = await graphRequestRaw(item['@microsoft.graph.downloadUrl']);
  return response;
}

/**
 * Upload a small file (< 4MB)
 */
export async function uploadFile(content, options = {}) {
  let endpoint;

  if (options.folder) {
    endpoint = `/me/drive/items/${options.folder}:/${options.name}:/content`;
  } else {
    endpoint = `/me/drive/root:/${options.name}:/content`;
  }

  return graphRequest(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: content,
  });
}

/**
 * Create a folder
 */
export async function createFolder(name, parentId) {
  let endpoint = '/me/drive/root/children';
  if (parentId) {
    endpoint = `/me/drive/items/${parentId}/children`;
  }

  return graphRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    }),
  });
}

/**
 * Delete item
 */
export async function deleteItem(itemId) {
  return graphRequest(`/me/drive/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Share item
 */
export async function shareItem(itemId, email, role = 'read') {
  const roles = role === 'write' ? ['write'] : ['read'];

  return graphRequest(`/me/drive/items/${itemId}/invite`, {
    method: 'POST',
    body: JSON.stringify({
      recipients: [{ email }],
      roles,
      requireSignIn: true,
      sendInvitation: true,
    }),
  });
}

/**
 * Move item to a different folder
 */
export async function moveItem(itemId, destinationFolderId) {
  return graphRequest(`/me/drive/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      parentReference: {
        id: destinationFolderId,
      },
    }),
  });
}

/**
 * Rename item
 */
export async function renameItem(itemId, newName) {
  return graphRequest(`/me/drive/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: newName,
    }),
  });
}

/**
 * Copy item
 */
export async function copyItem(itemId, options = {}) {
  const body = {};

  if (options.name) {
    body.name = options.name;
  }

  if (options.destinationFolderId) {
    body.parentReference = {
      id: options.destinationFolderId,
    };
  }

  // Copy is async - returns a monitor URL
  return graphRequest(`/me/drive/items/${itemId}/copy`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
