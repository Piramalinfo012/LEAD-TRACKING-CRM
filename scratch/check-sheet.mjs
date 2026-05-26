import fetch from 'node-fetch';

async function check() {
  const r = await fetch("https://script.google.com/macros/s/AKfycbzq0nfpvlxfSQ9TqM8Q_NtI7lFY1-yOW1HDcChY2k1nu1Bph0pJLnnq65j5r_aLuDfw/exec?sheet=NEW_FMS");
  const data = await r.json();
  const headers = data.data[5]; // 0-based index 5 = row 6
  const row1426 = data.data[1425]; // 0-based index 1425 = row 1426

  console.log("HEADERS 23-30:");
  for(let i=23; i<=30; i++) {
    console.log(`[${i}] ${headers[i]} = ${row1426 ? row1426[i] : 'ROW_NOT_FOUND'}`);
  }
}
check();
