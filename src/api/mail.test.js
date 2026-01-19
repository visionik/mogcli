import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
}));

import { graphRequest } from './client.js';
import {
  searchMessages,
  getMessage,
  getFolders,
  sendMail,
  createDraft,
  sendDraft,
  getDrafts,
  deleteDraft,
} from './mail.js';

describe('mail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchMessages', () => {
    it('searches messages with query', async () => {
      const mockMessages = [{ id: 'msg1', subject: 'Hello' }];
      graphRequest.mockResolvedValue({ value: mockMessages });

      const result = await searchMessages('hello');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/search.*hello/i));
      expect(result).toEqual(mockMessages);
    });

    it('searches in specific folder', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await searchMessages('query', { folder: 'folder123' });

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/me/mailFolders/folder123/messages')
      );
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await searchMessages('query', { max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/top.*10/));
    });
  });

  describe('getMessage', () => {
    it('fetches single message by ID', async () => {
      const mockMessage = { id: 'msg1', subject: 'Hello' };
      graphRequest.mockResolvedValue(mockMessage);

      const result = await getMessage('msg1');

      expect(graphRequest).toHaveBeenCalledWith('/me/messages/msg1');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getFolders', () => {
    it('fetches mail folders', async () => {
      const mockFolders = [
        { id: 'folder1', displayName: 'Inbox' },
        { id: 'folder2', displayName: 'Sent' },
      ];
      graphRequest.mockResolvedValue({ value: mockFolders });

      const result = await getFolders();

      expect(graphRequest).toHaveBeenCalledWith('/me/mailFolders?$top=50');
      expect(result).toEqual(mockFolders);
    });
  });

  describe('sendMail', () => {
    it('sends email with required fields', async () => {
      graphRequest.mockResolvedValue({});

      await sendMail({
        to: 'bob@example.com',
        subject: 'Hello',
        body: 'Hi there!',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/sendMail',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"Hello"'),
        })
      );
    });

    it('sends to multiple recipients', async () => {
      graphRequest.mockResolvedValue({});

      await sendMail({
        to: 'alice@example.com, bob@example.com',
        subject: 'Hello',
        body: 'Hi!',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/sendMail',
        expect.objectContaining({
          body: expect.stringContaining('alice@example.com'),
        })
      );
    });

    it('sends as reply when replyToMessageId provided', async () => {
      graphRequest.mockResolvedValue({});

      await sendMail({
        to: 'bob@example.com',
        subject: 'Re: Hello',
        body: 'Thanks!',
        replyToMessageId: 'original-msg-id',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/messages/original-msg-id/reply',
        expect.any(Object)
      );
    });

    it('includes CC recipients', async () => {
      graphRequest.mockResolvedValue({});

      await sendMail({
        to: 'bob@example.com',
        subject: 'Hello',
        body: 'Hi!',
        cc: 'alice@example.com',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/sendMail',
        expect.objectContaining({
          body: expect.stringContaining('ccRecipients'),
        })
      );
    });
  });

  describe('createDraft', () => {
    it('creates draft message', async () => {
      const mockDraft = { id: 'draft1', subject: 'Draft' };
      graphRequest.mockResolvedValue(mockDraft);

      const result = await createDraft({
        to: 'bob@example.com',
        subject: 'Draft',
        body: 'Content',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/messages',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"subject":"Draft"'),
        })
      );
      expect(result).toEqual(mockDraft);
    });
  });

  describe('sendDraft', () => {
    it('sends draft with POST request', async () => {
      graphRequest.mockResolvedValue({});

      await sendDraft('draft1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/messages/draft1/send',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getDrafts', () => {
    it('fetches drafts from Drafts folder', async () => {
      const mockDrafts = [{ id: 'draft1', subject: 'Draft' }];
      graphRequest.mockResolvedValue({ value: mockDrafts });

      const result = await getDrafts();

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/me/mailFolders/Drafts/messages')
      );
      expect(result).toEqual(mockDrafts);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getDrafts({ max: 5 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/top.*5/));
    });
  });

  describe('deleteDraft', () => {
    it('deletes draft with DELETE request', async () => {
      graphRequest.mockResolvedValue(undefined);

      await deleteDraft('draft1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/messages/draft1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
