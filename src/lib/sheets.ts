import { getSheetsClient } from './google-auth.js';

export class SheetsDB {
  static get spreadsheetId() {
    return process.env.GOOGLE_SHEET_ID;
  }

  private static buildScriptGetUrl(scriptUrl: string, sheetName: string) {
    const params = new URLSearchParams({
      sheet: sheetName,
      _ts: Date.now().toString(),
    });
    return `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  private static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static formatDateForVerification(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(date);

    const day = parts.find(part => part.type === 'day')?.value || '';
    const month = parts.find(part => part.type === 'month')?.value || '';
    const year = parts.find(part => part.type === 'year')?.value || '';
    return day && month && year ? `${day}/${month}/${year}` : '';
  }

  private static normalizeForVerification(value: any) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return SheetsDB.formatDateForVerification(value);
    }

    const text = String(value ?? '').trim().replace(/\r\n/g, '\n');
    const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s.*)?$/);
    if (dmy) {
      return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
    }

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
    }

    const isoDate = text.match(/^\d{4}-\d{2}-\d{2}[T\s]/);
    if (isoDate) {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        return SheetsDB.formatDateForVerification(date);
      }
    }

    return text;
  }

  private static valuesMatchForVerification(expected: any, actual: any) {
    return SheetsDB.normalizeForVerification(expected) === SheetsDB.normalizeForVerification(actual);
  }

  private static columnToLetter(index: number) {
    let n = index + 1;
    let letters = '';
    while (n > 0) {
      const remainder = (n - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  private static buildAppendRow(headers: string[], data: any) {
    const row = headers.map((header: string) => data[header] !== undefined && data[header] !== '' ? data[header] : null);

    Object.keys(data).forEach(key => {
      if (!key.startsWith('__col_')) return;
      const idx = parseInt(key.replace('__col_', ''), 10);
      if (isNaN(idx)) return;
      while (row.length <= idx) row.push(null);
      row[idx] = data[key] !== undefined && data[key] !== '' ? data[key] : null;
    });

    return row;
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
      range: rangeOverride || `${sheetName}!A:CH`,
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
            const row = SheetsDB.buildAppendRow(headers, data);
            console.log(`[SheetsDB.addRow] Sheet: ${sheetName}`);
            console.log(`[SheetsDB.addRow] Payload Keys:`, Object.keys(data));
            console.log(`[SheetsDB.addRow] First 5 Headers:`, headers.slice(0, 5));
            console.log(`[SheetsDB.addRow] Generated Row (first 5):`, row.slice(0, 5));
            
            const params = new URLSearchParams();
            params.append('action', 'insert');
            params.append('sheetName', sheetName);
            params.append('rowData', JSON.stringify(row));
            
            const postController = new AbortController();
            const postTimeoutId = setTimeout(() => postController.abort(), 50000);
            const postResponse = await fetch(scriptUrl, {
              method: 'POST',
              body: params,
              signal: postController.signal
            });
            clearTimeout(postTimeoutId);

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
      range: `${sheetName}!A${rowNum}:CH${rowNum}`,
    });
    
    headers = response.data.values?.[0] || [];
    // Pass null instead of '' to avoid breaking ArrayFormulas
    const row = SheetsDB.buildAppendRow(headers, data);

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
          const fetchSheetRows = async () => {
            const getController = new AbortController();
            const getTimeoutId = setTimeout(() => getController.abort(), 30000);
            const getResponse = await fetch(SheetsDB.buildScriptGetUrl(scriptUrl, sheetName), {
              headers: { 'Cache-Control': 'no-cache' },
              signal: getController.signal
            });
            clearTimeout(getTimeoutId);

            if (!getResponse.ok) {
              throw new Error(`Google Apps Script returned status ${getResponse.status}`);
            }

            const getResult = await getResponse.json();
            if (!getResult.success || !getResult.data) throw new Error('Failed to fetch data for update');
            return getResult.data;
          };

          const resolveRow = async () => {
            const allRows = await fetchSheetRows();
            if (allRows.length <= headerRowIndex) throw new Error('Sheet is empty or missing headers');

            const headers = allRows[headerRowIndex];
            const idColIndex = headers.indexOf(idField);
            if (idColIndex === -1) throw new Error(`Id field ${idField} not found in headers`);

            const rowIndex0Based = allRows.findIndex((r: any[], i: number) => i > headerRowIndex && String(r[idColIndex]) === String(idValue));
            if (rowIndex0Based === -1) throw new Error(`Row with ${idField}=${idValue} not found`);

            return {
              headers,
              row: allRows[rowIndex0Based] || [],
              rowIndex1Based: rowIndex0Based + 1,
            };
          };

          const resolved = await resolveRow();
          const headers = resolved.headers;
          
          const cellUpdates = new Map<number, any>();
          const formulaColumns = new Set([15, 23, 32, 59, 73]);
          const matchedKeys: string[] = [];
          const skippedKeys: string[] = [];
          const unmatchedKeys: string[] = [];

          for (const key of Object.keys(data)) {
            let colIndex = headers.indexOf(key);
            if (key.startsWith('__col_')) {
              const idx = parseInt(key.replace('__col_', ''), 10);
              if (!isNaN(idx)) colIndex = idx;
            }
            
            if (colIndex !== -1) {
              if (formulaColumns.has(colIndex)) continue;
              const nextValue = data[key] == null ? '' : String(data[key]);
              const currentValue = resolved.row[colIndex] ?? '';
              if (SheetsDB.valuesMatchForVerification(nextValue, currentValue)) {
                skippedKeys.push(`${key}->col${colIndex}`);
                continue;
              }
              cellUpdates.set(colIndex, nextValue);
              matchedKeys.push(`${key}->col${colIndex}`);
            } else {
              unmatchedKeys.push(key);
            }
          }

          console.log(`[SheetsDB.updateRow] ${idValue} in ${sheetName}: ${cellUpdates.size} changed cells to update. Matched: [${matchedKeys.join(', ')}]. Skipped unchanged: [${skippedKeys.join(', ')}]. Unmatched: [${unmatchedKeys.join(', ')}]`);

          if (cellUpdates.size === 0) {
            if (matchedKeys.length > 0 || skippedKeys.length > 0) {
              console.log(`[SheetsDB.updateRow] ${idValue} in ${sheetName}: no sheet changes needed`);
              return;
            }
            console.error(`[SheetsDB.updateRow] ZERO cells matched for ${idValue}! Data keys: [${Object.keys(data).join(', ')}]. First 10 headers: [${headers.slice(0, 10).join(', ')}]`);
            throw new Error(`No matching sheet columns found for update of ${idValue} in ${sheetName}`);
          }

          const writeCells = async (updates: Map<number, any>, rowIndex1Based: number, label: string) => {
            let successCount = 0;
            const failedCells: number[] = [];

            for (const [colIndex, value] of Array.from(updates)) {
              let lastErr: any = null;
              let success = false;

              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  const params = new URLSearchParams();
                  params.append('action', 'updateCell');
                  params.append('sheetName', sheetName);
                  params.append('rowIndex', rowIndex1Based.toString());
                  params.append('columnIndex', String(colIndex + 1));
                  params.append('value', value);

                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 30000);
                  const postResponse = await fetch(scriptUrl, {
                    method: 'POST',
                    body: params,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    signal: controller.signal
                  });
                  clearTimeout(timeoutId);

                  if (!postResponse.ok) {
                    throw new Error(`Update cell failed with status ${postResponse.status}`);
                  }

                  const result = await postResponse.json();
                  if (!result.success) throw new Error(result.error || 'Update cell failed via App Script');

                  success = true;
                  successCount++;
                  break;
                } catch (retryErr: any) {
                  lastErr = retryErr;
                  console.warn(`[SheetsDB.updateRow] ${label} cell col=${colIndex} attempt ${attempt}/3 failed: ${retryErr.message}`);
                  if (attempt < 3) await SheetsDB.delay(attempt * 1000);
                }
              }

              if (!success) {
                failedCells.push(colIndex);
                console.error(`[SheetsDB.updateRow] ${label} cell col=${colIndex} FAILED after 3 attempts: ${lastErr?.message}`);
              }

              if (updates.size > 1) await SheetsDB.delay(200);
            }

            if (failedCells.length > 0) {
              throw new Error(`Failed to update ${failedCells.length}/${updates.size} cells (columns: ${failedCells.join(', ')}) for ${idValue} in ${sheetName}`);
            }

            return successCount;
          };

          const verifyCells = async () => {
            const latest = await resolveRow();
            const mismatches = new Map<number, any>();
            const details: string[] = [];

            for (const [colIndex, expected] of Array.from(cellUpdates)) {
              const actual = latest.row[colIndex] ?? '';
              if (!SheetsDB.valuesMatchForVerification(expected, actual)) {
                mismatches.set(colIndex, expected);
                details.push(`col${colIndex}: expected="${expected}" actual="${actual}"`);
              }
            }

            return { mismatches, details, rowIndex1Based: latest.rowIndex1Based };
          };

          const initialCount = await writeCells(cellUpdates, resolved.rowIndex1Based, 'write');
          let verification = await verifyCells();

          for (let verifyAttempt = 1; verification.mismatches.size > 0 && verifyAttempt <= 3; verifyAttempt++) {
            console.warn(`[SheetsDB.updateRow] Verification mismatch for ${idValue} in ${sheetName}, retry ${verifyAttempt}/3: ${verification.details.join('; ')}`);
            await SheetsDB.delay(verifyAttempt * 750);
            await writeCells(verification.mismatches, verification.rowIndex1Based, `verify-retry-${verifyAttempt}`);
            verification = await verifyCells();
          }

          if (verification.mismatches.size > 0) {
            throw new Error(`Sheet verification failed after update for ${idValue} in ${sheetName}: ${verification.details.join('; ')}`);
          }

          console.log(`[SheetsDB.updateRow] Successfully updated and verified ${initialCount} cells for ${idValue} in ${sheetName} via App Script`);
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
    const formulaColumns = new Set([15, 23, 32, 59, 73]);

    const resolveRow = async () => {
      const allRows = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:CH`,
      });

      const rows = allRows.data.values || [];
      const headers = rows[headerRowIndex] || [];
      const idIndex = headers.indexOf(idField);

      if (idIndex === -1) throw new Error(`Field ${idField} not found`);

      const rowIndex = rows.findIndex((row, idx) => idx > headerRowIndex && row[idIndex] === idValue);
      if (rowIndex === -1) throw new Error(`Row with ${idField}=${idValue} not found`);

      return { headers, row: rows[rowIndex] || [], rowNumber: rowIndex + 1 };
    };

    const resolved = await resolveRow();
    const cellUpdates = new Map<number, any>();
    const matchedKeys: string[] = [];
    const skippedKeys: string[] = [];
    const unmatchedKeys: string[] = [];

    for (const key of Object.keys(data)) {
      let colIndex = resolved.headers.indexOf(key);
      if (key.startsWith('__col_')) {
        const idx = parseInt(key.replace('__col_', ''), 10);
        if (!isNaN(idx)) colIndex = idx;
      }

      if (colIndex !== -1) {
        if (formulaColumns.has(colIndex)) continue;
        const nextValue = data[key] == null ? '' : String(data[key]);
        const currentValue = resolved.row[colIndex] ?? '';
        if (SheetsDB.valuesMatchForVerification(nextValue, currentValue)) {
          skippedKeys.push(`${key}->col${colIndex}`);
          continue;
        }
        cellUpdates.set(colIndex, nextValue);
        matchedKeys.push(`${key}->col${colIndex}`);
      } else {
        unmatchedKeys.push(key);
      }
    }

    console.log(`[SheetsDB.updateRow] ${idValue} in ${sheetName}: ${cellUpdates.size} changed direct cells to update. Matched: [${matchedKeys.join(', ')}]. Skipped unchanged: [${skippedKeys.join(', ')}]. Unmatched: [${unmatchedKeys.join(', ')}]`);

    if (cellUpdates.size === 0) {
      if (matchedKeys.length > 0 || skippedKeys.length > 0) {
        console.log(`[SheetsDB.updateRow] ${idValue} in ${sheetName}: no direct sheet changes needed`);
        return;
      }
      throw new Error(`No matching sheet columns found for update of ${idValue} in ${sheetName}`);
    }

    const writeCells = async (updates: Map<number, any>, rowNumber: number) => {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: Array.from(updates).map(([colIndex, value]) => ({
            range: `${sheetName}!${SheetsDB.columnToLetter(colIndex)}${rowNumber}`,
            values: [[value]],
          })),
        },
      });
    };

    const verifyCells = async () => {
      const latest = await resolveRow();
      const mismatches = new Map<number, any>();
      const details: string[] = [];

      for (const [colIndex, expected] of Array.from(cellUpdates)) {
        const actual = latest.row[colIndex] ?? '';
        if (!SheetsDB.valuesMatchForVerification(expected, actual)) {
          mismatches.set(colIndex, expected);
          details.push(`col${colIndex}: expected="${expected}" actual="${actual}"`);
        }
      }

      return { mismatches, details, rowNumber: latest.rowNumber };
    };

    await writeCells(cellUpdates, resolved.rowNumber);
    let verification = await verifyCells();

    for (let verifyAttempt = 1; verification.mismatches.size > 0 && verifyAttempt <= 3; verifyAttempt++) {
      console.warn(`[SheetsDB.updateRow] Direct verification mismatch for ${idValue} in ${sheetName}, retry ${verifyAttempt}/3: ${verification.details.join('; ')}`);
      await SheetsDB.delay(verifyAttempt * 750);
      await writeCells(verification.mismatches, verification.rowNumber);
      verification = await verifyCells();
    }

    if (verification.mismatches.size > 0) {
      throw new Error(`Direct sheet verification failed after update for ${idValue} in ${sheetName}: ${verification.details.join('; ')}`);
    }

    console.log(`[SheetsDB.updateRow] Successfully updated and verified ${cellUpdates.size} cells for ${idValue} in ${sheetName} via direct API`);
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
      range: `${sheetName}!A:CH`,
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
