import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  Plus, 
  Upload, 
  FileText,
  Trash2,
  CheckCircle2,
  MessageSquare,
  ArrowUpRight,
  UserCheck,
  History,
  ExternalLink,
  Download,
  Edit
} from 'lucide-react';
import { useApi } from '../lib/api';
import { Lead, LeadStatus, Followup, LeadHistory, User, UserRole, Priority } from '../types';
import { useAuth } from '../hooks/useAuth';
import { INDIAN_STATES_DISTRICTS } from '../lib/locationData';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';
import { formatDateToDMY } from '../lib/utils';

interface LeadDetailsSheetProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  currentStageView?: string;
}

export default function LeadDetailsSheet({ lead, isOpen, onClose, onUpdate, currentStageView }: LeadDetailsSheetProps) {
  const { user: currentUser } = useAuth();
  const { request, loading } = useApi();
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    company_name: '',
    contact_person: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    district: '',
    product: '',
    source: '',
    priority: Priority.MEDIUM,
    expected_value: 0,
    notes: '',
    followup_date: '',
  });

  useEffect(() => {
    if (lead && isOpen) {
      setEditFormData({
        company_name: lead.company_name || lead['Party Name'] || '',
        contact_person: lead.contact_person || lead['Person Name'] || '',
        mobile: lead.mobile || lead['Mobile No. '] || '',
        alternate_mobile: lead.alternate_mobile || '',
        email: lead.email || lead['Gmail ID'] || '',
        address: lead.address || lead['Address'] || '',
        city: lead.city || '',
        state: lead.state || lead['State'] || '',
        district: lead['District'] || '',
        product: lead.product || '',
        source: lead.source || lead['Source'] || '',
        priority: lead.priority || Priority.MEDIUM,
        expected_value: lead.expected_value || 0,
        notes: lead.notes || lead['Last Remarks'] || '',
        followup_date: lead.followup_date || lead['Follow Up date'] || '',
      });
      setIsEditing(false);
    }
  }, [lead, isOpen]);

  const statesList = useMemo(() => {
    return Object.keys(INDIAN_STATES_DISTRICTS).sort();
  }, []);

  const districtsList = useMemo(() => {
    if (!editFormData.state) return [];
    return INDIAN_STATES_DISTRICTS[editFormData.state] || [];
  }, [editFormData.state]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.company_name.trim()) {
      toast.error("Company / Party Name is required");
      return;
    }
    setIsSaving(true);
    try {
      await request(`/api/leads/${lead?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          company_name: editFormData.company_name,
          'Party Name': editFormData.company_name,
          contact_person: editFormData.contact_person,
          'Person Name': editFormData.contact_person,
          mobile: editFormData.mobile,
          'Mobile No. ': editFormData.mobile,
          alternate_mobile: editFormData.alternate_mobile,
          email: editFormData.email,
          'Gmail ID': editFormData.email,
          address: editFormData.address,
          'Address': editFormData.address,
          city: editFormData.city,
          state: editFormData.state,
          'State': editFormData.state,
          district: editFormData.district,
          'District': editFormData.district,
          product: editFormData.product,
          source: editFormData.source,
          'Source': editFormData.source,
          priority: editFormData.priority,
          expected_value: Number(editFormData.expected_value || 0),
          notes: editFormData.notes,
          'Last Remarks': editFormData.notes,
          followup_date: editFormData.followup_date,
          'Follow Up date': editFormData.followup_date,
        })
      });
      toast.success("Lead details updated successfully!");
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update lead");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (lead && isOpen) {
      fetchExtraData();
      if (currentUser?.role === UserRole.ADMIN) {
        fetchUsers();
      }
    }
  }, [lead, isOpen, currentUser]);

  const fetchUsers = async () => {
    try {
      const uData = await request('/api/users');
      setUsers(uData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (newOwnerId: string) => {
    if (newOwnerId === lead?.owner_id) return;
    setIsAssigning(true);
    try {
        await request(`/api/leads/${lead?.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ owner_id: newOwnerId })
        });
        toast.success(`Lead assigned to ${newOwnerId}`);
        onUpdate();
    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setIsAssigning(false);
    }
  };

  const fetchExtraData = async () => {
    try {
      const fData = await request(`/api/followups/${lead?.id}`);
      setFollowups(fData);
      
      const hData = await request(`/api/history/${lead?.id}`);
      setHistory(hData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await request('/api/followups', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: lead?.id,
          type: 'NOTE',
          notes: newNote,
          date: new Date().toISOString()
        }),
      });
      setNewNote('');
      fetchExtraData();
      toast.success('⏱️ Follow-up note added successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadedFile = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('crm_token')}`
        },
        body: formData
      }).then(res => res.json());

      // Update lead attachments list
      const currentAttachments = lead?.attachments || [];
      await request(`/api/leads/${lead?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          attachments: [...currentAttachments, { name: uploadedFile.name, url: uploadedFile.webViewLink }]
        }),
      });
      
      toast.success('File uploaded and linked');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="p-5 md:p-8 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-600 text-white border-0 uppercase text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full">{lead.status.replace('_', ' ')}</Badge>
                <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-400 text-[10px] font-mono">{lead.id}</Badge>
              </div>
              <Button
                variant={isEditing ? "destructive" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 font-heading text-[10px] font-semibold px-3 uppercase tracking-wider gap-1.5 rounded-lg border-slate-200 hover:bg-slate-50"
              >
                <Edit size={12} />
                {isEditing ? "Cancel Edit" : "Edit Details"}
              </Button>
            </div>
            <DialogTitle className="text-2xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">{lead.company_name}</DialogTitle>
            <DialogDescription className="text-slate-500 font-sans font-medium text-xs">
              Assigned to <span className="text-indigo-600 font-bold">{lead.owner_id}</span> • Timestamp: {formatDateToDMY(lead.created_at || lead.Timestamp)}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 md:p-8 pt-2 overflow-hidden flex flex-col flex-1">
            <div className="w-full h-full flex flex-col">

              <ScrollArea className="flex-1 mt-2 pr-4">
                <div className="pb-10">
                  <div className="space-y-8 mt-0 animate-in fade-in duration-500">
                    {isEditing ? (
                      <form onSubmit={handleSaveChanges} className="space-y-6">
                        {/* Company / Party Name & Contact Person */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Company / Party Name</Label>
                            <Input 
                              type="text" 
                              required
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.company_name}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
                              placeholder="Enter company name..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Contact Person Name</Label>
                            <Input 
                              type="text"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.contact_person}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                              placeholder="Enter contact person..."
                            />
                          </div>
                        </div>

                        {/* Valuation & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Valuation ($)</Label>
                            <Input 
                              type="number"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.expected_value}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, expected_value: Number(e.target.value) }))}
                              placeholder="Enter expected value..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Priority</Label>
                            <Select 
                              value={editFormData.priority} 
                              onValueChange={(val) => setEditFormData(prev => ({ ...prev, priority: val as Priority }))}
                            >
                              <SelectTrigger className="bg-white border-slate-200 h-9 text-xs text-slate-900 rounded-lg">
                                <SelectValue placeholder="Select Priority" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-border rounded-lg shadow-xl">
                                {Object.values(Priority).map(p => (
                                  <SelectItem key={p} value={p} className="text-xs font-semibold">{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Business Context & Follow Up Date */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Source</Label>
                            <Input 
                              type="text"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.source}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, source: e.target.value }))}
                              placeholder="Organic, Referral, etc."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Product</Label>
                            <Input 
                              type="text"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.product}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, product: e.target.value }))}
                              placeholder="Product name..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Follow Up Date</Label>
                            <Input 
                              type="date"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light] h-9 wrapper-picker"
                              value={editFormData.followup_date ? editFormData.followup_date.split('T')[0] : ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, followup_date: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Contact Channels */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mobile Number</Label>
                            <Input 
                              type="text"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.mobile}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, mobile: e.target.value }))}
                              placeholder="Mobile..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Alternate Number</Label>
                            <Input 
                              type="text"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.alternate_mobile}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, alternate_mobile: e.target.value }))}
                              placeholder="Alternate mobile..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</Label>
                            <Input 
                              type="email"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.email}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email address..."
                            />
                          </div>
                        </div>

                        {/* Location details */}
                        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Address</Label>
                            <Input 
                              type="text"
                              className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                              value={editFormData.address}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                              placeholder="Full Address..."
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">State</Label>
                              <Select 
                                value={editFormData.state} 
                                onValueChange={(val) => setEditFormData(prev => ({ ...prev, state: val, district: '' }))}
                              >
                                <SelectTrigger className="bg-white border-slate-200 h-9 text-xs text-slate-900 rounded-lg">
                                  <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-border rounded-lg shadow-xl">
                                  {statesList.map(s => (
                                    <SelectItem key={s} value={s} className="text-xs font-semibold">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">District</Label>
                              <Select 
                                value={editFormData.district} 
                                onValueChange={(val) => setEditFormData(prev => ({ ...prev, district: val }))}
                                disabled={!editFormData.state}
                              >
                                <SelectTrigger className="bg-white border-slate-200 h-9 text-xs text-slate-900 rounded-lg">
                                  <SelectValue placeholder="Select District" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-border rounded-lg shadow-xl">
                                  {districtsList.map(d => (
                                    <SelectItem key={d} value={d} className="text-xs font-semibold">{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">City</Label>
                              <Input 
                                type="text"
                                className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light]"
                                value={editFormData.city}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="City..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-heading">Lead Notes / Narrative</Label>
                          <Textarea 
                            className="bg-white border-slate-200 text-slate-900 font-sans text-xs [color-scheme:light] h-20"
                            value={editFormData.notes}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add lead description..."
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-2">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            className="flex-1 font-heading font-medium text-xs uppercase tracking-wider h-11"
                          >
                            Discard
                          </Button>
                          <Button 
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-medium text-xs uppercase tracking-wider h-11"
                          >
                            {isSaving ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {currentUser?.role === UserRole.ADMIN && (
                          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] uppercase font-extrabold text-indigo-900 tracking-widest flex items-center gap-2">
                                <UserCheck size={14} /> Global Assignment
                              </h4>
                              <Badge variant="outline" className="text-[9px] font-bold text-indigo-600 bg-indigo-50 uppercase border-indigo-100">Admin Only</Badge>
                            </div>
                            <Select 
                              disabled={isAssigning}
                              defaultValue={lead.owner_id} 
                              onValueChange={handleAssign}
                            >
                              <SelectTrigger className="bg-white border-indigo-100 h-10 text-xs text-slate-900 font-bold px-4 rounded-lg focus:ring-indigo-500/20">
                                <SelectValue placeholder="Assign Owner" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-border rounded-lg shadow-xl">
                                {users.map(u => (
                                  <SelectItem key={u.id} value={u.employee_id} className="text-xs font-medium">
                                    {u.name} ({u.employee_id})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-widest">Lead Contact</span>
                            <div className="flex items-center gap-2 text-slate-900 font-sans font-semibold">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span>{lead.contact_person || lead['Person Name'] || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-widest">Valuation</span>
                            <div className="text-indigo-600 font-sans font-bold text-xl">
                              {lead.expected_value ? `$${lead.expected_value.toLocaleString()}` : '$0.00'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-widest">Priority</span>
                            <div>
                              <Badge 
                                variant="outline" 
                                className={`
                                  text-[10px] font-bold uppercase px-2 py-0.5 rounded-md
                                  ${lead.priority === Priority.CRITICAL ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                                    lead.priority === Priority.HIGH ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                    lead.priority === Priority.MEDIUM ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200'}
                                `}
                              >
                                {lead.priority || 'NORMAL'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                <Plus size={14} className="text-indigo-600" /> Business Context
                              </h4>
                              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                 <div className="space-y-1">
                                    <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Source</span>
                                    <p className="text-xs font-sans font-bold text-slate-700 uppercase">{lead.source || lead['Source'] || 'Organic'}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Product</span>
                                    <p className="text-xs font-sans font-bold text-slate-700 uppercase">{lead.product || 'Unspecified'}</p>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                 <Calendar size={14} className="text-indigo-600" /> Key Dates
                              </h4>
                              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                 <div className="space-y-1">
                                    <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Follow Up date</span>
                                    <p className="text-xs font-sans font-bold text-rose-500 uppercase">{lead.followup_date || lead['Follow Up date'] ? formatDateToDMY(lead.followup_date || lead['Follow Up date']) : 'Set Date'}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Timestamp</span>
                                    <p className="text-xs font-sans font-bold text-slate-700">{formatDateToDMY(lead.created_at || lead.Timestamp)}</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                            <Phone size={14} className="text-indigo-600" /> Primary Channels
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="space-y-1">
                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Direct Line</span>
                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.mobile || lead['Mobile No. ']}</p>
                            </div>
                            <div className="space-y-1">
                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Alternate No.</span>
                               <p className="text-sm font-sans font-semibold text-slate-700">{lead.alternate_mobile || '-'}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Email Route</span>
                              <p className="text-sm font-sans font-semibold text-slate-700 truncate">{lead.email || lead['Gmail ID']}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                            <MapPin size={14} className="text-indigo-600" /> Headquarters & Region
                          </h4>
                          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight block mb-1">Full Address</span>
                               <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
                                {lead.address || lead['Address']}, {lead.city}, {lead.state || lead['State']}
                               </p>
                            </div>
                            <Separator orientation="vertical" className="hidden md:block h-10" />
                            <div className="shrink-0">
                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight block mb-1">District</span>
                               <Badge variant="outline" className="bg-white text-slate-900 font-bold uppercase text-[10px] border-slate-200">
                                  {lead['District'] || 'N/A'}
                               </Badge>
                            </div>
                          </div>
                        </div>

                        {(lead.notes || lead['Last Remarks']) && (
                           <div className="space-y-3">
                              <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                 <FileText size={14} className="text-indigo-600" /> Lead Narrative / Remarks
                              </h4>
                              <div className="p-4 rounded-xl bg-amber-50/30 border border-amber-100/50">
                                 <p className="text-sm text-slate-600 font-sans leading-relaxed italic">
                                    "{lead.notes || lead['Last Remarks']}"
                                 </p>
                              </div>
                           </div>
                        )}

                        {/* Additional Stage Details */}
                        {(() => {
                           const STAGES_ORDER = [
                              LeadStatus.COLD,
                              LeadStatus.LEAD,
                              LeadStatus.MEETING,
                              LeadStatus.TECHNICAL_DISCUSSION,
                              LeadStatus.NEGOTIATION,
                              LeadStatus.ORDER,
                              LeadStatus.CLOSED
                           ];
                           let calculatedStageStr = (lead.status as string) || 'COLD';
                           if (currentStageView) {
                             calculatedStageStr = currentStageView.toUpperCase().replace('-', '_');
                             if (calculatedStageStr === 'TECH') calculatedStageStr = 'TECHNICAL_DISCUSSION';
                           } else if (!lead.status) {
                             calculatedStageStr = 'COLD';
                           }
                           
                           const currentStage = calculatedStageStr as LeadStatus;
                           const stageIndex = STAGES_ORDER.indexOf(currentStage);

                           const renderValueOrLink = (value: string | undefined) => {
                             if (!value) return '-';
                             if (value.startsWith('http://') || value.startsWith('https://')) {
                               return (
                                 <a href={value} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                                   <ExternalLink size={12} /> View File
                                 </a>
                               );
                             }
                             return value;
                           };

                           return (
                              <div className="space-y-6 pt-2">
                                 {stageIndex > 1 && (
                                    <div className="space-y-4">
                                       <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                          <FileText size={14} className="text-indigo-600" /> Lead Stage Details
                                       </h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Lead Planned Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.lead_planned_date || lead['Lead Planned Date'] ? formatDateToDMY(lead.lead_planned_date || lead['Lead Planned Date']) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Lead Actual Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.lead_actual_date || lead['Lead Actual Date'] ? formatDateToDMY(lead.lead_actual_date || lead['Lead Actual Date']) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Product Details</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.product_details || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">MCB Requirement</span>
                                             <div className="text-sm font-sans font-semibold text-slate-700 truncate">{renderValueOrLink(lead.mcb_requirement)}</div>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Kit Details</span>
                                             <div className="text-sm font-sans font-semibold text-slate-700 truncate">{renderValueOrLink(lead.kit_details || lead['MCBs. (KIT) URl'])}</div>
                                          </div>
                                          <div className="space-y-1 md:col-span-2">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Pain Points</span>
                                             <p className="text-sm font-sans font-medium text-slate-600">{lead.pain_points || '-'}</p>
                                          </div>
                                       </div>
                                    </div>
                                 )}

                                 {stageIndex > 2 && (
                                    <div className="space-y-4">
                                       <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                          <FileText size={14} className="text-indigo-600" /> Meeting Stage Details
                                       </h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Meeting Planned Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.meeting_planned_date || lead['Meeting Planned'] ? formatDateToDMY(lead.meeting_planned_date || lead['Meeting Planned']) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Meeting Actual Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.meeting_actual_date || lead['Meeting Actual Date'] || lead['Meeting Actual'] ? formatDateToDMY(lead.meeting_actual_date || lead['Meeting Actual Date'] || lead['Meeting Actual']) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Meeting Status</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.meeting_status || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Person Met</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.meeting_person_name || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Contact Number</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.meeting_number || '-'}</p>
                                          </div>
                                          <div className="space-y-1 md:col-span-2">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Discussion Points</span>
                                             <p className="text-sm font-sans font-medium text-slate-600">{lead.discussion_points || '-'}</p>
                                          </div>
                                          <div className="space-y-1 md:col-span-2">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Remarks</span>
                                             <p className="text-sm font-sans font-medium text-slate-600">{lead.bullet_point_remarks || '-'}</p>
                                          </div>
                                          {lead.meeting_url && (
                                            <div className="space-y-1 md:col-span-2">
                                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Meeting File / Image</span>
                                               <div className="text-sm font-sans font-semibold text-slate-700">{renderValueOrLink(lead.meeting_url)}</div>
                                            </div>
                                          )}
                                       </div>
                                    </div>
                                 )}

                                 {stageIndex > 3 && (
                                    <div className="space-y-4">
                                       <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                          <FileText size={14} className="text-indigo-600" /> Technical Discussion Details
                                       </h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Technical Planned Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.tech_planned_date || lead['Technical Discussion Planned'] ? formatDateToDMY(lead.tech_planned_date || lead['Technical Discussion Planned']) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Technical Actual Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.tech_actual_date || lead['Technical Discussion Actual'] ? formatDateToDMY(lead.tech_actual_date || lead['Technical Discussion Actual']) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Technical Status</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.tech_status || lead['Technical Status'] || '-'}</p>
                                          </div>
                                          {lead.tech_kit_url && (
                                            <div className="space-y-1 md:col-span-2">
                                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Technical Kit Attachment</span>
                                               <div className="text-sm font-sans font-semibold text-slate-700">{renderValueOrLink(lead.tech_kit_url)}</div>
                                            </div>
                                          )}
                                       </div>
                                    </div>
                                 )}

                                 {stageIndex > 4 && (
                                    <div className="space-y-4">
                                       <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                          <FileText size={14} className="text-indigo-600" /> Negotiation Stage Details
                                       </h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Negotiation Planned Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.negotiation_planned_date ? formatDateToDMY(lead.negotiation_planned_date) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Negotiation Actual Date</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.negotiation_actual_date ? formatDateToDMY(lead.negotiation_actual_date) : '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Negotiation Status</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.negotiation_status || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Unit</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.unit || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Final Price</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.final_price || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Quantity</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.quantity || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Payment Terms</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.payment_terms || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Delivery Schedule</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.delivery_schedule || '-'}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Party Type</span>
                                             <p className="text-sm font-sans font-semibold text-slate-700">{lead.party_type || '-'}</p>
                                          </div>
                                          <div className="space-y-1 md:col-span-2">
                                             <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Negotiation Remarks</span>
                                             <p className="text-sm font-sans font-medium text-slate-600">{lead.negotiation_remark || '-'}</p>
                                          </div>
                                          {lead.quotation_url && (
                                            <div className="space-y-1 md:col-span-2">
                                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Quotation Upload</span>
                                               <div className="text-sm font-sans font-semibold text-slate-700">{renderValueOrLink(lead.quotation_url)}</div>
                                            </div>
                                          )}
                                          {lead.negotiation_kit_url && (
                                            <div className="space-y-1 md:col-span-2">
                                               <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Kit Attachment</span>
                                               <div className="text-sm font-sans font-semibold text-slate-700">{renderValueOrLink(lead.negotiation_kit_url)}</div>
                                            </div>
                                          )}
                                       </div>
                                    </div>
                                 )}
                                  {stageIndex > 5 && (
                                     <div className="space-y-4">
                                        <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest flex items-center gap-2">
                                           <FileText size={14} className="text-indigo-600" /> Order Stage Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                           <div className="space-y-1">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Order Planned Date</span>
                                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.order_planned_date ? formatDateToDMY(lead.order_planned_date) : '-'}</p>
                                           </div>
                                           <div className="space-y-1">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Order Actual Date</span>
                                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.order_actual_date ? formatDateToDMY(lead.order_actual_date) : '-'}</p>
                                           </div>
                                           <div className="space-y-1">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Delivery In</span>
                                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.delivery_in || '-'}</p>
                                           </div>
                                           <div className="space-y-1">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Unloading</span>
                                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.unloading || '-'}</p>
                                           </div>
                                           <div className="space-y-1">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Motor / Pump Requirement</span>
                                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.motor_pump_requirement || '-'}</p>
                                           </div>
                                           <div className="space-y-1">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Transport</span>
                                              <p className="text-sm font-sans font-semibold text-slate-700">{lead.transport || '-'}</p>
                                           </div>
                                           <div className="space-y-1 md:col-span-2">
                                              <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Order Remarks</span>
                                              <p className="text-sm font-sans font-medium text-slate-600">{lead.order_remark || '-'}</p>
                                           </div>
                                           {lead.order_copy_url && (
                                             <div className="space-y-1 md:col-span-2">
                                                <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Order Copy Attached</span>
                                                <div className="text-sm font-sans font-semibold text-slate-700">{renderValueOrLink(lead.order_copy_url)}</div>
                                             </div>
                                           )}
                                           {lead.order_attachment_url && (
                                             <div className="space-y-1 md:col-span-2">
                                                <span className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-tight">Order Attachment</span>
                                                <div className="text-sm font-sans font-semibold text-slate-700">{renderValueOrLink(lead.order_attachment_url)}</div>
                                             </div>
                                           )}
                                        </div>
                                     </div>
                                  )}
                               </div>
                           );
                        })()}
                      </>
                    )}

                    <div className="space-y-4 pt-6 mt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest">Audit Activity Note</h4>
                        <Badge variant="outline" className="text-[9px] font-heading font-medium text-slate-400 uppercase">Verified entry</Badge>
                      </div>
                      <div className="space-y-3">
                        <Textarea 
                          placeholder="Document transaction details, requirements, or meeting minutes..." 
                          className="bg-slate-50 border-border text-slate-900 font-sans text-sm h-28 focus-visible:ring-indigo-500/20 shadow-inner"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <Button 
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-heading font-medium text-xs uppercase tracking-widest h-11"
                          onClick={handleAddFollowup}
                          disabled={!newNote.trim()}
                        >
                          Commit Entry
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6 mt-12 pt-12 border-t border-slate-200 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-heading font-bold text-slate-900 uppercase tracking-widest mb-6">Activity Timeline</h3>
                    {followups.length === 0 && history.length === 0 ? (
                      <div className="text-center py-20 text-slate-300 font-heading font-semibold uppercase tracking-widest text-[10px]">No historical activity log</div>
                    ) : (
                      <div className="space-y-0 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 pb-8">
                          {[
                            ...followups.map(f => ({ ...f, tType: 'FOLLOWUP', sortDate: f.date })),
                            ...history.map(h => ({ ...h, tType: 'HISTORY', sortDate: h.timestamp }))
                          ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()).map((item: any, i) => (
                            <div key={item.id} className="relative pl-10 pb-8 last:pb-0">
                              <div className={`absolute left-[11px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center z-10 ${
                                item.tType === 'HISTORY' ? 'border-indigo-600' : 'border-emerald-600'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  item.tType === 'HISTORY' ? 'bg-indigo-600' : 'bg-emerald-600'
                                }`} />
                              </div>
                              
                              <div className="bg-white border border-border p-4 rounded-xl shadow-sm space-y-3 group hover:border-indigo-200 transition-all hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-sans font-semibold text-slate-400 font-mono">
                                        {formatDateToDMY(item.sortDate)} {new Date(item.sortDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className={`text-[9px] font-heading font-medium uppercase border-opacity-20 ${
                                      item.tType === 'HISTORY' 
                                        ? 'text-indigo-600 bg-indigo-50 border-indigo-600' 
                                        : 'text-emerald-600 bg-emerald-50 border-emerald-600'
                                    }`}>
                                      {item.tType === 'HISTORY' ? 'Status Change' : 'Note'}
                                    </Badge>
                                </div>
                                
                                {item.tType === 'HISTORY' ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-heading font-semibold text-slate-900">
                                        <span className="text-slate-400 capitalize">{item.prev_stage.replace('_', ' ')}</span>
                                        <ArrowUpRight size={14} className="text-slate-300" />
                                        <span className="text-indigo-600 capitalize">{item.next_stage.replace('_', ' ')}</span>
                                    </div>
                                    {item.remarks && <p className="text-xs text-slate-500 font-sans italic">"{item.remarks}"</p>}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-700 font-sans leading-relaxed font-medium">{item.notes}</p>
                                )}
                                
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-sans font-bold text-slate-500">
                                      {item.user_id?.substring(0, 1).toUpperCase() || 'S'}
                                    </div>
                                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider">User {item.user_id || 'System'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 mt-12 pt-12 border-t border-slate-200 animate-in fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] font-heading uppercase font-bold text-slate-900 tracking-widest">Document Repository</h4>
                        <div className="relative">
                          <Input 
                              type="file" 
                              id="file-upload" 
                              className="hidden" 
                              onChange={handleFileUpload}
                              disabled={isUploading}
                            />
                          <Button 
                              asChild 
                              variant="outline" 
                              className="h-9 text-[10px] font-heading font-medium uppercase tracking-widest bg-white border-border text-slate-600 hover:text-slate-900 shadow-sm"
                              disabled={isUploading}
                            >
                              <label htmlFor="file-upload" className="cursor-pointer">
                                <Upload size={12} className="mr-2" /> {isUploading ? 'Transferring...' : 'Upload Asset'}
                              </label>
                          </Button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        {lead.attachments?.length ? (
                          lead.attachments.map((link, i) => {
                            const isObj = typeof link === 'object' && link !== null;
                            const fileName = isObj ? (link as any).name : `Asset_${i+1}.pdf`;
                            const fileUrl = isObj ? (link as any).url : link;
                            
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName) || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(fileUrl);
                            
                            return (
                              <div key={i} className="flex flex-col gap-3 p-4 rounded-xl bg-white border border-border hover:border-indigo-300 transition-all group shadow-sm hover:shadow-md">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors shrink-0">
                                      <FileText size={24} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-sans font-bold text-slate-800 group-hover:text-slate-900 transition-colors truncate mb-0.5">{fileName}</p>
                                      <p className="text-[10px] text-slate-400 font-sans font-medium truncate uppercase flex items-center gap-1">
                                        <Clock size={10} /> Static Archive
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" asChild title="View File">
                                        <a href={fileUrl} target="_blank" rel="noreferrer">
                                          <ExternalLink size={16} />
                                        </a>
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" asChild title="Download File">
                                        <a href={fileUrl} download={fileName}>
                                          <Download size={16} />
                                        </a>
                                      </Button>
                                  </div>
                                </div>
                                {isImage && (
                                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                    <a href={fileUrl} target="_blank" rel="noreferrer">
                                      <img src={fileUrl} alt={fileName} className="w-full max-h-[300px] object-contain hover:opacity-90 transition-opacity" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                              <FileText size={32} className="mx-auto text-slate-200 mb-2" />
                              <p className="text-[10px] font-heading text-slate-400 font-bold uppercase tracking-widest">No assets available</p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
            <div className="w-full flex gap-3">
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-medium h-12 text-xs uppercase tracking-widest shadow-sm shadow-indigo-500/20">Advance Stage</Button>
              <Button variant="ghost" className="border-none text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-12 px-6 font-heading font-medium text-[10px] uppercase tracking-widest">Retire Lead</Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
