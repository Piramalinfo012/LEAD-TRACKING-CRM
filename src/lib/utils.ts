import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateToDMY(dateInput: any): string {
  if (!dateInput) return '';
  
  const valStr = String(dateInput).trim();
  if (!valStr) return '';

  // Already DD/MM/YYYY?
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valStr)) {
    return valStr;
  }

  // If DD/MM/YYYY hh:mm:ss or similar, extraction:
  const dmyMatch = valStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1]}/${dmyMatch[2]}/${dmyMatch[3]}`;
  }

  // If YYYY-MM-DD (but not full ISO string)
  if (valStr.length <= 10) {
    const ymdMatch = valStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
      return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
    }
  }

  // Try parsing with Date object
  const date = new Date(valStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return valStr;
}

export function formatDateToYMD(dateInput: any): string {
  if (!dateInput) return '';
  
  const valStr = String(dateInput).trim();
  if (!valStr) return '';

  // If it is in YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
    return valStr;
  }

  // Parse DD/MM/YYYY
  const dmyMatch = valStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  const date = new Date(valStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return '';
}

export function getEmbeddableUrl(url?: string): string {
  if (!url) return '';
  const match = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    // lh3.googleusercontent.com/d/ID is generally unrestricted for rendering Drive images
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

export function customDateSortFn(rowA: any, rowB: any, columnId: string) {
  const getMs = (val: any) => {
    if (!val) return 0;
    const str = String(val).trim();
    if (!str) return 0;
    
    // Match DD/MM/YYYY, optionally followed by time
    const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmyMatch) {
      // Convert to YYYY-MM-DDT... for robust parsing
      const rest = str.substring(dmyMatch[0].length);
      const parsed = new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}${rest}`);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.getTime();
    return 0;
  };

  const valA = rowA.getValue(columnId);
  const valB = rowB.getValue(columnId);
  
  const msA = getMs(valA);
  const msB = getMs(valB);
  
  if (msA === msB) return 0;
  return msA > msB ? 1 : -1;
}

export function customIdSortFn(rowA: any, rowB: any, columnId: string) {
  const a = String(rowA.getValue(columnId) || '');
  const b = String(rowB.getValue(columnId) || '');
  
  const numA = parseInt(a.split('-').pop() || '0', 10);
  const numB = parseInt(b.split('-').pop() || '0', 10);

  if (!isNaN(numA) && !isNaN(numB) && a.includes('-') && b.includes('-')) {
    return numA < numB ? -1 : numA > numB ? 1 : 0;
  }
  return a.localeCompare(b);
}
