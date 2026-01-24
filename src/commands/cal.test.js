import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/calendar.js', () => ({
  getEvents: vi.fn(),
  createEvent: vi.fn(),
  getEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getCalendars: vi.fn(),
  respondToEvent: vi.fn(),
}));

// Mock ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

import {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  getCalendars,
  respondToEvent,
} from '../api/calendar.js';

import {
  calList,
  calCreate,
  calGet,
  calUpdate,
  calDelete,
  calCalendars,
  calRespond,
} from './cal.js';

describe('cal commands', () => {
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('calList', () => {
    it('lists events', async () => {
      const mockEvents = [
        {
          id: 'event1',
          subject: 'Meeting',
          start: { dateTime: '2025-01-15T10:00:00', timeZone: 'UTC' },
          end: { dateTime: '2025-01-15T11:00:00', timeZone: 'UTC' },
        },
      ];
      getEvents.mockResolvedValue(mockEvents);

      await calList({ max: '25' });

      expect(getEvents).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockEvents = [{ id: 'event1', subject: 'Meeting' }];
      getEvents.mockResolvedValue(mockEvents);

      await calList({ max: '25', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockEvents, null, 2));
    });

    it('shows message when no events', async () => {
      getEvents.mockResolvedValue([]);

      await calList({ max: '25' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No events found'));
    });

    it('handles errors gracefully', async () => {
      getEvents.mockRejectedValue(new Error('API Error'));

      await calList({ max: '25' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('calCreate', () => {
    it('creates an event', async () => {
      const mockEvent = {
        id: 'new-event',
        subject: 'New Meeting',
        start: { dateTime: '2025-01-15T10:00:00' },
        end: { dateTime: '2025-01-15T11:00:00' },
      };
      createEvent.mockResolvedValue(mockEvent);

      await calCreate({
        summary: 'New Meeting',
        from: '2025-01-15T10:00:00',
        to: '2025-01-15T11:00:00',
      });

      expect(createEvent).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Event created'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockEvent = { id: 'new-event', subject: 'Meeting' };
      createEvent.mockResolvedValue(mockEvent);

      await calCreate({
        summary: 'Meeting',
        from: '2025-01-15T10:00:00',
        to: '2025-01-15T11:00:00',
        json: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockEvent, null, 2));
    });

    it('requires --summary flag', async () => {
      await calCreate({ from: '2025-01-15T10:00:00', to: '2025-01-15T11:00:00' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('requires --from flag', async () => {
      await calCreate({ summary: 'Meeting', to: '2025-01-15T11:00:00' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('requires --to flag', async () => {
      await calCreate({ summary: 'Meeting', from: '2025-01-15T10:00:00' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      createEvent.mockRejectedValue(new Error('API Error'));

      await calCreate({
        summary: 'Meeting',
        from: '2025-01-15T10:00:00',
        to: '2025-01-15T11:00:00',
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('calGet', () => {
    it('gets an event by ID', async () => {
      const mockEvent = {
        id: 'event1',
        subject: 'Meeting',
        start: { dateTime: '2025-01-15T10:00:00' },
        end: { dateTime: '2025-01-15T11:00:00' },
      };
      getEvent.mockResolvedValue(mockEvent);

      await calGet('event1', {});

      expect(getEvent).toHaveBeenCalledWith('event1', undefined);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockEvent = { id: 'event1', subject: 'Meeting' };
      getEvent.mockResolvedValue(mockEvent);

      await calGet('event1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockEvent, null, 2));
    });

    it('handles errors gracefully', async () => {
      getEvent.mockRejectedValue(new Error('Not found'));

      await calGet('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('calUpdate', () => {
    it('updates an event', async () => {
      const mockEvent = { id: 'event1', subject: 'Updated Meeting' };
      updateEvent.mockResolvedValue(mockEvent);

      await calUpdate('event1', { summary: 'Updated Meeting' });

      expect(updateEvent).toHaveBeenCalledWith('event1', expect.anything(), undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Event updated'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockEvent = { id: 'event1', subject: 'Updated' };
      updateEvent.mockResolvedValue(mockEvent);

      await calUpdate('event1', { summary: 'Updated', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockEvent, null, 2));
    });

    it('requires at least one update field', async () => {
      await calUpdate('event1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      updateEvent.mockRejectedValue(new Error('API Error'));

      await calUpdate('event1', { summary: 'Updated' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('calDelete', () => {
    it('deletes an event', async () => {
      deleteEvent.mockResolvedValue(undefined);

      await calDelete('event1', {});

      expect(deleteEvent).toHaveBeenCalledWith('event1', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Event deleted'));
    });

    it('deletes from specific calendar', async () => {
      deleteEvent.mockResolvedValue(undefined);

      await calDelete('event1', { calendar: 'cal-id' });

      expect(deleteEvent).toHaveBeenCalledWith('event1', 'cal-id');
    });

    it('handles errors gracefully', async () => {
      deleteEvent.mockRejectedValue(new Error('Not found'));

      await calDelete('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('calCalendars', () => {
    it('lists calendars', async () => {
      const mockCalendars = [{ id: 'cal1', name: 'Calendar', color: 'blue' }];
      getCalendars.mockResolvedValue(mockCalendars);

      await calCalendars({});

      expect(getCalendars).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockCalendars = [{ id: 'cal1', name: 'Calendar' }];
      getCalendars.mockResolvedValue(mockCalendars);

      await calCalendars({ json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockCalendars, null, 2));
    });

    it('handles errors gracefully', async () => {
      getCalendars.mockRejectedValue(new Error('API Error'));

      await calCalendars({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('calRespond', () => {
    it('responds to an event', async () => {
      respondToEvent.mockResolvedValue(undefined);

      await calRespond('event1', 'accept', {});

      expect(respondToEvent).toHaveBeenCalledWith('event1', 'accept', undefined, undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Response sent'));
    });

    it('responds with comment', async () => {
      respondToEvent.mockResolvedValue(undefined);

      await calRespond('event1', 'accept', { comment: 'I will be there!' });

      expect(respondToEvent).toHaveBeenCalledWith(
        'event1',
        'accept',
        'I will be there!',
        undefined
      );
    });

    it('outputs JSON when --json flag is set', async () => {
      respondToEvent.mockResolvedValue(undefined);

      await calRespond('event1', 'accept', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, response: 'accept' })
      );
    });

    it('validates response type', async () => {
      await calRespond('event1', 'invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      respondToEvent.mockRejectedValue(new Error('API Error'));

      await calRespond('event1', 'accept', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
