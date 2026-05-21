import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function test() {
  console.log('Testing full fetch...');
  const start = Date.now();
  
  try {
    console.log('Fetching Entry Data...');
    const entryData = await SheetsDB.getRows('Entry Data');
    console.log(`Fetched Entry Data: ${entryData.length} rows in ${((Date.now() - start) / 1000).toFixed(2)}s`);
  } catch (e: any) {
    console.error('Entry Data error:', e.message);
  }

  const fmsStart = Date.now();
  try {
    console.log('Fetching NEW_FMS...');
    const fmsData = await SheetsDB.getRows('NEW_FMS', undefined, 5);
    console.log(`Fetched NEW_FMS: ${fmsData.length} rows in ${((Date.now() - fmsStart) / 1000).toFixed(2)}s`);
  } catch (e: any) {
    console.error('NEW_FMS error:', e.message);
  }

  console.log(`Total duration: ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

test().catch(console.error);
