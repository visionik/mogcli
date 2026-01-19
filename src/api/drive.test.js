import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
  graphRequestRaw: vi.fn(),
}));

import { graphRequest, graphRequestRaw } from './client.js';
import {
  listItems,
  searchFiles,
  getItem,
  getItemByPath,
  downloadFile,
  uploadFile,
  createFolder,
  deleteItem,
  moveItem,
  renameItem,
  copyItem,
} from './drive.js';

describe('drive API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listItems', () => {
    it('lists root folder by default', async () => {
      const mockItems = [
        { id: 'item1', name: 'Document.pdf' },
        { id: 'item2', name: 'Folder', folder: {} },
      ];
      graphRequest.mockResolvedValue({ value: mockItems });

      const result = await listItems();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/drive/root/children'));
      expect(result).toEqual(mockItems);
    });

    it('lists items at path', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listItems('/Documents');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/me/drive/root:/Documents:/children')
      );
    });

    it('lists items by folder ID', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listItems('folder-id-123');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/me/drive/items/folder-id-123/children')
      );
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listItems('/', { max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/top.*10/));
    });
  });

  describe('searchFiles', () => {
    it('searches files with query', async () => {
      const mockItems = [{ id: 'item1', name: 'report.pdf' }];
      graphRequest.mockResolvedValue({ value: mockItems });

      const result = await searchFiles('report');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining("search(q='report')"));
      expect(result).toEqual(mockItems);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await searchFiles('query', { max: 5 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/top.*5/));
    });
  });

  describe('getItem', () => {
    it('fetches item metadata by ID', async () => {
      const mockItem = { id: 'item1', name: 'file.pdf', size: 1024 };
      graphRequest.mockResolvedValue(mockItem);

      const result = await getItem('item1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/item1');
      expect(result).toEqual(mockItem);
    });
  });

  describe('getItemByPath', () => {
    it('fetches item metadata by path', async () => {
      const mockItem = { id: 'item1', name: 'file.pdf' };
      graphRequest.mockResolvedValue(mockItem);

      const result = await getItemByPath('/Documents/file.pdf');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/root:/Documents/file.pdf');
      expect(result).toEqual(mockItem);
    });
  });

  describe('downloadFile', () => {
    it('fetches download URL and streams content', async () => {
      const mockItem = {
        id: 'item1',
        '@microsoft.graph.downloadUrl': 'https://download.url',
      };
      const mockResponse = { body: 'stream' };
      graphRequest.mockResolvedValue(mockItem);
      graphRequestRaw.mockResolvedValue(mockResponse);

      const result = await downloadFile('item1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/item1');
      expect(graphRequestRaw).toHaveBeenCalledWith('https://download.url');
      expect(result).toEqual(mockResponse);
    });

    it('throws if item is not downloadable', async () => {
      graphRequest.mockResolvedValue({ id: 'folder1', folder: {} });

      await expect(downloadFile('folder1')).rejects.toThrow('not downloadable');
    });
  });

  describe('uploadFile', () => {
    it('uploads file to root', async () => {
      const mockItem = { id: 'new-item', name: 'uploaded.pdf' };
      graphRequest.mockResolvedValue(mockItem);

      const result = await uploadFile(Buffer.from('content'), { name: 'uploaded.pdf' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root:/uploaded.pdf:/content',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
          }),
        })
      );
      expect(result).toEqual(mockItem);
    });

    it('uploads file to specific folder', async () => {
      graphRequest.mockResolvedValue({ id: 'item' });

      await uploadFile(Buffer.from('content'), {
        name: 'file.pdf',
        folder: 'folder-id',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/folder-id:/file.pdf:/content',
        expect.any(Object)
      );
    });
  });

  describe('createFolder', () => {
    it('creates folder in root', async () => {
      const mockFolder = { id: 'new-folder', name: 'New Folder', folder: {} };
      graphRequest.mockResolvedValue(mockFolder);

      const result = await createFolder('New Folder');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root/children',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"New Folder"'),
        })
      );
      expect(result).toEqual(mockFolder);
    });

    it('creates folder in specific parent', async () => {
      graphRequest.mockResolvedValue({ id: 'folder' });

      await createFolder('Subfolder', 'parent-id');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/parent-id/children',
        expect.any(Object)
      );
    });
  });

  describe('deleteItem', () => {
    it('deletes item with DELETE request', async () => {
      graphRequest.mockResolvedValue(undefined);

      await deleteItem('item1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/item1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('moveItem', () => {
    it('moves item to new folder', async () => {
      const mockItem = { id: 'item1', name: 'file.pdf' };
      graphRequest.mockResolvedValue(mockItem);

      const result = await moveItem('item1', 'folder-dest');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/item1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('parentReference'),
        })
      );
      expect(result).toEqual(mockItem);
    });
  });

  describe('renameItem', () => {
    it('renames item', async () => {
      const mockItem = { id: 'item1', name: 'new-name.pdf' };
      graphRequest.mockResolvedValue(mockItem);

      const result = await renameItem('item1', 'new-name.pdf');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/item1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"name":"new-name.pdf"'),
        })
      );
      expect(result).toEqual(mockItem);
    });
  });

  describe('copyItem', () => {
    it('initiates copy operation', async () => {
      graphRequest.mockResolvedValue({});

      await copyItem('item1', { name: 'copy.pdf' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/item1/copy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"copy.pdf"'),
        })
      );
    });

    it('copies to specific folder', async () => {
      graphRequest.mockResolvedValue({});

      await copyItem('item1', { destinationFolderId: 'dest-folder' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/item1/copy',
        expect.objectContaining({
          body: expect.stringContaining('parentReference'),
        })
      );
    });
  });
});
