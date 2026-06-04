import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { formatDateToDMY, getEmbeddableUrl } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Download, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Share2,
  Table as TableIcon,
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';
import { useApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Badge } from './ui/badge';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

export default function Reports() {
  const { request, loading } = useApi();
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('ALL');
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updateMonthWiseDates = (month: string, year: string) => {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const firstDayStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const lastDayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setFromDate(firstDayStr);
    setToDate(lastDayStr);
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'LAST_30_DAYS') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setFromDate(past30.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    } else if (preset === 'LAST_90_DAYS') {
      const past90 = new Date();
      past90.setDate(today.getDate() - 90);
      setFromDate(past90.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    } else if (preset === 'MONTH_WISE') {
      updateMonthWiseDates(filterMonth, filterYear);
    }
  };

  const handleExportWithDates = () => {
    if (!leads || leads.length === 0) {
      import('sonner').then(({ toast }) => toast.error('No data available to export'));
      return;
    }

    // Filter leads by date range if dates are provided
    let filtered = leads;
    const dateFrom = exportDateFrom ? new Date(exportDateFrom) : null;
    const dateTo = exportDateTo ? new Date(exportDateTo) : null;

    if (dateFrom || dateTo) {
      filtered = leads.filter(lead => {
        const rawDate = lead.created_at || lead['Timestamp'] || lead.lead_actual_date || '';
        if (!rawDate) return !dateFrom; // include if no date and no from filter
        const leadDate = new Date(rawDate);
        if (isNaN(leadDate.getTime())) return true; // include if date unparseable
        if (dateFrom && leadDate < dateFrom) return false;
        if (dateTo) {
          // Make dateTo inclusive of the full day
          const toEnd = new Date(dateTo);
          toEnd.setHours(23, 59, 59, 999);
          if (leadDate > toEnd) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        import('sonner').then(({ toast }) => toast.error('No leads found in the selected date range'));
        return;
      }
    }

    // Extract all unique headers
    const headers = Array.from(new Set(filtered.flatMap(Object.keys)));
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...filtered.map(lead => 
        headers.map(header => {
          let cell = lead[header] === null || lead[header] === undefined ? '' : String(lead[header]);
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            cell = `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\n');

    const fromStr = exportDateFrom ? exportDateFrom.replace(/-/g, '') : 'ALL';
    const toStr = exportDateTo ? exportDateTo.replace(/-/g, '') : 'ALL';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `CRM_Export_${fromStr}_to_${toStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExportDialogOpen(false);
    import('sonner').then(({ toast }) => toast.success(`Exported ${filtered.length} records successfully`));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const cached = localStorage.getItem('crm_leads_cache');
        if (cached) {
          try { setLeads(JSON.parse(cached)); } catch(e) {}
        }
        setIsSyncing(true);
        const data = await request('/api/leads', { silent: !!cached });
        if (data && Array.isArray(data)) {
          setLeads(data);
          localStorage.setItem('crm_leads_cache', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setIsSyncing(false);
      }
    }
    async function loadAvatars() {
      try {
        const data = await request('/api/users/avatars');
        if (data && Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach(u => {
            if (u.name) map[u.name.toLowerCase().trim()] = u.profile_url;
          });
          setAvatars(map);
        }
      } catch (err) {}
    }
    loadData();
    loadAvatars();

    const handleSync = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLeads(e.detail);
      }
    };
    window.addEventListener('crm_leads_updated', handleSync);
    return () => window.removeEventListener('crm_leads_updated', handleSync);
  }, []);

  const salesPersonsList = useMemo(() => {
    const list = new Set<string>();
    leads.forEach(l => {
      const name = l['Sales Person Name'] || l.owner_id || 'Unassigned';
      if (name) {
        list.add(name.trim());
      }
    });
    return Array.from(list).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // 1. Sales Person filter
      if (selectedSalesPerson && selectedSalesPerson !== 'ALL') {
        const spName = (l['Sales Person Name'] || l.owner_id || 'Unassigned').toLowerCase().trim();
        if (spName !== selectedSalesPerson.toLowerCase().trim()) return false;
      }

      // 2. Date range filter
      const rawDate = l.created_at || l['Timestamp'] || '';
      if (rawDate) {
        const leadDate = new Date(rawDate);
        if (!isNaN(leadDate.getTime())) {
          if (fromDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            if (leadDate < start) return false;
          }
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (leadDate > end) return false;
          }
        }
      }
      return true;
    });
  }, [leads, selectedSalesPerson, fromDate, toDate]);

  const leadStats = useMemo(() => {
    const groups: Record<string, any> = {};
    const isWon = (l: any) => l.order_status && String(l.order_status).toLowerCase().trim() === 'recieved';
    
    filteredLeads.forEach((l: any) => {
      const name = l['Sales Person Name'] || l.owner_id || 'Unassigned';
      if (!groups[name]) {
        groups[name] = { name, leads: 0, conversions: 0, value: 0 };
      }
      groups[name].leads++;
      if (isWon(l)) {
        groups[name].conversions++;
        groups[name].value += Number(l.expected_value || 0);
      }
    });

    return Object.values(groups).sort((a: any, b: any) => b.leads - a.leads);
  }, [filteredLeads]);

  const dashboardMetrics = useMemo(() => {
    let inHand = 0;
    let quotationShared = 0;
    let meetingDone = 0;
    let rateShared = 0;
    let negotiation = 0;
    let orderReceived = 0;

    const getLeadStage = (lead: any) => {
      if (lead.closed_at || String(lead.status || '').toUpperCase() === 'CLOSED') return 'closed';
      if (lead.order_planned_date && !lead.order_actual_date) return 'order';
      if (lead.negotiation_planned_date && !lead.negotiation_actual_date) return 'negotiation';
      if (lead.tech_planned_date && !lead.tech_actual_date) return 'tech';
      if (lead.sample_planned_date && !lead.sample_actual_date) return 'sample';
      if (lead.meeting_planned_date && !lead.meeting_actual_date) return 'meeting';
      if (lead.lead_planned_date && !lead.lead_actual_date) return 'lead';
      return 'cold';
    };

    filteredLeads.forEach((l: any) => {
      const stage = getLeadStage(l);
      
      // Active Leads in hand (not closed)
      if (stage !== 'closed') {
        inHand++;
      }
      
      // Quotation shared (has quotation url or stage is negotiation/order)
      if (l.quotation_url || l.negotiation_status?.toLowerCase().includes('quotation') || stage === 'negotiation' || stage === 'order') {
        quotationShared++;
      }

      // Meeting Done (has actual date or stage passed meeting)
      if (l.meeting_actual_date || stage === 'meeting' || stage === 'tech' || stage === 'sample' || stage === 'negotiation' || stage === 'order') {
        meetingDone++;
      }

      // Rate Shared (has final price)
      if (l.final_price) {
        rateShared++;
      }

      // Negotiation Stage
      if (stage === 'negotiation') {
        negotiation++;
      }

      // Order Received = WON (order_status === 'Recieved')
      if (l.order_status && String(l.order_status).toLowerCase().trim() === 'recieved') {
        orderReceived++;
      }
    });

    return { inHand, quotationShared, meetingDone, rateShared, negotiation, orderReceived };
  }, [filteredLeads]);


  return (
    <>
      <div className="space-y-6 lg:space-y-8 animate-in zoom-in-95 duration-500 pb-12 lg:pb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-heading font-semibold text-slate-900 tracking-tight">Lead Reports</h1>
            {isSyncing && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-sans font-bold uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                Syncing
              </div>
            )}
          </div>
          <p className="text-slate-500 font-sans text-xs mt-1">Detailed statistics on lead conversion and performance.</p>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
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
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 px-3 shadow-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 ${
              showFilters 
                ? 'bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100'
                : 'bg-white border-border text-slate-500 hover:text-slate-900'
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline text-xs font-semibold">Filters</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-white border-border text-slate-600 hover:text-slate-900 shadow-sm shrink-0 h-10 w-10 rounded-xl"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('crm_leads_refresh'));
            }}
            disabled={isSyncing}
            title="Manual Refresh"
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin text-indigo-500" : ""} />
          </Button>
          <Button 
            onClick={() => setIsExportDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20 text-[10px] font-heading font-medium uppercase tracking-wider h-10 px-5 rounded-xl shrink-0 gap-1.5"
          >
            <Calendar size={14} /> Export with Date
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-300/85 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">Date Range Preset</Label>
            <Select value={datePreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-xs">
                <SelectValue placeholder="Select Preset" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All Time</SelectItem>
                <SelectItem value="THIS_MONTH">This Month</SelectItem>
                <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                <SelectItem value="LAST_90_DAYS">Last 90 Days</SelectItem>
                <SelectItem value="MONTH_WISE">Month-wise Filter</SelectItem>
                <SelectItem value="CUSTOM">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {datePreset === 'MONTH_WISE' ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">Select Month</Label>
                <Select 
                  value={filterMonth} 
                  onValueChange={(val) => {
                    setFilterMonth(val);
                    updateMonthWiseDates(val, filterYear);
                  }}
                >
                  <SelectTrigger className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-xs">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="0">January</SelectItem>
                    <SelectItem value="1">February</SelectItem>
                    <SelectItem value="2">March</SelectItem>
                    <SelectItem value="3">April</SelectItem>
                    <SelectItem value="4">May</SelectItem>
                    <SelectItem value="5">June</SelectItem>
                    <SelectItem value="6">July</SelectItem>
                    <SelectItem value="7">August</SelectItem>
                    <SelectItem value="8">September</SelectItem>
                    <SelectItem value="9">October</SelectItem>
                    <SelectItem value="10">November</SelectItem>
                    <SelectItem value="11">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">Select Year</Label>
                <Select 
                  value={filterYear} 
                  onValueChange={(val) => {
                    setFilterYear(val);
                    updateMonthWiseDates(filterMonth, val);
                  }}
                >
                  <SelectTrigger className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus:ring-indigo-500/20 font-sans text-xs">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Array.from({ length: new Date().getFullYear() - 2024 + 2 }, (_, i) => String(2024 + i)).map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">From Date</Label>
                <Input 
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus-visible:ring-indigo-500/20 font-sans text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-heading">To Date</Label>
                <Input 
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-white border-border text-slate-900 h-10 rounded-xl shadow-sm focus-visible:ring-indigo-500/20 font-sans text-xs"
                />
              </div>
            </>
          )}
        </div>
      )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Leads In Hand', value: dashboardMetrics.inHand, color: 'from-indigo-600 via-indigo-500 to-indigo-800', shadow: 'shadow-indigo-900/40', border: 'border-indigo-400/30' },
            { label: 'Meeting Done', value: dashboardMetrics.meetingDone, color: 'from-blue-600 via-blue-500 to-blue-800', shadow: 'shadow-blue-900/40', border: 'border-blue-400/30' },
            { label: 'Rate Shared', value: dashboardMetrics.rateShared, color: 'from-emerald-500 via-emerald-400 to-emerald-700', shadow: 'shadow-emerald-900/40', border: 'border-emerald-300/30' },
            { label: 'Quotation Shared', value: dashboardMetrics.quotationShared, color: 'from-amber-500 via-amber-400 to-amber-700', shadow: 'shadow-amber-900/40', border: 'border-amber-300/30' },
            { label: 'Negotiation', value: dashboardMetrics.negotiation, color: 'from-purple-600 via-purple-500 to-purple-800', shadow: 'shadow-purple-900/40', border: 'border-purple-400/30' },
            { label: 'Order Received', value: dashboardMetrics.orderReceived, color: 'from-pink-600 via-pink-500 to-pink-800', shadow: 'shadow-pink-900/40', border: 'border-pink-400/30' }
          ].map((stat, i) => (
            <Card key={i} className={`relative overflow-hidden bg-gradient-to-b ${stat.color} border-t ${stat.border} border-l-0 border-r-0 border-b-0 shadow-2xl ${stat.shadow} text-white rounded-[1.5rem] group transition-all duration-300 hover:-translate-y-2 hover:shadow-3xl hover:brightness-110`} style={{ boxShadow: 'inset 0px 4px 6px rgba(255, 255, 255, 0.2), 0px 10px 15px -3px rgba(0, 0, 0, 0.3), 0px 4px 6px -2px rgba(0, 0, 0, 0.15)' }}>
              
              {/* Dynamic 3D lighting effects */}
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-white opacity-20 rounded-full blur-[24px] group-hover:opacity-30 group-hover:scale-125 transition-all duration-500"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-20 rounded-full blur-[16px]"></div>
              
              {/* Subtle glass reflection line at the top */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              
              <CardContent className="p-5 flex flex-col justify-center items-center text-center relative z-10 h-full">
                <span className="text-4xl md:text-5xl font-heading font-black mb-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] tracking-tighter" style={{ textShadow: '0 4px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)' }}>{stat.value}</span>
                <span className="text-[10px] md:text-[11px] uppercase font-bold tracking-[0.15em] opacity-90 leading-tight drop-shadow-sm mt-1">{stat.label}</span>
              </CardContent>
              
              {/* 3D bottom bevel */}
              <div className="absolute bottom-0 inset-x-0 h-2 bg-black/20 mix-blend-overlay"></div>
            </Card>
          ))}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
               <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Employee Performance</CardTitle>
               <CardDescription className="text-slate-500 font-sans">Total leads vs Converted deals by sales rep</CardDescription>
            </div>
            <Select defaultValue="month">
               <SelectTrigger className="w-full sm:w-32 bg-slate-50 border-border text-slate-600 h-9">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent className="bg-white">
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
               </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadStats} layout="vertical" margin={{ left: -10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                <Bar dataKey="leads" name="Total Leads" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="conversions" name="Conversions" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="bg-white border-border shadow-sm">
              <CardHeader>
                 <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Quick Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                 {[
                   { 
                     label: 'Avg. Conversion Rate', 
                     value: leadStats.length ? `${Math.round((leadStats.reduce((acc, curr) => acc + (curr.conversions/curr.leads), 0) / leadStats.length) * 100)}%` : '0%', 
                     change: 'Active', 
                     color: 'emerald' 
                   },
                   { 
                     label: 'Total Lead Value', 
                     value: `₹${leadStats.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}`, 
                     change: 'Net', 
                     color: 'indigo' 
                   },
                   { 
                     label: 'Best Performer', 
                     value: leadStats[0]?.name || 'N/A', 
                     change: 'Top', 
                     color: 'purple',
                     isPerformer: true
                   },
                 ].map((item: any, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap mb-1">{item.label}</p>
                          <div className="flex items-center gap-3">
                            {item.isPerformer && item.value !== 'N/A' && (
                              <Avatar className="w-10 h-10 ring-2 ring-purple-500/20 shadow-sm">
                                <AvatarImage src={getEmbeddableUrl(avatars[item.value.toLowerCase().trim()])} referrerPolicy="no-referrer" />
                                <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-sm">{item.value.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            <p className="text-lg font-sans font-semibold text-slate-900">{item.value}</p>
                          </div>
                       </div>
                       <Badge className={`bg-white border text-${item.color}-500 border-${item.color}-500/20 text-[10px] font-heading font-medium`}>{item.change}</Badge>
                    </div>
                 ))}
              </CardContent>
           </Card>

           <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none shadow-lg text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wider">
                   <Share2 size={16} /> Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-indigo-50 leading-relaxed font-sans font-medium">
                    {leadStats.length > 0 
                      ? `${leadStats[0]?.name} is currently leads with ${leadStats[0]?.leads} prospects. Focus on following up with technical discussions to move them to the next stage.`
                      : 'Add more lead data to generate automated performance insights and conversion recommendations.'}
                 </p>
              </CardContent>
           </Card>
        </div>
      </div>

      <Card className="bg-white border-border shadow-sm overflow-hidden">
        <CardHeader>
           <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <TableIcon size={18} className="text-indigo-500" /> Tabular Performance Report
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-400 font-heading uppercase text-[10px] font-bold tracking-widest border-y border-slate-100">
                   <tr>
                      <th className="px-6 py-4">Sales Representative</th>
                      <th className="px-6 py-4">Leads</th>
                      <th className="px-6 py-4">Won</th>
                      <th className="px-6 py-4">Lead Value</th>
                      <th className="px-6 py-4">Rate</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {leadStats.map((row, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={getEmbeddableUrl(avatars[row.name.toLowerCase().trim()])} referrerPolicy="no-referrer" />
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">{row.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-sans font-semibold text-slate-900">{row.name}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-sans">{row.leads}</td>
                        <td className="px-6 py-4 text-slate-600 font-sans">{row.conversions}</td>
                        <td className="px-6 py-4 font-sans font-bold text-indigo-600">₹{row.value.toLocaleString()}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                                 <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(row.conversions/row.leads)*100 || 0}%` }} />
                              </div>
                              <span className="text-[10px] font-sans font-bold text-slate-500">{Math.round((row.conversions/row.leads)*100) || 0}%</span>
                           </div>
                        </td>
                     </tr>
                   ))}
                   {leadStats.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                           No performance data available yet.
                        </td>
                     </tr>
                   )}
                </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
    </div>

    {/* Date Range Export Dialog - rendered via Portal directly on body */}
    {isExportDialogOpen && createPortal(
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '16px' }}
        onClick={() => setIsExportDialogOpen(false)}
      >
        <div
          style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '380px', padding: '24px', position: 'relative' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setIsExportDialogOpen(false)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Download size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Export Data</h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Select date range to filter export</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>From Date</label>
              <input
                type="date"
                value={exportDateFrom}
                onChange={e => setExportDateFrom(e.target.value)}
                style={{ width: '100%', height: '44px', padding: '0 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#334155', background: '#f8fafc', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>To Date</label>
              <input
                type="date"
                value={exportDateTo}
                min={exportDateFrom || undefined}
                onChange={e => setExportDateTo(e.target.value)}
                style={{ width: '100%', height: '44px', padding: '0 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#334155', background: '#f8fafc', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <p style={{ fontSize: '11px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', padding: '10px', margin: 0 }}>
              💡 Dates blank chhod do to <strong>saara data</strong> export hoga
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setExportDateFrom(''); setExportDateTo(''); }}
                style={{ flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '600' }}
              >
                Clear
              </button>
              <button
                onClick={handleExportWithDates}
                style={{ flex: 1, height: '40px', border: 'none', borderRadius: '10px', background: '#4f46e5', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}


