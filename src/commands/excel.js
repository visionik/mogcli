import chalk from 'chalk';
import { writeFileSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  listWorkbooks,
  getWorkbook,
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
import { formatId, resolveId } from '../ids.js';

function formatSize(bytes) {
  if (!bytes) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============ List Workbooks ============

export async function excelList(options) {
  try {
    const workbooks = await listWorkbooks({ max: parseInt(options.max) || 50 });

    if (options.json) {
      console.log(JSON.stringify(workbooks, null, 2));
      return;
    }

    if (workbooks.length === 0) {
      console.log(chalk.yellow('No Excel workbooks found'));
      return;
    }

    console.log(chalk.bold('Excel Workbooks'));
    console.log('');

    for (const wb of workbooks) {
      const size = chalk.dim(formatSize(wb.size));
      const date = chalk.dim(formatDate(wb.lastModifiedDateTime));
      console.log(`📊 ${chalk.cyan(wb.name)}  ${size}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(wb.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`   Full: ${wb.id}`));
        if (wb.webUrl) {
          console.log(chalk.dim(`   URL: ${wb.webUrl}`));
        }
      }
    }

    console.log('');
    console.log(chalk.dim(`${workbooks.length} workbook(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ List Worksheets (metadata) ============

export async function excelMetadata(workbookId, options) {
  try {
    const sheets = await listWorksheets(resolveId(workbookId));

    if (options.json) {
      console.log(JSON.stringify(sheets, null, 2));
      return;
    }

    if (sheets.length === 0) {
      console.log(chalk.yellow('No worksheets found'));
      return;
    }

    console.log(chalk.bold('Worksheets'));
    console.log('');

    for (const sheet of sheets) {
      const visibility = sheet.visibility === 'Visible' ? '' : chalk.dim(` (${sheet.visibility})`);
      console.log(`📄 ${chalk.cyan(sheet.name)}${visibility}`);
      console.log(chalk.dim(`   ID: ${sheet.id}`));
      if (sheet.position !== undefined) {
        console.log(chalk.dim(`   Position: ${sheet.position}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${sheets.length} worksheet(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Get Range ============

export async function excelGet(workbookId, sheetOrRange, range, options) {
  try {
    // Parse arguments: workbook [sheet] [range]
    let sheetName = sheetOrRange;
    let rangeAddr = range;

    // If only workbook provided, read first sheet's used range
    if (!sheetOrRange) {
      const sheets = await listWorksheets(resolveId(workbookId));
      if (sheets.length === 0) {
        throw new Error('Workbook has no worksheets');
      }
      sheetName = sheets[0].name;
      rangeAddr = null;
    }
    // If sheetOrRange looks like a range (contains :), treat it as range on first sheet
    else if (sheetOrRange.includes(':') && !range) {
      const sheets = await listWorksheets(resolveId(workbookId));
      if (sheets.length === 0) {
        throw new Error('Workbook has no worksheets');
      }
      sheetName = sheets[0].name;
      rangeAddr = sheetOrRange;
    }

    const data = await readRange(resolveId(workbookId), sheetName, rangeAddr);

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    if (!data.values || data.values.length === 0) {
      console.log(chalk.yellow('No data in range'));
      return;
    }

    console.log(chalk.bold(`${sheetName}${rangeAddr ? ` - ${rangeAddr}` : ' (used range)'}`));
    console.log('');

    // Simple table output
    const values = data.values;

    // Calculate column widths
    const colWidths = [];
    for (let col = 0; col < (values[0]?.length || 0); col++) {
      let maxWidth = 0;
      for (const row of values) {
        const cell = row[col];
        const width = String(cell ?? '').length;
        if (width > maxWidth) {
          maxWidth = width;
        }
      }
      colWidths.push(Math.min(maxWidth, 30)); // Cap at 30 chars
    }

    // Print rows
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const cells = row.map((cell, col) => {
        const str = String(cell ?? '');
        const truncated = str.length > 30 ? str.slice(0, 27) + '...' : str;
        return truncated.padEnd(colWidths[col]);
      });

      if (i === 0) {
        // Header row
        console.log(chalk.bold(cells.join('  ')));
        console.log(chalk.dim('-'.repeat(cells.join('  ').length)));
      } else {
        console.log(cells.join('  '));
      }
    }

    console.log('');
    console.log(chalk.dim(`${values.length} row(s), ${values[0]?.length || 0} column(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Update Range ============

/**
 * Parse positional values into a 2D array for the range.
 * Values fill the range row by row based on range dimensions.
 * @param {string} range - Range address (e.g., 'A1:B2')
 * @param {string[]} values - Flat array of values
 * @returns {any[][]} 2D array of values
 */
function parsePositionalValues(range, values) {
  // Parse range to determine dimensions (e.g., A1:B2 = 2 cols, 2 rows)
  const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/i);
  if (!match) {
    // Single cell or invalid range - treat as single cell
    return [[values[0] ?? '']];
  }

  const [, startCol, startRow, endCol, endRow] = match;
  const numCols = colToNum(endCol) - colToNum(startCol) + 1;
  const numRows = parseInt(endRow) - parseInt(startRow) + 1;

  // Fill row by row
  const result = [];
  let idx = 0;
  for (let r = 0; r < numRows; r++) {
    const row = [];
    for (let c = 0; c < numCols; c++) {
      row.push(values[idx] ?? '');
      idx++;
    }
    result.push(row);
  }
  return result;
}

function colToNum(col) {
  let num = 0;
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

export async function excelUpdate(workbookId, sheet, range, positionalValues, options) {
  try {
    if (!positionalValues || positionalValues.length === 0) {
      console.error(chalk.red('Error: values are required'));
      process.exit(1);
    }

    const values = parsePositionalValues(range, positionalValues);

    const result = await writeRange(resolveId(workbookId), sheet, range, values);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.green('✓ Updated'));
    console.log(`  Sheet: ${chalk.cyan(sheet)}`);
    console.log(`  Range: ${range}`);
    console.log(`  Cells: ${values.length} rows × ${values[0].length} columns`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Append to Table ============

export async function excelAppend(workbookId, table, positionalValues, options) {
  try {
    if (!positionalValues || positionalValues.length === 0) {
      console.error(chalk.red('Error: values are required'));
      process.exit(1);
    }

    // For append, positional values become a single row
    const values = [positionalValues];

    const result = await appendTableRows(resolveId(workbookId), table, values);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.green('✓ Appended'));
    console.log(`  Table: ${chalk.cyan(table)}`);
    console.log(`  Rows added: ${values.length}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Create Workbook ============

export async function excelCreate(title, options) {
  try {
    if (!title) {
      console.error(chalk.red('Error: title is required'));
      process.exit(1);
    }

    const wb = await createWorkbook(
      title,
      options.folder ? resolveId(options.folder) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(wb, null, 2));
      return;
    }

    console.log(chalk.green('✓ Workbook created'));
    console.log(`  Name: ${chalk.cyan(wb.name)}`);
    console.log(`  ID: ${chalk.dim(formatId(wb.id))}`);
    if (wb.webUrl) {
      console.log(`  URL: ${chalk.dim(wb.webUrl)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Add Worksheet ============

export async function excelAddSheet(workbookId, options) {
  try {
    const sheet = await addWorksheet(resolveId(workbookId), options.name);

    if (options.json) {
      console.log(JSON.stringify(sheet, null, 2));
      return;
    }

    console.log(chalk.green('✓ Worksheet added'));
    console.log(`  Name: ${chalk.cyan(sheet.name)}`);
    console.log(`  ID: ${chalk.dim(sheet.id)}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ List Tables ============

export async function excelTables(workbookId, options) {
  try {
    const tables = await listTables(resolveId(workbookId));

    if (options.json) {
      console.log(JSON.stringify(tables, null, 2));
      return;
    }

    if (tables.length === 0) {
      console.log(chalk.yellow('No tables found in workbook'));
      return;
    }

    console.log(chalk.bold('Tables'));
    console.log('');

    for (const table of tables) {
      console.log(`📋 ${chalk.cyan(table.name)}`);
      if (table.showHeaders !== undefined) {
        console.log(chalk.dim(`   Headers: ${table.showHeaders ? 'Yes' : 'No'}`));
      }
      if (table.showTotals !== undefined) {
        console.log(chalk.dim(`   Totals: ${table.showTotals ? 'Yes' : 'No'}`));
      }
      console.log(chalk.dim(`   ID: ${table.id}`));
    }

    console.log('');
    console.log(chalk.dim(`${tables.length} table(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Clear Range ============

export async function excelClear(workbookId, sheet, range, options) {
  try {
    if (!sheet || !range) {
      console.error(chalk.red('Error: sheet and range are required'));
      process.exit(1);
    }

    await clearRange(resolveId(workbookId), sheet, range);

    if (options.json) {
      console.log(JSON.stringify({ success: true, sheet, range }, null, 2));
      return;
    }

    console.log(chalk.green('✓ Cleared'));
    console.log(`  Sheet: ${chalk.cyan(sheet)}`);
    console.log(`  Range: ${range}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Copy Workbook ============

export async function excelCopy(workbookId, title, options) {
  try {
    if (!title) {
      console.error(chalk.red('Error: title is required'));
      process.exit(1);
    }

    const result = await copyWorkbook(
      resolveId(workbookId),
      title,
      options.folder ? resolveId(options.folder) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.green('✓ Copy initiated'));
    console.log(`  Name: ${chalk.cyan(title)}`);
    if (result.id) {
      console.log(`  ID: ${chalk.dim(formatId(result.id))}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Export ============

export async function excelExport(workbookId, options) {
  try {
    const format = (options.format || 'xlsx').toLowerCase();
    const validFormats = ['xlsx', 'csv'];

    if (!validFormats.includes(format)) {
      console.error(chalk.red(`Error: Invalid format. Use: ${validFormats.join(', ')}`));
      process.exit(1);
    }

    if (!options.out) {
      console.error(chalk.red('Error: --out is required'));
      process.exit(1);
    }

    console.log(chalk.dim(`Exporting as ${format}...`));

    if (format === 'csv') {
      // For CSV, export the first sheet (or specified sheet)
      const sheetName = options.sheet;
      let targetSheet = sheetName;

      if (!targetSheet) {
        const sheets = await listWorksheets(resolveId(workbookId));
        if (sheets.length === 0) {
          throw new Error('Workbook has no worksheets');
        }
        targetSheet = sheets[0].name;
      }

      const csvData = await exportAsCsv(resolveId(workbookId), targetSheet);
      writeFileSync(options.out, csvData);

      if (options.json) {
        console.log(JSON.stringify({ success: true, path: options.out, format, sheet: targetSheet }));
        return;
      }

      console.log(chalk.green('✓ Exported'));
      console.log(`  Format: CSV`);
      console.log(`  Sheet: ${targetSheet}`);
      console.log(`  Saved to: ${options.out}`);
    } else {
      // For xlsx, download the raw file
      const response = await downloadWorkbook(resolveId(workbookId));
      const fileStream = createWriteStream(options.out);
      await pipeline(response.body, fileStream);

      if (options.json) {
        console.log(JSON.stringify({ success: true, path: options.out, format }));
        return;
      }

      console.log(chalk.green('✓ Exported'));
      console.log(`  Format: XLSX`);
      console.log(`  Saved to: ${options.out}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
