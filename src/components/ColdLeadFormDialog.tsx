import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Lead, LeadStatus } from '../types';
import { toast } from 'sonner';
import { useApi } from '../lib/api';
import { formatDateToDMY } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { 
  ChevronDown, 
  Target, 
  Box, 
  Settings2, 
  MessageSquare, 
  Briefcase, 
  CalendarClock,
  User,
  Phone,
  Link as LinkIcon
} from 'lucide-react';

interface ColdLeadFormDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promoteToStage?: LeadStatus;
}

export default function ColdLeadFormDialog({ lead, isOpen, onClose, onSuccess, promoteToStage }: ColdLeadFormDialogProps) {
  const { request } = useApi();
  const [isSaving, setIsSaving] = useState(false);
  const [masterProducts, setMasterProducts] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    custom_status: '',
    
    // Lead Fields
    lead_planned_date: '',
    product_details: '',
    mcb_requirement: '',
    pain_points: '',
    kit_details: '',
    meeting_followup_date: '',

    // Meeting Fields
    meeting_planned_date: '',
    meeting_status: '',
    reschedule_date: '',
    discussion_points: '',
    meeting_person_name: '',
    meeting_number: '',
    bullet_point_remarks: '',
    meeting_url: '',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<LeadStatus | ''>('');

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await request('/api/master-data');
        if (Array.isArray(res)) {
          const products = new Set<string>();
          res.forEach(row => {
            const p = row['Product details.'];
            if (p && p.trim()) products.add(p.trim());
          });
          setMasterProducts(Array.from(products));
        }
      } catch (err) {
        console.error('Failed to load master data for products', err);
      }
    }
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen, request]);

  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        custom_status: lead.custom_status || '',
        
        lead_planned_date: lead.lead_planned_date ? lead.lead_planned_date.split('T')[0] : '',
        product_details: lead.product_details || '',
        mcb_requirement: lead.mcb_requirement || '',
        pain_points: lead.pain_points || '',
        kit_details: lead.kit_details || '',
        meeting_followup_date: lead.meeting_followup_date ? lead.meeting_followup_date.split('T')[0] : '',

        meeting_planned_date: lead.meeting_planned_date ? lead.meeting_planned_date.split('T')[0] : '',
        meeting_status: lead.meeting_status || '',
        reschedule_date: lead.reschedule_date ? lead.reschedule_date.split('T')[0] : '',
        discussion_points: lead.discussion_points || '',
        meeting_person_name: lead.meeting_person_name || '',
        meeting_number: lead.meeting_number || '',
        bullet_point_remarks: lead.bullet_point_remarks || '',
        meeting_url: lead.meeting_url || '',
      });
      setSelectedProducts(
        lead.product_details 
          ? lead.product_details.split(',').map(s => s.trim()).filter(Boolean) 
          : []
      );
      setSelectedStage(promoteToStage || (lead.status as LeadStatus) || LeadStatus.COLD);
    }
  }, [lead, isOpen, promoteToStage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    
    setIsSaving(true);
    try {
      const nowDmy = formatDateToDMY(new Date());
      const payload: any = { 
        ...formData,
        product_details: selectedProducts.join(', '),
      };

      // Format any selected dates to DD/MM/YYYY
      if (payload.meeting_followup_date) payload.meeting_followup_date = formatDateToDMY(payload.meeting_followup_date);
      if (payload.lead_planned_date) payload.lead_planned_date = formatDateToDMY(payload.lead_planned_date);
      if (payload.meeting_planned_date) payload.meeting_planned_date = formatDateToDMY(payload.meeting_planned_date);
      if (payload.reschedule_date) payload.reschedule_date = formatDateToDMY(payload.reschedule_date);
      
      if (selectedStage) {
        payload.status = selectedStage;
      }

      // Automatically store actual dates based on stage movement
      if (selectedStage === LeadStatus.LEAD && lead.status !== LeadStatus.LEAD) {
        // Moving to LEAD stage
        payload.lead_actual_date = nowDmy;
      } else if (selectedStage === LeadStatus.MEETING && lead.status !== LeadStatus.MEETING) {
        // Moving to MEETING stage
        payload.meeting_actual_date = nowDmy;
      }

      await request(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('Lead updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProduct = (prod: string) => {
    setSelectedProducts(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  const isLeadFieldsVisible = selectedStage === LeadStatus.LEAD || selectedStage === LeadStatus.COLD || !selectedStage;
  const isMeetingFieldsVisible = selectedStage === LeadStatus.MEETING;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl bg-white border-none shadow-2xl rounded-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-xl font-heading font-semibold text-slate-900 flex items-center gap-2">
            <Target className="text-indigo-600" size={24} />
            Update Lead Stage Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto px-6 py-6">
          <form id="cold-lead-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Top Section: Status & Stage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={12} /> Remarks / Custom Status
                </Label>
                <Input 
                  type="text"
                  value={formData.custom_status}
                  onChange={(e) => setFormData(p => ({ ...p, custom_status: e.target.value }))}
                  placeholder="e.g. Interested, Callback required..."
                  className="bg-white border-slate-200 text-sm h-11 focus-visible:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Target size={12} /> Shift to Stage
                </Label>
                <Select value={selectedStage} onValueChange={(val) => setSelectedStage(val as LeadStatus)}>
                  <SelectTrigger className="bg-white border-indigo-200 text-indigo-900 h-11 focus:ring-indigo-500/20 font-semibold text-sm shadow-sm">
                    <SelectValue placeholder="Select Stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.values(LeadStatus).map(stage => (
                      <SelectItem key={stage} value={stage} className="font-medium text-sm">
                        {stage.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* LEAD STAGE FIELDS */}
            {isLeadFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b pb-2">Lead Stage Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Box size={12} /> Product Details (Multiple)
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-auto min-h-[44px] py-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal text-left"
                        >
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {selectedProducts.length > 0 ? (
                              selectedProducts.map(p => (
                                <Badge key={p} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none font-medium px-2 py-0.5 text-xs">
                                  {p}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-400 text-sm">Select products...</span>
                            )}
                          </div>
                          <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[340px] bg-white max-h-60 overflow-y-auto z-50">
                        {masterProducts.length > 0 ? masterProducts.map(prod => (
                          <DropdownMenuCheckboxItem
                            key={prod}
                            checked={selectedProducts.includes(prod)}
                            onCheckedChange={() => toggleProduct(prod)}
                            onSelect={(e) => e.preventDefault()}
                            className="text-sm font-medium"
                          >
                            {prod}
                          </DropdownMenuCheckboxItem>
                        )) : (
                          <div className="p-2 text-xs text-slate-500 text-center">Loading products or none found...</div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Settings2 size={12} /> MCB According to Requirement (Url)
                    </Label>
                    <Input 
                      type="text"
                      value={formData.mcb_requirement}
                      onChange={(e) => setFormData(p => ({ ...p, mcb_requirement: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                      placeholder="Enter MCB details/url..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={12} /> Pain Points - Remark in Detail
                  </Label>
                  <Textarea 
                    value={formData.pain_points}
                    onChange={(e) => setFormData(p => ({ ...p, pain_points: e.target.value }))}
                    className="bg-white border-slate-200 text-sm min-h-[80px] resize-none focus-visible:ring-indigo-500/20"
                    placeholder="Describe the customer's pain points in detail..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Briefcase size={12} /> KIT Url
                    </Label>
                    <Input 
                      type="text"
                      value={formData.kit_details}
                      onChange={(e) => setFormData(p => ({ ...p, kit_details: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                      placeholder="Enter KIT url..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <CalendarClock size={12} /> Meeting Follow-up Date
                    </Label>
                    <Input 
                      type="date"
                      value={formData.meeting_followup_date}
                      onChange={(e) => setFormData(p => ({ ...p, meeting_followup_date: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MEETING STAGE FIELDS */}
            {isMeetingFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b pb-2">Meeting Stage Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <CalendarClock size={12} /> Meeting Planned Date
                    </Label>
                    <Input 
                      type="date"
                      value={formData.meeting_planned_date}
                      onChange={(e) => setFormData(p => ({ ...p, meeting_planned_date: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Target size={12} /> Meeting Status
                    </Label>
                    <Select value={formData.meeting_status} onValueChange={(val) => setFormData(p => ({ ...p, meeting_status: val }))}>
                      <SelectTrigger className="bg-white border-slate-200 text-sm h-11 focus:ring-indigo-500/20">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Hold">Hold</SelectItem>
                        <SelectItem value="Not Done">Not Done</SelectItem>
                        <SelectItem value="Reschedule">Reschedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.meeting_status === 'Reschedule' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] uppercase font-bold text-rose-500 tracking-wider flex items-center gap-1.5">
                      <CalendarClock size={12} /> Reschedule Meeting Date
                    </Label>
                    <Input 
                      type="date"
                      value={formData.reschedule_date}
                      onChange={(e) => setFormData(p => ({ ...p, reschedule_date: e.target.value }))}
                      className="bg-rose-50 border-rose-200 text-sm h-11 focus-visible:ring-rose-500/20"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <User size={12} /> Meeting Person Name
                    </Label>
                    <Input 
                      type="text"
                      value={formData.meeting_person_name}
                      onChange={(e) => setFormData(p => ({ ...p, meeting_person_name: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                      placeholder="Name of person met..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Phone size={12} /> Contact Number
                    </Label>
                    <Input 
                      type="tel"
                      value={formData.meeting_number}
                      onChange={(e) => setFormData(p => ({ ...p, meeting_number: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                      placeholder="Phone number..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={12} /> Discussion Points
                  </Label>
                  <Textarea 
                    value={formData.discussion_points}
                    onChange={(e) => setFormData(p => ({ ...p, discussion_points: e.target.value }))}
                    className="bg-white border-slate-200 text-sm min-h-[80px] resize-none focus-visible:ring-indigo-500/20"
                    placeholder="Enter main points discussed..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Briefcase size={12} /> Bullet Point Remarks
                    </Label>
                    <Input 
                      type="text"
                      value={formData.bullet_point_remarks}
                      onChange={(e) => setFormData(p => ({ ...p, bullet_point_remarks: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                      placeholder="Short remarks..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <LinkIcon size={12} /> Picture of Meeting Url
                    </Label>
                    <Input 
                      type="text"
                      value={formData.meeting_url}
                      onChange={(e) => setFormData(p => ({ ...p, meeting_url: e.target.value }))}
                      className="bg-white border-slate-200 text-sm h-11"
                      placeholder="URL of picture..."
                    />
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end mt-auto shrink-0">
          <Button 
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-32 font-heading font-bold text-xs uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            form="cold-lead-form"
            disabled={isSaving}
            className="w-48 bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-bold text-xs uppercase tracking-widest shadow-md shadow-indigo-500/20"
          >
            {isSaving ? "Saving..." : "Save Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
