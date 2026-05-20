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

  // If YYYY-MM-DD
  const ymdMatch = valStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
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
