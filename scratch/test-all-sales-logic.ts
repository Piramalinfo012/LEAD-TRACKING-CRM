import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const rawMain = await SheetsDB.getRows('Entry Data');
  const mainLeads = rawMain.filter((r: any) => (r['Party Name'] || r['Id']) && String(r['Id']).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => ({ id: l['Id'], owner_id: l['Sales Person Name'] || 'SYSTEM', sales_person_name: l['Sales Person Name'] || '' }));
  
  const fmsRows = await SheetsDB.getRows('NEW_FMS', undefined, 5);
  const fmsLeads = fmsRows.filter((r: any) => (r.Id || r['Party Name']) && String(r.Id).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => ({ id: l['Id'], owner_id: l['Sales Person Name'] || 'SYSTEM_FMS', sales_person_name: l['Sales Person Name'] || '' }));
  
  const leads = [...mainLeads, ...fmsLeads];
  
  const users = await SheetsDB.getRows('Login');
  const sales = users.filter((u: any) => String(u.ROLE || u.role).toLowerCase() === 'sales');
  
  sales.forEach((u: any) => {
      const id = u.ID || u.employee_id;
      const employee_id = u.ID || u.employee_id;
      const name = u['USER NAME'] || u.name;
      const userId = id || employee_id;
      const userName = name || '';
      
      const filtered = leads.filter((l: any) => {
          const isOwner = l.owner_id === userId || l.owner_id === employee_id || l.owner_id === id;
          const isNamedSales = l.sales_person_name && userName && l.sales_person_name.toLowerCase().trim() === userName.toLowerCase().trim();
          return isOwner || isNamedSales;
      });
      console.log(userName + ' total leads: ' + filtered.length);
  });
}
main();
