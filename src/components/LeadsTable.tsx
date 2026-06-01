import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnDef,
} from '@tanstack/react-table';
import { 
  MoreHorizontal, 
  Search, 
  ArrowUpDown, 
  Filter, 
  Download,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Plus,
  Calendar,
  ArrowRight,
  XCircle
} from 'lucide-react';
import { useApi } from '../lib/api';
import { Lead, LeadStatus, Priority } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { formatDateToDMY, customDateSortFn, customIdSortFn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import LeadDetailsSheet from './LeadDetailsSheet';
import NewLeadDialog from './NewLeadDialog';
import ColdLeadFormDialog from './ColdLeadFormDialog';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

export default function LeadsTable() {
  const { request, loading } = useApi();
  const { user } = useAuth();
  const { stage } = useParams<{ stage: string }>();
  const [data, setData] = useState<Lead[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        await request(`/api/leads/${id}`, {
          method: 'DELETE'
        });
        toast.success("Lead successfully deleted");
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete lead");
      }
    }
  };

  const handlePromoteLead = async (id: string) => {
    try {
      await request(`/api/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: LeadStatus.LEAD, remarks: 'Promoted from Cold stage to pipeline Lead' })
      });
      toast.success("Lead promoted successfully to Lead pipeline!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to promote lead");
    }
  };
  
  const [sorting, setSorting] = useState<SortingState>([
    { 
      id: 'id', 
      desc: true 
    }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedColdLeadForForm, setSelectedColdLeadForForm] = useState<Lead | null>(null);
  const [promoteTargetStage, setPromoteTargetStage] = useState<LeadStatus | undefined>(undefined);
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const salesPersonsList = useMemo(() => {
    const list = new Set<string>();
    data.forEach(lead => {
      const spName = lead['Sales Person Name'] || lead.owner_id || 'Unassigned';
      if (spName) {
        list.add(spName.trim());
      }
    });
    return Array.from(list).sort();
  }, [data]);

  const sourcesList = useMemo(() => {
    const list = new Set<string>();
    data.forEach(lead => {
      const src = lead.Source || lead.source || 'Unspecified';
      if (src) {
        list.add(src.trim());
      }
    });
    return Array.from(list).sort();
  }, [data]);

  const productsList = useMemo(() => {
    const list = new Set<string>();
    data.forEach(lead => {
      const prod = lead.product || 'General';
      if (prod) {
        list.add(prod.trim());
      }
    });
    return Array.from(list).sort();
  }, [data]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSalesPerson !== 'ALL') count++;
    if (selectedSource !== 'ALL') count++;
    if (selectedProduct !== 'ALL') count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [selectedSalesPerson, selectedSource, selectedProduct, fromDate, toDate]);

  const filteredData = useMemo(() => {
    return data.filter(lead => {
      if (selectedSalesPerson && selectedSalesPerson !== 'ALL') {
        const spName = (lead['Sales Person Name'] || lead.owner_id || 'Unassigned').toLowerCase().trim();
        if (spName !== selectedSalesPerson.toLowerCase().trim()) {
          return false;
        }
      }

      if (selectedSource && selectedSource !== 'ALL') {
        const leadSrc = (lead.Source || lead.source || 'Unspecified').toLowerCase().trim();
        if (leadSrc !== selectedSource.toLowerCase().trim()) {
          return false;
        }
      }

      if (selectedProduct && selectedProduct !== 'ALL') {
        const leadProd = (lead.product || 'General').toLowerCase().trim();
        if (leadProd !== selectedProduct.toLowerCase().trim()) {
          return false;
        }
      }

      if (fromDate) {
        const leadDate = new Date(lead.created_at);
        const filterFrom = new Date(fromDate);
        filterFrom.setHours(0, 0, 0, 0);
        if (leadDate < filterFrom) {
          return false;
        }
      }

      if (toDate) {
        const leadDate = new Date(lead.created_at);
        const filterTo = new Date(toDate);
        filterTo.setHours(23, 59, 59, 999);
        if (leadDate > filterTo) {
          return false;
        }
      }

      if (stage) {
        const stageKey = stage.toLowerCase();
        
        if (stageKey === 'lead') {
          const hasPlanned = !!(lead.lead_planned_date);
          const hasActual = !!(lead.lead_actual_date);
          if (!hasPlanned || hasActual) return false;
        } else if (stageKey === 'meeting') {
          const hasPlanned = !!(lead.meeting_planned_date);
          const hasActual = !!(lead.meeting_actual_date);
          if (!hasPlanned || hasActual) return false;
        } else if (stageKey === 'tech') {
          const hasPlanned = !!(lead.tech_planned_date);
          const hasActual = !!(lead.tech_actual_date);
          if (!hasPlanned || hasActual) return false;
        } else if (stageKey === 'negotiation') {
          const hasPlanned = !!(lead.negotiation_planned_date);
          const hasActual = !!(lead.negotiation_actual_date);
          if (!hasPlanned || hasActual) return false;
        } else if (stageKey === 'order') {
          const hasPlanned = !!(lead.order_planned_date);
          const hasActual = !!(lead.order_actual_date);
          if (!hasPlanned || hasActual) return false;
        } else if (stageKey === 'sample') {
          const hasPlanned = !!(lead.sample_planned_date);
          const hasActual = !!(lead.sample_actual_date);
          if (!hasPlanned || hasActual) return false;
        } else if (stageKey === 'closed') {
          // If BS Col (closed_at) is NOT null, show it
          if (!lead.closed_at) return false;
        } else {
          // cold stage
          const stageMap: Record<string, string> = {
            'cold': 'COLD'
          };
          const targetStatus = stageMap[stageKey];
          if (targetStatus && (lead.status?.toUpperCase() || 'COLD') !== targetStatus) return false;
        }
      }

      return true;
    });
  }, [data, selectedSalesPerson, selectedSource, selectedProduct, fromDate, toDate, stage]);

  const fetchData = async () => {
    try {
      const applyData = (leadsToApply: any[]) => {
        setData(leadsToApply); // Status filtering is now handled in filteredData
      };

      const cached = localStorage.getItem('crm_leads_cache');
      if (cached) {
        try { applyData(JSON.parse(cached)); } catch(e) {}
      }

      setIsSyncing(true);
      const leads = await request('/api/leads', { silent: !!cached });
      applyData(leads);
      localStorage.setItem('crm_leads_cache', JSON.stringify(leads));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stage]);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setData(e.detail);
      }
    };
    window.addEventListener('crm_leads_updated', handleSync);
    return () => window.removeEventListener('crm_leads_updated', handleSync);
  }, []);

  const columns = useMemo<ColumnDef<Lead>[]>(() => {
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

    const renderActions = (row: any) => {
      const canDelete = user?.role === 'ADMIN' || user?.role === 'CRM';
      
      // Determine the current stage context. Prioritize the active tab/view (stage from URL).
      let currentStageStr = (row.original.status as string) || 'COLD';
      if (stage) {
        currentStageStr = stage.toUpperCase().replace('-', '_');
        if (currentStageStr === 'TECHNICAL_DISCUSSION' || currentStageStr === 'TECH') {
          currentStageStr = 'TECHNICAL_DISCUSSION';
        }
      } else if (!row.original.status) {
         currentStageStr = 'COLD';
      }

      const currentStage = currentStageStr as LeadStatus;
      const currentIndex = STAGES_ORDER.indexOf(currentStage);
      const availableStages = currentIndex >= 0 ? STAGES_ORDER.slice(currentIndex + 1) : [];

      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-indigo-600 hover:bg-slate-50 hover:text-indigo-700 rounded-lg"
            onClick={() => setSelectedLead(row.original)}
            title="Edit Lead"
          >
            <Edit size={16} />
          </Button>
          {availableStages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg"
              title="Update or Promote Stage"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedColdLeadForForm(row.original);
              }}
            >
              <ArrowRight size={16} />
            </Button>
          )}
          {currentStage !== LeadStatus.CLOSED && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:text-amber-600 rounded-lg"
              title="Close Lead"
              onClick={(e) => {
                e.stopPropagation();
                setPromoteTargetStage(LeadStatus.CLOSED);
                setSelectedColdLeadForForm(row.original);
              }}
            >
              <XCircle size={16} />
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
              onClick={() => handleDeleteLead(row.original.id)}
              title="Delete Lead"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      );
    };

    const defaultCols: ColumnDef<Lead>[] = [
      {
        accessorKey: 'id',
        meta: { className: 'hidden md:table-cell' },
        sortingFn: customIdSortFn,
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-4 hover:bg-slate-50 group font-heading font-semibold">
            Lead ID <ArrowUpDown className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-[10px] font-bold text-slate-600 font-mono tracking-tight">{row.getValue('id')}</div>,
      },
      {
        accessorKey: 'company_name',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-4 hover:bg-slate-50 group font-heading font-semibold">
            Party / Org <ArrowUpDown className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-heading font-semibold text-slate-900">{row.original['Party Name'] || row.getValue('company_name')}</div>,
      },
      {
        accessorKey: 'contact_person',
        header: 'Contact Person',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-slate-900 font-sans font-medium">{row.original['Person Name'] || row.getValue('contact_person')}</span>
            <span className="text-xs text-slate-600 font-sans font-normal tracking-tight">{row.original['Gmail ID'] || row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'mobile',
        meta: { className: 'hidden sm:table-cell' },
        header: 'Mobile No.',
        cell: ({ row }) => {
          const mobileNumber = row.original['Mobile No. '] || row.original.mobile;
          return (
            <div className="flex items-center gap-2">
              {mobileNumber && (
                <a 
                  href={`tel:${String(mobileNumber).replace(/\D/g, '')}`} 
                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Click to call"
                >
                  <Phone size={14} />
                </a>
              )}
              <span className="text-slate-600 font-sans font-medium">{mobileNumber}</span>
            </div>
          );
        },
      },
      {
        id: 'view',
        meta: { className: 'hidden md:table-cell' },
        header: '',
        cell: ({ row }) => (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={(e) => { e.stopPropagation(); setSelectedLead(row.original); }}
          >
            <Eye size={16} />
          </Button>
        ),
      }
    ];

    if (stage?.toLowerCase() === 'cold') {
      return [
        {
          accessorKey: 'created_at',
          meta: { className: 'hidden md:table-cell' },
          header: 'Timestamp',
          sortingFn: customDateSortFn,
          cell: ({ row }) => {
            const raw = row.original.Timestamp || row.original.created_at;
            return <div className="text-xs font-bold text-slate-600 tracking-tight whitespace-nowrap">{formatDateToDMY(raw) || '-'}</div>;
          }
        },
        ...defaultCols,
        {
          accessorKey: 'District',
          meta: { className: 'hidden md:table-cell' },
          header: 'District',
          cell: ({ row }) => <div className="text-xs font-bold text-slate-600 uppercase tracking-tight">{row.original.District || row.original.city || '-'}</div>
        },
        {
          accessorKey: 'Follow Up date',
          meta: { className: 'hidden md:table-cell' },
          header: 'Follow Up date',
          sortingFn: customDateSortFn,
          cell: ({ row }) => <div className="text-xs font-bold text-indigo-700 uppercase tracking-tight">{formatDateToDMY(row.original['Follow Up date'] || row.original.followup_date) || '-'}</div>
        },

        {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => {
            const canDelete = user?.role === 'ADMIN' || user?.role === 'CRM';
            return (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-indigo-600 hover:bg-slate-50 hover:text-indigo-700 rounded-lg"
                  onClick={() => setSelectedLead(row.original)}
                  title="View/Edit Details"
                >
                  <Edit size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-emerald-600 hover:bg-slate-50 hover:text-emerald-700 rounded-lg"
                  onClick={() => setSelectedColdLeadForForm(row.original)}
                  title="Update Stage"
                >
                  <ArrowUpDown size={16} />
                </Button>
                {canDelete && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                    onClick={() => handleDeleteLead(row.original.id)}
                    title="Delete Lead"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            );
          }
        },
    ];
  }

  if (stage?.toLowerCase() === 'closed') {
    const closedCols = [...defaultCols];

    closedCols.push({
      accessorKey: 'close_reason',
      header: 'Lost Reason',
      cell: ({ row }) => (
        <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
          {row.original.close_reason || '-'}
        </div>
      )
    });

    closedCols.push({
      accessorKey: 'close_remark',
      header: 'Remark',
      cell: ({ row }) => (
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider line-clamp-2 max-w-[150px]">
          {row.original.close_remark || '-'}
        </div>
      )
    });

    closedCols.push({
      accessorKey: 'closed_at',
      header: 'Closed Date',
      sortingFn: customDateSortFn,
      cell: ({ row }) => (
        <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider whitespace-nowrap">
          {formatDateToDMY(row.original.closed_at) || '-'}
        </div>
      )
    });

    closedCols.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => renderActions(row)
    });

    return closedCols as ColumnDef<Lead>[];
  }

  if (stage?.toLowerCase() === 'lead') {
    const leadCols = [...defaultCols];

    leadCols.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => renderActions(row)
    });

    return leadCols as ColumnDef<Lead>[];
  }

  if (stage?.toLowerCase() === 'meeting') {
    const meetingCols = [...defaultCols];

    meetingCols.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => renderActions(row)
    });

    return meetingCols as ColumnDef<Lead>[];
  }

  // Standard columns for other stages
  return [
    ...defaultCols,
    {
      accessorKey: 'status',
      meta: { className: 'hidden sm:table-cell' },
      header: 'Stage',
      cell: ({ row }) => {
        const status = row.getValue('status') as LeadStatus;
        return (
          <Badge className={`
            capitalize font-heading font-medium text-[10px] border-none px-2 py-0.5 rounded-full
            ${status === 'ORDER' ? 'bg-emerald-50 text-emerald-600' : 
              status === 'CLOSED' ? 'bg-rose-50 text-rose-600' :
              'bg-indigo-50 text-indigo-600'}
          `}>
             {status.toLowerCase().replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      meta: { className: 'hidden md:table-cell' },
      header: 'Timestamp',
      sortingFn: customDateSortFn,
      cell: ({ row }) => {
        return <div className="text-[10px] text-slate-600 font-sans font-medium uppercase tracking-tight">{formatDateToDMY(row.original.created_at || row.original.Timestamp)}</div>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => renderActions(row)
    },
  ];
}, [stage, user]);

const table = useReactTable({
  data: filteredData,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  onSortingChange: setSorting,
  getSortedRowModel: getSortedRowModel(),
  onGlobalFilterChange: setGlobalFilter,
  getFilteredRowModel: getFilteredRowModel(),
  state: {
    sorting,
    globalFilter,
  },
});

  const handleDownloadCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No data to download.");
      return;
    }
    
    const headers = [
      'id', 'company_name', 'contact_person', 'mobile', 'email', 'address', 'district', 'state', 'source', 'status', 'sales_person_name',
      'lead_status', 'product_details', 'pain_points', 'lead_planned_date', 'lead_actual_date',
      'meeting_status', 'meeting_planned_date', 'meeting_actual_date', 'meeting_person_name', 'meeting_number',
      'tech_status', 'tech_planned_date', 'tech_actual_date',
      'negotiation_status', 'negotiation_planned_date', 'negotiation_actual_date',
      'order_status', 'order_planned_date', 'order_actual_date',
      'created_at'
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of filteredData) {
      const values = headers.map(header => {
        let val = (row as any)[header] || '';
        val = String(val).replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) {
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-heading font-semibold text-slate-900 tracking-tight">
            {stage 
              ? (stage.toLowerCase() === 'closed' ? 'Lost Lead List' : `${stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')} List`) 
              : 'Lead Management'}
          </h2>
          {isSyncing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-sans font-bold uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              Syncing
            </div>
          )}
        </div>
        <p className="text-xs text-slate-600 font-sans font-medium tracking-tight">
          Manage and track leads in the {stage?.toLowerCase() === 'closed' ? 'lost' : (stage || 'total')} pipeline.
        </p>
      </div>



      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <Input
            placeholder="Search leads..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 bg-white border-border text-slate-900 font-sans text-sm h-11 sm:h-10 shadow-sm focus-visible:ring-indigo-500/20 rounded-xl"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
            <SelectTrigger className="bg-white border-border text-slate-900 h-11 sm:h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-sm">
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
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button 
          variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
          onClick={() => setShowFilters(prev => !prev)}
          className={`h-11 sm:h-10 shadow-sm grow sm:grow-0 flex items-center justify-center gap-1.5 px-3 rounded-xl transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              : 'bg-white border-border text-slate-500 hover:text-slate-900'
          }`}
        >
          <Filter size={18} />
          <span className="hidden leading-none sm:inline text-xs font-semibold">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-white border-border text-slate-600 hover:text-slate-900 shadow-sm grow sm:grow-0 h-11 sm:h-10"
          onClick={handleDownloadCSV}
          title="Download CSV"
        >
          <Download size={18} />
        </Button>
        <Button 
          onClick={() => setIsNewLeadDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20 font-heading font-medium text-[10px] uppercase tracking-widest gap-2 grow sm:grow-0 h-11 sm:h-10 px-6"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Lead</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </div>

    {showFilters && (
      <div className="bg-slate-50/50 border border-slate-200/85 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">Lead Source</label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-xs">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="ALL">All Sources</SelectItem>
              {sourcesList.map(src => (
                <SelectItem key={src} value={src}>{src}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">Product / Item</label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-xs">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="ALL">All Products</SelectItem>
              {productsList.map(prod => (
                <SelectItem key={prod} value={prod}>{prod}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">From Date (Timestamp)</label>
          <Input 
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus-visible:ring-indigo-500/20 font-sans text-xs"
          />
        </div>

        <div className="space-y-1.5 flex flex-col justify-between">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">To Date (Timestamp)</label>
            <Input 
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus-visible:ring-indigo-500/20 font-sans text-xs"
            />
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end pt-1">
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedSalesPerson('ALL');
                setSelectedSource('ALL');
                setSelectedProduct('ALL');
                setFromDate('');
                setToDate('');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-3 rounded-lg flex items-center gap-1.5"
            >
              Reset All Filters
            </Button>
          </div>
        )}
      </div>
    )}
    
    <NewLeadDialog 
      isOpen={isNewLeadDialogOpen} 
      onClose={() => setIsNewLeadDialogOpen(false)} 
      onSuccess={fetchData} 
    />

    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="hidden md:block overflow-x-auto text-slate-900">
        <Table>
        <TableHeader className="bg-slate-50 border-b-2 border-slate-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={`text-slate-700 font-heading font-semibold uppercase text-[11px] tracking-widest py-5 h-14 ${(header.column.columnDef.meta as any)?.className || ''}`}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading && data.length === 0 ? (
            [1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {columns.map((col: any, index) => (
                  <TableCell key={index} className={`py-4 ${col.meta?.className || ''}`}>
                    <Skeleton className="h-6 w-full rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedLead(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={`py-4 ${(cell.column.columnDef.meta as any)?.className || ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-40 text-center py-8">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="text-slate-600 italic text-sm font-medium">No prospects found in pipeline.</span>
                  {activeFiltersCount > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSalesPerson('ALL');
                        setSelectedSource('ALL');
                        setSelectedProduct('ALL');
                        setFromDate('');
                        setToDate('');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs h-8 border border-slate-300 rounded-lg px-3 shadow-sm font-semibold transition"
                    >
                      Clear Active Filters
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden flex flex-col divide-y divide-slate-100 text-slate-900">
        {loading && data.length === 0 ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 space-y-3">
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          ))
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
              onClick={() => setSelectedLead(row.original)}
            >
              <div>
                <div className="font-heading font-semibold text-slate-900 text-sm">
                  {row.original['Party Name'] || row.original.company_name}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  {row.original['Person Name'] || row.original.contact_person}
                </div>
              </div>

              <div className="h-px bg-slate-100 my-1" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                   {(row.original['Mobile No. '] || row.original.mobile) && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                         <Phone size={12} className="text-emerald-600" />
                         {(row.original['Mobile No. '] || row.original.mobile)}
                      </div>
                   )}
                   
                   <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Calendar size={12} className="text-slate-600" />
                      {formatDateToDMY(row.original.created_at || row.original.Timestamp) || '-'}
                   </div>

                   {stage?.toLowerCase() === 'cold' && (row.original['Follow Up date'] || row.original.followup_date) && (
                      <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
                         <Calendar size={12} className="text-indigo-400" />
                         Follow Up: {formatDateToDMY(row.original['Follow Up date'] || row.original.followup_date)}
                      </div>
                   )}
                   
                   {stage?.toLowerCase() === 'lead' && (row.original['Lead Planned Date'] || row.original.lead_planned_date) && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                         <Calendar size={12} className="text-slate-600" />
                         Planned: {formatDateToDMY(row.original['Lead Planned Date'] || row.original.lead_planned_date)}
                      </div>
                   )}
                   
                   {stage?.toLowerCase() === 'meeting' && (row.original['Meeting Planned'] || row.original.meeting_planned_date) && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                         <Calendar size={12} className="text-slate-600" />
                         Planned: {formatDateToDMY(row.original['Meeting Planned'] || row.original.meeting_planned_date)}
                      </div>
                   )}
                   
                   {row.original.District && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium uppercase tracking-tight">
                         <span className="font-bold text-[10px] text-slate-600">DIST:</span> {row.original.District}
                      </div>
                   )}

                   {!stage && row.getValue('status') && (
                      <div className="flex items-center gap-1.5">
                         <Badge className={`
                           capitalize font-heading font-medium text-[9px] border-none px-2 py-0.5 rounded-full
                           ${row.getValue('status') === 'ORDER' ? 'bg-emerald-50 text-emerald-600' : 
                             row.getValue('status') === 'CLOSED' ? 'bg-rose-50 text-rose-600' :
                             'bg-indigo-50 text-indigo-600'}
                         `}>
                            {(row.getValue('status') as string).toLowerCase().replace('_', ' ')}
                         </Badge>
                      </div>
                   )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto sm:ml-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const actionCell = row.getVisibleCells().find(c => c.column.id === 'actions');
                    return actionCell ? flexRender(actionCell.column.columnDef.cell, actionCell.getContext()) : null;
                  })()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 flex flex-col items-center justify-center space-y-3">
             <span className="text-slate-600 italic text-sm font-medium">No prospects found in pipeline.</span>
             {activeFiltersCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedSalesPerson('ALL');
                    setSelectedSource('ALL');
                    setSelectedProduct('ALL');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs h-8 border border-slate-300 rounded-lg px-3 shadow-sm font-semibold transition mt-2"
                >
                  Clear Active Filters
                </Button>
             )}
          </div>
        )}
      </div>
    </div>
    
    <div className="flex items-center justify-between px-2">
      <div className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">
        Showing {table.getFilteredRowModel().rows.length} Active Records
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="bg-white border-border text-slate-600 disabled:opacity-30 h-8 font-bold text-[10px] uppercase tracking-wider"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="bg-white border-border text-slate-600 disabled:opacity-30 h-8 font-bold text-[10px] uppercase tracking-wider"
        >
          Next
        </Button>
      </div>
    </div>

      <LeadDetailsSheet 
         lead={selectedLead} 
         isOpen={!!selectedLead} 
         onClose={() => setSelectedLead(null)} 
         onUpdate={fetchData}
         currentStageView={stage}
      />

      <ColdLeadFormDialog
        lead={selectedColdLeadForForm}
        isOpen={!!selectedColdLeadForForm}
        onClose={() => {
          setSelectedColdLeadForForm(null);
          setPromoteTargetStage(undefined);
        }}
        onSuccess={fetchData}
        promoteToStage={promoteTargetStage}
        currentStageView={stage}
      />
    </div>
  );
}
