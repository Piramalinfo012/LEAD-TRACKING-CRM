import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function test() {
  console.log('Fetching NEW_FMS rows...');
  const rows = await SheetsDB.getRows('NEW_FMS', undefined, 5);
  console.log('Total rows fetched:', rows.length);
  
  const validRows = rows.filter((r: any) => r.Id || r['Party Name'] || r['Person Name'] || r['Mobile No. '] || r['Mobile No.']);
  console.log('Valid rows with actual lead data:', validRows.length);
  
  if (validRows.length > 0) {
    console.log('First valid row:', validRows[0]);
    console.log('Last valid row:', validRows[validRows.length - 1]);
  }
}

test().catch(console.error);
