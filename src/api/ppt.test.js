import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
}));

import { graphRequest } from './client.js';
import {
  listPresentations,
  getPresentation,
  downloadPresentation,
  copyPresentation,
  createPresentation,
} from './ppt.js';

describe('ppt API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPresentations', () => {
    it('searches for .pptx files', async () => {
      const mockPpts = [{ id: 'ppt1', name: 'deck.pptx' }];
      graphRequest.mockResolvedValue({ value: mockPpts });

      const result = await listPresentations();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('.pptx'));
      expect(result).toEqual(mockPpts);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listPresentations({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=10'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listPresentations();

      expect(result).toEqual([]);
    });
  });

  describe('getPresentation', () => {
    it('gets presentation metadata', async () => {
      const mockPpt = { id: 'ppt1', name: 'deck.pptx' };
      graphRequest.mockResolvedValue(mockPpt);

      const result = await getPresentation('ppt1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/ppt1');
      expect(result).toEqual(mockPpt);
    });
  });

  describe('downloadPresentation', () => {
    it('downloads presentation content', async () => {
      const mockResponse = { body: 'stream' };
      graphRequest.mockResolvedValue(mockResponse);

      const result = await downloadPresentation('ppt1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/ppt1/content', {
        rawResponse: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('downloads as PDF when format specified', async () => {
      const mockResponse = { body: 'stream' };
      graphRequest.mockResolvedValue(mockResponse);

      await downloadPresentation('ppt1', 'pdf');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/ppt1/content?format=pdf', {
        rawResponse: true,
      });
    });
  });

  describe('copyPresentation', () => {
    it('copies presentation with new name', async () => {
      const mockResult = { id: 'copy-id' };
      graphRequest.mockResolvedValue(mockResult);

      const result = await copyPresentation('ppt1', { name: 'copy.pptx' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/ppt1/copy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('copy.pptx'),
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('createPresentation', () => {
    it('creates presentation in root', async () => {
      const mockPpt = { id: 'new-ppt', name: 'deck.pptx' };
      graphRequest.mockResolvedValue(mockPpt);

      const result = await createPresentation('deck');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root:/deck.pptx:/content',
        expect.objectContaining({ method: 'PUT' })
      );
      expect(result).toEqual(mockPpt);
    });

    it('creates presentation in folder', async () => {
      graphRequest.mockResolvedValue({ id: 'new-ppt' });

      await createPresentation('deck', 'folder-id');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/folder-id:/deck.pptx:/content',
        expect.anything()
      );
    });
  });
});
