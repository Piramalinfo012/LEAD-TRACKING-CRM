import 'dotenv/config';

async function test() {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) return console.error('No script URL');
  
  console.log('Testing with range...');
  const start = Date.now();
  const res = await fetch(`${scriptUrl}?sheet=NEW_FMS&range=A1:Z1500`);
  const json: any = await res.json();
  
  console.log('Success:', json.success);
  if (json.success) {
    console.log('Data length:', json.data.length);
    console.log('Duration:', ((Date.now() - start) / 1000).toFixed(2) + 's');
  }
}

test().catch(console.error);
