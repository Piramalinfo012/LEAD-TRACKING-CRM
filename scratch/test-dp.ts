import { config } from 'dotenv';
config();
import { SheetsDB } from '../src/lib/sheets';

async function testUpdate() {
  try {
    console.log('Testing SheetsDB.updateRow...');
    await SheetsDB.updateRow('Login', 'ID', 'Admin', { 'PROFILE URL': 'https://example.com/test.jpg' });
    console.log('Update successful!');
  } catch (err: any) {
    console.error('Update failed:', err.message);
  }
}

testUpdate();
