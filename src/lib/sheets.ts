import { getSheetsClient } from './google-auth';

export class SheetsDB {
  static get spreadsheetId() {
    return process.env.GOOGLE_SHEET_ID;
  }

  static async getRows(sheetName: string, rangeOverride?: string, headerRowIndex: number = 0) {
    const spreadsheetId = this.spreadsheetId;
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

    // Preference: Use Google Apps Script if URL is provided
    if (scriptUrl && !rangeOverride) {
      try {
        const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`);
        
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
            });
            return obj;
          });
        }
      } catch (e: any) {
        console.error('App Script fetch failed:', e.message);
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
      range: rangeOverride || `${sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const headers = rows[headerRowIndex];
    if (!headers) return [];
    
    return rows.slice(headerRowIndex + 1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  }

  static async addRow(sheetName: string, data: any) {
    const spreadsheetId = this.spreadsheetId;
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

    let headers: string[] = [];

    if (scriptUrl) {
      try {
        const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`);
        
        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Google Apps Script returned non-JSON response when checking headers');
        }

        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          headers = result.data[0];
          
          if (headers.length > 0) {
            const row = headers.map(header => data[header] || '');
            const params = new URLSearchParams();
            params.append('action', 'insert');
            params.append('sheetName', sheetName);
            params.append('rowData', JSON.stringify(row));
            
            const postResponse = await fetch(scriptUrl, {
              method: 'POST',
              body: params
            });

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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    
    headers = response.data.values?.[0] || [];
    const row = headers.map(header => data[header] || '');

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  }

  static async updateRow(sheetName: string, idField: string, idValue: string, data: any) {
    const spreadsheetId = this.spreadsheetId;
    if (!spreadsheetId) {
      console.warn('Spreadsheet ID missing, cannot use direct API');
      return;
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('Google Service Account email missing, cannot use direct API');
      return;
    }

    const sheets = await getSheetsClient();
    const allRows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = allRows.data.values || [];
    const headers = rows[0];
    const idIndex = headers.indexOf(idField);
    
    if (idIndex === -1) throw new Error(`Field ${idField} not found`);

    const rowIndex = rows.findIndex(row => row[idIndex] === idValue);
    if (rowIndex === -1) throw new Error(`Row with ${idField}=${idValue} not found`);

    const updatedRow = headers.map((header, index) => {
        return data[header] !== undefined ? data[header] : rows[rowIndex][index];
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });
  }
}
