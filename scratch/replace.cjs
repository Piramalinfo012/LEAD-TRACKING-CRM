const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Remove rawMain from Promise.all
content = content.replace(
  /      const \[rawMain, fmsRows, deletedRows\] = await Promise\.all\(\[[\s\S]*?\n      \]\);/,
  `      const [fmsRows, deletedRows] = await Promise.all([
        SheetsDB.getRows('NEW_FMS', undefined, 5, 25000).catch(err => {
          console.error('NEW_FMS fetch failed during cache refresh:', err.message);
          throw err; // Throw error so we don't wipe out the cache with an empty array!
        }),
        SheetsDB.getRows('Deleted', undefined, 0, 25000).catch(err => {
          console.warn('Deleted sheet fetch failed during cache refresh:', err.message || err);
          return [];
        })
      ]);`
);

// 2. Remove mainLeads map
content = content.replace(
  /      const mainLeads = rawMain\.filter[\s\S]*?\n      \}\)\);\n\n/,
  ''
);

// 3. Update the leads array merging
content = content.replace(
  /leads = \[\.\.\.mainLeads, \.\.\.fmsLeads\]\.filter/,
  'leads = [...fmsLeads].filter'
);

// 4. Update the endpoint and error msg
content = content.replace(
  /  \/\/ Leads: Create \(Entry Data Special\)\n  app\.post\('\/api\/leads\/entry', authenticateToken, async \(req: any, res\) => {/,
  `  // Leads: Create\n  app.post('/api/leads/entry', authenticateToken, async (req: any, res) => {`
);
content = content.replace(
  /console\.error\('Entry Data creation error:', error\);/,
  `console.error('Lead creation error:', error);`
);

fs.writeFileSync('server.ts', content);
console.log('Replacements complete');
