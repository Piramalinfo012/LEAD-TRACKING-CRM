import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const rawMain = await SheetsDB.getRows('Entry Data');
  const mainLeads = rawMain.filter((r: any) => (r['Party Name'] || r['Id']) && String(r['Id']).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => ({ id: l['Id'], owner_id: l['Sales Person Name'] || 'SYSTEM', sales_person_name: l['Sales Person Name'] || '' }));
  
  const userId = 'Atul Baghmar';
  const userName = 'Atul Baghmar';
  
  const filtered = mainLeads.filter((l: any) => {
      const isOwner = l.owner_id === userId;
      const isNamedSales = l.sales_person_name && userName && l.sales_person_name.toLowerCase().trim() === userName.toLowerCase().trim();
      return isOwner || isNamedSales;
  });
  
  console.log('Total leads:', mainLeads.length);
  console.log('Filtered Leads for Atul Baghmar:', filtered.length);
}
main();
