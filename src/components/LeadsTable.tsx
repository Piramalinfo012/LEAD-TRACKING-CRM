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
  Plus
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
import { formatDateToDMY } from '../lib/utils';
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

export default function LeadsTable() {
  const { request, loading } = useApi();
  const { user } = useAuth();
  const { stage } = useParams<{ stage: string }>();
  const [data, setData] = useState<Lead[]>([]);

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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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

      return true;
    });
  }, [data, selectedSalesPerson, selectedSource, selectedProduct, fromDate, toDate]);

  const fetchData = async () => {
    try {
      const applyData = (leadsToApply: any[]) => {
        if (stage) {
          const stageMap: Record<string, LeadStatus> = {
            'cold': LeadStatus.COLD,
            'lead': LeadStatus.LEAD,
            'meeting': LeadStatus.MEETING,
            'tech': LeadStatus.TECHNICAL_DISCUSSION,
            'negotiation': LeadStatus.NEGOTIATION,
            'order': LeadStatus.ORDER
          };
          const targetStatus = stageMap[stage.toLowerCase()];
          if (targetStatus) {
            setData(leadsToApply.filter((l: Lead) => l.status?.toUpperCase() === targetStatus));
            return;
          }
        }
        setData(leadsToApply);
      };

      const cached = localStorage.getItem('crm_leads_cache');
      if (cached) {
        try { applyData(JSON.parse(cached)); } catch(e) {}
      }

      const leads = await request('/api/leads');
      applyData(leads);
      localStorage.setItem('crm_leads_cache', JSON.stringify(leads));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stage]);

  const columns = useMemo<ColumnDef<Lead>[]>(() => {
    const defaultCols: ColumnDef<Lead>[] = [
      {
        accessorKey: 'id',
        header: () => <span className="hidden md:inline">Lead ID</span>,
        cell: ({ row }) => <div className="text-[10px] font-bold text-slate-400 font-mono tracking-tight hidden md:block">{row.getValue('id')}</div>,
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
            <span className="text-xs text-slate-400 font-sans font-normal tracking-tight">{row.original['Gmail ID'] || row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'mobile',
        header: () => <span className="hidden sm:inline">Mobile No.</span>,
        cell: ({ row }) => {
          const mobileNumber = row.original['Mobile No. '] || row.original.mobile;
          return (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-600 font-sans font-medium">{mobileNumber}</span>
              {mobileNumber && (
                <a 
                  href={`tel:${String(mobileNumber).replace(/\D/g, '')}`} 
                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Click to call"
                >
                  <Phone size={14} />
                </a>
              )}
            </div>
          );
        },
      },
      {
        id: 'view',
        header: '',
        cell: ({ row }) => (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
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
          header: 'Timestamp',
          cell: ({ row }) => {
            const raw = row.original.Timestamp || row.original.created_at;
            return <div className="text-xs font-bold text-slate-600 tracking-tight whitespace-nowrap">{formatDateToDMY(raw) || '-'}</div>;
          }
        },
        ...defaultCols,
        {
          accessorKey: 'District',
          header: 'District',
          cell: ({ row }) => <div className="text-xs font-bold text-slate-600 uppercase tracking-tight">{row.original.District || row.original.city || '-'}</div>
        },
        {
          accessorKey: 'Follow Up date',
          header: 'Follow Up date',
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
                  onClick={() => handlePromoteLead(row.original.id)}
                  title="Promote to Lead"
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

  // Standard columns for other stages
  return [
    ...defaultCols,
    {
      accessorKey: 'status',
      header: 'Status',
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
      header: () => <span className="hidden md:inline">Timestamp</span>,
      cell: ({ row }) => {
        return <div className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-tight hidden md:block">{formatDateToDMY(row.original.created_at || row.original.Timestamp)}</div>;
      },
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
              title="Edit Lead"
            >
              <Edit size={16} />
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

return (
  <div className="space-y-6 animate-in fade-in duration-700 pb-12">
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-heading font-semibold text-slate-900 tracking-tight">
        {stage ? `${stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')} List` : 'Lead Management'}
      </h2>
      <p className="text-xs text-slate-400 font-sans font-medium tracking-tight">
        Manage and track leads in the {stage || 'total'} pipeline.
      </p>
    </div>

    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
        <Button variant="outline" size="icon" className="bg-white border-border text-slate-400 hover:text-slate-900 shadow-sm grow sm:grow-0 h-11 sm:h-10">
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
      <div className="overflow-x-auto text-slate-900">
        <Table>
        <TableHeader className="bg-slate-50 border-b-2 border-slate-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-slate-700 font-heading font-semibold uppercase text-[11px] tracking-widest py-5 h-14">
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
                {columns.map((_, index) => (
                  <TableCell key={index} className="py-4">
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
                  <TableCell key={cell.id} className="py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-40 text-center py-8">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="text-slate-400 italic text-sm font-medium">No prospects found in pipeline.</span>
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
    </div>
    
    <div className="flex items-center justify-between px-2">
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
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
      />
    </div>
  );
}
