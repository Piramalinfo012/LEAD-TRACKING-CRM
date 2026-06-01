import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  TrendingUp,
  Zap,
  Upload,
  FileCheck,
  Loader2,
  ChevronDown,
  Search
} from 'lucide-react';
import { useApi } from '../lib/api';
import { formatDateToDMY } from '../lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Priority } from '../types';

interface NewLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

import { INDIAN_STATES_DISTRICTS } from '../lib/locationData';

function SearchableSelect({ options, value, onChange, placeholder, disabled, onSearch }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string, disabled?: boolean, onSearch?: (val: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className={`flex items-center justify-between bg-white h-12 text-sm rounded-xl shadow-sm border px-4 cursor-pointer focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' : 'border-slate-200 text-slate-900'}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={value ? "text-slate-900" : "text-slate-500"}>{value || placeholder}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
      </div>
      
      {open && (
        <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search size={14} className="text-slate-400 ml-2" />
            <input 
              autoFocus
              className="w-full text-sm outline-none bg-transparent h-9 placeholder:text-slate-400 font-medium text-slate-900"
              placeholder="Type to search..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                if (onSearch) onSearch(e.target.value);
              }}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center font-medium">No results found.</div>
            ) : (
              filtered.map(opt => (
                <div 
                  key={opt}
                  className={`px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors ${value === opt ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewLeadDialog({ isOpen, onClose, onSuccess }: NewLeadDialogProps) {
  const { request, loading } = useApi();
  const [uploading, setUploading] = useState(false);
  const [masterData, setMasterData] = useState<any[]>([]);
  const [existingLeads, setExistingLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('crm_user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isAdmin = user?.role === 'ADMIN';
  const [duplicateLead, setDuplicateLead] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredParties, setFilteredParties] = useState<string[]>([]);

  const combinedRecords = useMemo(() => {
    return [...masterData, ...existingLeads];
  }, [masterData, existingLeads]);

  const existingParties = useMemo(() => {
    const names = combinedRecords.map(item => item['Party Name'] || item.company_name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [combinedRecords]);

  const [formData, setFormData] = useState({
    party_name: '',
    person_name: '',
    mobile_no: '',
    gmail_id: '',
    address: '',
    district: '',
    state: '',
    mcb_kit_url: '',
    last_remarks: '',
    source: '',
    follow_up_date: '',
    id: '', // Will be generated automatically
    owner_id: JSON.parse(localStorage.getItem('crm_user') || '{}').id,
    sales_person_name: JSON.parse(localStorage.getItem('crm_user') || '{}').name,
    senior_sales_id: JSON.parse(localStorage.getItem('crm_user') || '{}').senior_sales_id
  });

  useEffect(() => {
    if (combinedRecords.length > 0 && !formData.id) {
      // Auto-generate next sequence ID
      const ppplIds = combinedRecords
        .map(r => r['Id'] || r.id)
        .filter(id => typeof id === 'string' && id.startsWith('PPPL-26-'))
        .map(id => parseInt(id.replace('PPPL-26-', ''), 10))
        .filter(num => !isNaN(num));
      
      let nextNum = 1424; // Default fallback if no sequence found
      if (ppplIds.length > 0) {
        nextNum = Math.max(...ppplIds) + 1;
      }
      setFormData(prev => ({ ...prev, id: `PPPL-26-${nextNum}` }));
    }
  }, [combinedRecords, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
      if (isAdmin) {
        request('/api/users').then(data => {
          if (data && Array.isArray(data)) setUsers(data);
        }).catch(err => console.error('Failed to fetch users:', err));
      }
    }
  }, [isOpen, isAdmin, request]);

  const fetchMasterData = async () => {
    try {
      const [mData, lData] = await Promise.all([
        request('/api/master-data'),
        request('/api/leads')
      ]);
      setMasterData(mData || []);
      setExistingLeads(lData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const states = useMemo(() => {
    return Object.keys(INDIAN_STATES_DISTRICTS).sort();
  }, []);

  const sources = useMemo(() => {
    const s = combinedRecords.map(item => item.Source || item.source).filter(Boolean);
    return Array.from(new Set(s)).sort();
  }, [combinedRecords]);

  const districts = useMemo(() => {
    if (!formData.state) return [];
    
    // Find a case-insensitive match for the state in case of manual typing
    const stateKey = Object.keys(INDIAN_STATES_DISTRICTS).find(
      key => key.toLowerCase() === formData.state.toLowerCase()
    ) || formData.state;
    
    const matchedDistricts = INDIAN_STATES_DISTRICTS[stateKey] || [];
    return [...matchedDistricts].sort();
  }, [formData.state]);

  useEffect(() => {
    const cleanNum = formData.mobile_no.replace(/\D/g, '');
    const currentPartyName = (formData.party_name || '').trim().toLowerCase();

    if (cleanNum.length >= 10 && currentPartyName.length > 0) {
      const match = combinedRecords.find(item => {
        const itemMob = String(item['Mobile No. '] || item.mobile || '').replace(/\D/g, '');
        const itemPartyName = String(item['Party Name'] || item.company_name || '').trim().toLowerCase();
        
        const isMobileMatch = itemMob.includes(cleanNum) || cleanNum.includes(itemMob);
        const isNameMatch = itemPartyName === currentPartyName;
        
        return isMobileMatch && isNameMatch;
      });
      setDuplicateLead(match || null);
    } else {
      setDuplicateLead(null);
    }
  }, [formData.mobile_no, formData.party_name, combinedRecords]);

  const handleMobileChange = (val: string) => {
    // Basic number cleaning
    setFormData(prev => ({ ...prev, mobile_no: val }));
  };

  const handlePartyNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, party_name: name }));
    
    if (name.trim()) {
      const filtered = existingParties.filter(p => 
        p.toLowerCase().includes(name.toLowerCase())
      );
      setFilteredParties(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }

    // Auto-fill if exact match found in combined records
    const match = combinedRecords.find(item => (item['Party Name'] || item.company_name) === name);
    if (match) {
      setFormData(prev => ({
        ...prev,
        person_name: match['Person Name'] || match.contact_person || prev.person_name,
        gmail_id: match['Gmail ID'] || match.email || prev.gmail_id,
        address: match['Address'] || match.address || prev.address,
        state: match['State'] || match.state || prev.state,
        district: match['District'] || match.district || prev.district,
        source: match['Source'] || match.source || prev.source
      }));
      setShowSuggestions(false);
      toast.info(`Auto-filled details for ${name}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crm_token')}`
        },
        body: uploadData
      });

      const result = await response.json();
      if (result.webViewLink) {
        setFormData(prev => ({ ...prev, mcb_kit_url: result.webViewLink }));
        toast.success('File uploaded and linked successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('File upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('crm_user') || '{}');
      setFormData({
        party_name: '',
        person_name: '',
        mobile_no: '',
        gmail_id: '',
        address: '',
        district: '',
        state: '',
        mcb_kit_url: '',
        last_remarks: '',
        source: '',
        follow_up_date: '',
        id: '',
        owner_id: currentUser.id || '',
        sales_person_name: currentUser.name || '',
        senior_sales_id: currentUser.senior_sales_id || ''
      });
      setDuplicateLead(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        Timestamp: formatDateToDMY(new Date()),
        Id: formData.id,
        'Party Name': formData.party_name,
        'Address': formData.address,
        'Person Name': formData.person_name,
        'Mobile No. ': formData.mobile_no,
        'MCBs. (KIT) URl': formData.mcb_kit_url,
        'Last Remarks': formData.last_remarks,
        'District': formData.district,
        'State': formData.state,
        'Sales Person Name': formData.sales_person_name,
        'Source': formData.source,
        'Gmail ID': formData.gmail_id,
        'Follow Up date': formatDateToDMY(formData.follow_up_date),
        'Entry By Id': user?.employee_id || user?.id || '',
        // Also keep standard fields for compatibility if needed
        company_name: formData.party_name,
        contact_person: formData.person_name,
        status: 'COLD'
      };

      await request('/api/leads/entry', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(`Lead added with ID: ${formData.id}`);
      
      resetForm();
      window.dispatchEvent(new CustomEvent('crm_leads_refresh'));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-3xl bg-white border-slate-200 text-slate-900 shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 md:p-8 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
               <Plus size={24} />
            </div>
            <div>
               <DialogTitle className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-slate-900">New Lead Entry</DialogTitle>
               <DialogDescription className="text-slate-400 font-heading text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5">Add record to FMS Tracker</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 py-6 md:px-10 md:py-8 overflow-y-auto max-h-[75vh] scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 md:gap-y-8">
            <div className="space-y-2.5">
              <Label htmlFor="party_name" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <Briefcase size={14} className="text-indigo-600" /> Company / Name
              </Label>
              <div className="relative">
                <Input 
                  id="party_name" 
                  placeholder="Enter Company Name" 
                  className="bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all rounded-xl"
                  value={formData.party_name}
                  onChange={(e) => handlePartyNameChange(e.target.value)}
                  onFocus={() => {
                    if (formData.party_name.trim()) {
                      const filtered = existingParties.filter(p => 
                        p.toLowerCase().includes(formData.party_name.toLowerCase())
                      );
                      setFilteredParties(filtered);
                      setShowSuggestions(filtered.length > 0);
                    }
                  }}
                  onBlur={() => {
                    // Small delay to allow clicking a suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  required
                  autoComplete="off"
                />
                
                {showSuggestions && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {filteredParties.map((party, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full px-4 py-3 text-left text-sm font-sans hover:bg-indigo-50 text-slate-700 transition-colors first:rounded-t-xl last:rounded-b-xl border-b border-slate-50 last:border-0 flex items-center justify-between group"
                        onClick={() => {
                          handlePartyNameChange(party);
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="font-medium group-hover:text-indigo-600">{party}</span>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest bg-slate-50 px-1.5 py-0.5 rounded group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">Existing</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="person_name" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <User size={14} className="text-indigo-600" /> Contact Person
              </Label>
              <Input 
                 id="person_name" 
                 placeholder="Full Name" 
                 className="bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all rounded-xl"
                 value={formData.person_name}
                 onChange={(e) => setFormData({...formData, person_name: e.target.value})}
                 required
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile_no" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                  <Phone size={14} className="text-indigo-600" /> Mobile No.
                </Label>
                {duplicateLead && (
                  <span className="text-[9px] font-bold text-rose-500 animate-pulse uppercase tracking-tight">
                    Duplicate Entry Detected!
                  </span>
                )}
              </div>
              <div className={`flex gap-2 p-0.5 rounded-[13px] transition-all ${duplicateLead ? 'bg-rose-50 ring-2 ring-rose-500/20' : ''}`}>
                <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-500 font-sans font-bold text-sm h-12 whitespace-nowrap">+91</div>
                <Input 
                  id="mobile_no" 
                  placeholder="00000 00000" 
                  className={`bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all rounded-xl flex-1 ${duplicateLead ? 'border-rose-300 text-rose-600 focus:border-rose-500 focus:ring-rose-500/10' : ''}`}
                  value={formData.mobile_no}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  required
                />
              </div>
              {duplicateLead && (
                <div className="mt-1 p-2 bg-rose-50 rounded-lg border border-rose-100 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[10px] text-rose-600 font-medium">
                    This number is already registered under <b>{duplicateLead['Party Name'] || duplicateLead.company_name}</b> ({duplicateLead['Person Name'] || duplicateLead.contact_person})
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="gmail_id" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <Mail size={14} className="text-indigo-600" /> Email Address
              </Label>
              <Input 
                id="gmail_id" 
                type="email" 
                placeholder="example@gmail.com" 
                className="bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all rounded-xl"
                value={formData.gmail_id}
                onChange={(e) => setFormData({...formData, gmail_id: e.target.value})}
              />
            </div>

            <div className="sm:col-span-2 space-y-2.5">
              <Label htmlFor="address" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <MapPin size={14} className="text-indigo-600" /> Site/Office Address
              </Label>
              <Textarea 
                id="address" 
                placeholder="Village, Street, Building Details..." 
                className="bg-white border-slate-200 text-slate-900 min-h-[100px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all pt-3 px-4 rounded-xl resize-none"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="state" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <Search size={14} className="text-indigo-600" /> State
              </Label>
              <SearchableSelect
                options={states}
                value={formData.state}
                onChange={(val) => setFormData({ ...formData, state: val, district: '' })}
                placeholder="Select State..."
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="district" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <Search size={14} className="text-indigo-600" /> District
              </Label>
              <SearchableSelect
                options={districts}
                value={formData.district}
                onChange={(val) => setFormData({ ...formData, district: val })}
                placeholder={formData.state ? "Select District..." : "Select State First"}
                disabled={!formData.state}
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider">MCBs. (KIT) Attachment</Label>
              <div className="relative w-full">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button 
                  type="button"
                  variant="outline" 
                  className={`w-full h-12 px-4 md:px-5 justify-center shadow-sm rounded-xl border-dashed border-2 text-sm font-sans transition-all ${formData.mcb_kit_url ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-indigo-500" />
                      <span>Uploading...</span>
                    </div>
                  ) : formData.mcb_kit_url ? (
                    <div className="flex items-center gap-2">
                      <FileCheck size={18} className="text-emerald-600" />
                      <span className="font-semibold">File Uploaded Successfully</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload size={18} className="text-indigo-500" />
                      <span className="font-medium">Click to Upload File</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="source" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-indigo-600" /> Lead Source
              </Label>
              <div className="relative">
                <Input 
                  id="source" 
                  list="sources-list"
                  placeholder="Select or Add Source" 
                  className="bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all pr-10 rounded-xl"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                />
                <datalist id="sources-list">
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </datalist>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="follow_up_date" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider">Follow Up Date</Label>
              <Input 
                id="follow_up_date" 
                type="date"
                className="bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm px-4 transition-all rounded-xl"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
              />
            </div>
            <div className="space-y-2.5">
               <Label htmlFor="sales_person" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider">Sales Person Name</Label>
               {isAdmin ? (
                 <Select 
                   value={formData.sales_person_name} 
                   onValueChange={(val) => {
                     const selectedUser = users.find(u => (u['USER NAME'] || u.name) === val);
                     setFormData(prev => ({
                       ...prev, 
                       sales_person_name: val,
                       owner_id: selectedUser?.ID || selectedUser?.id || prev.owner_id,
                       senior_sales_id: selectedUser?.senior_sales_id || prev.senior_sales_id
                     }));
                   }}
                 >
                   <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all rounded-xl">
                     <SelectValue placeholder="Select Sales Person" />
                   </SelectTrigger>
                   <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl z-[100] max-h-60">
                     {users.map((u, idx) => {
                       const name = u['USER NAME'] || u.name;
                       if (!name) return null;
                       return <SelectItem key={u.ID || u.id || idx} value={name}>{name}</SelectItem>
                     })}
                   </SelectContent>
                 </Select>
               ) : (
                 <Input 
                   id="sales_person" 
                   value={formData.sales_person_name}
                   disabled
                   className="bg-slate-50 border-slate-200 text-slate-500 h-12 font-sans text-sm cursor-not-allowed font-medium shadow-none px-4 rounded-xl"
                 />
               )}
            </div>

            <div className="sm:col-span-2 space-y-2.5">
              <Label htmlFor="last_remarks" className="text-[11px] font-heading uppercase font-extrabold text-slate-900 tracking-wider">Important Remarks</Label>
              <Textarea 
                id="last_remarks" 
                placeholder="Brief summary of the requirement..." 
                className="bg-white border-slate-200 text-slate-900 min-h-[110px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-sans text-sm shadow-sm transition-all pt-3 px-4 rounded-xl resize-none"
                value={formData.last_remarks}
                onChange={(e) => setFormData({...formData, last_remarks: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="mt-10 pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-4">
             <Button variant="ghost" type="button" onClick={onClose} className="w-full sm:w-auto text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-heading font-bold uppercase text-[10px] tracking-widest h-11 px-8 rounded-xl transition-colors">Cancel</Button>
             <Button type="submit" disabled={loading} className="w-full sm:w-[200px] bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold uppercase text-[10px] tracking-widest h-11 shadow-md transition-all focus:ring-2 focus:ring-slate-900/20 rounded-xl">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing</span>
                  </div>
                ) : 'Save to FMS'}
             </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
