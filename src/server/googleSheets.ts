/**
 * Google Sheets & Drive API Server-Side Integration
 * Handles CRUD operations, sheet schemas, and Drive image uploads
 */

export const SHEET_SCHEMAS: Record<string, string[]> = {
  'User Access': ['Email', 'Role', 'Status', 'Added On'],
  'Price Database': [
    'Code No.',
    'Item Name',
    'Brand Name',
    'Size',
    'Unit',
    'Unit Price',
    'Updated Date',
    'Remark',
    '',
    'Product Image File ID',
  ],
  'Price History': [
    'Update Date',
    'Item Name',
    'Code No.',
    'Brand Name',
    'Size',
    'Previous Price',
    'New Price',
    'Remark',
    'Updated By',
  ],
  'Quotation': [
    'Quotation No',
    'Date',
    'Customer Name',
    'Customer Contact',
    'Items Summary',
    'Subtotal',
    'Discount',
    'Tax Rate',
    'Grand Total',
    'Status',
    'Created By',
    'Items Data',
  ],
  'CS Rate': [
    'Item Name',
    'Code No',
    'Brand',
    'Vendor A',
    'Rate A',
    'Vendor B',
    'Rate B',
    'Vendor C',
    'Rate C',
    'Recommended Vendor',
    'Lowest Rate',
    'Remarks',
    'Updated Date',
  ],
  'Delivery': [
    'Delivery No',
    'Date',
    'Customer Name',
    'Quotation No',
    'Items Summary',
    'Delivery Status',
    'Delivered By',
    'Remarks',
  ],
  'Chalan': [
    'Challan No',
    'Date',
    'Customer Name',
    'Delivery No',
    'Vehicle No',
    'Items Details',
    'Received By',
    'Remarks',
  ],
  'Bill': [
    'Bill No',
    'Date',
    'Customer Name',
    'Reference No',
    'Total Amount',
    'Paid Amount',
    'Balance Due',
    'Payment Status',
    'Payment Method',
    'Remarks',
  ],
  'Activity Log': [
    'Timestamp',
    'User Email',
    'Action',
    'Module',
    'Details',
  ],
};

export interface SheetMetadata {
  id: string;
  title: string;
  sheets: { id: number; title: string; rowCount: number; columnCount: number }[];
}

export async function extractErrorMessage(res: Response, fallbackPrefix: string): Promise<string> {
  const statusStr = `HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`;
  try {
    const text = await res.text();
    // Try to parse Google API JSON error
    if (text.startsWith('{')) {
      const json = JSON.parse(text);
      if (json.error?.message) {
        return `${fallbackPrefix} - ${json.error.message} (${statusStr})`;
      }
      if (json.message) {
        return `${fallbackPrefix} - ${json.message} (${statusStr})`;
      }
    }
    // If Google returned an HTML page (like 404 or auth redirect), extract the page title
    const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      return `${fallbackPrefix} - ${titleMatch[1].trim()} (${statusStr})`;
    }
    if (text.length > 0 && text.length < 200 && !text.includes('<')) {
      return `${fallbackPrefix} - ${text.trim()} (${statusStr})`;
    }
  } catch {
    // ignore parsing failure
  }
  return `${fallbackPrefix} (${statusStr})`;
}

export async function getSpreadsheetMetadata(spreadsheetId: string, token: string): Promise<SheetMetadata> {
  const cleanId = spreadsheetId.trim();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const cleanError = await extractErrorMessage(res, `Failed to access spreadsheet ID "${cleanId}"`);
    throw new Error(cleanError);
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Price Database Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      id: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount || 0,
      columnCount: s.properties.gridProperties?.columnCount || 0,
    })),
  };
}

export async function createAndInitializeSpreadsheet(
  title: string,
  token: string,
  superAdminEmail: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // Step 1: Create the spreadsheet with the 9 sheets
  const sheetsPayload = Object.keys(SHEET_SCHEMAS).map((sheetName, index) => ({
    properties: {
      sheetId: index + 100,
      title: sheetName,
      gridProperties: {
        rowCount: 100,
        columnCount: SHEET_SCHEMAS[sheetName].length + 2,
        frozenRowCount: 1,
      },
    },
  }));

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: sheetsPayload,
    }),
  });

  if (!createRes.ok) {
    const cleanErr = await extractErrorMessage(createRes, 'Failed to create Google Spreadsheet');
    throw new Error(cleanErr);
  }

  const newSpreadsheet = await createRes.json();
  const spreadsheetId = newSpreadsheet.spreadsheetId;

  // The spreadsheet is owned by the service account. Give the configured super admin
  // editor access so they can open it in Google Sheets; employees are never shared.
  if (superAdminEmail) {
    const permissionRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=false`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user',
          role: 'writer',
          emailAddress: superAdminEmail,
        }),
      }
    );
    if (!permissionRes.ok) {
      const cleanErr = await extractErrorMessage(permissionRes, 'Spreadsheet created, but could not share it with the super admin');
      throw new Error(cleanErr);
    }
  }

  // Step 2: Write column headers to each sheet
  const dataUpdates = Object.entries(SHEET_SCHEMAS).map(([sheetName, headers]) => ({
    range: `'${sheetName}'!A1:${String.fromCharCode(64 + headers.length)}1`,
    values: [headers],
  }));

  // Also add initial super admin to 'User Access'
  dataUpdates.push({
    range: `'User Access'!A2:D2`,
    values: [[superAdminEmail, 'Admin', 'Active', new Date().toISOString().split('T')[0]]],
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataUpdates,
    }),
  });

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export async function initializeMissingSheets(spreadsheetId: string, token: string): Promise<string[]> {
  const metadata = await getSpreadsheetMetadata(spreadsheetId, token);
  const existingSheetTitles = new Set(metadata.sheets.map((s) => s.title));
  const missing = Object.keys(SHEET_SCHEMAS).filter((name) => !existingSheetTitles.has(name));

  if (missing.length === 0) {
    return [];
  }

  // Add missing sheets
  const addSheetRequests = missing.map((sheetTitle, idx) => ({
    addSheet: {
      properties: {
        title: sheetTitle,
        gridProperties: {
          rowCount: 100,
          columnCount: SHEET_SCHEMAS[sheetTitle].length + 2,
          frozenRowCount: 1,
        },
      },
    },
  }));

  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: addSheetRequests }),
  });

  if (!batchRes.ok) {
    const cleanErr = await extractErrorMessage(batchRes, 'Failed to create missing sheets');
    throw new Error(cleanErr);
  }

  // Populate headers for new sheets
  const headerUpdates = missing.map((sheetName) => {
    const headers = SHEET_SCHEMAS[sheetName];
    return {
      range: `'${sheetName}'!A1:${String.fromCharCode(64 + headers.length)}1`,
      values: [headers],
    };
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerUpdates,
    }),
  });

  return missing;
}

export async function readSheetRows(
  spreadsheetId: string,
  sheetName: string,
  token: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const range = `'${sheetName}'!A1:Z1000`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const cleanErr = await extractErrorMessage(res, `Failed to read sheet '${sheetName}'`);
    throw new Error(cleanErr);
  }

  const data = await res.json();
  const values: string[][] = data.values || [];

  if (values.length === 0) {
    return { headers: SHEET_SCHEMAS[sheetName] || [], rows: [] };
  }

  const headers = values[0];
  const rows = values.slice(1);
  return { headers, rows };
}

export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowValues: (string | number)[],
  token: string
): Promise<any> {
  const range = `'${sheetName}'!A:A`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!res.ok) {
    const cleanErr = await extractErrorMessage(res, `Failed to append row to '${sheetName}'`);
    throw new Error(cleanErr);
  }

  return await res.json();
}

export async function updateSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number, // 1-indexed (row 1 is header, so data starts at row 2)
  rowValues: (string | number)[],
  token: string
): Promise<any> {
  const lastColLetter = String.fromCharCode(64 + rowValues.length);
  const range = `'${sheetName}'!A${rowNumber}:${lastColLetter}${rowNumber}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!res.ok) {
    const cleanErr = await extractErrorMessage(res, `Failed to update row ${rowNumber} in '${sheetName}'`);
    throw new Error(cleanErr);
  }

  return await res.json();
}

/**
 * Upload an image file directly to Google Drive via multipart upload
 */
export async function uploadImageToDrive(
  base64Data: string,
  fileName: string,
  mimeType: string,
  token: string
): Promise<{ fileId: string; webViewLink?: string; thumbnailLink?: string }> {
  // Clean base64 string
  const cleanBase64 = base64Data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: mimeType || 'image/jpeg',
    description: 'Uploaded via Price Database Management System',
  };

  const multipartRequestBody = Buffer.concat([
    Buffer.from(
      delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'image/jpeg'}\r\n\r\n`
    ),
    buffer,
    Buffer.from(closeDelimiter),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const cleanErr = await extractErrorMessage(res, 'Failed to upload image to Google Drive');
    throw new Error(cleanErr);
  }

  const fileData = await res.json();

  // Make file publicly readable by anyone with link or within domain so image displays in web app
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Could not set anyone reader permission on file:', permErr);
  }

  return {
    fileId: fileData.id,
    webViewLink: fileData.webViewLink,
    thumbnailLink: `https://lh3.googleusercontent.com/d/${fileData.id}=s800`,
  };
}
