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
  searchDirectory,
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

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/\/me\/contacts/));
      expect(result).toEqual(mockContacts);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getContacts({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/top.*10/));
    });
  });

  describe('searchContacts', () => {
    it('searches contacts by displayName filter', async () => {
      const mockContacts = [{ id: 'contact1', displayName: 'John Doe' }];
      graphRequest.mockResolvedValue({ value: mockContacts });

      const result = await searchContacts('John');

      // URL params get encoded: startswith(displayName,'John') → startswith%28displayName%2C%27John%27%29
      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/contacts?'));
      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('%24filter='));
      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('John'));
      expect(result).toEqual(mockContacts);
    });

    it('falls back to people search when filter fails', async () => {
      const mockPeople = [
        { id: 'person1', displayName: 'John Doe' },
        { id: 'person2', displayName: 'Johnny Appleseed' },
      ];
      // First call fails (filter not supported), second succeeds (people search)
      graphRequest
        .mockRejectedValueOnce(new Error('Filter not supported'))
        .mockResolvedValueOnce({ value: mockPeople });

      const result = await searchContacts('John');

      expect(graphRequest).toHaveBeenCalledTimes(2);
      // Second call should be to people search
      expect(graphRequest).toHaveBeenLastCalledWith(expect.stringContaining('/me/people'));
      expect(result).toEqual(mockPeople);
    });

    it('falls back to people search when filter returns empty', async () => {
      const mockPeople = [{ id: 'person1', displayName: 'John Colleague' }];
      // First call returns empty, second returns people
      graphRequest
        .mockResolvedValueOnce({ value: [] })
        .mockResolvedValueOnce({ value: mockPeople });

      const result = await searchContacts('John');

      expect(graphRequest).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockPeople);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [{ id: '1', displayName: 'John' }] });

      await searchContacts('John', { max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('%24top=10'));
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

  describe('searchDirectory', () => {
    it('searches organizational directory', async () => {
      const mockUsers = [
        { id: 'user1', displayName: 'John Doe', mail: 'john@example.com' },
        { id: 'user2', displayName: 'John Smith', mail: 'jsmith@example.com' },
      ];
      graphRequest.mockResolvedValue({ value: mockUsers });

      const result = await searchDirectory('John');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/users?'));
      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('John'));
      expect(result).toEqual(mockUsers);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await searchDirectory('Test', { max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('%24top=10'));
    });

    it('includes relevant user fields in select', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await searchDirectory('Test');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('displayName'));
      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('mail'));
      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('jobTitle'));
    });
  });
});
