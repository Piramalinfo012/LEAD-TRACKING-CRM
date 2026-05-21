import 'dotenv/config';
import { SheetsDB } from '../src/lib/sheets.js';

async function main() {
  const users = await SheetsDB.getRows('Login');
  console.log('First user:', users[0]);
  console.log('User names mapping check:');
  users.forEach((u: any) => {
      console.log(`- ID: ${u.ID || u.id}, Gmail: ${u.Gmail || u.email}, USER NAME: ${u['USER NAME'] || u.name}, ROLE: ${u.ROLE || u.role}, Employee_ID: ${u.employee_id}`);
  });
}
main();
