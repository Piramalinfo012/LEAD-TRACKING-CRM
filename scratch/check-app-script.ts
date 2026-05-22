import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAppScript() {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!scriptUrl) return console.log('No URL');
  
  const getResponse = await fetch(`${scriptUrl}?sheet=Entry Data`);
  const getResult = await getResponse.json();
  console.log('Result:', getResult);
}

checkAppScript();
