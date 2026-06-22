import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export function SearchableSelect({ 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select...", 
  allLabel = "All",
  className = "" 
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative w-full ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
        className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-all hover:bg-slate-50"
      >
        <span className="truncate font-sans font-medium text-slate-700">
          {value === 'ALL' ? allLabel : value}
        </span>
        <ChevronDown size={16} className={`text-slate-500 opacity-50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center px-3 border-b border-slate-100 bg-slate-50/50">
            <Search size={16} className="text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 h-10 text-sm bg-transparent outline-none text-slate-900 font-sans"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
            <button
              onClick={() => {
                onValueChange('ALL');
                setIsOpen(false);
                setSearch("");
              }}
              className={`flex items-center w-full px-2 py-2 text-sm rounded-lg transition-colors font-sans ${value === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-100 font-medium'}`}
            >
              <Check size={16} className={`mr-2 shrink-0 transition-opacity ${value === 'ALL' ? 'opacity-100 text-indigo-600' : 'opacity-0'}`} />
              <span className="truncate">{allLabel}</span>
            </button>
            {filteredOptions.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  onValueChange(opt);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`flex items-center w-full px-2 py-2 text-sm rounded-lg transition-colors font-sans mt-0.5 ${value === opt ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-100 font-medium'}`}
              >
                <Check size={16} className={`mr-2 shrink-0 transition-opacity ${value === opt ? 'opacity-100 text-indigo-600' : 'opacity-0'}`} />
                <span className="truncate">{opt}</span>
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-sm text-center text-slate-500 font-sans italic">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
