import { SheetsDB } from './src/lib/sheets.js';
import dotenv from 'dotenv';
dotenv.config();

async function testQuickAccess() {
  try {
    const rows = await SheetsDB.getRows('Quick Access', undefined, 0, 5000);
    console.log(`Quick Access rows:`, rows.length);
    if (rows.length > 0) {
      console.log('First row keys:', Object.keys(rows[0]).filter(k => !k.startsWith('__col_')));
      console.log('First row data:', rows[0]);
    }
  } catch(e) {
    console.error(e);
  }
}
testQuickAccess();
