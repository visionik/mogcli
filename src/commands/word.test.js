import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/word.js', () => ({
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  downloadDocument: vi.fn(),
  copyDocument: vi.fn(),
  createDocument: vi.fn(),
}));

// Mock ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

// Mock fs and stream
vi.mock('fs', () => ({
  createWriteStream: vi.fn(() => ({ on: vi.fn() })),
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

import {
  listDocuments,
  getDocument,
  downloadDocument,
  copyDocument,
  createDocument,
} from '../api/word.js';

import { wordList, wordGet, wordExport, wordCopy, wordCreate } from './word.js';

describe('word commands', () => {
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

  describe('wordList', () => {
    it('lists Word documents', async () => {
      const mockDocs = [
        { id: 'doc1', name: 'report.docx', size: 1024, lastModifiedDateTime: '2025-01-01' },
      ];
      listDocuments.mockResolvedValue(mockDocs);

      await wordList({ max: '50' });

      expect(listDocuments).toHaveBeenCalledWith({ max: 50 });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockDocs = [{ id: 'doc1', name: 'report.docx' }];
      listDocuments.mockResolvedValue(mockDocs);

      await wordList({ max: '50', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockDocs, null, 2));
    });

    it('shows message when no documents', async () => {
      listDocuments.mockResolvedValue([]);

      await wordList({ max: '50' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No Word documents'));
    });

    it('handles errors gracefully', async () => {
      listDocuments.mockRejectedValue(new Error('API Error'));

      await wordList({ max: '50' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('wordGet', () => {
    it('gets document metadata', async () => {
      const mockDoc = {
        id: 'doc1',
        name: 'report.docx',
        size: 1024,
        lastModifiedDateTime: '2025-01-01',
        createdDateTime: '2025-01-01',
      };
      getDocument.mockResolvedValue(mockDoc);

      await wordGet('doc1', {});

      expect(getDocument).toHaveBeenCalledWith('doc1');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockDoc = { id: 'doc1', name: 'report.docx' };
      getDocument.mockResolvedValue(mockDoc);

      await wordGet('doc1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockDoc, null, 2));
    });

    it('handles errors gracefully', async () => {
      getDocument.mockRejectedValue(new Error('Not found'));

      await wordGet('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('wordExport', () => {
    it('exports document as docx', async () => {
      downloadDocument.mockResolvedValue({ body: { pipe: vi.fn() } });

      await wordExport('doc1', { out: './output.docx', format: 'docx' });

      expect(downloadDocument).toHaveBeenCalledWith('doc1', null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Exported'));
    });

    it('exports document as PDF', async () => {
      downloadDocument.mockResolvedValue({ body: { pipe: vi.fn() } });

      await wordExport('doc1', { out: './output.pdf', format: 'pdf' });

      expect(downloadDocument).toHaveBeenCalledWith('doc1', 'pdf');
    });

    it('requires --out flag', async () => {
      await wordExport('doc1', { format: 'docx' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('validates format', async () => {
      await wordExport('doc1', { out: './output.txt', format: 'txt' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      downloadDocument.mockRejectedValue(new Error('API Error'));

      await wordExport('doc1', { out: './output.docx', format: 'docx' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('wordCopy', () => {
    it('copies a document', async () => {
      const mockResult = { id: 'copy-id' };
      copyDocument.mockResolvedValue(mockResult);

      await wordCopy('doc1', { name: 'copy' });

      expect(copyDocument).toHaveBeenCalledWith(
        'doc1',
        expect.objectContaining({ name: 'copy.docx' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Copy initiated'));
    });

    it('requires --name flag', async () => {
      await wordCopy('doc1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockResult = { id: 'copy-id' };
      copyDocument.mockResolvedValue(mockResult);

      await wordCopy('doc1', { name: 'copy', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2));
    });

    it('handles errors gracefully', async () => {
      copyDocument.mockRejectedValue(new Error('API Error'));

      await wordCopy('doc1', { name: 'copy' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('wordCreate', () => {
    it('creates a document', async () => {
      const mockDoc = { id: 'new-doc', name: 'report.docx', webUrl: 'https://...' };
      createDocument.mockResolvedValue(mockDoc);

      await wordCreate({ title: 'report' });

      expect(createDocument).toHaveBeenCalledWith('report', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Document created'));
    });

    it('creates in specific folder', async () => {
      createDocument.mockResolvedValue({ id: 'new-doc', name: 'report.docx' });

      await wordCreate({ title: 'report', folder: 'folder-id' });

      expect(createDocument).toHaveBeenCalledWith('report', 'folder-id');
    });

    it('requires --title flag', async () => {
      await wordCreate({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockDoc = { id: 'new-doc', name: 'report.docx' };
      createDocument.mockResolvedValue(mockDoc);

      await wordCreate({ title: 'report', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockDoc, null, 2));
    });

    it('handles errors gracefully', async () => {
      createDocument.mockRejectedValue(new Error('API Error'));

      await wordCreate({ title: 'report' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
