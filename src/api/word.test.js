import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
}));

import { graphRequest } from './client.js';
import {
  listDocuments,
  getDocument,
  downloadDocument,
  copyDocument,
  createDocument,
} from './word.js';

describe('word API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('searches for .docx files', async () => {
      const mockDocs = [{ id: 'doc1', name: 'report.docx' }];
      graphRequest.mockResolvedValue({ value: mockDocs });

      const result = await listDocuments();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('.docx'));
      expect(result).toEqual(mockDocs);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listDocuments({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=10'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listDocuments();

      expect(result).toEqual([]);
    });
  });

  describe('getDocument', () => {
    it('gets document metadata', async () => {
      const mockDoc = { id: 'doc1', name: 'report.docx' };
      graphRequest.mockResolvedValue(mockDoc);

      const result = await getDocument('doc1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/doc1');
      expect(result).toEqual(mockDoc);
    });
  });

  describe('downloadDocument', () => {
    it('downloads document content', async () => {
      const mockResponse = { body: 'stream' };
      graphRequest.mockResolvedValue(mockResponse);

      const result = await downloadDocument('doc1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/doc1/content', {
        rawResponse: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('downloads as PDF when format specified', async () => {
      const mockResponse = { body: 'stream' };
      graphRequest.mockResolvedValue(mockResponse);

      await downloadDocument('doc1', 'pdf');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/doc1/content?format=pdf', {
        rawResponse: true,
      });
    });
  });

  describe('copyDocument', () => {
    it('copies document with new name', async () => {
      const mockResult = { id: 'copy-id' };
      graphRequest.mockResolvedValue(mockResult);

      const result = await copyDocument('doc1', { name: 'copy.docx' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/doc1/copy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('copy.docx'),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('copies to specific folder', async () => {
      graphRequest.mockResolvedValue({});

      await copyDocument('doc1', { name: 'copy.docx', parentId: 'folder-id' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/doc1/copy',
        expect.objectContaining({
          body: expect.stringContaining('folder-id'),
        })
      );
    });
  });

  describe('createDocument', () => {
    it('creates document in root', async () => {
      const mockDoc = { id: 'new-doc', name: 'report.docx' };
      graphRequest.mockResolvedValue(mockDoc);

      const result = await createDocument('report');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root:/report.docx:/content',
        expect.objectContaining({ method: 'PUT' })
      );
      expect(result).toEqual(mockDoc);
    });

    it('creates document in folder', async () => {
      graphRequest.mockResolvedValue({ id: 'new-doc' });

      await createDocument('report', 'folder-id');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/folder-id:/report.docx:/content',
        expect.anything()
      );
    });

    it('handles name with .docx extension', async () => {
      graphRequest.mockResolvedValue({ id: 'new-doc' });

      await createDocument('report.docx');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root:/report.docx:/content',
        expect.anything()
      );
    });
  });
});
