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
  Link as LinkIcon,
  Plus,
  Trash2,
  Loader2,
  Upload,
  FileCheck
} from 'lucide-react';

interface ColdLeadFormDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promoteToStage?: LeadStatus;
  currentStageView?: string;
}

export default function ColdLeadFormDialog({ lead, isOpen, onClose, onSuccess, promoteToStage, currentStageView }: ColdLeadFormDialogProps) {
  const { request } = useApi();
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    
    // Tech Stage
    tech_status: '',
    tech_kit_url: '',
    
    // Negotiation Stage
    negotiation_status: '',
    quotation_url: '',
    unit: '',
    final_price: '',
    quantity: '',
    payment_terms: '',
    delivery_schedule: '',
    party_type: '',
    negotiation_remark: '',
    negotiation_kit_url: '',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<LeadStatus | ''>('');
  const [techProducts, setTechProducts] = useState<any[]>([]);


  const [masterPaymentTerms, setMasterPaymentTerms] = useState<string[]>([]);
  const [masterPartyTypes, setMasterPartyTypes] = useState<string[]>([]);
  const [masterUnits, setMasterUnits] = useState<string[]>([]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await request('/api/master-data');
        if (Array.isArray(res)) {
          const products = new Set<string>();
          const paymentTerms = new Set<string>();
          const partyTypes = new Set<string>();
          const units = new Set<string>();

          res.forEach(row => {
            const p = row['Product details.'];
            if (p && p.trim()) products.add(p.trim());

            const pt = row['Payment Terms'];
            if (pt && pt.trim()) paymentTerms.add(pt.trim());

            const party = row['Party Type classification:'];
            if (party && party.trim()) partyTypes.add(party.trim());

            const u = row['Unit'];
            if (u && u.trim()) units.add(u.trim());
          });

          setMasterProducts(Array.from(products));
          setMasterPaymentTerms(Array.from(paymentTerms));
          setMasterPartyTypes(Array.from(partyTypes));
          setMasterUnits(Array.from(units));
        }
      } catch (err) {
        console.error('Failed to load master data', err);
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
        
        tech_status: lead.tech_status || '',
        tech_kit_url: lead.tech_kit_url || '',

        negotiation_status: lead.negotiation_status || '',
        quotation_url: lead.quotation_url || '',
        unit: lead.unit || '',
        final_price: lead.final_price || '',
        quantity: lead.quantity || '',
        payment_terms: lead.payment_terms || '',
        delivery_schedule: lead.delivery_schedule || '',
        party_type: lead.party_type || '',
        negotiation_remark: lead.negotiation_remark || '',
        negotiation_kit_url: lead.negotiation_kit_url || '',
      });
      setSelectedProducts(
        lead.product_details 
          ? lead.product_details.split(',').map(s => s.trim()).filter(Boolean) 
          : []
      );
      
      setTechProducts(lead.tech_products || []);
      
      let calculatedStageStr = (lead.status as string) || 'COLD';
      if (currentStageView) {
        calculatedStageStr = currentStageView.toUpperCase().replace('-', '_');
        if (calculatedStageStr === 'TECH') calculatedStageStr = 'TECHNICAL_DISCUSSION';
      } else if (!lead.status) {
        calculatedStageStr = 'COLD';
      }
      
      setSelectedStage(promoteToStage || (calculatedStageStr as LeadStatus) || LeadStatus.COLD);
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

      if (selectedStage === LeadStatus.TECHNICAL_DISCUSSION) {
        payload.tech_products = techProducts;
      }

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
        payload.lead_actual_date = nowDmy;
      } else if (selectedStage === LeadStatus.MEETING && lead.status !== LeadStatus.MEETING) {
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

  const [uploadingQuotation, setUploadingQuotation] = useState(false);
  const [uploadingNegKit, setUploadingNegKit] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, setUploadingState: (state: boolean) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingState(true);
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
        setFormData(prev => ({ ...prev, [fieldName]: result.webViewLink }));
        toast.success('File uploaded and linked successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('File upload failed: ' + err.message);
    } finally {
      setUploadingState(false);
    }
  };

  const toggleProduct = (prod: string) => {
    setSelectedProducts(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  const addTechProduct = () => {
    setTechProducts([...techProducts, {
      product_name: '', density: '', gcv: '', flash_point: '', 
      moisture: '', carbon_content: '', sulphur: '', remarks: '', sediment: ''
    }]);
  };

  const removeTechProduct = (index: number) => {
    setTechProducts(techProducts.filter((_, i) => i !== index));
  };

  const updateTechProduct = (index: number, field: string, value: string) => {
    const updated = [...techProducts];
    updated[index] = { ...updated[index], [field]: value };
    setTechProducts(updated);
  };

  const isLeadFieldsVisible = selectedStage === LeadStatus.LEAD || selectedStage === LeadStatus.COLD || !selectedStage;
  const isMeetingFieldsVisible = selectedStage === LeadStatus.MEETING;
  const isTechFieldsVisible = selectedStage === LeadStatus.TECHNICAL_DISCUSSION;
  const isNegotiationFieldsVisible = selectedStage === LeadStatus.NEGOTIATION;

  const STAGES_ORDER = [
    LeadStatus.COLD,
    LeadStatus.LEAD,
    LeadStatus.MEETING,
    LeadStatus.TECHNICAL_DISCUSSION,
    LeadStatus.NEGOTIATION,
    LeadStatus.ORDER,
    LeadStatus.CLOSED
  ];
  
  let calculatedOrigStageStr = (lead?.status as string) || 'COLD';
  if (currentStageView) {
    calculatedOrigStageStr = currentStageView.toUpperCase().replace('-', '_');
    if (calculatedOrigStageStr === 'TECH') calculatedOrigStageStr = 'TECHNICAL_DISCUSSION';
  } else if (!lead?.status) {
    calculatedOrigStageStr = 'COLD';
  }
  
  const originalStage = (calculatedOrigStageStr as LeadStatus) || LeadStatus.COLD;
  const originalStageIndex = STAGES_ORDER.indexOf(originalStage);
  const allowedStages = originalStageIndex >= 0 ? STAGES_ORDER.slice(originalStageIndex) : STAGES_ORDER;

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
                    {allowedStages.map(stage => (
                      <SelectItem key={stage} value={stage} className="font-medium text-sm">
                        {stage.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

                {formData.meeting_status !== 'Reschedule' && (
                  <>
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
                          <LinkIcon size={12} /> Meeting File / Image (Url)
                        </Label>
                        <Input 
                          type="url"
                          value={formData.meeting_url}
                          onChange={(e) => setFormData(p => ({ ...p, meeting_url: e.target.value }))}
                          className="bg-white border-slate-200 text-sm h-11"
                          placeholder="Drive link to meeting image or file..."
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {isTechFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b pb-2 flex justify-between items-center">
                  Technical Discussion Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Target size={12} /> Technical Status
                    </Label>
                    <Select value={formData.tech_status} onValueChange={(val) => setFormData(p => ({ ...p, tech_status: val }))}>
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

                  {formData.tech_status !== 'Reschedule' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                        <LinkIcon size={12} /> Kit Attachment
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="file"
                            id="tech-file-upload"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'tech_kit_url', setUploading)}
                            disabled={uploading}
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            className={`h-11 w-full flex items-center justify-center gap-2 ${formData.tech_kit_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                            onClick={() => document.getElementById('tech-file-upload')?.click()}
                            disabled={uploading}
                          >
                            {uploading ? (
                              <>
                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                <span>Uploading...</span>
                              </>
                            ) : formData.tech_kit_url ? (
                              <>
                                <FileCheck size={16} />
                                <span className="font-semibold">Kit Uploaded</span>
                              </>
                            ) : (
                              <>
                                <Upload size={16} className="text-indigo-600" />
                                <span>Upload File/Image</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.tech_status === 'Reschedule' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="text-[10px] uppercase font-bold text-rose-500 tracking-wider flex items-center gap-1.5">
                        <CalendarClock size={12} /> Reschedule Date
                      </Label>
                      <Input 
                        type="date"
                        value={formData.reschedule_date}
                        onChange={(e) => setFormData(p => ({ ...p, reschedule_date: e.target.value }))}
                        className="bg-rose-50 border-rose-200 text-sm h-11 focus-visible:ring-rose-500/20"
                      />
                    </div>
                  )}
                </div>

                {formData.tech_status !== 'Reschedule' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 border rounded-lg border-slate-100">
                      <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                        <Box size={14} /> Product Negotiations
                      </Label>
                      <Button type="button" onClick={addTechProduct} variant="outline" size="sm" className="h-8 gap-1.5 bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-200">
                        <Plus size={14} /> Add Product
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {techProducts.map((prod, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 relative animate-in slide-in-from-bottom-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                            onClick={() => removeTechProduct(idx)}
                          >
                            <Trash2 size={14} />
                          </Button>
                          
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Product #{idx + 1}</div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Product Name</Label>
                              <Select value={prod.product_name} onValueChange={val => updateTechProduct(idx, 'product_name', val)}>
                                <SelectTrigger className="bg-white border-slate-200 text-xs h-9">
                                  <SelectValue placeholder="Select Product" />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-60">
                                  {masterProducts.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Density</Label>
                              <Input className="h-9 text-xs" value={prod.density} onChange={e => updateTechProduct(idx, 'density', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">GCV</Label>
                              <Input className="h-9 text-xs" value={prod.gcv} onChange={e => updateTechProduct(idx, 'gcv', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Flash Point</Label>
                              <Input className="h-9 text-xs" value={prod.flash_point} onChange={e => updateTechProduct(idx, 'flash_point', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Moisture</Label>
                              <Input className="h-9 text-xs" value={prod.moisture} onChange={e => updateTechProduct(idx, 'moisture', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Carbon Content</Label>
                              <Input className="h-9 text-xs" value={prod.carbon_content} onChange={e => updateTechProduct(idx, 'carbon_content', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Sulphur</Label>
                              <Input className="h-9 text-xs" value={prod.sulphur} onChange={e => updateTechProduct(idx, 'sulphur', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Sediment</Label>
                              <Input className="h-9 text-xs" value={prod.sediment} onChange={e => updateTechProduct(idx, 'sediment', e.target.value)} />
                            </div>
                            <div className="space-y-1.5 lg:col-span-3">
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Remarks in Detail</Label>
                              <Textarea className="min-h-[60px] text-xs" value={prod.remarks} onChange={e => updateTechProduct(idx, 'remarks', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {techProducts.length === 0 && (
                        <div className="text-center p-8 bg-white border border-dashed border-slate-200 rounded-xl">
                          <p className="text-sm text-slate-400">No products added for technical discussion.</p>
                          <Button type="button" onClick={addTechProduct} variant="outline" size="sm" className="mt-3">
                            Add First Product
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isNegotiationFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b pb-2">
                  Negotiation Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</Label>
                    <Select value={formData.negotiation_status} onValueChange={(val) => setFormData(p => ({ ...p, negotiation_status: val }))}>
                      <SelectTrigger className="bg-white border-slate-200 text-sm h-11">
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
                  
                  {formData.negotiation_status === 'Reschedule' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Reschedule Date</Label>
                      <Input type="date" value={formData.reschedule_date} onChange={e => setFormData(p => ({ ...p, reschedule_date: e.target.value }))} className="h-11 text-sm bg-rose-50 border-rose-200" />
                    </div>
                  )}

                  {formData.negotiation_status !== 'Reschedule' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quotation Upload</Label>
                        <div className="relative">
                          <input type="file" id="quotation-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'quotation_url', setUploadingQuotation)} disabled={uploadingQuotation} />
                          <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.quotation_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`} onClick={() => document.getElementById('quotation-upload')?.click()}>
                            {uploadingQuotation ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.quotation_url ? <><FileCheck size={16}/><span>Quotation Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload Quotation</span></>}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit</Label>
                        <Select value={formData.unit} onValueChange={(val) => setFormData(p => ({ ...p, unit: val }))}>
                          <SelectTrigger className="bg-white border-slate-200 text-sm h-11">
                            <SelectValue placeholder="Select Unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60">
                            {masterUnits.map((u, i) => (
                              <SelectItem key={i} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Final Price</Label>
                        <Input value={formData.final_price} onChange={e => setFormData(p => ({ ...p, final_price: e.target.value }))} className="h-11 text-sm bg-white" placeholder="Enter Final Price" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quantity</Label>
                        <Input value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} className="h-11 text-sm bg-white" placeholder="Enter Quantity" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment Terms</Label>
                        <Select value={formData.payment_terms} onValueChange={(val) => setFormData(p => ({ ...p, payment_terms: val }))}>
                          <SelectTrigger className="bg-white border-slate-200 text-sm h-11">
                            <SelectValue placeholder="Select Payment Terms" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60">
                            {masterPaymentTerms.map((pt, i) => (
                              <SelectItem key={i} value={pt}>{pt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Delivery Schedule</Label>
                        <Input value={formData.delivery_schedule} onChange={e => setFormData(p => ({ ...p, delivery_schedule: e.target.value }))} className="h-11 text-sm bg-white" placeholder="Enter Delivery Schedule" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Party Type classification</Label>
                        <Select value={formData.party_type} onValueChange={(val) => setFormData(p => ({ ...p, party_type: val }))}>
                          <SelectTrigger className="bg-white border-slate-200 text-sm h-11">
                            <SelectValue placeholder="Select Party Type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-60">
                            {masterPartyTypes.map((pt, i) => (
                              <SelectItem key={i} value={pt}>{pt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kit Attachment</Label>
                        <div className="relative">
                          <input type="file" id="neg-kit-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'negotiation_kit_url', setUploadingNegKit)} disabled={uploadingNegKit} />
                          <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.negotiation_kit_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`} onClick={() => document.getElementById('neg-kit-upload')?.click()}>
                            {uploadingNegKit ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.negotiation_kit_url ? <><FileCheck size={16}/><span>Kit Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload Kit</span></>}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {formData.negotiation_status !== 'Reschedule' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remark if-Any</Label>
                    <Textarea value={formData.negotiation_remark} onChange={e => setFormData(p => ({ ...p, negotiation_remark: e.target.value }))} className="min-h-[80px] text-sm bg-white" placeholder="Enter remarks..." />
                  </div>
                )}
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
