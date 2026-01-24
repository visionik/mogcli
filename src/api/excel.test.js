import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
  graphRequestRaw: vi.fn(),
}));

import { graphRequest, graphRequestRaw } from './client.js';
import {
  listWorkbooks,
  getWorkbook,
  listWorksheets,
  getWorksheet,
  addWorksheet,
  readRange,
  writeRange,
  listTables,
  getTable,
  appendTableRows,
  createWorkbook,
  downloadWorkbook,
  exportAsCsv,
  clearRange,
  copyWorkbook,
} from './excel.js';

describe('excel API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWorkbooks', () => {
    it('searches for .xlsx files', async () => {
      const mockWorkbooks = [{ id: 'wb1', name: 'budget.xlsx' }];
      graphRequest.mockResolvedValue({ value: mockWorkbooks });

      const result = await listWorkbooks();

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('.xlsx'));
      expect(result).toEqual(mockWorkbooks);
    });

    it('applies max limit', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await listWorkbooks({ max: 10 });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringContaining('top=10'));
    });

    it('returns empty array when no value', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listWorkbooks();

      expect(result).toEqual([]);
    });
  });

  describe('getWorkbook', () => {
    it('gets workbook metadata', async () => {
      const mockWb = { id: 'wb1', name: 'budget.xlsx' };
      graphRequest.mockResolvedValue(mockWb);

      const result = await getWorkbook('wb1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/wb1');
      expect(result).toEqual(mockWb);
    });
  });

  describe('listWorksheets', () => {
    it('lists worksheets in workbook', async () => {
      const mockSheets = [
        { id: 'sheet1', name: 'Sheet1' },
        { id: 'sheet2', name: 'Q1 Data' },
      ];
      graphRequest.mockResolvedValue({ value: mockSheets });

      const result = await listWorksheets('wb1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/wb1/workbook/worksheets');
      expect(result).toEqual(mockSheets);
    });

    it('returns empty array when no sheets', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listWorksheets('wb1');

      expect(result).toEqual([]);
    });
  });

  describe('getWorksheet', () => {
    it('gets worksheet by name', async () => {
      const mockSheet = { id: 'sheet1', name: 'Sheet1' };
      graphRequest.mockResolvedValue(mockSheet);

      const result = await getWorksheet('wb1', 'Sheet1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/worksheets/Sheet1'
      );
      expect(result).toEqual(mockSheet);
    });

    it('encodes special characters in sheet name', async () => {
      graphRequest.mockResolvedValue({});

      await getWorksheet('wb1', 'Q1 Data');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/worksheets/Q1%20Data'
      );
    });
  });

  describe('addWorksheet', () => {
    it('adds worksheet with name', async () => {
      const mockSheet = { id: 'new-sheet', name: 'Q2' };
      graphRequest.mockResolvedValue(mockSheet);

      const result = await addWorksheet('wb1', 'Q2');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/worksheets/add',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Q2"'),
        })
      );
      expect(result).toEqual(mockSheet);
    });

    it('adds worksheet without name', async () => {
      graphRequest.mockResolvedValue({ id: 'new-sheet' });

      await addWorksheet('wb1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/worksheets/add',
        expect.objectContaining({
          method: 'POST',
          body: '{}',
        })
      );
    });
  });

  describe('readRange', () => {
    it('reads specific range', async () => {
      const mockRange = {
        address: 'Sheet1!A1:C3',
        values: [
          ['Name', 'Value', 'Date'],
          ['Item1', 100, '2024-01-01'],
          ['Item2', 200, '2024-01-02'],
        ],
      };
      graphRequest.mockResolvedValue(mockRange);

      const result = await readRange('wb1', 'Sheet1', 'A1:C3');

      expect(graphRequest).toHaveBeenCalledWith(
        "/me/drive/items/wb1/workbook/worksheets/Sheet1/range(address='A1:C3')"
      );
      expect(result).toEqual(mockRange);
    });

    it('reads used range when no range specified', async () => {
      const mockRange = { values: [[1, 2], [3, 4]] };
      graphRequest.mockResolvedValue(mockRange);

      const result = await readRange('wb1', 'Sheet1', null);

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/worksheets/Sheet1/usedRange'
      );
      expect(result).toEqual(mockRange);
    });

    it('encodes sheet name with spaces', async () => {
      graphRequest.mockResolvedValue({ values: [] });

      await readRange('wb1', 'Q1 Data', 'A1:B2');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/Q1%20Data/')
      );
    });
  });

  describe('writeRange', () => {
    it('writes values to range', async () => {
      const mockRange = { address: 'Sheet1!A1:B2', values: [[1, 2], [3, 4]] };
      graphRequest.mockResolvedValue(mockRange);

      const result = await writeRange('wb1', 'Sheet1', 'A1:B2', [[1, 2], [3, 4]]);

      expect(graphRequest).toHaveBeenCalledWith(
        "/me/drive/items/wb1/workbook/worksheets/Sheet1/range(address='A1:B2')",
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"values":[[1,2],[3,4]]'),
        })
      );
      expect(result).toEqual(mockRange);
    });

    it('writes string values', async () => {
      graphRequest.mockResolvedValue({});

      await writeRange('wb1', 'Sheet1', 'A1:B1', [['Name', 'Value']]);

      expect(graphRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"values":[["Name","Value"]]'),
        })
      );
    });
  });

  describe('listTables', () => {
    it('lists tables in workbook', async () => {
      const mockTables = [
        { id: 'table1', name: 'SalesData' },
        { id: 'table2', name: 'Expenses' },
      ];
      graphRequest.mockResolvedValue({ value: mockTables });

      const result = await listTables('wb1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/wb1/workbook/tables');
      expect(result).toEqual(mockTables);
    });

    it('returns empty array when no tables', async () => {
      graphRequest.mockResolvedValue({});

      const result = await listTables('wb1');

      expect(result).toEqual([]);
    });
  });

  describe('getTable', () => {
    it('gets table by name', async () => {
      const mockTable = { id: 'table1', name: 'SalesData' };
      graphRequest.mockResolvedValue(mockTable);

      const result = await getTable('wb1', 'SalesData');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/tables/SalesData'
      );
      expect(result).toEqual(mockTable);
    });
  });

  describe('appendTableRows', () => {
    it('appends rows to table', async () => {
      const mockResult = { index: 5 };
      graphRequest.mockResolvedValue(mockResult);

      const result = await appendTableRows('wb1', 'SalesData', [[1, 2, 3], [4, 5, 6]]);

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/tables/SalesData/rows/add',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"values":[[1,2,3],[4,5,6]]'),
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('createWorkbook', () => {
    it('creates workbook in root', async () => {
      const mockWb = { id: 'new-wb', name: 'budget.xlsx' };
      graphRequest.mockResolvedValue(mockWb);

      const result = await createWorkbook('budget');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root:/budget.xlsx:/content',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        })
      );
      expect(result).toEqual(mockWb);
    });

    it('creates workbook in folder', async () => {
      graphRequest.mockResolvedValue({ id: 'new-wb' });

      await createWorkbook('budget', 'folder-id');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/folder-id:/budget.xlsx:/content',
        expect.anything()
      );
    });

    it('handles name with .xlsx extension', async () => {
      graphRequest.mockResolvedValue({ id: 'new-wb' });

      await createWorkbook('budget.xlsx');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/root:/budget.xlsx:/content',
        expect.anything()
      );
    });
  });

  describe('downloadWorkbook', () => {
    it('downloads workbook content', async () => {
      const mockResponse = { body: 'stream' };
      graphRequest.mockResolvedValue(mockResponse);

      const result = await downloadWorkbook('wb1');

      expect(graphRequest).toHaveBeenCalledWith('/me/drive/items/wb1/content', {
        rawResponse: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportAsCsv', () => {
    it('exports worksheet as CSV', async () => {
      graphRequest.mockResolvedValue({
        values: [
          ['Name', 'Value', 'Date'],
          ['Item1', 100, '2024-01-01'],
          ['Item2', 200, '2024-01-02'],
        ],
      });

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/workbook/worksheets/Sheet1/usedRange'
      );
      expect(result).toBe('Name,Value,Date\nItem1,100,2024-01-01\nItem2,200,2024-01-02');
    });

    it('handles empty worksheet', async () => {
      graphRequest.mockResolvedValue({ values: [] });

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(result).toBe('');
    });

    it('handles null values', async () => {
      graphRequest.mockResolvedValue({
        values: [
          ['A', null, 'C'],
          [1, 2, undefined],
        ],
      });

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(result).toBe('A,,C\n1,2,');
    });

    it('quotes values with commas', async () => {
      graphRequest.mockResolvedValue({
        values: [['Name, Title', 'Value']],
      });

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(result).toBe('"Name, Title",Value');
    });

    it('escapes quotes in values', async () => {
      graphRequest.mockResolvedValue({
        values: [['Say "Hello"', 'World']],
      });

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(result).toBe('"Say ""Hello""",World');
    });

    it('handles values with newlines', async () => {
      graphRequest.mockResolvedValue({
        values: [['Line1\nLine2', 'Normal']],
      });

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(result).toBe('"Line1\nLine2",Normal');
    });

    it('returns empty string when no values property', async () => {
      graphRequest.mockResolvedValue({});

      const result = await exportAsCsv('wb1', 'Sheet1');

      expect(result).toBe('');
    });
  });

  describe('clearRange', () => {
    it('clears values in range', async () => {
      graphRequest.mockResolvedValue({});

      await clearRange('wb1', 'Sheet1', 'A1:C3');

      expect(graphRequest).toHaveBeenCalledWith(
        "/me/drive/items/wb1/workbook/worksheets/Sheet1/range(address='A1:C3')/clear",
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"applyTo":"Contents"'),
        })
      );
    });

    it('encodes sheet name with spaces', async () => {
      graphRequest.mockResolvedValue({});

      await clearRange('wb1', 'Q1 Data', 'A1:B2');

      expect(graphRequest).toHaveBeenCalledWith(
        expect.stringContaining('/Q1%20Data/'),
        expect.anything()
      );
    });
  });

  describe('copyWorkbook', () => {
    it('copies workbook to root', async () => {
      const mockResult = { id: 'copy-wb' };
      graphRequest.mockResolvedValue(mockResult);

      const result = await copyWorkbook('wb1', 'Budget Copy');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/copy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Budget Copy"'),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('copies workbook to folder', async () => {
      graphRequest.mockResolvedValue({ id: 'copy-wb' });

      await copyWorkbook('wb1', 'Budget Copy', 'folder-id');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/drive/items/wb1/copy',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"parentReference":{"id":"folder-id"}'),
        })
      );
    });
  });
});
