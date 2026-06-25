import React, { useState, useEffect, useRef } from 'react';
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
  FileCheck,
  Camera
} from 'lucide-react';

interface ColdLeadFormDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedLead?: Lead) => void;
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

    // Order Stage
    order_copy_url: '',
    delivery_in: '',
    unloading: '',
    motor_pump_requirement: '',
    transport: '',
    order_remark: '',
    order_attachment_url: '',
    order_status: '',
    
    // Sample Stage
    sample_actual_date: '',
    sample_status: '',
    sample_product_name: '',
    sample_qty: '',
    sample_dispatch_date: '',
    sample_remark: '',
    sample_attachment: '',
    
    close_reason: '',
    close_remark: '',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<LeadStatus | ''>('');
  const [techProducts, setTechProducts] = useState<any[]>([]);


  const [masterPaymentTerms, setMasterPaymentTerms] = useState<string[]>([]);
  const [masterPartyTypes, setMasterPartyTypes] = useState<string[]>([]);
  const [masterUnits, setMasterUnits] = useState<string[]>([]);
  const [masterDeliveryIn, setMasterDeliveryIn] = useState<string[]>([]);
  const [masterUnloading, setMasterUnloading] = useState<string[]>([]);
  const [masterTransport, setMasterTransport] = useState<string[]>([]);
  const [masterOrderStatus, setMasterOrderStatus] = useState<string[]>([]);
  
  const [motorPumpYesNo, setMotorPumpYesNo] = useState<'Yes' | 'No' | ''>('');

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await request('/api/master-data');
        if (Array.isArray(res)) {
          const products = new Set<string>();
          const paymentTerms = new Set<string>();
          const partyTypes = new Set<string>();
          const units = new Set<string>();
          const deliveryInSet = new Set<string>();
          const unloadingSet = new Set<string>();
          const transportSet = new Set<string>();
          const orderStatusSet = new Set<string>();

          res.forEach(row => {
            const p = String(row['Product details.'] || '');
            if (p.trim()) products.add(p.trim());

            const pt = String(row['Payment Terms'] || '');
            if (pt.trim()) paymentTerms.add(pt.trim());

            const party = String(row['Party Type classification:'] || '');
            if (party.trim()) partyTypes.add(party.trim());

            const u = String(row['Unit'] || '');
            if (u.trim()) units.add(u.trim());
            
            const dIn = String(row['Delivery In'] || '');
            if (dIn.trim()) deliveryInSet.add(dIn.trim());
            
            const unl = String(row['Unloading'] || '');
            if (unl.trim()) unloadingSet.add(unl.trim());
            
            const trans = String(row[8] || row['Transport:'] || '');
            if (trans.trim()) transportSet.add(trans.trim());

            const ordStat = String(row[9] || row['Order Status'] || '');
            if (ordStat.trim()) orderStatusSet.add(ordStat.trim());
          });

          setMasterProducts(Array.from(products));
          setMasterPaymentTerms(Array.from(paymentTerms));
          setMasterPartyTypes(Array.from(partyTypes));
          setMasterUnits(Array.from(units));
          setMasterDeliveryIn(Array.from(deliveryInSet));
          setMasterUnloading(Array.from(unloadingSet));
          setMasterTransport(Array.from(transportSet));
          setMasterOrderStatus(Array.from(orderStatusSet));
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

        order_copy_url: lead.order_copy_url || '',
        delivery_in: lead.delivery_in || '',
        unloading: lead.unloading || '',
        motor_pump_requirement: lead.motor_pump_requirement || '',
        transport: lead.transport || '',
        order_remark: lead.order_remark || '',
        order_attachment_url: lead.order_attachment_url || '',
        order_status: lead.order_status || '',
        
        sample_actual_date: lead.sample_actual_date || '',
        sample_status: lead.sample_status || '',
        sample_product_name: lead.sample_product_name || '',
        sample_qty: lead.sample_qty || '',
        sample_dispatch_date: lead.sample_dispatch_date || '',
        sample_remark: lead.sample_remark || '',
        sample_attachment: lead.sample_attachment || '',
        
        close_reason: lead.close_reason || '',
        close_remark: lead.close_remark || '',
      });
      setSelectedProducts(
        lead.product_details 
          ? lead.product_details.split(',').map(s => s.trim()).filter(Boolean) 
          : []
      );
      
      if (lead.motor_pump_requirement) {
        if (lead.motor_pump_requirement.trim().toLowerCase() === 'no') {
          setMotorPumpYesNo('No');
        } else {
          setMotorPumpYesNo('Yes');
        }
      } else {
        setMotorPumpYesNo('');
      }
      
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
      if (payload.reschedule_date) payload.reschedule_date = formatDateToDMY(payload.reschedule_date);
      if (payload.sample_dispatch_date) payload.sample_dispatch_date = formatDateToDMY(payload.sample_dispatch_date);

      // Do NOT send any planned dates as they are auto-generated in Google Sheets
      delete payload.lead_planned_date;
      delete payload.meeting_planned_date;
      delete payload.tech_planned_date;
      delete payload.negotiation_planned_date;
      delete payload.order_planned_date;
      
      if (selectedStage) {
        payload.status = selectedStage;
      }

        // Automatically store actual dates based on stage movement or if they are missing
        const stagesSeq = [
          LeadStatus.LEAD,
          LeadStatus.MEETING,
          LeadStatus.SAMPLE,
          LeadStatus.TECHNICAL_DISCUSSION,
          LeadStatus.NEGOTIATION,
          LeadStatus.ORDER,
          LeadStatus.CLOSED
        ];

        if (selectedStage) {
          const selectedIndex = stagesSeq.indexOf(selectedStage as LeadStatus);
          
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.LEAD)) {
            if (!lead.lead_actual_date && payload.custom_status !== 'Reschedule') payload.lead_actual_date = nowDmy;
          }
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.MEETING)) {
            if (!lead.meeting_actual_date && payload.meeting_status !== 'Reschedule') payload.meeting_actual_date = nowDmy;
          }
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.SAMPLE)) {
            if (!lead.sample_actual_date && payload.sample_status !== 'Reschedule') payload.sample_actual_date = nowDmy;
          }
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.TECHNICAL_DISCUSSION)) {
            if (!lead.tech_actual_date && payload.tech_status !== 'Reschedule') payload.tech_actual_date = nowDmy;
          }
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.NEGOTIATION)) {
            if (!lead.negotiation_actual_date && payload.negotiation_status !== 'Reschedule') payload.negotiation_actual_date = nowDmy;
          }
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.ORDER)) {
            if (!lead.order_actual_date && payload.order_status !== 'Reschedule') payload.order_actual_date = nowDmy;
          }
          if (selectedIndex >= stagesSeq.indexOf(LeadStatus.CLOSED)) {
            if (!lead.closed_at) payload.closed_at = nowDmy;
          }
        }

      const savedLead = await request(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const updatedLead = {
        ...lead,
        ...((savedLead && typeof savedLead === 'object') ? savedLead : payload),
        id: lead.id,
      } as Lead;

      try {
        const cached = localStorage.getItem('crm_leads_cache');
        if (cached) {
          const cachedLeads = JSON.parse(cached);
          if (Array.isArray(cachedLeads)) {
            const nextLeads = cachedLeads.map((item: Lead) => (
              item.id === lead.id ? { ...item, ...updatedLead } : item
            ));
            localStorage.setItem('crm_leads_cache', JSON.stringify(nextLeads));
            window.dispatchEvent(new CustomEvent('crm_leads_updated', { detail: nextLeads }));
          }
        }
      } catch (cacheError) {
        console.warn('Unable to sync lead cache after update:', cacheError);
      }

      let successMsg = 'Lead updated successfully!';
      let isPremium = false;

      // Check for Final Order Received
      if (selectedStage === LeadStatus.ORDER || payload.order_status === 'Recieved' || payload.order_status === 'Received') {
        successMsg = '🎉 Congratulations! Final Order Received successfully! 🚀';
        isPremium = true;
      } 
      // Check for Reschedule
      else if (
        (payload.meeting_status === 'Reschedule' && payload.meeting_status !== lead.meeting_status) || 
        (payload.tech_status === 'Reschedule' && payload.tech_status !== lead.tech_status) || 
        (payload.negotiation_status === 'Reschedule' && payload.negotiation_status !== lead.negotiation_status) || 
        (payload.custom_status === 'Reschedule' && payload.custom_status !== lead.custom_status) || 
        (payload.order_status === 'Reschedule' && payload.order_status !== lead.order_status) || 
        (payload.reschedule_date && payload.reschedule_date !== lead.reschedule_date)
      ) {
        successMsg = '📅 Meeting Rescheduled successfully!';
      }
      // Check for Follow up
      else if (
        (payload.custom_status === 'Follow up' && payload.custom_status !== lead.custom_status) || 
        (payload.meeting_status === 'Follow up' && payload.meeting_status !== lead.meeting_status) || 
        (payload.tech_status === 'Follow up' && payload.tech_status !== lead.tech_status) || 
        (payload.negotiation_status === 'Follow up' && payload.negotiation_status !== lead.negotiation_status) ||
        (payload.order_status === 'Follow up' && payload.order_status !== lead.order_status) ||
        (payload.meeting_followup_date && payload.meeting_followup_date !== lead.meeting_followup_date) ||
        (payload.followup_date && payload.followup_date !== lead.followup_date)
      ) {
        successMsg = '⏱️ Follow-up scheduled successfully!';
      }

      if (isPremium) {
        toast.success(successMsg, {
          duration: 6000,
          className: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-none shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] !text-base',
        });
      } else {
        toast.success(successMsg);
      }

      onSuccess(updatedLead);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setIsSaving(false);
    }
  };

  const [uploadingQuotation, setUploadingQuotation] = useState(false);
  const [uploadingMeetingUrl, setUploadingMeetingUrl] = useState(false);
  const [uploadingTechKit, setUploadingTechKit] = useState(false);
  const [uploadingNegKit, setUploadingNegKit] = useState(false);
  const [uploadingOrderCopy, setUploadingOrderCopy] = useState(false);
  const [uploadingOrderAttachment, setUploadingOrderAttachment] = useState(false);
  const [uploadingSampleAttachment, setUploadingSampleAttachment] = useState(false);
  const [uploadingMCB, setUploadingMCB] = useState(false);
  const [uploadingKit, setUploadingKit] = useState(false);
  const [uploadingMeeting, setUploadingMeeting] = useState(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      toast.error("Unable to access camera directly. Opening device camera...");
      setIsCameraActive(false);
      // Fallback to native capture input
      document.getElementById('meeting-camera')?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            // Upload photo
            setUploadingMeeting(true);
            const uploadData = new FormData();
            uploadData.append('file', file);
            
            const toastId = toast.loading('Uploading captured photo...');
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
                setFormData(prev => ({ ...prev, meeting_url: result.webViewLink }));
                toast.success('Photo captured and uploaded successfully!', { id: toastId });
              } else {
                throw new Error(result.error || 'Upload failed');
              }
            } catch (err: any) {
              toast.error('Photo upload failed: ' + err.message, { id: toastId });
            } finally {
              setUploadingMeeting(false);
            }
          }
        }, 'image/jpeg', 0.85);
      }
    }
    stopCamera();
    setIsCameraActive(false);
  };

  // Bind video stream to ref when camera becomes active
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.error("Video play failed:", err);
      });
    }
  }, [isCameraActive, cameraStream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
  const isSampleFieldsVisible = selectedStage === LeadStatus.SAMPLE;
  const isTechFieldsVisible = selectedStage === LeadStatus.TECHNICAL_DISCUSSION;
  const isNegotiationFieldsVisible = selectedStage === LeadStatus.NEGOTIATION;
  const isOrderFieldsVisible = selectedStage === LeadStatus.ORDER;
  const isClosedFieldsVisible = selectedStage === LeadStatus.CLOSED;

  const STAGES_ORDER = [
    LeadStatus.COLD,
    LeadStatus.LEAD,
    LeadStatus.MEETING,
    LeadStatus.SAMPLE,
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
                  className="bg-white border-slate-300 text-sm h-11 focus-visible:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Target size={12} /> Shift to Stage
                </Label>
                <Select value={selectedStage} onValueChange={(val) => setSelectedStage(val as LeadStatus)}>
                  <SelectTrigger className="bg-white border-indigo-300 text-indigo-900 h-11 focus:ring-indigo-500/20 font-semibold text-sm shadow-sm">
                    <SelectValue placeholder="Select Stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {allowedStages.map(stage => (
                      <SelectItem key={stage} value={stage} className="font-medium text-sm">
                        {stage === LeadStatus.CLOSED ? 'LOST LEAD' : stage.replace('_', ' ')}
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
                          className="w-full justify-between h-auto min-h-[44px] py-2 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal text-left"
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
                    <div className="relative">
                      <input type="file" id="mcb-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'mcb_requirement', setUploadingMCB)} disabled={uploadingMCB} />
                      <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.mcb_requirement ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={() => document.getElementById('mcb-upload')?.click()}>
                        {uploadingMCB ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.mcb_requirement ? <><FileCheck size={16}/><span>File Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload File</span></>}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={12} /> Pain Points - Remark in Detail
                  </Label>
                  <Textarea 
                    value={formData.pain_points}
                    onChange={(e) => setFormData(p => ({ ...p, pain_points: e.target.value }))}
                    className="bg-white border-slate-300 text-sm min-h-[80px] resize-none focus-visible:ring-indigo-500/20"
                    placeholder="Describe the customer's pain points in detail..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Briefcase size={12} /> KIT Url
                    </Label>
                    <div className="relative">
                      <input type="file" id="kit-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'kit_details', setUploadingKit)} disabled={uploadingKit} />
                      <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.kit_details ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={() => document.getElementById('kit-upload')?.click()}>
                        {uploadingKit ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.kit_details ? <><FileCheck size={16}/><span>File Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload KIT</span></>}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <CalendarClock size={12} /> Meeting Follow-up Date
                    </Label>
                    <Input 
                      type="date"
                      value={formData.meeting_followup_date}
                      onChange={(e) => setFormData(p => ({ ...p, meeting_followup_date: e.target.value }))}
                      className="bg-white border-slate-300 text-sm h-11"
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
                      <Target size={12} /> Meeting Status
                    </Label>
                    <Select value={formData.meeting_status} onValueChange={(val) => setFormData(p => ({ ...p, meeting_status: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11 focus:ring-indigo-500/20">
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
                          className="bg-white border-slate-300 text-sm h-11"
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
                          className="bg-white border-slate-300 text-sm h-11"
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
                        className="bg-white border-slate-300 text-sm min-h-[80px] resize-none focus-visible:ring-indigo-500/20"
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
                          className="bg-white border-slate-300 text-sm h-11"
                          placeholder="Short remarks..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                          <LinkIcon size={12} /> Meeting File / Image (Url)
                        </Label>
                        <div className="flex gap-2">
                          <input type="file" id="meeting-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'meeting_url', setUploadingMeeting)} disabled={uploadingMeeting} />
                          <input type="file" id="meeting-camera" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, 'meeting_url', setUploadingMeeting)} disabled={uploadingMeeting} />
                          <Button type="button" variant="outline" className={`h-11 flex-1 flex items-center justify-center gap-2 ${formData.meeting_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={startCamera} disabled={uploadingMeeting}>
                            {uploadingMeeting ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.meeting_url ? <><FileCheck size={16}/><span>Photo Uploaded</span></> : <><Camera size={16} className="text-indigo-600" /><span>Take Photo</span></>}
                          </Button>
                          <Button type="button" variant="outline" className={`h-11 px-4 flex items-center justify-center ${formData.meeting_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={() => document.getElementById('meeting-upload')?.click()} disabled={uploadingMeeting} title="Upload File from Device">
                            <Upload size={18} className="text-slate-600" />
                          </Button>
                        </div>
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
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11 focus:ring-indigo-500/20">
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
                            className={`h-11 w-full flex items-center justify-center gap-2 ${formData.tech_kit_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}
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
                      <Button type="button" onClick={addTechProduct} variant="outline" size="sm" className="h-8 gap-1.5 bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-300">
                        <Plus size={14} /> Add Product
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {techProducts.map((prod, idx) => (
                        <div key={idx} className="bg-white border border-slate-300 rounded-xl p-4 space-y-4 relative animate-in slide-in-from-bottom-2">
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
                                <SelectTrigger className="bg-white border-slate-300 text-xs h-9">
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
                        <div className="text-center p-8 bg-white border border-dashed border-slate-300 rounded-xl">
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

            {isSampleFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b pb-2">
                  Sample Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sample Actual Date</Label>
                    <Input type="date" value={formData.sample_actual_date || new Date().toISOString().split('T')[0]} disabled className="h-11 text-sm bg-slate-50 border-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Product Name</Label>
                    <Select value={formData.sample_product_name} onValueChange={(val) => setFormData(p => ({ ...p, sample_product_name: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60">
                        {masterProducts.length > 0 ? masterProducts.map(p => (
                          <SelectItem key={p} value={p} className="text-sm font-medium">{p}</SelectItem>
                        )) : (
                          <div className="p-2 text-xs text-slate-500 text-center">Loading products...</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Qty</Label>
                    <Input value={formData.sample_qty} onChange={e => setFormData(p => ({ ...p, sample_qty: e.target.value }))} placeholder="Enter Qty" className="h-11 text-sm bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sample Dispatch Date</Label>
                    <Input type="date" value={formData.sample_dispatch_date} onChange={e => setFormData(p => ({ ...p, sample_dispatch_date: e.target.value }))} className="h-11 text-sm bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sample Status</Label>
                    <Select value={formData.sample_status} onValueChange={(val) => setFormData(p => ({ ...p, sample_status: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Dispatched">Dispatched</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Testing in Progress">Testing in Progress</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remark If-Any</Label>
                    <Textarea value={formData.sample_remark} onChange={e => setFormData(p => ({ ...p, sample_remark: e.target.value }))} placeholder="Any remarks about sample" className="bg-white min-h-[80px] text-sm" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attachment</Label>
                    <div className="relative">
                      <input type="file" id="sample-attachment-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'sample_attachment', setUploadingSampleAttachment)} disabled={uploadingSampleAttachment} />
                      <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.sample_attachment ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`} onClick={() => document.getElementById('sample-attachment-upload')?.click()}>
                        {uploadingSampleAttachment ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.sample_attachment ? <><FileCheck size={16}/><span>Attachment Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload Attachment</span></>}
                      </Button>
                    </div>
                  </div>
                </div>
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
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
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
                          <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.quotation_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`} onClick={() => document.getElementById('quotation-upload')?.click()}>
                            {uploadingQuotation ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.quotation_url ? <><FileCheck size={16}/><span>Quotation Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload Quotation</span></>}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit</Label>
                        <Select value={formData.unit} onValueChange={(val) => setFormData(p => ({ ...p, unit: val }))}>
                          <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
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
                          <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
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
                          <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
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
                          <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.negotiation_kit_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`} onClick={() => document.getElementById('neg-kit-upload')?.click()}>
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

            {isOrderFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b pb-2">
                  Order Punching Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Copy Attached (Url)</Label>
                    <div className="relative">
                      <input type="file" id="order-copy-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'order_copy_url', setUploadingOrderCopy)} disabled={uploadingOrderCopy} />
                      <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.order_copy_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`} onClick={() => document.getElementById('order-copy-upload')?.click()}>
                        {uploadingOrderCopy ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.order_copy_url ? <><FileCheck size={16}/><span>Order Copy Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload Order Copy</span></>}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Delivery In</Label>
                    <Select value={formData.delivery_in} onValueChange={(val) => setFormData(p => ({ ...p, delivery_in: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Delivery In" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60">
                        {masterDeliveryIn.map((d, i) => (
                          <SelectItem key={i} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unloading</Label>
                    <Select value={formData.unloading} onValueChange={(val) => setFormData(p => ({ ...p, unloading: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Unloading" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60">
                        {masterUnloading.map((u, i) => (
                          <SelectItem key={i} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motor / Pump Requirement</Label>
                    <div className="space-y-2">
                      <Select value={motorPumpYesNo} onValueChange={(val) => {
                        setMotorPumpYesNo(val as any);
                        if (val === 'No') setFormData(p => ({ ...p, motor_pump_requirement: 'No' }));
                        else setFormData(p => ({ ...p, motor_pump_requirement: '' }));
                      }}>
                        <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                          <SelectValue placeholder="Yes / No" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      {motorPumpYesNo === 'Yes' && (
                        <Input value={formData.motor_pump_requirement === 'No' ? '' : formData.motor_pump_requirement} onChange={e => setFormData(p => ({ ...p, motor_pump_requirement: e.target.value }))} className="h-11 text-sm bg-white" placeholder="Specify Requirement" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Transport</Label>
                    <Select value={formData.transport} onValueChange={(val) => setFormData(p => ({ ...p, transport: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Transport" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-60">
                        {masterTransport.map((t, i) => (
                          <SelectItem key={i} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Status</Label>
                    <Select value={formData.order_status} onValueChange={(val) => setFormData(p => ({ ...p, order_status: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Order Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {masterOrderStatus.map((o, i) => (
                          <SelectItem key={i} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Any Specific Instructions / Remark</Label>
                    <Textarea value={formData.order_remark} onChange={e => setFormData(p => ({ ...p, order_remark: e.target.value }))} className="bg-white border-slate-300 text-sm min-h-[80px]" placeholder="Enter Remarks" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attachment</Label>
                    <div className="relative">
                      <input type="file" id="order-attachment-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'order_attachment_url', setUploadingOrderAttachment)} disabled={uploadingOrderAttachment} />
                      <Button type="button" variant="outline" className={`h-11 w-full flex items-center justify-center gap-2 ${formData.order_attachment_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`} onClick={() => document.getElementById('order-attachment-upload')?.click()}>
                        {uploadingOrderAttachment ? <><Loader2 size={16} className="animate-spin text-slate-400" /><span>Uploading...</span></> : formData.order_attachment_url ? <><FileCheck size={16}/><span>Attachment Uploaded</span></> : <><Upload size={16} className="text-indigo-600" /><span>Upload Attachment</span></>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isClosedFieldsVisible && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-rose-600 uppercase tracking-widest border-b pb-2">
                  Lost Lead Details
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lost Reason</Label>
                    <Select value={formData.close_reason} onValueChange={(val) => setFormData(p => ({ ...p, close_reason: val }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-sm h-11">
                        <SelectValue placeholder="Select Reason" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Price Issue">Price Issue</SelectItem>
                        <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                        <SelectItem value="Competitor">Competitor</SelectItem>
                        <SelectItem value="Not Interested">Not Interested</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Close Remark</Label>
                    <Textarea value={formData.close_remark} onChange={e => setFormData(p => ({ ...p, close_remark: e.target.value }))} className="min-h-[80px] text-sm bg-white" placeholder="Enter additional details for closure..." />
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
            className="w-32 font-heading font-bold text-xs uppercase tracking-widest border-slate-300 text-slate-600 hover:bg-slate-100"
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

        {isCameraActive && (
          <div className="fixed inset-0 bg-black/95 z-[99999] flex flex-col items-center justify-between p-6">
            <div className="w-full max-w-md flex justify-between items-center text-white mt-4">
              <span className="font-heading font-semibold text-lg">Take Meeting Photo</span>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  stopCamera();
                  setIsCameraActive(false);
                }}
                className="text-white hover:bg-white/10 hover:text-white rounded-lg px-3"
              >
                Cancel
              </Button>
            </div>
            
            <div className="relative w-full max-w-md aspect-[3/4] sm:aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
               />
            </div>
            
            <div className="w-full flex justify-center pb-8">
              <button 
                type="button"
                onClick={capturePhoto}
                disabled={uploadingMeeting}
                className="w-20 h-20 bg-white hover:bg-slate-100 rounded-full border-8 border-slate-300/40 flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Camera className="text-white" size={24} />
                </div>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
