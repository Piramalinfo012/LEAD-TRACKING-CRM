import fetch from 'node-fetch';

async function check() {
  const r = await fetch("https://script.google.com/macros/s/AKfycbzq0nfpvlxfSQ9TqM8Q_NtI7lFY1-yOW1HDcChY2k1nu1Bph0pJLnnq65j5r_aLuDfw/exec?sheet=Master");
  const data = await r.json();
  const headers = data.data[0]; 
  
  console.log("HEADERS:");
  headers.forEach((h, i) => console.log(`[${i}] ${h}`));

  const firstRow = data.data[1];
  console.log("FIRST ROW:");
  firstRow.forEach((h, i) => console.log(`[${i}] ${h}`));
}
check();
