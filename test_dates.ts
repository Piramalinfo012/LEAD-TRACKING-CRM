import { SheetsDB } from './src/lib/sheets';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const rows = await SheetsDB.getRows('NEW_FMS', undefined, 5, 8000);
  const lastRows = rows.slice(-5);
  console.log("Last 5 rows from Google Sheet NEW_FMS:");
  lastRows.forEach((r: any) => {
    console.log(`Id: ${r.Id}, Party: ${r['Party Name']}, Timestamp: ${r.Timestamp}, __col_0: ${r.__col_0}, FollowUp: ${r['Follow Up date']}, __col_13: ${r.__col_13}, keys: ${Object.keys(r).filter(k => k.includes('col') || k.includes('Time') || k.includes('Follow')).join(', ')}`);
  });
}
run();
