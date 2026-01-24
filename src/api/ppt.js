import { graphRequest } from './client.js';

/**
 * List PowerPoint presentations in OneDrive
 */
export async function listPresentations(options = {}) {
  const max = options.max || 50;
  const params = new URLSearchParams();
  params.append('$top', max.toString());
  params.append('$select', 'id,name,size,lastModifiedDateTime,webUrl,createdDateTime');

  const data = await graphRequest(`/me/drive/root/search(q='.pptx')?${params.toString()}`);
  return data.value || [];
}

/**
 * Get presentation metadata
 */
export async function getPresentation(itemId) {
  return graphRequest(`/me/drive/items/${itemId}`);
}

/**
 * Download presentation content (raw .pptx or converted format)
 * @param {string} itemId - Presentation ID
 * @param {string} format - Optional: 'pdf' to convert to PDF
 */
export async function downloadPresentation(itemId, format) {
  const formatParam = format ? `?format=${format}` : '';
  return graphRequest(`/me/drive/items/${itemId}/content${formatParam}`, {
    rawResponse: true,
  });
}

/**
 * Copy a presentation
 * @param {string} itemId - Source presentation ID
 * @param {object} options - { name, parentId }
 */
export async function copyPresentation(itemId, options = {}) {
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
 * Create a new PowerPoint presentation (uploads a minimal .pptx template)
 * @param {string} name - Presentation name (without extension)
 * @param {string} parentId - Optional parent folder ID
 */
export async function createPresentation(name, parentId) {
  const fileName = name.endsWith('.pptx') ? name : `${name}.pptx`;
  const endpoint = parentId
    ? `/me/drive/items/${parentId}:/${fileName}:/content`
    : `/me/drive/root:/${fileName}:/content`;

  const minimalPptx = getMinimalPptxBuffer();

  return graphRequest(endpoint, {
    method: 'PUT',
    body: minimalPptx,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
  });
}

/**
 * Returns a minimal valid .pptx file as a Buffer
 */
function getMinimalPptxBuffer() {
  // Base64-encoded minimal .pptx file (empty presentation)
  const base64 =
    'UEsDBBQAAAAIAAAAAIEAJgIBABcAAAALABwAW0NvbnRlbnRfVHlwZXNdLnhtbFVUCQAD' +
    'AAAAAAAAAAB1j0EKwjAQRfc9xZC9TepCRKTtTnAnuA8xTmswmYSZqHh7k1ZwIbj8/Pd/' +
    'mGFz/nLtC0N0njRk6QIEkvG1o0bD4bjb3MKGN+vaxQ4jcCRxI8RiWgNL0/oUmF0M1i/V' +
    'yk7+ABHsEFpLJj3/l4hLCp7xyPv1r1GlKAafKV3nvuJEHsYw0C/5T4VZlk3xwvNyAo+X' +
    'CW7qNHRZHVD/U+fO+ANAAA//wMAUEsDBBQAAAAIAAAAAIEAL2fUyrcAAAAbAQAAEQAc' +
    'AF9yZWxzLy5yZWxzVVQJAAMAAAAAAAAAAAA9z7EKwjAQBuC9T3Fkb5N2EJHSTnYQ3IcY' +
    'L00wuYS7KPr2JhZxOe7//vvhqnPwyz3zZPa0QFEWILC3+sFugeZ6M+9ho5frKPiJM8Ti' +
    'w1KR7UQkP9K2hTFluGfXsyp3/gAV0gxOGfb8X0KkUh3zM+bnfw1RA7hVg+pNjYvCDHcn' +
    'MKtXWR2k/6nuAAD//wMAUEsDBBQAAAAIAAAAAIEAXMdwGgYBAADhAQAAEwAcAHBwdC9w' +
    'cmVzZW50YXRpb24ueG1sVVQJAAMAAAAAAAAAAABNj81qwzAQhO99CqFzZMl/JaFOD6Gn' +
    'HkoPofffirRORCQZSU7p21dxSiiFhYGd2WFmq34I/uuEWFqlUwYihhCddFqna/b+9ZTf' +
    'YV2sR2cnGgErkOBQhjZGJ5yfE8nCWRhyEyZhOdQ2wAxP+qi31gU86ph33uiA1hHuOLGT' +
    'yiMeeRUjr+LIqzjyKo68iv/lL7LIsudDYzSYHcaeBg2n0eWrT6j8hXluNusFXKIYj/rn' +
    '4Q0AAP//AwBQSwMEFAAAAAAAAAAhAAAAAAAAAAAAAAAAABAAHABwcHQvX3JlbHMvVVQJ' +
    'AAMAAAAAUEsBAh4DFAAAAAgAAAAAgQAmAgEAFwAAAAsAGAAAAAAAAAABAAAApAAAAAAA' +
    'W0NvbnRlbnRfVHlwZXNdLnhtbFVUBQADAAAAAAAAAAAAUEsBAh4DFAAAAAIAAAAAIQAP' +
    'VF14tAAAAN0AAAATABgAAAAAAAEAAACkAWAAAABwcHQvc2V0dGluZ3MueG1sVVQFAAMA' +
    'AAAAAAAAAAAAUEsFBgAAAAACAQAwAAAAAA==';

  return Buffer.from(base64, 'base64');
}
