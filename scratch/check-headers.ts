import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const e = await SheetsDB.getRows('Entry Data');
  const f = await SheetsDB.getRows('NEW_FMS', undefined, 5);
  
  console.log('Entry Data rogue rows:', e.filter(r => r.Id === 'Id' || r['Party Name'] === 'Party Name'));
  console.log('NEW_FMS rogue rows:', f.filter(r => r.Id === 'Id' || r['Party Name'] === 'Party Name'));
}
main();
