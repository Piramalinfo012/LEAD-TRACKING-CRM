import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const f = await SheetsDB.getRows('NEW_FMS', undefined, 5);
  console.log('First lead sales person:', f[0]['Sales Person Name']);
  const m = await SheetsDB.getRows('Entry Data');
  console.log('Main lead sales person:', m[0]['Sales Person Name']);
}
main();
