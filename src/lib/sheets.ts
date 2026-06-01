import { getSheetsClient } from './google-auth.js';

export class SheetsDB {
  static get spreadsheetId() {
    return process.env.GOOGLE_SHEET_ID;
  }

  static async getRows(sheetName: string, rangeOverride?: string, headerRowIndex: number = 0, timeoutMs: number = 50000) {
    const spreadsheetId = this.spreadsheetId;
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();

    // Preference: Use Google Apps Script if URL is provided
    if (scriptUrl && !rangeOverride) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs); // Custom timeout to handle Vercel limits
        const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
            throw new Error('Google Apps Script returned HTML instead of JSON. Ensure the script is deployed as a Web App with access set to "Anyone".');
          }
          throw new Error('Google Apps Script returned non-JSON response');
        }

        const result = await response.json();
        if (result.success) {
          const rows = result.data || [];
          if (rows.length === 0) return [];
          const headers = rows[headerRowIndex];
          return rows.slice(headerRowIndex + 1).map((row: any) => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
              obj[`__col_${index}`] = row[index];
            });
            return obj;
          });
        } else {
          throw new Error('Google Apps Script returned success: false. Error: ' + result.error);
        }
      } catch (e: any) {
        console.error('App Script fetch failed:', e.message);
        throw e; // Propagate the error so the caller knows it failed
      }
    }

    if (!spreadsheetId) {
      console.warn('Spreadsheet ID missing, returning empty array');
      return [];
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('Google Service Account email missing, cannot use direct API');
      return [];
    }
    
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeOverride || `${sheetName}!A:CE`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const headers = rows[headerRowIndex];
    if (!headers) return [];
    
    return rows.slice(headerRowIndex + 1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
        obj[`__col_${index}`] = row[index];
      });
      return obj;
    });
  }

  static async addRow(sheetName: string, data: any, headerRowIndex: number = 0) {
    const spreadsheetId = this.spreadsheetId;
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();

    let headers: string[] = [];

    if (scriptUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000);
        const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Google Apps Script returned non-JSON response when checking headers');
        }

        const result = await response.json();
        if (result.success && result.data && result.data.length > headerRowIndex) {
          headers = result.data[headerRowIndex];
          
          if (headers.length > 0) {
            // Pass null instead of '' to avoid breaking ArrayFormulas when appending rows
            const row = headers.map((header: string) => data[header] !== undefined && data[header] !== '' ? data[header] : null);
            console.log(`[SheetsDB.addRow] Sheet: ${sheetName}`);
            console.log(`[SheetsDB.addRow] Payload Keys:`, Object.keys(data));
            console.log(`[SheetsDB.addRow] First 5 Headers:`, headers.slice(0, 5));
            console.log(`[SheetsDB.addRow] Generated Row (first 5):`, row.slice(0, 5));
            
            const params = new URLSearchParams();
            params.append('action', 'insert');
            params.append('sheetName', sheetName);
            params.append('rowData', JSON.stringify(row));
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 50000);
            const postResponse = await fetch(scriptUrl, {
              method: 'POST',
              body: params,
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!postResponse.ok) {
              throw new Error(`Google Apps Script POST failed with status ${postResponse.status}`);
            }

            const postContentType = postResponse.headers.get('content-type');
            if (!postContentType || !postContentType.includes('application/json')) {
              throw new Error('Google Apps Script POST returned non-JSON response');
            }

            const postResult = await postResponse.json();
            if (postResult.success) return;
          }
        }
      } catch (e: any) {
        console.error('App Script addRow failed, falling back to direct API:', e.message);
      }
    }

    if (!spreadsheetId) {
      console.warn('Spreadsheet ID missing, cannot use direct API');
      return;
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('Google Service Account email missing, cannot use direct API');
      return;
    }

    const sheets = await getSheetsClient();
    
    // Get headers first to preserve order
    const rowNum = headerRowIndex + 1;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A${rowNum}:CE${rowNum}`,
    });
    
    headers = response.data.values?.[0] || [];
    // Pass null instead of '' to avoid breaking ArrayFormulas
    const row = headers.map(header => data[header] !== undefined && data[header] !== '' ? data[header] : null);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  }

  static async updateRow(sheetName: string, idField: string, idValue: string, data: any, headerRowIndex: number = 0) {
    const spreadsheetId = this.spreadsheetId;
    
    // Check if we need to use App Script Fallback
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
      if (scriptUrl) {
        try {
          // 1. Fetch all rows to find the rowIndex and construct the updated array
          const getResponse = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`);
          const getResult = await getResponse.json();
          
          if (!getResult.success || !getResult.data) throw new Error('Failed to fetch data for update');
          
          const allRows = getResult.data;
          if (allRows.length <= headerRowIndex) throw new Error('Sheet is empty or missing headers');
          
          const headers = allRows[headerRowIndex];
          const idColIndex = headers.indexOf(idField);
          if (idColIndex === -1) throw new Error(`Id field ${idField} not found in headers`);
          
          const rowIndex0Based = allRows.findIndex((r: any[], i: number) => i > headerRowIndex && String(r[idColIndex]) === String(idValue));
          if (rowIndex0Based === -1) throw new Error(`Row with ${idField}=${idValue} not found`);
          
          const existingRow = allRows[rowIndex0Based];
          
          // Construct the full rowData array
          // The App Script will read `rowData.length` columns, so we need to pass an array
          // that is at least as long as the headers length.
          const newRowData = [...existingRow].map((val, idx) => {
            // Explicitly clear formula columns so ArrayFormula can expand
            const header = headers[idx];
            if (header === 'Lead Planned Date' || header === '__col_15' || 
                header === 'Meeting Planned' || header === 'Meeting Planned Date' || header === '__col_23') {
              return null;
            }
            
            // doGet converts Date objects to ISO strings. Convert them back to DD/MM/YYYY before saving.
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(val)) {
              const d = new Date(val);
              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            }
            return val;
          });
          
          // Pad array if necessary
          while (newRowData.length < headers.length) newRowData.push('');
          
          for (const key of Object.keys(data)) {
            let colIndex = headers.indexOf(key);
            if (key.startsWith('__col_')) {
              const idx = parseInt(key.replace('__col_', ''), 10);
              if (!isNaN(idx)) colIndex = idx;
            }
            
            if (colIndex !== -1) {
              // Expand newRowData if colIndex is beyond current length
              while (newRowData.length <= colIndex) newRowData.push('');
              newRowData[colIndex] = data[key];
            }
          }
          
          // 2. Call the 'update' action with the 1-based rowIndex
          const rowIndex1Based = rowIndex0Based + 1;
          const params = new URLSearchParams();
          params.append('action', 'update');
          params.append('sheetName', sheetName);
          params.append('rowIndex', rowIndex1Based.toString());
          params.append('rowData', JSON.stringify(newRowData));

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const postResponse = await fetch(scriptUrl, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const result = await postResponse.json();
          if (!result.success) throw new Error(result.error || 'Update failed via App Script');
          console.log(`[SheetsDB.updateRow] Successfully updated ${idValue} in ${sheetName} via App Script`);
          return;
        } catch (e: any) {
          console.error('[SheetsDB.updateRow] App Script fallback failed:', e.message);
          throw e; // Throw so server.ts can catch it
        }
      } else {
        console.warn('No GOOGLE_SERVICE_ACCOUNT_EMAIL and no GOOGLE_SCRIPT_URL. Cannot update.');
        return;
      }
    }

    if (!spreadsheetId) {
      console.warn('Spreadsheet ID missing, cannot use direct API');
      return;
    }

    const sheets = await getSheetsClient();
    const allRows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:CE`,
    });

    const rows = allRows.data.values || [];
    const headers = rows[headerRowIndex] || [];
    const idIndex = headers.indexOf(idField);
    
    if (idIndex === -1) throw new Error(`Field ${idField} not found`);

    const rowIndex = rows.findIndex((row, idx) => idx > headerRowIndex && row[idIndex] === idValue);
    if (rowIndex === -1) throw new Error(`Row with ${idField}=${idValue} not found`);

    const updatedRow = headers.map((header, index) => {
        return data[header] !== undefined ? data[header] : rows[rowIndex][index];
    });

    for (const key of Object.keys(data)) {
      if (!key.startsWith('__col_')) continue;

      const colIndex = parseInt(key.replace('__col_', ''), 10);
      if (isNaN(colIndex)) continue;

      while (updatedRow.length <= colIndex) updatedRow.push('');
      updatedRow[colIndex] = data[key];
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });
  }

  static async deleteRow(sheetName: string, idField: string, idValue: string, headerRowIndex: number = 0) {
    const spreadsheetId = this.spreadsheetId;
    
    // Check if we need to use App Script Fallback
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
      if (scriptUrl) {
        try {
          // 1. Fetch all rows to find the rowIndex
          const getResponse = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`);
          const getResult = await getResponse.json();
          
          if (!getResult.success || !getResult.data) throw new Error('Failed to fetch data for delete');
          
          const allRows = getResult.data;
          if (allRows.length <= headerRowIndex) throw new Error('Sheet is empty or missing headers');
          
          const headers = allRows[headerRowIndex];
          const idColIndex = headers.indexOf(idField);
          if (idColIndex === -1) throw new Error(`Id field ${idField} not found in headers`);
          
          const rowIndex0Based = allRows.findIndex((r: any[], i: number) => i > headerRowIndex && String(r[idColIndex]) === String(idValue));
          if (rowIndex0Based === -1) throw new Error(`Row with ${idField}=${idValue} not found`);
          
          // 2. Call the 'delete' action with the 1-based rowIndex
          const rowIndex1Based = rowIndex0Based + 1;
          const params = new URLSearchParams();
          params.append('action', 'delete');
          params.append('sheetName', sheetName);
          params.append('rowIndex', rowIndex1Based.toString());

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const postResponse = await fetch(scriptUrl, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const result = await postResponse.json();
          if (!result.success) throw new Error(result.error || 'Delete failed via App Script');
          console.log(`[SheetsDB.deleteRow] Successfully deleted ${idValue} in ${sheetName} via App Script`);
          return;
        } catch (e: any) {
          console.error('[SheetsDB.deleteRow] App Script fallback failed:', e.message);
          throw e; // Throw so server.ts can catch it
        }
      } else {
        console.warn('No GOOGLE_SERVICE_ACCOUNT_EMAIL and no GOOGLE_SCRIPT_URL. Cannot delete.');
        return;
      }
    }

    if (!spreadsheetId) return;

    const sheets = await getSheetsClient();
    
    const allRows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:CE`,
    });

    const rows = allRows.data.values || [];
    if (rows.length === 0) return;
    
    const headers = rows[headerRowIndex] || [];
    const idIndex = headers.indexOf(idField);
    if (idIndex === -1) throw new Error(`Field ${idField} not found`);

    const rowIndex = rows.findIndex((row, idx) => idx > headerRowIndex && row[idIndex] === idValue);
    if (rowIndex === -1) throw new Error(`Row with ${idField}=${idValue} not found`);

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheetInfo.data.sheets?.find(s => s.properties?.title === sheetName);
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) throw new Error(`Sheet ${sheetName} not found`);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              }
            }
          }
        ]
      }
    });
  }
}

