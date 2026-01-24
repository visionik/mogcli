import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/excel.js', () => ({
  listWorkbooks: vi.fn(),
  getWorkbook: vi.fn(),
  listWorksheets: vi.fn(),
  addWorksheet: vi.fn(),
  readRange: vi.fn(),
  writeRange: vi.fn(),
  listTables: vi.fn(),
  appendTableRows: vi.fn(),
  createWorkbook: vi.fn(),
  downloadWorkbook: vi.fn(),
  exportAsCsv: vi.fn(),
  clearRange: vi.fn(),
  copyWorkbook: vi.fn(),
}));

// Mock the ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || ''),
  resolveId: vi.fn((id) => id),
}));

// Mock fs and stream
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  createWriteStream: vi.fn(() => ({ on: vi.fn() })),
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

import {
  listWorkbooks,
  listWorksheets,
  addWorksheet,
  readRange,
  writeRange,
  listTables,
  appendTableRows,
  createWorkbook,
  downloadWorkbook,
  exportAsCsv,
  clearRange,
  copyWorkbook,
} from '../api/excel.js';

import {
  excelList,
  excelMetadata,
  excelGet,
  excelUpdate,
  excelAppend,
  excelCreate,
  excelAddSheet,
  excelTables,
  excelExport,
  excelClear,
  excelCopy,
} from './excel.js';

describe('excel commands', () => {
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

  describe('excelList', () => {
    it('lists workbooks', async () => {
      listWorkbooks.mockResolvedValue([
        { id: 'wb1', name: 'budget.xlsx', size: 1024, lastModifiedDateTime: '2024-01-15T10:00:00Z' },
        { id: 'wb2', name: 'data.xlsx', size: 2048, lastModifiedDateTime: '2024-01-14T10:00:00Z' },
      ]);

      await excelList({ max: '50' });

      expect(listWorkbooks).toHaveBeenCalledWith({ max: 50 });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Excel Workbooks'));
    });

    it('outputs JSON when --json flag', async () => {
      const workbooks = [{ id: 'wb1', name: 'budget.xlsx' }];
      listWorkbooks.mockResolvedValue(workbooks);

      await excelList({ json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(workbooks, null, 2));
    });

    it('handles empty results', async () => {
      listWorkbooks.mockResolvedValue([]);

      await excelList({});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No Excel workbooks found'));
    });

    it('handles errors gracefully', async () => {
      listWorkbooks.mockRejectedValue(new Error('API error'));

      await excelList({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelMetadata', () => {
    it('lists worksheets', async () => {
      listWorksheets.mockResolvedValue([
        { id: 'sheet1', name: 'Sheet1', visibility: 'Visible', position: 0 },
        { id: 'sheet2', name: 'Q1 Data', visibility: 'Visible', position: 1 },
      ]);

      await excelMetadata('wb1', {});

      expect(listWorksheets).toHaveBeenCalledWith('wb1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Worksheets'));
    });

    it('outputs JSON when --json flag', async () => {
      const sheets = [{ id: 'sheet1', name: 'Sheet1' }];
      listWorksheets.mockResolvedValue(sheets);

      await excelMetadata('wb1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(sheets, null, 2));
    });

    it('handles empty results', async () => {
      listWorksheets.mockResolvedValue([]);

      await excelMetadata('wb1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No worksheets found'));
    });

    it('handles errors gracefully', async () => {
      listWorksheets.mockRejectedValue(new Error('API error'));

      await excelMetadata('wb1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelGet', () => {
    it('reads specific range', async () => {
      readRange.mockResolvedValue({
        values: [
          ['Name', 'Value'],
          ['Item1', 100],
        ],
      });

      await excelGet('wb1', 'Sheet1', 'A1:B2', {});

      expect(readRange).toHaveBeenCalledWith('wb1', 'Sheet1', 'A1:B2');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sheet1'));
    });

    it('reads first sheet used range when no sheet specified', async () => {
      listWorksheets.mockResolvedValue([{ name: 'Sheet1' }]);
      readRange.mockResolvedValue({
        values: [['Data']],
      });

      await excelGet('wb1', undefined, undefined, {});

      expect(listWorksheets).toHaveBeenCalled();
      expect(readRange).toHaveBeenCalledWith('wb1', 'Sheet1', null);
    });

    it('treats range-like argument as range on first sheet', async () => {
      listWorksheets.mockResolvedValue([{ name: 'Sheet1' }]);
      readRange.mockResolvedValue({
        values: [['Data']],
      });

      await excelGet('wb1', 'A1:C3', undefined, {});

      expect(readRange).toHaveBeenCalledWith('wb1', 'Sheet1', 'A1:C3');
    });

    it('outputs JSON when --json flag', async () => {
      const data = { values: [[1, 2], [3, 4]] };
      readRange.mockResolvedValue(data);

      await excelGet('wb1', 'Sheet1', 'A1:B2', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('handles empty range', async () => {
      readRange.mockResolvedValue({ values: [] });

      await excelGet('wb1', 'Sheet1', 'A1:B2', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No data'));
    });

    it('handles errors gracefully', async () => {
      readRange.mockRejectedValue(new Error('API error'));

      await excelGet('wb1', 'Sheet1', 'A1:B2', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelUpdate', () => {
    it('writes values to range using positional values', async () => {
      writeRange.mockResolvedValue({ address: 'Sheet1!A1:B2' });

      await excelUpdate('wb1', 'Sheet1', 'A1:B2', ['1', '2', '3', '4'], {});

      expect(writeRange).toHaveBeenCalledWith('wb1', 'Sheet1', 'A1:B2', [['1', '2'], ['3', '4']]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
    });

    it('outputs JSON when --json flag', async () => {
      const result = { address: 'Sheet1!A1:B2' };
      writeRange.mockResolvedValue(result);

      await excelUpdate('wb1', 'Sheet1', 'A1:B2', ['1', '2'], { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
    });

    it('requires positional values', async () => {
      await excelUpdate('wb1', 'Sheet1', 'A1:B2', [], {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles single cell range', async () => {
      writeRange.mockResolvedValue({ address: 'Sheet1!A1' });

      await excelUpdate('wb1', 'Sheet1', 'A1', ['hello'], {});

      expect(writeRange).toHaveBeenCalledWith('wb1', 'Sheet1', 'A1', [['hello']]);
    });

    it('handles errors gracefully', async () => {
      writeRange.mockRejectedValue(new Error('API error'));

      await excelUpdate('wb1', 'Sheet1', 'A1:B2', ['1', '2'], {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelAppend', () => {
    it('appends row to table using positional values', async () => {
      appendTableRows.mockResolvedValue({ index: 5 });

      await excelAppend('wb1', 'SalesData', ['1', '2', '3'], {});

      expect(appendTableRows).toHaveBeenCalledWith('wb1', 'SalesData', [['1', '2', '3']]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Appended'));
    });

    it('outputs JSON when --json flag', async () => {
      const result = { index: 5 };
      appendTableRows.mockResolvedValue(result);

      await excelAppend('wb1', 'SalesData', ['1', '2', '3'], { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
    });

    it('requires positional values', async () => {
      await excelAppend('wb1', 'SalesData', [], {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      appendTableRows.mockRejectedValue(new Error('API error'));

      await excelAppend('wb1', 'SalesData', ['1', '2', '3'], {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelCreate', () => {
    it('creates workbook with positional title', async () => {
      createWorkbook.mockResolvedValue({
        id: 'new-wb',
        name: 'Budget 2024.xlsx',
        webUrl: 'https://...',
      });

      await excelCreate('Budget 2024', {});

      expect(createWorkbook).toHaveBeenCalledWith('Budget 2024', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Workbook created'));
    });

    it('creates workbook in folder', async () => {
      createWorkbook.mockResolvedValue({ id: 'new-wb', name: 'test.xlsx' });

      await excelCreate('test', { folder: 'folder-id' });

      expect(createWorkbook).toHaveBeenCalledWith('test', 'folder-id');
    });

    it('outputs JSON when --json flag', async () => {
      const wb = { id: 'new-wb', name: 'test.xlsx' };
      createWorkbook.mockResolvedValue(wb);

      await excelCreate('test', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(wb, null, 2));
    });

    it('requires title argument', async () => {
      await excelCreate(undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      createWorkbook.mockRejectedValue(new Error('API error'));

      await excelCreate('test', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelAddSheet', () => {
    it('adds worksheet with name', async () => {
      addWorksheet.mockResolvedValue({ id: 'new-sheet', name: 'Q2' });

      await excelAddSheet('wb1', { name: 'Q2' });

      expect(addWorksheet).toHaveBeenCalledWith('wb1', 'Q2');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Worksheet added'));
    });

    it('adds worksheet without name', async () => {
      addWorksheet.mockResolvedValue({ id: 'new-sheet', name: 'Sheet2' });

      await excelAddSheet('wb1', {});

      expect(addWorksheet).toHaveBeenCalledWith('wb1', undefined);
    });

    it('outputs JSON when --json flag', async () => {
      const sheet = { id: 'new-sheet', name: 'Q2' };
      addWorksheet.mockResolvedValue(sheet);

      await excelAddSheet('wb1', { name: 'Q2', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(sheet, null, 2));
    });

    it('handles errors gracefully', async () => {
      addWorksheet.mockRejectedValue(new Error('API error'));

      await excelAddSheet('wb1', { name: 'Q2' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelTables', () => {
    it('lists tables', async () => {
      listTables.mockResolvedValue([
        { id: 'table1', name: 'SalesData', showHeaders: true, showTotals: false },
      ]);

      await excelTables('wb1', {});

      expect(listTables).toHaveBeenCalledWith('wb1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tables'));
    });

    it('outputs JSON when --json flag', async () => {
      const tables = [{ id: 'table1', name: 'SalesData' }];
      listTables.mockResolvedValue(tables);

      await excelTables('wb1', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(tables, null, 2));
    });

    it('handles empty results', async () => {
      listTables.mockResolvedValue([]);

      await excelTables('wb1', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No tables found'));
    });

    it('handles errors gracefully', async () => {
      listTables.mockRejectedValue(new Error('API error'));

      await excelTables('wb1', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelExport', () => {
    it('requires --out option', async () => {
      await excelExport('wb1', { format: 'xlsx' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('validates format option', async () => {
      await excelExport('wb1', { format: 'pdf', out: 'test.pdf' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('exports as CSV', async () => {
      listWorksheets.mockResolvedValue([{ name: 'Sheet1' }]);
      exportAsCsv.mockResolvedValue('a,b,c\n1,2,3');

      await excelExport('wb1', { format: 'csv', out: 'test.csv' });

      expect(exportAsCsv).toHaveBeenCalledWith('wb1', 'Sheet1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Exported'));
    });

    it('exports as CSV with specified sheet', async () => {
      exportAsCsv.mockResolvedValue('data');

      await excelExport('wb1', { format: 'csv', out: 'test.csv', sheet: 'Q1' });

      expect(exportAsCsv).toHaveBeenCalledWith('wb1', 'Q1');
    });

    it('exports as XLSX', async () => {
      downloadWorkbook.mockResolvedValue({ body: { pipe: vi.fn() } });

      await excelExport('wb1', { format: 'xlsx', out: 'test.xlsx' });

      expect(downloadWorkbook).toHaveBeenCalledWith('wb1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Exported'));
    });

    it('outputs JSON when --json flag for CSV', async () => {
      listWorksheets.mockResolvedValue([{ name: 'Sheet1' }]);
      exportAsCsv.mockResolvedValue('data');

      await excelExport('wb1', { format: 'csv', out: 'test.csv', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, path: 'test.csv', format: 'csv', sheet: 'Sheet1' })
      );
    });

    it('outputs JSON when --json flag for XLSX', async () => {
      downloadWorkbook.mockResolvedValue({ body: { pipe: vi.fn() } });

      await excelExport('wb1', { format: 'xlsx', out: 'test.xlsx', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, path: 'test.xlsx', format: 'xlsx' })
      );
    });

    it('handles errors gracefully', async () => {
      downloadWorkbook.mockRejectedValue(new Error('API error'));

      await excelExport('wb1', { format: 'xlsx', out: 'test.xlsx' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelClear', () => {
    it('clears range values', async () => {
      clearRange.mockResolvedValue({});

      await excelClear('wb1', 'Sheet1', 'A1:C3', {});

      expect(clearRange).toHaveBeenCalledWith('wb1', 'Sheet1', 'A1:C3');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cleared'));
    });

    it('outputs JSON when --json flag', async () => {
      clearRange.mockResolvedValue({});

      await excelClear('wb1', 'Sheet1', 'A1:C3', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, sheet: 'Sheet1', range: 'A1:C3' }, null, 2)
      );
    });

    it('requires sheet and range', async () => {
      await excelClear('wb1', undefined, undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      clearRange.mockRejectedValue(new Error('API error'));

      await excelClear('wb1', 'Sheet1', 'A1:C3', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('excelCopy', () => {
    it('copies workbook with positional title', async () => {
      copyWorkbook.mockResolvedValue({ id: 'copy-wb' });

      await excelCopy('wb1', 'Budget Copy', {});

      expect(copyWorkbook).toHaveBeenCalledWith('wb1', 'Budget Copy', undefined);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Copy initiated'));
    });

    it('copies workbook to folder', async () => {
      copyWorkbook.mockResolvedValue({ id: 'copy-wb' });

      await excelCopy('wb1', 'Budget Copy', { folder: 'folder-id' });

      expect(copyWorkbook).toHaveBeenCalledWith('wb1', 'Budget Copy', 'folder-id');
    });

    it('outputs JSON when --json flag', async () => {
      const result = { id: 'copy-wb' };
      copyWorkbook.mockResolvedValue(result);

      await excelCopy('wb1', 'Budget Copy', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
    });

    it('requires title argument', async () => {
      await excelCopy('wb1', undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      copyWorkbook.mockRejectedValue(new Error('API error'));

      await excelCopy('wb1', 'Budget Copy', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
