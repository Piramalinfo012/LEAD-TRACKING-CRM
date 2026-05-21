import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const rawMain = await SheetsDB.getRows('Entry Data');
  const mainLeads = rawMain.filter((r: any) => (r['Party Name'] || r['Id']) && String(r['Id']).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => ({ id: l['Id'], owner_id: l['Sales Person Name'] || 'SYSTEM', sales_person_name: l['Sales Person Name'] || '' }));
  
  const sales = ['Atul Baghmar', 'Awantika Tiwari', 'Bhushan Singh Chouhan', 'Brejesh Verma', 'Neha Garg', 'Pradeep Kumar', 'Anas Siddique', 'Vivek Yadav', 'jaspreet Singh'];
  
  sales.forEach((userName: any) => {
      const filtered = mainLeads.filter((l: any) => {
          const isOwner = l.owner_id === userName;
          const isNamedSales = l.sales_person_name && userName && l.sales_person_name.toLowerCase().trim() === userName.toLowerCase().trim();
          return isOwner || isNamedSales;
      });
      console.log(userName + ' leads: ' + filtered.length);
  });
}
main();
