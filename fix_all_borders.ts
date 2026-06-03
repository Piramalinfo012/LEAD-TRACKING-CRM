import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const dir = path.join(process.cwd(), 'src');
walkDir(dir, (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Globally replace border-slate-200 with border-slate-300 for better visibility everywhere
    let newContent = content.replace(/border-slate-200/g, 'border-slate-300');
    newContent = newContent.replace(/border-indigo-200/g, 'border-indigo-300');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Updated all borders in ${path.basename(filePath)}`);
    }
  }
});
