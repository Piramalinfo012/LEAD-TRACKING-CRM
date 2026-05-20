import 'dotenv/config'; import { SheetsDB } from '../src/lib/sheets.js'; async function test() { const rows = await SheetsDB.getRows('Login'); console.log(rows); } test().catch(console.error);
