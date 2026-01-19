import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
}));

import { graphRequest } from './client.js';
import {
  getContacts,
  searchContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from './contacts.js';

describe('contacts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContacts', () => {
    it('fetches contacts from Graph API', async () => {
      const mockContacts = [
        { id: 'contact1', displayName: 'John Doe' },
        { id: 'contact2', displayName: 'Jane Smith' },
      ];
      graphRequest.mockResolvedValue({ value: mockContacts });

      const result = await getContacts();

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringMatching(/\/me\/contacts/)
      );
      expect(result).toEqual(mockContacts);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getContacts({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringMatching(/top.*10/)
      );
    });
  });

  describe('getContact', () => {
    it('fetches single contact by ID', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Doe' };
      graphRequest.mockResolvedValue(mockContact);

      const result = await getContact('contact1');

      expect(graphRequest).toHaveBeenCalledWith('/me/contacts/contact1');
      expect(result).toEqual(mockContact);
    });
  });

  describe('createContact', () => {
    it('creates contact with name', async () => {
      const mockContact = { id: 'new-contact', displayName: 'John Doe' };
      graphRequest.mockResolvedValue(mockContact);

      const result = await createContact({ name: 'John Doe' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"displayName":"John Doe"'),
        })
      );
      expect(result).toEqual(mockContact);
    });

    it('creates contact with email', async () => {
      graphRequest.mockResolvedValue({ id: 'contact' });

      await createContact({ name: 'John', email: 'john@example.com' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts',
        expect.objectContaining({
          body: expect.stringContaining('john@example.com'),
        })
      );
    });

    it('creates contact with phone', async () => {
      graphRequest.mockResolvedValue({ id: 'contact' });

      await createContact({ name: 'John', phone: '555-1234' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts',
        expect.objectContaining({
          body: expect.stringContaining('555-1234'),
        })
      );
    });

    it('creates contact with company and title', async () => {
      graphRequest.mockResolvedValue({ id: 'contact' });

      await createContact({
        name: 'John',
        company: 'Acme Corp',
        title: 'Developer',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts',
        expect.objectContaining({
          body: expect.stringContaining('Acme Corp'),
        })
      );
    });
  });

  describe('updateContact', () => {
    it('updates contact with PATCH request', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Updated' };
      graphRequest.mockResolvedValue(mockContact);

      const result = await updateContact('contact1', { name: 'John Updated' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts/contact1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"displayName":"John Updated"'),
        })
      );
      expect(result).toEqual(mockContact);
    });

    it('updates email', async () => {
      graphRequest.mockResolvedValue({ id: 'contact1' });

      await updateContact('contact1', { email: 'new@example.com' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts/contact1',
        expect.objectContaining({
          body: expect.stringContaining('new@example.com'),
        })
      );
    });
  });

  describe('deleteContact', () => {
    it('deletes contact with DELETE request', async () => {
      graphRequest.mockResolvedValue(undefined);

      await deleteContact('contact1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/contacts/contact1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
