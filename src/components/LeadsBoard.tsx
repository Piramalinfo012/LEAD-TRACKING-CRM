import { useState, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Info, 
  Phone, 
  Mail, 
  Tag, 
  Calendar,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useApi } from '../lib/api';
import { Lead, LeadStatus } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { useMemo } from 'react';
import LeadDetailsSheet from './LeadDetailsSheet';
import NewLeadDialog from './NewLeadDialog';

const STAGES: LeadStatus[] = [
  LeadStatus.COLD,
  LeadStatus.LEAD,
  LeadStatus.MEETING,
  LeadStatus.TECHNICAL_DISCUSSION,
  LeadStatus.NEGOTIATION,
  LeadStatus.ORDER
];

const STAGE_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.COLD]: 'Cold',
  [LeadStatus.LEAD]: 'Lead',
  [LeadStatus.MEETING]: 'Meeting',
  [LeadStatus.TECHNICAL_DISCUSSION]: 'Tech Talk',
  [LeadStatus.NEGOTIATION]: 'Negotiation',
  [LeadStatus.ORDER]: 'Order',
  [LeadStatus.CLOSED]: 'Closed'
};

export default function KanbanBoard() {
  const { request, loading } = useApi();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('ALL');

  const salesPersonsList = useMemo(() => {
    const list = new Set<string>();
    leads.forEach(lead => {
      const spName = lead['Sales Person Name'] || lead.owner_id || 'Unassigned';
      if (spName) {
        list.add(spName.trim());
      }
    });
    return Array.from(list).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!selectedSalesPerson || selectedSalesPerson === 'ALL') {
      return leads;
    }
    return leads.filter(lead => {
      const spName = (lead['Sales Person Name'] || lead.owner_id || 'Unassigned').toLowerCase().trim();
      return spName === selectedSalesPerson.toLowerCase().trim();
    });
  }, [leads, selectedSalesPerson]);

  const fetchLeads = async () => {
    try {
      const cached = localStorage.getItem('crm_leads_cache');
      if (cached) {
        try { setLeads(JSON.parse(cached)); } catch(e) {}
      }
      const data = await request('/api/leads');
      setLeads(data);
      localStorage.setItem('crm_leads_cache', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const moveLead = async (leadId: string, nextStage: LeadStatus) => {
    try {
      await request(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStage }),
      });
      toast.success('Lead stage updated');
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter(l => (l.status?.toUpperCase() || 'COLD') === stage);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="h-full flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-700 pb-12 lg:pb-0">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-semibold text-slate-900 tracking-tight">Lead Stages</h1>
          <p className="text-slate-500 font-sans text-xs mt-1">Track where each lead is in the process.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
              <SelectTrigger className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-sm">
                <SelectValue placeholder="All Sales Persons" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All Sales Persons</SelectItem>
                {salesPersonsList.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => setIsNewLeadDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md shadow-indigo-500/20 py-2 font-heading font-medium text-[10px] uppercase tracking-widest h-10 px-5 rounded-xl shrink-0"
          >
             <Plus size={18} /> New Lead
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
        {STAGES.map((stage) => (
          <div key={stage} className="w-80 shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-heading font-semibold uppercase tracking-widest text-slate-900">{STAGE_LABELS[stage]}</h3>
                <Badge variant="outline" className="bg-white text-slate-700 border-slate-300 rounded-full text-[10px] font-sans font-semibold">
                  {leadsByStage[stage]?.length || 0}
                </Badge>
              </div>
            </div>

            <div className="flex-1 space-y-3 p-1">
              {loading && (!leadsByStage[stage] || leadsByStage[stage].length === 0) ? (
                <>
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </>
              ) : (
                leadsByStage[stage]?.map((lead) => (
                  <Card 
                     key={lead.id} 
                     className="bg-white border-border hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] group"
                     onClick={() => setSelectedLead(lead)}
                  >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-heading font-semibold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                          {lead.company_name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-sans font-medium truncate uppercase tracking-tight">{lead.contact_person}</p>
                      </div>
                      <Badge className={`
                        text-[10px] font-heading font-medium uppercase px-1.5 py-0 rounded border-none
                        ${lead.priority === 'HIGH' || lead.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}
                      `}>
                        {lead.priority}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                       <div className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-tight">
                          <AlertCircle size={12} className="text-slate-300" />
                          <span className="truncate">{lead.product || 'General'}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-tight">
                          <Tag size={12} className="text-slate-300" />
                          <span className="truncate">{lead.source || 'Direct'}</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                       <div className="flex -space-x-1.5">
                         <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-sans font-bold text-slate-600">MK</div>
                       </div>
                       <div className="flex items-center gap-1">
                          <span className="text-[10px] font-heading font-medium text-indigo-600 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                          <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-6 w-6 text-slate-400 hover:bg-slate-50 hover:text-indigo-600"
                             onClick={(e) => {
                               e.stopPropagation();
                               moveLead(lead.id, STAGES[STAGES.indexOf(stage) + 1] || stage);
                             }}
                             disabled={STAGES.indexOf(stage) === STAGES.length -1}
                          >
                            <ChevronRight size={14} />
                          </Button>
                       </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
              
              {leadsByStage[stage]?.length === 0 && (
                <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium italic">
                   Stage is empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <LeadDetailsSheet 
         lead={selectedLead} 
         isOpen={!!selectedLead} 
         onClose={() => setSelectedLead(null)} 
         onUpdate={fetchLeads}
      />

      <NewLeadDialog 
        isOpen={isNewLeadDialogOpen} 
        onClose={() => setIsNewLeadDialogOpen(false)} 
        onSuccess={fetchLeads} 
      />
    </div>
  );
}
