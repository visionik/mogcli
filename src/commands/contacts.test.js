import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/contacts.js', () => ({
  getContacts: vi.fn(),
  searchContacts: vi.fn(),
  getContact: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
}));

// Mock ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

import {
  getContacts,
  searchContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from '../api/contacts.js';

import {
  contactsList,
  contactsSearch,
  contactsGet,
  contactsCreate,
  contactsUpdate,
  contactsDelete,
} from './contacts.js';

describe('contacts commands', () => {
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

  describe('contactsList', () => {
    it('lists contacts', async () => {
      const mockContacts = [
        { id: 'contact1', displayName: 'John Doe', emailAddresses: [{ address: 'john@test.com' }] },
        { id: 'contact2', displayName: 'Jane Smith' },
      ];
      getContacts.mockResolvedValue(mockContacts);

      await contactsList({ max: '50' });

      expect(getContacts).toHaveBeenCalledWith({ max: 50 });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockContacts = [{ id: 'contact1', displayName: 'John Doe' }];
      getContacts.mockResolvedValue(mockContacts);

      await contactsList({ max: '50', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockContacts, null, 2));
    });

    it('shows message when no contacts found', async () => {
      getContacts.mockResolvedValue([]);

      await contactsList({ max: '50' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No contacts found'));
    });

    it('shows verbose output when requested', async () => {
      const mockContacts = [{ id: 'full-contact-id-here', displayName: 'John' }];
      getContacts.mockResolvedValue(mockContacts);

      await contactsList({ max: '50', verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('full-contact-id-here'));
    });

    it('handles errors gracefully', async () => {
      getContacts.mockRejectedValue(new Error('API Error'));

      await contactsList({ max: '50' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('contactsSearch', () => {
    it('searches contacts by query', async () => {
      const mockContacts = [{ id: 'contact1', displayName: 'John Doe' }];
      searchContacts.mockResolvedValue(mockContacts);

      await contactsSearch('John', { max: '25' });

      expect(searchContacts).toHaveBeenCalledWith('John', { max: 25 });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockContacts = [{ id: 'contact1', displayName: 'John Doe' }];
      searchContacts.mockResolvedValue(mockContacts);

      await contactsSearch('John', { max: '25', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockContacts, null, 2));
    });

    it('shows message when no contacts found', async () => {
      searchContacts.mockResolvedValue([]);

      await contactsSearch('Nobody', { max: '25' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No contacts found'));
    });

    it('handles people API results (different field names)', async () => {
      const mockPeople = [
        {
          id: 'person1',
          givenName: 'John',
          scoredEmailAddresses: [{ address: 'john@work.com' }],
          phones: [{ number: '555-1234' }],
        },
      ];
      searchContacts.mockResolvedValue(mockPeople);

      await contactsSearch('John', { max: '25' });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      searchContacts.mockRejectedValue(new Error('API Error'));

      await contactsSearch('John', { max: '25' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('contactsGet', () => {
    it('gets a contact by ID', async () => {
      const mockContact = {
        id: 'contact1',
        displayName: 'John Doe',
        emailAddresses: [{ address: 'john@test.com' }],
        mobilePhone: '555-1234',
        businessPhones: ['555-5678'],
        companyName: 'Acme Corp',
        jobTitle: 'Developer',
      };
      getContact.mockResolvedValue(mockContact);

      await contactsGet('contact1', {});

      expect(getContact).toHaveBeenCalledWith('contact1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('John Doe'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Doe' };
      getContact.mockResolvedValue(mockContact);

      await contactsGet('contact1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockContact, null, 2));
    });

    it('handles contacts without optional fields', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Doe' };
      getContact.mockResolvedValue(mockContact);

      await contactsGet('contact1', {});

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      getContact.mockRejectedValue(new Error('Not found'));

      await contactsGet('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('contactsCreate', () => {
    it('creates a contact with name', async () => {
      const mockContact = { id: 'new-contact', displayName: 'John Doe' };
      createContact.mockResolvedValue(mockContact);

      await contactsCreate({ name: 'John Doe' });

      expect(createContact).toHaveBeenCalledWith({
        name: 'John Doe',
        email: undefined,
        phone: undefined,
        company: undefined,
        title: undefined,
      });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Contact created'));
    });

    it('creates a contact with all fields', async () => {
      const mockContact = {
        id: 'new-contact',
        displayName: 'John Doe',
        emailAddresses: [{ address: 'john@test.com' }],
        mobilePhone: '555-1234',
      };
      createContact.mockResolvedValue(mockContact);

      await contactsCreate({
        name: 'John Doe',
        email: 'john@test.com',
        phone: '555-1234',
        company: 'Acme',
        title: 'Dev',
      });

      expect(createContact).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@test.com',
        phone: '555-1234',
        company: 'Acme',
        title: 'Dev',
      });
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockContact = { id: 'new-contact', displayName: 'John Doe' };
      createContact.mockResolvedValue(mockContact);

      await contactsCreate({ name: 'John Doe', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockContact, null, 2));
    });

    it('requires name or email', async () => {
      await contactsCreate({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      createContact.mockRejectedValue(new Error('API Error'));

      await contactsCreate({ name: 'John' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('contactsUpdate', () => {
    it('updates a contact', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Updated' };
      updateContact.mockResolvedValue(mockContact);

      await contactsUpdate('contact1', { name: 'John Updated' });

      expect(updateContact).toHaveBeenCalledWith('contact1', { name: 'John Updated' });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Contact updated'));
    });

    it('updates multiple fields', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Updated' };
      updateContact.mockResolvedValue(mockContact);

      await contactsUpdate('contact1', {
        name: 'John Updated',
        email: 'new@test.com',
        phone: '555-9999',
        company: 'New Corp',
        title: 'Manager',
      });

      expect(updateContact).toHaveBeenCalledWith('contact1', {
        name: 'John Updated',
        email: 'new@test.com',
        phone: '555-9999',
        company: 'New Corp',
        title: 'Manager',
      });
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockContact = { id: 'contact1', displayName: 'John Updated' };
      updateContact.mockResolvedValue(mockContact);

      await contactsUpdate('contact1', { name: 'John Updated', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockContact, null, 2));
    });

    it('requires at least one update field', async () => {
      await contactsUpdate('contact1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      updateContact.mockRejectedValue(new Error('API Error'));

      await contactsUpdate('contact1', { name: 'New Name' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('contactsDelete', () => {
    it('deletes a contact', async () => {
      deleteContact.mockResolvedValue(undefined);

      await contactsDelete('contact1', {});

      expect(deleteContact).toHaveBeenCalledWith('contact1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Contact deleted'));
    });

    it('outputs JSON when --json flag is set', async () => {
      deleteContact.mockResolvedValue(undefined);

      await contactsDelete('contact1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ success: true }));
    });

    it('handles errors gracefully', async () => {
      deleteContact.mockRejectedValue(new Error('Not found'));

      await contactsDelete('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
