import { graphRequest } from './client.js';

/**
 * List contacts
 */
export async function getContacts(options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 50).toString());
  params.append('$select', 'id,displayName,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle');
  params.append('$orderby', 'displayName');
  
  const data = await graphRequest(`/me/contacts?${params.toString()}`);
  return data.value;
}

/**
 * Search contacts
 */
export async function searchContacts(query, options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append('$select', 'id,displayName,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle');
  params.append('$filter', `contains(displayName,'${query}') or contains(emailAddresses/any(e:contains(e/address,'${query}')),'${query}')`);
  
  try {
    const data = await graphRequest(`/me/contacts?${params.toString()}`);
    return data.value;
  } catch {
    // Fallback to people search if contacts filter fails
    return searchPeople(query, options);
  }
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
