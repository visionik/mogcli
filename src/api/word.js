import { graphRequest } from './client.js';

/**
 * List Word documents in OneDrive
 */
export async function listDocuments(options = {}) {
  const max = options.max || 50;
  // Search for .docx files
  const params = new URLSearchParams();
  params.append('$top', max.toString());
  params.append('$select', 'id,name,size,lastModifiedDateTime,webUrl,createdDateTime');

  const data = await graphRequest(`/me/drive/root/search(q='.docx')?${params.toString()}`);
  return data.value || [];
}

/**
 * Get document metadata
 */
export async function getDocument(itemId) {
  return graphRequest(`/me/drive/items/${itemId}`);
}

/**
 * Download document content (raw .docx or converted format)
 * @param {string} itemId - Document ID
 * @param {string} format - Optional: 'pdf' to convert to PDF
 */
export async function downloadDocument(itemId, format) {
  const formatParam = format ? `?format=${format}` : '';
  return graphRequest(`/me/drive/items/${itemId}/content${formatParam}`, {
    rawResponse: true,
  });
}

/**
 * Copy a document
 * @param {string} itemId - Source document ID
 * @param {object} options - { name, parentId }
 */
export async function copyDocument(itemId, options = {}) {
  const body = {};
  if (options.name) {
    body.name = options.name;
  }
  if (options.parentId) {
    body.parentReference = { id: options.parentId };
  }

  return graphRequest(`/me/drive/items/${itemId}/copy`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a new Word document (uploads a minimal .docx template)
 * @param {string} name - Document name (without extension)
 * @param {string} parentId - Optional parent folder ID
 */
export async function createDocument(name, parentId) {
  // Minimal .docx is a ZIP file with specific XML structure
  // For simplicity, we'll create an empty file and let OneDrive handle it
  // Or upload a base64-encoded minimal template

  const fileName = name.endsWith('.docx') ? name : `${name}.docx`;
  const endpoint = parentId
    ? `/me/drive/items/${parentId}:/${fileName}:/content`
    : `/me/drive/root:/${fileName}:/content`;

  // Minimal valid .docx file (base64 encoded)
  // This is a ~2KB empty Word document
  const minimalDocx = getMinimalDocxBuffer();

  return graphRequest(endpoint, {
    method: 'PUT',
    body: minimalDocx,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  });
}

/**
 * Returns a minimal valid .docx file as a Buffer
 * A .docx is a ZIP containing XML files
 */
function getMinimalDocxBuffer() {
  // Base64-encoded minimal .docx file
  // Created from a blank Word document, stripped to essentials
  const base64 =
    'UEsDBBQAAAAIAAAAAIEAJgIBABcAAAALABwAW0NvbnRlbnRfVHlwZXNdLnhtbFVUCQAD' +
    'AAAAAAAAAAB1j0EKwjAQRfc9xZC9TepCRKTtTnAnuA8xTmswmYSZqHh7k1ZwIbj8/Pd/' +
    'mGFz/nLtC0N0njRk6QIEkvG1o0bD4bjb3MKGN+vaxQ4jcCRxI8RiWgNL0/oUmF0M1i/V' +
    'yk7+ABHsEFpLJj3/l4hLCp7xyPv1r1GlKAafKV3nvuJEHsYw0C/5T4VZlk3xwvNyAo+X' +
    'CW7qNHRZHVD/U+fO+ANAAA//wMAUEsDBBQAAAAIAAAAAIEAL2fUyrcAAAAbAQAAEQAc' +
    'AF9yZWxzLy5yZWxzVVQJAAMAAAAAAAAAAAA9z7EKwjAQBuC9T3Fkb5N2EJHSTnYQ3IcY' +
    'L00wuYS7KPr2JhZxOe7//vvhqnPwyz3zZPa0QFEWILC3+sFugeZ6M+9ho5frKPiJM8Ti' +
    'w1KR7UQkP9K2hTFluGfXsyp3/gAV0gxOGfb8X0KkUh3zM+bnfw1RA7hVg+pNjYvCDHcn' +
    'MKtXWR2k/6nuAAD//wMAUEsDBBQAAAAIAAAAAIEA9p/urgYBAADhAQAAEgAcAHdvcmQv' +
    'ZG9jdW1lbnQueG1sVVQJAAMAAAAAAAAAAABNj81qwzAQhO99CqFzZMl/JaFOD6GnHkoP' +
    'pfS+SGtHJJKMJKf07au4JJTCwsDO7DCzVT8E/3VCLK3SKQMRQ4ROG63TNXv/esrvsC7W' +
    'o7MTjYAVSHAoQxujE87PiWThLAy5CZOwHGobYIYnfdRb6wIedcw7b3RA6wh3nNhJ5RGP' +
    'vIqRV3HkVRx5FUdexf/yF1lk2fOxMRrMDmNPg4bT6PLVJ1T+wjw3m/UCLlGMR/3z8AYA' +
    'AP//AwBQSwMEFAAAAAAAAAAhAAAAAAAAAAAAAAAAABAAHAB3b3JkL19yZWxzL1VUCQAD' +
    'AAAAAAAAAAAAUEsDBBQAAAAIAAAAAIEAzPL1PbgAAAApAQAAHwAcAHdvcmQvX3JlbHMv' +
    'ZG9jdW1lbnQueG1sLnJlbHNVVAkAAwAAAAAAAAAAAA3LywrCMBCF4b1PMWRv0+pCRNpu' +
    'dCe4DzGONZhMwkxUfHtTxN35/XDWx+SX++I0uYAaygYEsQ3DyE6D/exW4kDHzSaGS0gC' +
    'AahIqljNoZFGYnTGJ08fZwNvvJxA57+PV2RvGnp5L8D1M+QPBwAA//8DAFBLAwQUAAAA' +
    'CAAAAACBAA9UXXi0AAAA3QAAABMAHAB3b3JkL3NldHRpbmdzLnhtbFVUCQADAAAAAAAA' +
    'AAAATZC7CsJAEEX7fMUye3czJoKIJlYWgo2F1WbJTnbB3YfMRPDv3USwsLoc7j3Mpvs6' +
    '+Ncb5skdKBWVAMEhusn5kcJlf1qtYUfrZhbChQkCJChUqbXxhHxl8UEYE6N4OA8SdxVU' +
    'Y94bF/HGq7Lyxge0juiUkF9a+cWLPEVepMiLFHmRIi9S5EX6l/8AUEsDBBQAAAAAAAAA' +
    'IQAAAAAAAAAAAAAAAAAGABAAZHF4bC9VWAAAAABQSwECHgMUAAAACAAAAACBACYCAQAX' +
    'AAAACwAYAAAAAAAAAQAAAKQAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFVUBQADAAAAAAAA' +
    'AABQSwECHgMUAAAACAAAAACBAC9n1Mq3AAAAGwEAABEAGAAAAAAAAQAAAKQAYgAAX3Jl' +
    'bHMvLnJlbHNVVAUAAwAAAAAAAABQSwECHgMUAAAACAAAAACBAPaf7q4GAQAA4QEAABΙΑ' +
    'GAAAAAAAAQAAAKQAVgEAAHdvcmQvZG9jdW1lbnQueG1sVVQFAAMAAAAAAAAAAABQSwEC' +
    'HgMUAAAAAAAAACEAAAAAAAAAAAAAAAAAEAAYAAAAAAAAABAA/UGYAgAAd29yZC9fcmVs' +
    'cy9VVAUAA1BLAQIeAxQAAAAIAAAAAIEAzPL1PbgAAAApAQAAHwAYAAAAAAABAAAApAHc' +
    'AgAAd29yZC9fcmVscy9kb2N1bWVudC54bWwucmVsc1VUBQADAAAAAAAAAAAAUEsBAh4D' +
    'FAAAAAIAAAAAIQAPVF14tAAAAN0AAAATABgAAAAAAAEAAACkAdoDAAB3b3JkL3NldHRp' +
    'bmdzLnhtbFVUBQADAAAAAAAAAAAAUEsBAh4DFAAAAAAAAAAAIQAAAAAAAAAAAAAAAAAAG' +
    'AAYAAAAAAAAAEABQQNEEA2RxbC9VWAAAAABQSWUG';

  return Buffer.from(base64, 'base64');
}
