import fetch from 'node-fetch';

async function check() {
  const r = await fetch("https://script.google.com/macros/s/AKfycbzq0nfpvlxfSQ9TqM8Q_NtI7lFY1-yOW1HDcChY2k1nu1Bph0pJLnnq65j5r_aLuDfw/exec?sheet=NEW_FMS");
  const data = await r.json();
  const headers = data.data[5]; // 0-based index 5 = row 6
  
  const indices = [15, 16, 23, 24, 32, 33, 46, 47, 59, 60];
  console.log("HEADERS WE NEED:");
  indices.forEach(i => {
    // A=0, B=1...
    // 26=AA, 27=AB
    const letter = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
    console.log(`[${i}] ${letter} = ${headers[i]}`);
  });
}
check();
