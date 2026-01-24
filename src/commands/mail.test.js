import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// Mock the API module
vi.mock('../api/mail.js', () => ({
  searchMessages: vi.fn(),
  getMessage: vi.fn(),
  sendMail: vi.fn(),
  getFolders: vi.fn(),
  getDrafts: vi.fn(),
  createDraft: vi.fn(),
  sendDraft: vi.fn(),
  deleteDraft: vi.fn(),
  getAttachments: vi.fn(),
  getAttachment: vi.fn(),
}));

// Mock ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import {
  searchMessages,
  getMessage,
  sendMail,
  getFolders,
  getDrafts,
  createDraft,
  sendDraft,
  deleteDraft,
  getAttachments,
  getAttachment,
} from '../api/mail.js';

import {
  mailSearch,
  mailSend,
  mailGet,
  mailFolders,
  draftsList,
  draftsCreate,
  draftsSend,
  draftsDelete,
  attachmentList,
  attachmentDownload,
} from './mail.js';

describe('mail commands', () => {
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

  describe('mailSearch', () => {
    it('searches messages', async () => {
      const mockMessages = [
        { id: 'msg1', subject: 'Hello', from: { emailAddress: { address: 'test@example.com' } } },
      ];
      searchMessages.mockResolvedValue(mockMessages);

      await mailSearch('test query', { max: '25' });

      expect(searchMessages).toHaveBeenCalledWith('test query', { max: 25, folder: undefined });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockMessages = [{ id: 'msg1', subject: 'Hello' }];
      searchMessages.mockResolvedValue(mockMessages);

      await mailSearch('test', { max: '25', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockMessages, null, 2));
    });

    it('shows message when no results', async () => {
      searchMessages.mockResolvedValue([]);

      await mailSearch('test', { max: '25' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No messages found'));
    });

    it('handles errors gracefully', async () => {
      searchMessages.mockRejectedValue(new Error('API Error'));

      await mailSearch('test', { max: '25' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('mailSend', () => {
    it('sends an email with required fields', async () => {
      sendMail.mockResolvedValue(undefined);

      await mailSend({ to: 'recipient@example.com', subject: 'Test', body: 'Hello' });

      expect(sendMail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Hello',
        isHtml: false,
        cc: undefined,
        bcc: undefined,
        replyToMessageId: undefined,
      });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Email sent'));
    });

    it('sends with CC and BCC', async () => {
      sendMail.mockResolvedValue(undefined);

      await mailSend({
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Hello',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
        })
      );
    });

    it('reads body from file', async () => {
      fs.readFileSync.mockReturnValue('File content');
      sendMail.mockResolvedValue(undefined);

      await mailSend({
        to: 'recipient@example.com',
        subject: 'Test',
        bodyFile: './body.txt',
      });

      expect(fs.readFileSync).toHaveBeenCalledWith('./body.txt', 'utf8');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ body: 'File content' }));
    });

    it('sends HTML body', async () => {
      sendMail.mockResolvedValue(undefined);

      await mailSend({
        to: 'recipient@example.com',
        subject: 'Test',
        bodyHtml: '<p>Hello</p>',
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ body: '<p>Hello</p>', isHtml: true })
      );
    });

    it('outputs JSON when --json flag is set', async () => {
      sendMail.mockResolvedValue(undefined);

      await mailSend({ to: 'test@example.com', subject: 'Test', body: 'Hi', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ success: true }));
    });

    it('requires body content', async () => {
      await mailSend({ to: 'test@example.com', subject: 'Test' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      sendMail.mockRejectedValue(new Error('API Error'));

      await mailSend({ to: 'test@example.com', subject: 'Test', body: 'Hello' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('mailGet', () => {
    it('gets a message by ID', async () => {
      const mockMessage = {
        id: 'msg1',
        subject: 'Hello',
        from: { emailAddress: { name: 'Sender', address: 'sender@example.com' } },
        body: { content: 'Message body' },
      };
      getMessage.mockResolvedValue(mockMessage);

      await mailGet('msg1', {});

      expect(getMessage).toHaveBeenCalledWith('msg1');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockMessage = { id: 'msg1', subject: 'Hello' };
      getMessage.mockResolvedValue(mockMessage);

      await mailGet('msg1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockMessage, null, 2));
    });

    it('handles errors gracefully', async () => {
      getMessage.mockRejectedValue(new Error('Not found'));

      await mailGet('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('mailFolders', () => {
    it('lists mail folders', async () => {
      const mockFolders = [
        { id: 'folder1', displayName: 'Inbox', unreadItemCount: 5, totalItemCount: 100 },
      ];
      getFolders.mockResolvedValue(mockFolders);

      await mailFolders({});

      expect(getFolders).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFolders = [{ id: 'folder1', displayName: 'Inbox' }];
      getFolders.mockResolvedValue(mockFolders);

      await mailFolders({ json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFolders, null, 2));
    });

    it('handles errors gracefully', async () => {
      getFolders.mockRejectedValue(new Error('API Error'));

      await mailFolders({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('draftsList', () => {
    it('lists drafts', async () => {
      const mockDrafts = [{ id: 'draft1', subject: 'Draft email' }];
      getDrafts.mockResolvedValue(mockDrafts);

      await draftsList({ max: '25' });

      expect(getDrafts).toHaveBeenCalledWith({ max: 25 });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockDrafts = [{ id: 'draft1', subject: 'Draft' }];
      getDrafts.mockResolvedValue(mockDrafts);

      await draftsList({ max: '25', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockDrafts, null, 2));
    });

    it('shows message when no drafts', async () => {
      getDrafts.mockResolvedValue([]);

      await draftsList({ max: '25' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No drafts found'));
    });

    it('handles errors gracefully', async () => {
      getDrafts.mockRejectedValue(new Error('API Error'));

      await draftsList({ max: '25' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('draftsCreate', () => {
    it('creates a draft', async () => {
      const mockDraft = { id: 'draft1', subject: 'Draft' };
      createDraft.mockResolvedValue(mockDraft);

      await draftsCreate({ to: 'test@example.com', subject: 'Draft', body: 'Content' });

      expect(createDraft).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Draft created'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockDraft = { id: 'draft1', subject: 'Draft' };
      createDraft.mockResolvedValue(mockDraft);

      await draftsCreate({ to: 'test@example.com', subject: 'Draft', body: 'Hi', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockDraft, null, 2));
    });

    it('handles errors gracefully', async () => {
      createDraft.mockRejectedValue(new Error('API Error'));

      await draftsCreate({ to: 'test@example.com', subject: 'Draft', body: 'Hi' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('draftsSend', () => {
    it('sends a draft', async () => {
      sendDraft.mockResolvedValue(undefined);

      await draftsSend('draft1', {});

      expect(sendDraft).toHaveBeenCalledWith('draft1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Draft sent'));
    });

    it('outputs JSON when --json flag is set', async () => {
      sendDraft.mockResolvedValue(undefined);

      await draftsSend('draft1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ success: true }));
    });

    it('handles errors gracefully', async () => {
      sendDraft.mockRejectedValue(new Error('API Error'));

      await draftsSend('draft1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('draftsDelete', () => {
    it('deletes a draft', async () => {
      deleteDraft.mockResolvedValue(undefined);

      await draftsDelete('draft1', {});

      expect(deleteDraft).toHaveBeenCalledWith('draft1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Draft deleted'));
    });

    it('outputs JSON when --json flag is set', async () => {
      deleteDraft.mockResolvedValue(undefined);

      await draftsDelete('draft1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ success: true }));
    });

    it('handles errors gracefully', async () => {
      deleteDraft.mockRejectedValue(new Error('API Error'));

      await draftsDelete('draft1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('attachmentList', () => {
    it('lists attachments for a message', async () => {
      const mockAttachments = [{ id: 'att1', name: 'file.pdf', size: 1024 }];
      getAttachments.mockResolvedValue(mockAttachments);

      await attachmentList('msg1', {});

      expect(getAttachments).toHaveBeenCalledWith('msg1');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockAttachments = [{ id: 'att1', name: 'file.pdf' }];
      getAttachments.mockResolvedValue(mockAttachments);

      await attachmentList('msg1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockAttachments, null, 2));
    });

    it('shows message when no attachments', async () => {
      getAttachments.mockResolvedValue([]);

      await attachmentList('msg1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No attachments'));
    });

    it('handles errors gracefully', async () => {
      getAttachments.mockRejectedValue(new Error('API Error'));

      await attachmentList('msg1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('attachmentDownload', () => {
    it('downloads an attachment', async () => {
      const mockAttachment = {
        name: 'file.pdf',
        contentBytes: Buffer.from('file content').toString('base64'),
      };
      getAttachment.mockResolvedValue(mockAttachment);

      await attachmentDownload('msg1', 'att1', { out: './file.pdf' });

      expect(getAttachment).toHaveBeenCalledWith('msg1', 'att1');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Downloaded'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const content = Buffer.from('data');
      const mockAttachment = {
        name: 'file.pdf',
        contentBytes: content.toString('base64'),
      };
      getAttachment.mockResolvedValue(mockAttachment);

      await attachmentDownload('msg1', 'att1', { out: './file.pdf', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, path: './file.pdf', size: content.length })
      );
    });

    it('uses attachment name when --out not provided', async () => {
      const mockAttachment = {
        name: 'document.pdf',
        contentBytes: Buffer.from('data').toString('base64'),
      };
      getAttachment.mockResolvedValue(mockAttachment);

      await attachmentDownload('msg1', 'att1', {});

      expect(fs.writeFileSync).toHaveBeenCalledWith('document.pdf', expect.any(Buffer));
    });

    it('handles attachment without content', async () => {
      getAttachment.mockResolvedValue({ name: 'ref.pdf' });

      await attachmentDownload('msg1', 'att1', { out: './file.pdf' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      getAttachment.mockRejectedValue(new Error('API Error'));

      await attachmentDownload('msg1', 'att1', { out: './file.pdf' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
