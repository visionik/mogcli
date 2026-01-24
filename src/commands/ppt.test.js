import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../api/ppt.js', () => ({
  listPresentations: vi.fn(),
  getPresentation: vi.fn(),
  downloadPresentation: vi.fn(),
  copyPresentation: vi.fn(),
  createPresentation: vi.fn(),
}));

vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

vi.mock('fs', () => ({
  createWriteStream: vi.fn(() => ({ on: vi.fn() })),
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

import {
  listPresentations,
  getPresentation,
  downloadPresentation,
  copyPresentation,
  createPresentation,
} from '../api/ppt.js';

import { pptList, pptGet, pptExport, pptCopy, pptCreate } from './ppt.js';

describe('ppt commands', () => {
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

  describe('pptList', () => {
    it('lists PowerPoint presentations', async () => {
      const mockPpts = [
        { id: 'ppt1', name: 'deck.pptx', size: 2048, lastModifiedDateTime: '2025-01-01' },
      ];
      listPresentations.mockResolvedValue(mockPpts);

      await pptList({ max: '50' });

      expect(listPresentations).toHaveBeenCalledWith({ max: 50 });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockPpts = [{ id: 'ppt1', name: 'deck.pptx' }];
      listPresentations.mockResolvedValue(mockPpts);

      await pptList({ max: '50', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockPpts, null, 2));
    });

    it('shows message when no presentations', async () => {
      listPresentations.mockResolvedValue([]);

      await pptList({ max: '50' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No PowerPoint'));
    });

    it('handles errors gracefully', async () => {
      listPresentations.mockRejectedValue(new Error('API Error'));

      await pptList({ max: '50' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('pptGet', () => {
    it('gets presentation metadata', async () => {
      const mockPpt = {
        id: 'ppt1',
        name: 'deck.pptx',
        size: 2048,
        lastModifiedDateTime: '2025-01-01',
        createdDateTime: '2025-01-01',
      };
      getPresentation.mockResolvedValue(mockPpt);

      await pptGet('ppt1', {});

      expect(getPresentation).toHaveBeenCalledWith('ppt1');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockPpt = { id: 'ppt1', name: 'deck.pptx' };
      getPresentation.mockResolvedValue(mockPpt);

      await pptGet('ppt1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockPpt, null, 2));
    });

    it('handles errors gracefully', async () => {
      getPresentation.mockRejectedValue(new Error('Not found'));

      await pptGet('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('pptExport', () => {
    it('exports presentation as pptx', async () => {
      downloadPresentation.mockResolvedValue({ body: { pipe: vi.fn() } });

      await pptExport('ppt1', { out: './output.pptx', format: 'pptx' });

      expect(downloadPresentation).toHaveBeenCalledWith('ppt1', null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Exported'));
    });

    it('exports presentation as PDF', async () => {
      downloadPresentation.mockResolvedValue({ body: { pipe: vi.fn() } });

      await pptExport('ppt1', { out: './output.pdf', format: 'pdf' });

      expect(downloadPresentation).toHaveBeenCalledWith('ppt1', 'pdf');
    });

    it('requires --out flag', async () => {
      await pptExport('ppt1', { format: 'pptx' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('validates format', async () => {
      await pptExport('ppt1', { out: './output.txt', format: 'txt' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      downloadPresentation.mockRejectedValue(new Error('API Error'));

      await pptExport('ppt1', { out: './output.pptx', format: 'pptx' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('pptCopy', () => {
    it('copies a presentation', async () => {
      const mockResult = { id: 'copy-id' };
      copyPresentation.mockResolvedValue(mockResult);

      await pptCopy('ppt1', { name: 'copy' });

      expect(copyPresentation).toHaveBeenCalledWith(
        'ppt1',
        expect.objectContaining({ name: 'copy.pptx' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Copy initiated'));
    });

    it('requires --name flag', async () => {
      await pptCopy('ppt1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockResult = { id: 'copy-id' };
      copyPresentation.mockResolvedValue(mockResult);

      await pptCopy('ppt1', { name: 'copy', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2));
    });

    it('handles errors gracefully', async () => {
      copyPresentation.mockRejectedValue(new Error('API Error'));

      await pptCopy('ppt1', { name: 'copy' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('pptCreate', () => {
    it('creates a presentation', async () => {
      const mockPpt = { id: 'new-ppt', name: 'deck.pptx', webUrl: 'https://...' };
      createPresentation.mockResolvedValue(mockPpt);

      await pptCreate({ title: 'deck' });

      expect(createPresentation).toHaveBeenCalledWith('deck', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Presentation created'));
    });

    it('requires --title flag', async () => {
      await pptCreate({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockPpt = { id: 'new-ppt', name: 'deck.pptx' };
      createPresentation.mockResolvedValue(mockPpt);

      await pptCreate({ title: 'deck', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockPpt, null, 2));
    });

    it('handles errors gracefully', async () => {
      createPresentation.mockRejectedValue(new Error('API Error'));

      await pptCreate({ title: 'deck' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
