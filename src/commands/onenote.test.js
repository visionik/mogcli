import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/onenote.js', () => ({
  listNotebooks: vi.fn(),
  getNotebook: vi.fn(),
  listSections: vi.fn(),
  listPages: vi.fn(),
  getPage: vi.fn(),
  getPageContent: vi.fn(),
  createNotebook: vi.fn(),
  createSection: vi.fn(),
  createPage: vi.fn(),
  deletePage: vi.fn(),
  searchPages: vi.fn(),
  htmlToText: vi.fn((html) => html?.replace(/<[^>]+>/g, '') || ''),
}));

// Mock the ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || ''),
  resolveId: vi.fn((id) => id),
}));

import {
  listNotebooks,
  listSections,
  listPages,
  getPage,
  getPageContent,
  createNotebook,
  createSection,
  createPage,
  deletePage,
  searchPages,
  htmlToText,
} from '../api/onenote.js';

import {
  onenoteNotebooks,
  onenoteSections,
  onenotePages,
  onenoteGet,
  onenoteCreateNotebook,
  onenoteCreateSection,
  onenoteCreatePage,
  onenoteDelete,
  onenoteSearch,
} from './onenote.js';

describe('onenote commands', () => {
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

  describe('onenoteNotebooks', () => {
    it('lists notebooks', async () => {
      listNotebooks.mockResolvedValue([
        { id: 'nb1', displayName: 'Work Notes', lastModifiedDateTime: '2024-01-15T10:00:00Z' },
        { id: 'nb2', displayName: 'Personal', lastModifiedDateTime: '2024-01-14T10:00:00Z', isDefault: true },
      ]);

      await onenoteNotebooks({ max: '50' });

      expect(listNotebooks).toHaveBeenCalledWith({ max: 50 });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('OneNote Notebooks'));
    });

    it('outputs JSON when --json flag', async () => {
      const notebooks = [{ id: 'nb1', displayName: 'Work Notes' }];
      listNotebooks.mockResolvedValue(notebooks);

      await onenoteNotebooks({ json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(notebooks, null, 2));
    });

    it('handles empty results', async () => {
      listNotebooks.mockResolvedValue([]);

      await onenoteNotebooks({});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No notebooks found'));
    });

    it('shows verbose info when --verbose', async () => {
      listNotebooks.mockResolvedValue([
        { id: 'nb1', displayName: 'Work', userRole: 'Owner', lastModifiedDateTime: '2024-01-15T10:00:00Z' },
      ]);

      await onenoteNotebooks({ verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Full:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Role:'));
    });

    it('handles errors gracefully', async () => {
      listNotebooks.mockRejectedValue(new Error('API error'));

      await onenoteNotebooks({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteSections', () => {
    it('lists sections in notebook', async () => {
      listSections.mockResolvedValue([
        { id: 'sec1', displayName: 'January', lastModifiedDateTime: '2024-01-15T10:00:00Z' },
        { id: 'sec2', displayName: 'February', lastModifiedDateTime: '2024-01-14T10:00:00Z' },
      ]);

      await onenoteSections('nb1', { max: '50' });

      expect(listSections).toHaveBeenCalledWith('nb1', { max: 50 });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sections'));
    });

    it('outputs JSON when --json flag', async () => {
      const sections = [{ id: 'sec1', displayName: 'January' }];
      listSections.mockResolvedValue(sections);

      await onenoteSections('nb1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(sections, null, 2));
    });

    it('handles empty results', async () => {
      listSections.mockResolvedValue([]);

      await onenoteSections('nb1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No sections found'));
    });

    it('handles errors gracefully', async () => {
      listSections.mockRejectedValue(new Error('API error'));

      await onenoteSections('nb1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenotePages', () => {
    it('lists pages in section', async () => {
      listPages.mockResolvedValue([
        { id: 'pg1', title: 'Meeting Notes', lastModifiedDateTime: '2024-01-15T10:00:00Z' },
        { id: 'pg2', title: 'Project Ideas', lastModifiedDateTime: '2024-01-14T10:00:00Z' },
      ]);

      await onenotePages('sec1', { max: '50' });

      expect(listPages).toHaveBeenCalledWith('sec1', { max: 50 });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Pages'));
    });

    it('outputs JSON when --json flag', async () => {
      const pages = [{ id: 'pg1', title: 'Meeting Notes' }];
      listPages.mockResolvedValue(pages);

      await onenotePages('sec1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(pages, null, 2));
    });

    it('handles empty results', async () => {
      listPages.mockResolvedValue([]);

      await onenotePages('sec1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No pages found'));
    });

    it('handles untitled pages', async () => {
      listPages.mockResolvedValue([
        { id: 'pg1', title: null, lastModifiedDateTime: '2024-01-15T10:00:00Z' },
      ]);

      await onenotePages('sec1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('(Untitled)'));
    });

    it('shows verbose info when --verbose', async () => {
      listPages.mockResolvedValue([
        { id: 'pg1', title: 'Test', level: 1, lastModifiedDateTime: '2024-01-15T10:00:00Z' },
      ]);

      await onenotePages('sec1', { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Level:'));
    });

    it('handles errors gracefully', async () => {
      listPages.mockRejectedValue(new Error('API error'));

      await onenotePages('sec1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteGet', () => {
    it('gets page content as text', async () => {
      getPage.mockResolvedValue({
        id: 'pg1',
        title: 'Meeting Notes',
        lastModifiedDateTime: '2024-01-15T10:00:00Z',
      });
      getPageContent.mockResolvedValue('<html><body><p>Hello world</p></body></html>');
      htmlToText.mockReturnValue('Hello world');

      await onenoteGet('pg1', {});

      expect(getPage).toHaveBeenCalledWith('pg1');
      expect(getPageContent).toHaveBeenCalledWith('pg1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Meeting Notes'));
    });

    it('outputs raw HTML when --html flag', async () => {
      getPage.mockResolvedValue({ id: 'pg1', title: 'Test' });
      getPageContent.mockResolvedValue('<p>Content</p>');

      await onenoteGet('pg1', { html: true });

      expect(consoleSpy).toHaveBeenCalledWith('<p>Content</p>');
    });

    it('outputs JSON when --json flag', async () => {
      const page = { id: 'pg1', title: 'Test', lastModifiedDateTime: '2024-01-15T10:00:00Z' };
      getPage.mockResolvedValue(page);
      getPageContent.mockResolvedValue('<p>Content</p>');
      htmlToText.mockReturnValue('Content');

      await onenoteGet('pg1', { json: true });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.title).toBe('Test');
      expect(output.content).toBe('Content');
    });

    it('handles response with text() method', async () => {
      getPage.mockResolvedValue({ id: 'pg1', title: 'Test' });
      getPageContent.mockResolvedValue({
        text: vi.fn().mockResolvedValue('<p>Content</p>'),
      });
      htmlToText.mockReturnValue('Content');

      await onenoteGet('pg1', {});

      expect(consoleSpy).toHaveBeenCalledWith('Content');
    });

    it('handles empty page content', async () => {
      getPage.mockResolvedValue({ id: 'pg1', title: 'Empty' });
      getPageContent.mockResolvedValue('');
      htmlToText.mockReturnValue('');

      await onenoteGet('pg1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Empty page'));
    });

    it('handles errors gracefully', async () => {
      getPage.mockRejectedValue(new Error('API error'));

      await onenoteGet('pg1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteCreateNotebook', () => {
    it('creates a notebook', async () => {
      createNotebook.mockResolvedValue({ id: 'new-nb', displayName: 'Work Notes' });

      await onenoteCreateNotebook('Work Notes', {});

      expect(createNotebook).toHaveBeenCalledWith('Work Notes');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Notebook created'));
    });

    it('outputs JSON when --json flag', async () => {
      const notebook = { id: 'new-nb', displayName: 'Work Notes' };
      createNotebook.mockResolvedValue(notebook);

      await onenoteCreateNotebook('Work Notes', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(notebook, null, 2));
    });

    it('requires name argument', async () => {
      await onenoteCreateNotebook(undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      createNotebook.mockRejectedValue(new Error('API error'));

      await onenoteCreateNotebook('Test', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteCreateSection', () => {
    it('creates a section', async () => {
      createSection.mockResolvedValue({ id: 'new-sec', displayName: 'January' });

      await onenoteCreateSection('nb1', 'January', {});

      expect(createSection).toHaveBeenCalledWith('nb1', 'January');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Section created'));
    });

    it('outputs JSON when --json flag', async () => {
      const section = { id: 'new-sec', displayName: 'January' };
      createSection.mockResolvedValue(section);

      await onenoteCreateSection('nb1', 'January', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(section, null, 2));
    });

    it('requires notebook ID and name', async () => {
      await onenoteCreateSection(undefined, 'Test', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('requires section name', async () => {
      await onenoteCreateSection('nb1', undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      createSection.mockRejectedValue(new Error('API error'));

      await onenoteCreateSection('nb1', 'Test', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteCreatePage', () => {
    it('creates a page with content', async () => {
      createPage.mockResolvedValue({ id: 'new-pg', title: 'Meeting Notes' });

      await onenoteCreatePage('sec1', 'Meeting Notes', 'Notes from today', {});

      expect(createPage).toHaveBeenCalledWith('sec1', 'Meeting Notes', 'Notes from today');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Page created'));
    });

    it('creates a page without content', async () => {
      createPage.mockResolvedValue({ id: 'new-pg', title: 'Empty Page' });

      await onenoteCreatePage('sec1', 'Empty Page', undefined, {});

      expect(createPage).toHaveBeenCalledWith('sec1', 'Empty Page', '');
    });

    it('outputs JSON when --json flag', async () => {
      const page = { id: 'new-pg', title: 'Test' };
      createPage.mockResolvedValue(page);

      await onenoteCreatePage('sec1', 'Test', '', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(page, null, 2));
    });

    it('requires section ID and title', async () => {
      await onenoteCreatePage(undefined, 'Test', '', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('requires page title', async () => {
      await onenoteCreatePage('sec1', undefined, '', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      createPage.mockRejectedValue(new Error('API error'));

      await onenoteCreatePage('sec1', 'Test', '', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteDelete', () => {
    it('deletes a page', async () => {
      deletePage.mockResolvedValue(null);

      await onenoteDelete('pg1', {});

      expect(deletePage).toHaveBeenCalledWith('pg1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Page deleted'));
    });

    it('outputs JSON when --json flag', async () => {
      deletePage.mockResolvedValue(null);

      await onenoteDelete('pg1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, pageId: 'pg1' }, null, 2)
      );
    });

    it('requires page ID', async () => {
      await onenoteDelete(undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      deletePage.mockRejectedValue(new Error('API error'));

      await onenoteDelete('pg1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('onenoteSearch', () => {
    it('searches pages', async () => {
      searchPages.mockResolvedValue([
        {
          id: 'pg1',
          title: 'Meeting Notes',
          lastModifiedDateTime: '2024-01-15T10:00:00Z',
          parentSection: { displayName: 'Work' },
        },
      ]);

      await onenoteSearch('meeting', { max: '25' });

      expect(searchPages).toHaveBeenCalledWith('meeting', { max: 25 });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Search Results'));
    });

    it('outputs JSON when --json flag', async () => {
      const pages = [{ id: 'pg1', title: 'Test' }];
      searchPages.mockResolvedValue(pages);

      await onenoteSearch('test', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(pages, null, 2));
    });

    it('handles empty results', async () => {
      searchPages.mockResolvedValue([]);

      await onenoteSearch('nonexistent', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No pages found'));
    });

    it('shows parent section in results', async () => {
      searchPages.mockResolvedValue([
        {
          id: 'pg1',
          title: 'Test',
          parentSection: { displayName: 'Work', id: 'sec1' },
          lastModifiedDateTime: '2024-01-15T10:00:00Z',
        },
      ]);

      await onenoteSearch('test', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Work'));
    });

    it('shows section ID when --verbose', async () => {
      searchPages.mockResolvedValue([
        {
          id: 'pg1',
          title: 'Test',
          parentSection: { displayName: 'Work', id: 'sec1' },
          lastModifiedDateTime: '2024-01-15T10:00:00Z',
        },
      ]);

      await onenoteSearch('test', { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Section ID:'));
    });

    it('requires query argument', async () => {
      await onenoteSearch(undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      searchPages.mockRejectedValue(new Error('API error'));

      await onenoteSearch('test', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
