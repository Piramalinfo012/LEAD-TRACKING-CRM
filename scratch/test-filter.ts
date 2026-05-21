import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const rawMain = await SheetsDB.getRows('Entry Data');
  const fmsRows = await SheetsDB.getRows('NEW_FMS', undefined, 5);
  
  const mainLeads = rawMain.filter((r: any) => (r['Party Name'] || r['Id']) && String(r['Id']).trim() !== 'Id' && String(r['Party Name']).trim() !== 'Party Name');
  const fmsLeads = fmsRows.filter((r: any) => (r.Id || r['Party Name']) && String(r.Id).trim() !== 'Id' && String(r['Party Name']).trim() !== 'Party Name');
  
  console.log('mainLeads with Id="Id":', mainLeads.filter((r: any) => r.Id === 'Id' || r['Party Name'] === 'Party Name'));
  console.log('fmsLeads with Id="Id":', fmsLeads.filter((r: any) => r.Id === 'Id' || r['Party Name'] === 'Party Name'));
}
main();
