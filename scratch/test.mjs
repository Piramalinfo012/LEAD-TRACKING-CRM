import fs from 'fs';
fetch("https://script.google.com/macros/s/AKfycbzq0nfpvlxfSQ9TqM8Q_NtI7lFY1-yOW1HDcChY2k1nu1Bph0pJLnnq65j5r_aLuDfw/exec?sheet=NEW_FMS")
  .then(r => r.json())
  .then(data => {
     // Row 6 is headerRowIndex = 5 (since 0-based is 5)
     console.log("HEADERS:", data.data[5]);
  });
