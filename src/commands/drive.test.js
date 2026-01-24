import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/drive.js', () => ({
  listItems: vi.fn(),
  searchFiles: vi.fn(),
  getItem: vi.fn(),
  downloadFile: vi.fn(),
  uploadFile: vi.fn(),
  createFolder: vi.fn(),
  deleteItem: vi.fn(),
  moveItem: vi.fn(),
  renameItem: vi.fn(),
  copyItem: vi.fn(),
}));

// Mock ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

// Mock fs and stream
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  createWriteStream: vi.fn(() => ({ on: vi.fn() })),
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

import {
  listItems,
  searchFiles,
  getItem,
  downloadFile,
  uploadFile,
  createFolder,
  deleteItem,
  moveItem,
  renameItem,
  copyItem,
} from '../api/drive.js';

import {
  driveLs,
  driveSearch,
  driveGet,
  driveDownload,
  driveUpload,
  driveMkdir,
  driveRm,
  driveMove,
  driveRename,
  driveCopy,
} from './drive.js';

describe('drive commands', () => {
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

  describe('driveLs', () => {
    it('lists files in root', async () => {
      const mockFiles = [
        { id: 'file1', name: 'document.pdf', size: 1024, lastModifiedDateTime: '2025-01-01' },
        {
          id: 'folder1',
          name: 'Photos',
          folder: { childCount: 5 },
          lastModifiedDateTime: '2025-01-01',
        },
      ];
      listItems.mockResolvedValue(mockFiles);

      await driveLs(undefined, { max: '50' });

      expect(listItems).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFiles = [{ id: 'file1', name: 'doc.pdf' }];
      listItems.mockResolvedValue(mockFiles);

      await driveLs(undefined, { max: '50', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFiles, null, 2));
    });

    it('shows message when folder is empty', async () => {
      listItems.mockResolvedValue([]);

      await driveLs(undefined, { max: '50' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('empty'));
    });

    it('handles errors gracefully', async () => {
      listItems.mockRejectedValue(new Error('API Error'));

      await driveLs(undefined, { max: '50' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveSearch', () => {
    it('searches files', async () => {
      const mockFiles = [
        { id: 'file1', name: 'report.pdf', size: 1024, lastModifiedDateTime: '2025-01-01' },
      ];
      searchFiles.mockResolvedValue(mockFiles);

      await driveSearch('report', { max: '25' });

      expect(searchFiles).toHaveBeenCalledWith('report', { max: 25 });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFiles = [{ id: 'file1', name: 'report.pdf' }];
      searchFiles.mockResolvedValue(mockFiles);

      await driveSearch('report', { max: '25', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFiles, null, 2));
    });

    it('shows message when no results', async () => {
      searchFiles.mockResolvedValue([]);

      await driveSearch('nonexistent', { max: '25' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No files found'));
    });

    it('handles errors gracefully', async () => {
      searchFiles.mockRejectedValue(new Error('API Error'));

      await driveSearch('test', { max: '25' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveGet', () => {
    it('gets file metadata', async () => {
      const mockFile = { id: 'file1', name: 'doc.pdf', size: 1024, webUrl: 'https://...' };
      getItem.mockResolvedValue(mockFile);

      await driveGet('file1', {});

      expect(getItem).toHaveBeenCalledWith('file1');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFile = { id: 'file1', name: 'doc.pdf' };
      getItem.mockResolvedValue(mockFile);

      await driveGet('file1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFile, null, 2));
    });

    it('handles errors gracefully', async () => {
      getItem.mockRejectedValue(new Error('Not found'));

      await driveGet('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveDownload', () => {
    it('downloads a file', async () => {
      downloadFile.mockResolvedValue({ body: { pipe: vi.fn() } });

      await driveDownload('file1', { out: './downloaded.pdf' });

      expect(downloadFile).toHaveBeenCalledWith('file1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Downloaded'));
    });

    it('handles errors gracefully', async () => {
      downloadFile.mockRejectedValue(new Error('API Error'));

      await driveDownload('file1', { out: './file.pdf' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveUpload', () => {
    it('uploads a file', async () => {
      const mockFile = { id: 'new-file', name: 'upload.pdf', size: 1024 };
      uploadFile.mockResolvedValue(mockFile);

      await driveUpload('./local.pdf', {});

      expect(uploadFile).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Uploaded'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFile = { id: 'new-file', name: 'upload.pdf' };
      uploadFile.mockResolvedValue(mockFile);

      await driveUpload('./local.pdf', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFile, null, 2));
    });

    it('handles errors gracefully', async () => {
      uploadFile.mockRejectedValue(new Error('API Error'));

      await driveUpload('./local.pdf', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveMkdir', () => {
    it('creates a folder', async () => {
      const mockFolder = { id: 'new-folder', name: 'NewFolder', folder: {} };
      createFolder.mockResolvedValue(mockFolder);

      await driveMkdir('NewFolder', {});

      expect(createFolder).toHaveBeenCalledWith('NewFolder', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Folder created'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFolder = { id: 'new-folder', name: 'NewFolder' };
      createFolder.mockResolvedValue(mockFolder);

      await driveMkdir('NewFolder', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFolder, null, 2));
    });

    it('handles errors gracefully', async () => {
      createFolder.mockRejectedValue(new Error('API Error'));

      await driveMkdir('NewFolder', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveRm', () => {
    it('deletes a file', async () => {
      deleteItem.mockResolvedValue(undefined);

      await driveRm('file1', {});

      expect(deleteItem).toHaveBeenCalledWith('file1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deleted'));
    });

    it('handles errors gracefully', async () => {
      deleteItem.mockRejectedValue(new Error('Not found'));

      await driveRm('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveMove', () => {
    it('moves a file', async () => {
      const mockFile = { id: 'file1', name: 'doc.pdf' };
      moveItem.mockResolvedValue(mockFile);

      await driveMove('file1', 'dest-folder', {});

      expect(moveItem).toHaveBeenCalledWith('file1', 'dest-folder');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Moved'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFile = { id: 'file1', name: 'doc.pdf' };
      moveItem.mockResolvedValue(mockFile);

      await driveMove('file1', 'dest-folder', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFile, null, 2));
    });

    it('handles errors gracefully', async () => {
      moveItem.mockRejectedValue(new Error('API Error'));

      await driveMove('file1', 'dest', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveRename', () => {
    it('renames a file', async () => {
      const mockFile = { id: 'file1', name: 'newname.pdf' };
      renameItem.mockResolvedValue(mockFile);

      await driveRename('file1', 'newname.pdf', {});

      expect(renameItem).toHaveBeenCalledWith('file1', 'newname.pdf');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Renamed'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockFile = { id: 'file1', name: 'newname.pdf' };
      renameItem.mockResolvedValue(mockFile);

      await driveRename('file1', 'newname.pdf', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockFile, null, 2));
    });

    it('handles errors gracefully', async () => {
      renameItem.mockRejectedValue(new Error('API Error'));

      await driveRename('file1', 'new.pdf', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('driveCopy', () => {
    it('copies a file', async () => {
      const mockResult = { id: 'copy-id' };
      copyItem.mockResolvedValue(mockResult);

      await driveCopy('file1', { name: 'doc-copy.pdf' });

      expect(copyItem).toHaveBeenCalledWith(
        'file1',
        expect.objectContaining({ name: 'doc-copy.pdf' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Copy initiated'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockResult = { id: 'copy-id' };
      copyItem.mockResolvedValue(mockResult);

      await driveCopy('file1', { name: 'doc-copy.pdf', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2));
    });

    it('handles errors gracefully', async () => {
      copyItem.mockRejectedValue(new Error('API Error'));

      await driveCopy('file1', { name: 'copy.pdf' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
