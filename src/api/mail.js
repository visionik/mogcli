import { graphRequest } from './client.js';

/**
 * Search messages
 */
export async function searchMessages(query, options = {}) {
  const params = new URLSearchParams();
  params.append('$search', `"${query}"`);
  params.append('$top', (options.max || 25).toString());
  params.append('$select', 'id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments');

  let endpoint = '/me/messages';
  if (options.folder) {
    endpoint = `/me/mailFolders/${options.folder}/messages`;
  }

  const data = await graphRequest(`${endpoint}?${params.toString()}`);
  return data.value;
}

/**
 * Get messages in a folder
 */
export async function getMessages(options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append('$select', 'id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments');
  params.append('$orderby', 'receivedDateTime desc');

  if (options.filter) {
    params.append('$filter', options.filter);
  }

  let endpoint = '/me/messages';
  if (options.folder) {
    endpoint = `/me/mailFolders/${options.folder}/messages`;
  }

  const data = await graphRequest(`${endpoint}?${params.toString()}`);
  return data.value;
}

/**
 * Get a specific message
 */
export async function getMessage(messageId) {
  return graphRequest(`/me/messages/${messageId}`);
}

/**
 * Get mail folders
 */
export async function getFolders() {
  const data = await graphRequest('/me/mailFolders?$top=50');
  return data.value;
}

/**
 * Send an email
 */
export async function sendMail(options) {
  const toRecipients = options.to.split(',').map((email) => ({
    emailAddress: { address: email.trim() },
  }));

  const message = {
    subject: options.subject,
    body: {
      contentType: options.isHtml ? 'HTML' : 'Text',
      content: options.body,
    },
    toRecipients,
  };

  if (options.cc) {
    message.ccRecipients = options.cc.split(',').map((email) => ({
      emailAddress: { address: email.trim() },
    }));
  }

  if (options.bcc) {
    message.bccRecipients = options.bcc.split(',').map((email) => ({
      emailAddress: { address: email.trim() },
    }));
  }

  // Reply to existing message
  if (options.replyToMessageId) {
    return graphRequest(`/me/messages/${options.replyToMessageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, comment: options.body }),
    });
  }

  return graphRequest('/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Create a draft
 */
export async function createDraft(options) {
  const toRecipients = options.to.split(',').map((email) => ({
    emailAddress: { address: email.trim() },
  }));

  const message = {
    subject: options.subject,
    body: {
      contentType: options.isHtml ? 'HTML' : 'Text',
      content: options.body,
    },
    toRecipients,
  };

  if (options.cc) {
    message.ccRecipients = options.cc.split(',').map((email) => ({
      emailAddress: { address: email.trim() },
    }));
  }

  return graphRequest('/me/messages', {
    method: 'POST',
    body: JSON.stringify(message),
  });
}

/**
 * Send a draft
 */
export async function sendDraft(messageId) {
  return graphRequest(`/me/messages/${messageId}/send`, {
    method: 'POST',
  });
}

/**
 * Get drafts
 */
export async function getDrafts(options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append('$select', 'id,subject,toRecipients,createdDateTime,bodyPreview');
  params.append('$orderby', 'createdDateTime desc');

  const data = await graphRequest(`/me/mailFolders/Drafts/messages?${params.toString()}`);
  return data.value;
}

/**
 * Get a draft
 */
export async function getDraft(messageId) {
  return graphRequest(`/me/messages/${messageId}`);
}

/**
 * Update a draft
 */
export async function updateDraft(messageId, updates) {
  return graphRequest(`/me/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a draft
 */
export async function deleteDraft(messageId) {
  return graphRequest(`/me/messages/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Get attachments for a message
 */
export async function getAttachments(messageId) {
  const data = await graphRequest(`/me/messages/${messageId}/attachments`);
  return data.value;
}

/**
 * Get a specific attachment
 */
export async function getAttachment(messageId, attachmentId) {
  return graphRequest(`/me/messages/${messageId}/attachments/${attachmentId}`);
}
