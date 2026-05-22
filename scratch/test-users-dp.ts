import { config } from 'dotenv';
config();
import { SheetsDB } from '../src/lib/sheets';

async function test() {
  const users = await SheetsDB.getRows('Login');
  console.log(users.map(u => ({ name: u['USER NAME'], dp: u['PROFILE URL'] })));
}
test();
