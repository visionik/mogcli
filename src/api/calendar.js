import { graphRequest } from './client.js';

/**
 * List calendars
 */
export async function getCalendars() {
  const data = await graphRequest('/me/calendars');
  return data.value;
}

/**
 * Get events
 */
export async function getEvents(options = {}) {
  const params = new URLSearchParams();
  params.append('$top', (options.max || 25).toString());
  params.append(
    '$select',
    'id,subject,start,end,location,organizer,attendees,isAllDay,bodyPreview'
  );
  params.append('$orderby', 'start/dateTime');

  if (options.from) {
    params.append('$filter', `start/dateTime ge '${options.from}'`);
  }
  if (options.from && options.to) {
    params.set(
      '$filter',
      `start/dateTime ge '${options.from}' and end/dateTime le '${options.to}'`
    );
  }

  let endpoint = '/me/events';
  if (options.calendar && options.calendar !== 'primary') {
    endpoint = `/me/calendars/${options.calendar}/events`;
  }

  const data = await graphRequest(`${endpoint}?${params.toString()}`);
  return data.value;
}

/**
 * Get a specific event
 */
export async function getEvent(eventId, calendarId) {
  let endpoint = `/me/events/${eventId}`;
  if (calendarId && calendarId !== 'primary') {
    endpoint = `/me/calendars/${calendarId}/events/${eventId}`;
  }
  return graphRequest(endpoint);
}

/**
 * Create an event
 */
export async function createEvent(options) {
  const event = {
    subject: options.subject,
    start: {
      dateTime: options.start,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: options.end,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  if (options.body) {
    event.body = {
      contentType: 'Text',
      content: options.body,
    };
  }

  if (options.location) {
    event.location = {
      displayName: options.location,
    };
  }

  if (options.attendees) {
    event.attendees = options.attendees.split(',').map((email) => ({
      emailAddress: { address: email.trim() },
      type: 'required',
    }));
  }

  let endpoint = '/me/events';
  if (options.calendar && options.calendar !== 'primary') {
    endpoint = `/me/calendars/${options.calendar}/events`;
  }

  return graphRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/**
 * Update an event
 */
export async function updateEvent(eventId, updates, calendarId) {
  let endpoint = `/me/events/${eventId}`;
  if (calendarId && calendarId !== 'primary') {
    endpoint = `/me/calendars/${calendarId}/events/${eventId}`;
  }

  return graphRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId, calendarId) {
  let endpoint = `/me/events/${eventId}`;
  if (calendarId && calendarId !== 'primary') {
    endpoint = `/me/calendars/${calendarId}/events/${eventId}`;
  }

  return graphRequest(endpoint, {
    method: 'DELETE',
  });
}

/**
 * Respond to an event invitation
 * @param {string} eventId - Event ID
 * @param {string} response - 'accept', 'tentative', or 'decline'
 * @param {string} comment - Optional comment
 * @param {string} calendarId - Optional calendar ID
 */
export async function respondToEvent(eventId, response, comment, calendarId) {
  let endpoint = `/me/events/${eventId}`;
  if (calendarId && calendarId !== 'primary') {
    endpoint = `/me/calendars/${calendarId}/events/${eventId}`;
  }

  const body = {};
  if (comment) {
    body.comment = comment;
  }

  return graphRequest(`${endpoint}/${response}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get free/busy schedule for users
 * @param {string[]} emails - Array of email addresses to check
 * @param {string} startTime - Start time in ISO format
 * @param {string} endTime - End time in ISO format
 */
export async function getFreeBusy(emails, startTime, endTime) {
  const body = {
    schedules: emails,
    startTime: {
      dateTime: startTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    endTime: {
      dateTime: endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  return graphRequest('/me/calendar/getSchedule', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get calendar permissions (ACL)
 * @param {string} calendarId - Calendar ID (optional, defaults to primary)
 */
export async function getCalendarPermissions(calendarId) {
  let endpoint = '/me/calendar/calendarPermissions';
  if (calendarId && calendarId !== 'primary') {
    endpoint = `/me/calendars/${calendarId}/calendarPermissions`;
  }
  
  const data = await graphRequest(endpoint);
  return data.value;
}
