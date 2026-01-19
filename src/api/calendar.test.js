import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
}));

import { graphRequest } from './client.js';
import {
  getCalendars,
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  respondToEvent,
} from './calendar.js';

describe('calendar API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCalendars', () => {
    it('fetches calendars from Graph API', async () => {
      const mockCalendars = [
        { id: 'cal1', name: 'Calendar', isDefaultCalendar: true },
        { id: 'cal2', name: 'Work', isDefaultCalendar: false },
      ];
      graphRequest.mockResolvedValue({ value: mockCalendars });

      const result = await getCalendars();

      expect(graphRequest).toHaveBeenCalledWith('/me/calendars');
      expect(result).toEqual(mockCalendars);
    });
  });

  describe('getEvents', () => {
    it('fetches events from default calendar', async () => {
      const mockEvents = [{ id: 'event1', subject: 'Meeting' }];
      graphRequest.mockResolvedValue({ value: mockEvents });

      const result = await getEvents();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/events'));
      expect(result).toEqual(mockEvents);
    });

    it('fetches events from specific calendar', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getEvents({ calendar: 'cal123' });

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/me/calendars/cal123/events')
      );
    });

    it('applies date filters', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getEvents({ from: '2025-01-01', to: '2025-01-31' });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/filter.*2025-01-01/));
    });

    it('applies max results limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getEvents({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/top.*10/));
    });
  });

  describe('getEvent', () => {
    it('fetches single event by ID', async () => {
      const mockEvent = { id: 'event1', subject: 'Meeting' };
      graphRequest.mockResolvedValue(mockEvent);

      const result = await getEvent('event1');

      expect(graphRequest).toHaveBeenCalledWith('/me/events/event1');
      expect(result).toEqual(mockEvent);
    });

    it('fetches event from specific calendar', async () => {
      graphRequest.mockResolvedValue({ id: 'event1' });

      await getEvent('event1', 'cal123');

      expect(graphRequest).toHaveBeenCalledWith('/me/calendars/cal123/events/event1');
    });
  });

  describe('createEvent', () => {
    it('creates event with required fields', async () => {
      const mockEvent = { id: 'new-event', subject: 'New Meeting' };
      graphRequest.mockResolvedValue(mockEvent);

      const result = await createEvent({
        subject: 'New Meeting',
        start: '2025-01-15T10:00:00',
        end: '2025-01-15T11:00:00',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"New Meeting"'),
        })
      );
      expect(result).toEqual(mockEvent);
    });

    it('creates event in specific calendar', async () => {
      graphRequest.mockResolvedValue({ id: 'event' });

      await createEvent({
        subject: 'Meeting',
        start: '2025-01-15T10:00:00',
        end: '2025-01-15T11:00:00',
        calendar: 'cal123',
      });

      expect(graphRequest).toHaveBeenCalledWith('/me/calendars/cal123/events', expect.any(Object));
    });

    it('includes location when provided', async () => {
      graphRequest.mockResolvedValue({ id: 'event' });

      await createEvent({
        subject: 'Meeting',
        start: '2025-01-15T10:00:00',
        end: '2025-01-15T11:00:00',
        location: 'Conference Room A',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events',
        expect.objectContaining({
          body: expect.stringContaining('Conference Room A'),
        })
      );
    });

    it('includes attendees when provided', async () => {
      graphRequest.mockResolvedValue({ id: 'event' });

      await createEvent({
        subject: 'Meeting',
        start: '2025-01-15T10:00:00',
        end: '2025-01-15T11:00:00',
        attendees: 'alice@example.com, bob@example.com',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events',
        expect.objectContaining({
          body: expect.stringContaining('attendees'),
        })
      );
    });
  });

  describe('updateEvent', () => {
    it('updates event with PATCH request', async () => {
      const mockEvent = { id: 'event1', subject: 'Updated' };
      graphRequest.mockResolvedValue(mockEvent);

      const result = await updateEvent('event1', { subject: 'Updated' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events/event1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"subject":"Updated"'),
        })
      );
      expect(result).toEqual(mockEvent);
    });

    it('updates event in specific calendar', async () => {
      graphRequest.mockResolvedValue({ id: 'event1' });

      await updateEvent('event1', { subject: 'Updated' }, 'cal123');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/calendars/cal123/events/event1',
        expect.any(Object)
      );
    });
  });

  describe('deleteEvent', () => {
    it('deletes event with DELETE request', async () => {
      graphRequest.mockResolvedValue(undefined);

      await deleteEvent('event1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events/event1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('deletes event from specific calendar', async () => {
      graphRequest.mockResolvedValue(undefined);

      await deleteEvent('event1', 'cal123');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/calendars/cal123/events/event1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('respondToEvent', () => {
    it('accepts event invitation', async () => {
      graphRequest.mockResolvedValue({});

      await respondToEvent('event1', 'accept');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events/event1/accept',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('declines event invitation', async () => {
      graphRequest.mockResolvedValue({});

      await respondToEvent('event1', 'decline');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events/event1/decline',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('responds tentatively with comment', async () => {
      graphRequest.mockResolvedValue({});

      await respondToEvent('event1', 'tentative', 'Maybe if I finish early');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/events/event1/tentative',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Maybe if I finish early'),
        })
      );
    });

    it('responds to event in specific calendar', async () => {
      graphRequest.mockResolvedValue({});

      await respondToEvent('event1', 'accept', null, 'cal123');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/calendars/cal123/events/event1/accept',
        expect.any(Object)
      );
    });
  });
});
