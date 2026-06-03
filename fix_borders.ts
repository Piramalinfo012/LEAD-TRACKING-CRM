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
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace border-slate-200 with border-slate-300 for Input, Textarea, SelectTrigger, SelectContent
    let newContent = content.replace(/(<(?:Input|Textarea|SelectTrigger|SelectContent|div)[^>]*className=(?:'|"|`)[^>]*?)(border-slate-200)/g, '$1border-slate-300');
    
    // Also replace border-indigo-200 with border-indigo-300 for inputs
    newContent = newContent.replace(/(<(?:Input|Textarea|SelectTrigger)[^>]*className=(?:'|"|`)[^>]*?)(border-indigo-200)/g, '$1border-indigo-300');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Updated borders in ${path.basename(filePath)}`);
    }
  }
});
