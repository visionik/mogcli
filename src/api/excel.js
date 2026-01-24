import { graphRequest, graphRequestRaw } from './client.js';

/**
 * List Excel workbooks in OneDrive
 */
export async function listWorkbooks(options = {}) {
  const max = options.max || 50;
  const params = new URLSearchParams();
  params.append('$top', max.toString());
  params.append('$select', 'id,name,size,lastModifiedDateTime,webUrl,createdDateTime');

  const data = await graphRequest(`/me/drive/root/search(q='.xlsx')?${params.toString()}`);
  return data.value || [];
}

/**
 * Get workbook metadata (drive item)
 */
export async function getWorkbook(itemId) {
  return graphRequest(`/me/drive/items/${itemId}`);
}

/**
 * List worksheets in a workbook
 */
export async function listWorksheets(itemId) {
  const data = await graphRequest(`/me/drive/items/${itemId}/workbook/worksheets`);
  return data.value || [];
}

/**
 * Get a specific worksheet
 */
export async function getWorksheet(itemId, sheetNameOrId) {
  return graphRequest(`/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheetNameOrId)}`);
}

/**
 * Add a new worksheet
 * @param {string} itemId - Workbook drive item ID
 * @param {string} name - Optional worksheet name
 */
export async function addWorksheet(itemId, name) {
  const body = name ? { name } : {};
  return graphRequest(`/me/drive/items/${itemId}/workbook/worksheets/add`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Read a range of cells
 * @param {string} itemId - Workbook drive item ID
 * @param {string} sheetNameOrId - Worksheet name or ID
 * @param {string} range - Range address (e.g., 'A1:C10') or null for used range
 */
export async function readRange(itemId, sheetNameOrId, range) {
  const sheetPath = `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheetNameOrId)}`;

  if (!range) {
    // Get used range if no range specified
    return graphRequest(`${sheetPath}/usedRange`);
  }

  return graphRequest(`${sheetPath}/range(address='${range}')`);
}

/**
 * Write values to a range
 * @param {string} itemId - Workbook drive item ID
 * @param {string} sheetNameOrId - Worksheet name or ID
 * @param {string} range - Range address (e.g., 'A1:C10')
 * @param {Array<Array<any>>} values - 2D array of values
 */
export async function writeRange(itemId, sheetNameOrId, range, values) {
  const endpoint = `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheetNameOrId)}/range(address='${range}')`;

  return graphRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify({ values }),
  });
}

/**
 * List tables in a workbook
 */
export async function listTables(itemId) {
  const data = await graphRequest(`/me/drive/items/${itemId}/workbook/tables`);
  return data.value || [];
}

/**
 * Get a specific table
 */
export async function getTable(itemId, tableNameOrId) {
  return graphRequest(`/me/drive/items/${itemId}/workbook/tables/${encodeURIComponent(tableNameOrId)}`);
}

/**
 * Append rows to a table
 * @param {string} itemId - Workbook drive item ID
 * @param {string} tableNameOrId - Table name or ID
 * @param {Array<Array<any>>} values - 2D array of row values
 */
export async function appendTableRows(itemId, tableNameOrId, values) {
  return graphRequest(`/me/drive/items/${itemId}/workbook/tables/${encodeURIComponent(tableNameOrId)}/rows/add`, {
    method: 'POST',
    body: JSON.stringify({ values }),
  });
}

/**
 * Create a new workbook (uploads a minimal .xlsx template)
 * @param {string} name - Workbook name (without extension)
 * @param {string} parentId - Optional parent folder ID
 */
export async function createWorkbook(name, parentId) {
  const fileName = name.endsWith('.xlsx') ? name : `${name}.xlsx`;
  const endpoint = parentId
    ? `/me/drive/items/${parentId}:/${fileName}:/content`
    : `/me/drive/root:/${fileName}:/content`;

  const minimalXlsx = getMinimalXlsxBuffer();

  return graphRequest(endpoint, {
    method: 'PUT',
    body: minimalXlsx,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}

/**
 * Download workbook content (raw .xlsx)
 * @param {string} itemId - Workbook ID
 */
export async function downloadWorkbook(itemId) {
  return graphRequest(`/me/drive/items/${itemId}/content`, {
    rawResponse: true,
  });
}

/**
 * Clear values in a range (keeps formatting)
 * @param {string} itemId - Workbook drive item ID
 * @param {string} sheetNameOrId - Worksheet name or ID
 * @param {string} range - Range address (e.g., 'A1:C10')
 */
export async function clearRange(itemId, sheetNameOrId, range) {
  const endpoint = `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheetNameOrId)}/range(address='${range}')/clear`;

  return graphRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ applyTo: 'Contents' }),
  });
}

/**
 * Copy/duplicate a workbook
 * @param {string} itemId - Source workbook ID
 * @param {string} name - Name for the copy
 * @param {string} parentId - Optional destination folder ID
 */
export async function copyWorkbook(itemId, name, parentId) {
  const body = { name };
  if (parentId) {
    body.parentReference = { id: parentId };
  }

  return graphRequest(`/me/drive/items/${itemId}/copy`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Export worksheet data as CSV (manual conversion from range data)
 * @param {string} itemId - Workbook drive item ID
 * @param {string} sheetNameOrId - Worksheet name or ID
 */
export async function exportAsCsv(itemId, sheetNameOrId) {
  const data = await readRange(itemId, sheetNameOrId, null);

  if (!data.values || data.values.length === 0) {
    return '';
  }

  // Convert values to CSV
  return data.values
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) {
            return '';
          }
          const str = String(cell);
          // Quote if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Returns a minimal valid .xlsx file as a Buffer
 * A .xlsx is a ZIP containing XML files
 */
function getMinimalXlsxBuffer() {
  // Base64-encoded minimal .xlsx file (empty workbook with one sheet)
  // This is a ~4KB file with the minimum structure needed
  const base64 =
    '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' +
    'AAAAfY5BDsIwDETvPUWUfdMuEEKobdiwQuIAbOomEW0cOU7h9qQFiQWIG/9vzXhTfXN9' +
    '96YxmTMdzJg4Mim6pMlb2J+22ysYybps0jlnoAwklJWpKqNrJ3gVGvlPKihNYoy7PFVZ' +
    'fxEYeyPF/50AAP//AwBQSwMEFAAAAAAAAAAhAAAAAAAAAAAAAAAAABQAHAB4bC9zaGFy' +
    'ZWRTdHJpbmdzL1VUBQADAAAAAAAAUEsDBBQAAAAIAAAAAIEAJb8dJVkAAABhAAAAGAAc' +
    'AHhsL3NoYXJlZFN0cmluZ3Mvc3N0LnhtbFVUCQADAAAAAAAAAACrDkksSi4v0LCuTi4p' +
    'SizIUHDOSSwuKS0usNZRKMlIVQjPz8lRBIqCFWfk5wEFNKzzgQoLUos0NAEA//8DAFBL' +
    'AwQUAAAAAAAAAAIAAAAAAAAAAAAAAAAACQAcAF9yZWxzL1VUBQADAAAAAABQSwMEFAAA' +
    'AAIAAAAAgQAvZ9TKtwAAABsBAAARABwAX3JlbHMvLnJlbHNVVAkAAwAAAAAAAAAAPc+x' +
    'CsIwEAb gvU9xZG+TdhCR0k52ENyHGC9NMLmEuyj69iYWcTnu//676hz8cs88mT0tUJQF' +
    'COytfrBboLnezHvY6OU6Cn7iDLH4sFRkOxHJj7RtYUwZ7tn1rMqd/0CFNINTU3b8X0Kk' +
    'Uh3zM+bnfw1RA7hVg+pNjYvCDHcnMKtXWR2k/6nuAAD//wMAUEsFBgAAAAAOAA4AvgMA' +
    'AAYDAAAAAA==';

  return Buffer.from(base64, 'base64');
}
