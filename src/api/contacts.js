import { graphRequest } from './client.js';

/**
 * List contacts
 */
export async function getContacts(options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 50).toString());
  params.append(
    '$select',
    'id,displayName,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle'
  );
  params.append('$orderby', 'displayName');

  const data = await graphRequest(`/me/contacts?${params.toString()}`);
  return data.value;
}

/**
 * Search contacts
 */
export async function searchContacts(query, options = {}) {
  // Try simple displayName filter first
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append(
    '$select',
    'id,displayName,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle'
  );
  params.append('$filter', `startswith(displayName,'${query}')`);

  try {
    const data = await graphRequest(`/me/contacts?${params.toString()}`);
    if (data.value?.length > 0) {
      return data.value;
    }
  } catch {
    // Filter failed, fall through to people search
  }

  // Fallback to people search (broader, includes colleagues etc.)
  return searchPeople(query, options);
}

/**
 * Search people (includes contacts, colleagues, etc.)
 */
export async function searchPeople(query, options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append('$search', `"${query}"`);

  const data = await graphRequest(`/me/people?${params.toString()}`);
  return data.value;
}

/**
 * Get a specific contact
 */
export async function getContact(contactId) {
  return graphRequest(`/me/contacts/${contactId}`);
}

/**
 * Create a contact
 */
export async function createContact(options) {
  const contact = {};

  if (options.name) {
    contact.displayName = options.name;
    // Try to split into given/surname
    const parts = options.name.split(' ');
    if (parts.length >= 2) {
      contact.givenName = parts[0];
      contact.surname = parts.slice(1).join(' ');
    } else {
      contact.givenName = options.name;
    }
  }

  if (options.email) {
    contact.emailAddresses = [
      {
        address: options.email,
        name: options.name || options.email,
      },
    ];
  }

  if (options.phone) {
    contact.mobilePhone = options.phone;
  }

  if (options.company) {
    contact.companyName = options.company;
  }

  if (options.title) {
    contact.jobTitle = options.title;
  }

  return graphRequest('/me/contacts', {
    method: 'POST',
    body: JSON.stringify(contact),
  });
}

/**
 * Update a contact
 */
export async function updateContact(contactId, updates) {
  const contact = {};

  if (updates.name) {
    contact.displayName = updates.name;
    const parts = updates.name.split(' ');
    if (parts.length >= 2) {
      contact.givenName = parts[0];
      contact.surname = parts.slice(1).join(' ');
    } else {
      contact.givenName = updates.name;
    }
  }

  if (updates.email) {
    contact.emailAddresses = [
      {
        address: updates.email,
        name: updates.name || updates.email,
      },
    ];
  }

  if (updates.phone) {
    contact.mobilePhone = updates.phone;
  }

  if (updates.company) {
    contact.companyName = updates.company;
  }

  if (updates.title) {
    contact.jobTitle = updates.title;
  }

  return graphRequest(`/me/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(contact),
  });
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId) {
  return graphRequest(`/me/contacts/${contactId}`, {
    method: 'DELETE',
  });
}
