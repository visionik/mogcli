import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
  graphRequestRaw: vi.fn(),
}));

import { graphRequest, graphRequestRaw } from './client.js';
import {
  listNotebooks,
  getNotebook,
  listSections,
  getSection,
  listPages,
  getPage,
  getPageContent,
  createNotebook,
  createSection,
  createPage,
  updatePage,
  deletePage,
  searchPages,
  htmlToText,
} from './onenote.js';

describe('onenote API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listNotebooks', () => {
    it('lists all notebooks', async () => {
      const mockNotebooks = [
        { id: 'nb1', displayName: 'Work Notes' },
        { id: 'nb2', displayName: 'Personal' },
      ];
      graphRequest.mockResolvedValue({ value: mockNotebooks });

      const result = await listNotebooks();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/onenote/notebooks'));
      expect(result).toEqual(mockNotebooks);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listNotebooks({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=10'));
    });

    it('orders by lastModifiedDateTime', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listNotebooks();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('orderby=lastModifiedDateTime'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listNotebooks();

      expect(result).toEqual([]);
    });
  });

  describe('getNotebook', () => {
    it('gets notebook by ID', async () => {
      const mockNotebook = { id: 'nb1', displayName: 'Work Notes' };
      graphRequest.mockResolvedValue(mockNotebook);

      const result = await getNotebook('nb1');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/notebooks/nb1');
      expect(result).toEqual(mockNotebook);
    });
  });

  describe('listSections', () => {
    it('lists sections in a notebook', async () => {
      const mockSections = [
        { id: 'sec1', displayName: 'January' },
        { id: 'sec2', displayName: 'February' },
      ];
      graphRequest.mockResolvedValue({ value: mockSections });

      const result = await listSections('nb1');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/onenote/notebooks/nb1/sections'));
      expect(result).toEqual(mockSections);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listSections('nb1', { max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=10'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listSections('nb1');

      expect(result).toEqual([]);
    });
  });

  describe('getSection', () => {
    it('gets section by ID', async () => {
      const mockSection = { id: 'sec1', displayName: 'January' };
      graphRequest.mockResolvedValue(mockSection);

      const result = await getSection('sec1');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/sections/sec1');
      expect(result).toEqual(mockSection);
    });
  });

  describe('listPages', () => {
    it('lists pages in a section', async () => {
      const mockPages = [
        { id: 'pg1', title: 'Meeting Notes' },
        { id: 'pg2', title: 'Project Ideas' },
      ];
      graphRequest.mockResolvedValue({ value: mockPages });

      const result = await listPages('sec1');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/onenote/sections/sec1/pages'));
      expect(result).toEqual(mockPages);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listPages('sec1', { max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=10'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listPages('sec1');

      expect(result).toEqual([]);
    });
  });

  describe('getPage', () => {
    it('gets page metadata by ID', async () => {
      const mockPage = { id: 'pg1', title: 'Meeting Notes' };
      graphRequest.mockResolvedValue(mockPage);

      const result = await getPage('pg1');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/pages/pg1');
      expect(result).toEqual(mockPage);
    });
  });

  describe('getPageContent', () => {
    it('gets page HTML content', async () => {
      const mockHtml = '<html><body><p>Content</p></body></html>';
      graphRequestRaw.mockResolvedValue({
        text: () => Promise.resolve(mockHtml),
      });

      const result = await getPageContent('pg1');

      expect(graphRequestRaw).toHaveBeenCalledWith('/me/onenote/pages/pg1/content');
      expect(result).toEqual(mockHtml);
    });
  });

  describe('createNotebook', () => {
    it('creates a new notebook', async () => {
      const mockNotebook = { id: 'new-nb', displayName: 'New Notebook' };
      graphRequest.mockResolvedValue(mockNotebook);

      const result = await createNotebook('New Notebook');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/notebooks', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'New Notebook' }),
      });
      expect(result).toEqual(mockNotebook);
    });
  });

  describe('createSection', () => {
    it('creates a new section in a notebook', async () => {
      const mockSection = { id: 'new-sec', displayName: 'March' };
      graphRequest.mockResolvedValue(mockSection);

      const result = await createSection('nb1', 'March');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/notebooks/nb1/sections', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'March' }),
      });
      expect(result).toEqual(mockSection);
    });
  });

  describe('createPage', () => {
    it('creates a new page with content', async () => {
      const mockPage = { id: 'new-pg', title: 'New Page' };
      graphRequest.mockResolvedValue(mockPage);

      const result = await createPage('sec1', 'New Page', 'Hello world');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/sections/sec1/pages', {
        method: 'POST',
        body: expect.stringContaining('<title>New Page</title>'),
        headers: {
          'Content-Type': 'application/xhtml+xml',
        },
      });
      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Hello world'),
        })
      );
      expect(result).toEqual(mockPage);
    });

    it('creates a page with empty content', async () => {
      graphRequest.mockResolvedValue({ id: 'new-pg' });

      await createPage('sec1', 'Empty Page');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('<title>Empty Page</title>'),
        })
      );
    });

    it('escapes HTML in title and content', async () => {
      graphRequest.mockResolvedValue({ id: 'new-pg' });

      await createPage('sec1', 'Test <script>', 'Content & "quotes"');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Test &lt;script&gt;'),
        })
      );
      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Content &amp; &quot;quotes&quot;'),
        })
      );
    });
  });

  describe('updatePage', () => {
    it('updates page content with PATCH', async () => {
      graphRequest.mockResolvedValue({});

      await updatePage('pg1', 'Additional content');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/pages/pg1/content', {
        method: 'PATCH',
        body: expect.stringContaining('append'),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Additional content'),
        })
      );
    });

    it('escapes HTML in update content', async () => {
      graphRequest.mockResolvedValue({});

      await updatePage('pg1', '<script>alert("xss")</script>');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('&lt;script&gt;'),
        })
      );
    });
  });

  describe('deletePage', () => {
    it('deletes a page', async () => {
      graphRequest.mockResolvedValue(null);

      await deletePage('pg1');

      expect(graphRequest).toHaveBeenCalledWith('/me/onenote/pages/pg1', {
        method: 'DELETE',
      });
    });
  });

  describe('searchPages', () => {
    it('searches pages by title (client-side filter)', async () => {
      const mockPages = [
        { id: 'pg1', title: 'Meeting Notes', parentSection: { displayName: 'Work' } },
        { id: 'pg2', title: 'Other Page', parentSection: { displayName: 'Work' } },
      ];
      graphRequest.mockResolvedValue({ value: mockPages });

      const result = await searchPages('meeting');

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('/me/onenote/pages'));
      expect(result).toEqual([mockPages[0]]); // Only matching page
    });

    it('applies max limit to fetch', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await searchPages('test', { max: 50 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=50'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await searchPages('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('htmlToText', () => {
    it('converts simple HTML to text', () => {
      const html = '<p>Hello world</p>';
      expect(htmlToText(html)).toBe('Hello world');
    });

    it('handles multiple paragraphs', () => {
      const html = '<p>First</p><p>Second</p>';
      const result = htmlToText(html);
      expect(result).toContain('First');
      expect(result).toContain('Second');
    });

    it('handles headings', () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = htmlToText(html);
      expect(result).toContain('Title');
      expect(result).toContain('Content');
    });

    it('handles lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = htmlToText(html);
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
    });

    it('removes script tags', () => {
      const html = '<p>Content</p><script>alert("xss")</script>';
      expect(htmlToText(html)).toBe('Content');
    });

    it('removes style tags', () => {
      const html = '<style>.cls{color:red}</style><p>Content</p>';
      expect(htmlToText(html)).toBe('Content');
    });

    it('decodes HTML entities', () => {
      const html = '<p>Hello &amp; goodbye &lt;world&gt;</p>';
      expect(htmlToText(html)).toBe('Hello & goodbye <world>');
    });

    it('handles nbsp', () => {
      const html = '<p>Hello&nbsp;world</p>';
      expect(htmlToText(html)).toBe('Hello world');
    });

    it('handles quotes', () => {
      const html = '<p>&quot;Hello&quot; &apos;world&apos;</p>';
      expect(htmlToText(html)).toBe('"Hello" \'world\'');
    });

    it('returns empty string for null/undefined', () => {
      expect(htmlToText(null)).toBe('');
      expect(htmlToText(undefined)).toBe('');
      expect(htmlToText('')).toBe('');
    });

    it('handles divs and br tags', () => {
      const html = '<div>Line 1</div><br/><div>Line 2</div>';
      const result = htmlToText(html);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('handles table rows', () => {
      const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
      const result = htmlToText(html);
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
      expect(result).toContain('D');
    });

    it('cleans up excessive whitespace', () => {
      const html = '<p>Hello</p>\n\n\n\n<p>World</p>';
      const result = htmlToText(html);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('handles complex nested HTML', () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Header</h1>
            <p>Paragraph with <strong>bold</strong> text.</p>
            <ul>
              <li>Item one</li>
              <li>Item two</li>
            </ul>
          </body>
        </html>
      `;
      const result = htmlToText(html);
      expect(result).toContain('Header');
      expect(result).toContain('Paragraph with bold text.');
      expect(result).toContain('• Item one');
      expect(result).toContain('• Item two');
    });
  });
});
