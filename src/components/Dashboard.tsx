import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ArrowDownRight,
  Filter,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getEmbeddableUrl } from '../lib/utils';
import { useApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
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
import IndiaMap from './IndiaMap';
import { useGlobalFilter } from '../hooks/useGlobalFilter';
import { SearchableSelect } from './ui/searchable-select';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 180,
      damping: 20
    }
  }
};

const formatDateTime = (dateInput: any) => {
  if (!dateInput) return '';
  const valStr = String(dateInput).trim();
  if (!valStr) return '';

  // Check if it's already a formatted date like DD/MM/YYYY with optional time
  if (/^\d{2}\/\d{2}\/\d{4}/.test(valStr)) {
    return valStr;
  }

  const date = new Date(valStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Check if it has time part (i.e. contains 'T' or a colon, or is ISO string)
    if (valStr.includes('T') || valStr.includes(':')) {
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    
    return `${day}/${month}/${year}`;
  }
  return valStr;
};

export default function Dashboard() {
  const { request, loading } = useApi();
  const [leads, setLeads] = useState<any[]>([]);
  const { salesPerson: selectedSalesPerson, setSalesPerson: setSelectedSalesPerson } = useGlobalFilter();
  const [avatars, setAvatars] = useState<Record<string, string>>({});
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

  useEffect(() => {
    async function fetchData() {
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
        console.error('Failed to load dashboard data:', err);
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
    fetchData();
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

  const stats = useMemo(() => {
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

    const isWon = (l: any) => l.order_status && String(l.order_status).toLowerCase().trim() === 'recieved';
    return {
      totalLeads: filteredLeads.length,
      activeLeads: filteredLeads.filter((l: any) => {
        const stage = getLeadStage(l);
        return stage !== 'closed' && !isWon(l);
      }).length,
      closedLeads: filteredLeads.filter((l: any) => getLeadStage(l) === 'closed').length,
      convertedOrders: filteredLeads.filter(isWon).length,
    };
  }, [filteredLeads]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    // Show last 5 months
    const last5MonthsIndices = [
      (currentMonthIdx - 4 + 12) % 12,
      (currentMonthIdx - 3 + 12) % 12,
      (currentMonthIdx - 2 + 12) % 12,
      (currentMonthIdx - 1 + 12) % 12,
      currentMonthIdx,
    ];

    const trends = last5MonthsIndices.map(idx => {
      const monthLeads = filteredLeads.filter(l => {
        const rawDate = l.created_at || l['Timestamp'] || '';
        if (!rawDate) return false;
        
        let leadDate: Date;
        if (typeof rawDate === 'string' && rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts.length === 3) {
            leadDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            leadDate = new Date(rawDate);
          }
        } else {
          leadDate = new Date(rawDate);
        }

        return !isNaN(leadDate.getTime()) && leadDate.getMonth() === idx;
      });
      return {
        month: months[idx],
        leadsCount: monthLeads.length,
      };
    });

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

    const isWon = (l: any) => l.order_status && String(l.order_status).toLowerCase().trim() === 'recieved';

    const funnel = [
      { name: 'Cold', value: filteredLeads.filter(l => getLeadStage(l) === 'cold').length },
      { name: 'Lead', value: filteredLeads.filter(l => getLeadStage(l) === 'lead').length },
      { name: 'Meeting', value: filteredLeads.filter(l => getLeadStage(l) === 'meeting').length },
      { name: 'Tech Talk', value: filteredLeads.filter(l => getLeadStage(l) === 'tech').length },
      { name: 'Sample', value: filteredLeads.filter(l => getLeadStage(l) === 'sample').length },
      { name: 'Negotiation', value: filteredLeads.filter(l => getLeadStage(l) === 'negotiation').length },
      { name: 'Order', value: filteredLeads.filter(l => getLeadStage(l) === 'order').length },
      { name: 'Won ✓', value: filteredLeads.filter(isWon).length },
    ];

    return {
      funnel,
      trends
    };
  }, [filteredLeads]);

  const recentActivities = useMemo(() => {
    const getLatestStage = (l: any) => {
      if (l.order_actual_date) return { stage: 'Order', date: l.order_actual_date };
      if (l.negotiation_actual_date) return { stage: 'Negotiation', date: l.negotiation_actual_date };
      if (l.tech_actual_date) return { stage: 'Tech Talk', date: l.tech_actual_date };
      if (l.meeting_actual_date) return { stage: 'Meeting', date: l.meeting_actual_date };
      if (l.lead_actual_date) return { stage: 'Lead', date: l.lead_actual_date };
      if (l.status === 'CLOSED') return { stage: 'Closed', date: l.closed_at || l.created_at };
      return { stage: 'Cold', date: l.created_at };
    };

    const parseDMY = (d: string) => {
      if (!d) return 0;
      // Try dd/mm/yyyy
      const parts = d.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      }
      return new Date(d).getTime();
    };

    return [...filteredLeads]
      .filter(l => {
        const { date } = getLatestStage(l);
        return !!date;
      })
      .sort((a, b) => parseDMY(getLatestStage(b).date) - parseDMY(getLatestStage(a).date))
      .slice(0, 8)
      .map(l => {
        const rep = l.sales_person_name || l['Sales Person Name'] || l.owner_id || 'Representative';
        const company = l.company_name || l['Party Name'] || 'Prospect';
        const { stage, date } = getLatestStage(l);
        return { rep, company, action: stage, time: date };
      });
  }, [filteredLeads]);

  const statCards = [
    { title: 'Total Leads', value: stats?.totalLeads, icon: Users, bgGradient: 'from-blue-50/80 to-indigo-50/30', iconGradient: 'from-blue-500 to-indigo-600', shadowColor: 'shadow-blue-500/20', change: 'Active' },
    { title: 'Active Leads', value: stats?.activeLeads, icon: Clock, bgGradient: 'from-purple-50/80 to-fuchsia-50/30', iconGradient: 'from-purple-500 to-fuchsia-600', shadowColor: 'shadow-purple-500/20', change: 'In Progress' },
    { title: 'Lost Leads', value: stats?.closedLeads, icon: XCircle, bgGradient: 'from-rose-50/80 to-orange-50/30', iconGradient: 'from-rose-500 to-orange-500', shadowColor: 'shadow-rose-500/20', change: 'Lost/Inactive' },
    { title: 'Converted Orders', value: stats?.convertedOrders, icon: CheckCircle2, bgGradient: 'from-emerald-50/80 to-teal-50/30', iconGradient: 'from-emerald-500 to-teal-600', shadowColor: 'shadow-emerald-500/20', change: 'Won' },
  ];

  if (loading && leads.length === 0) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-slate-200" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl bg-slate-200" />
          <Skeleton className="h-96 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 lg:space-y-8 pb-12 lg:pb-0"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-heading font-semibold text-slate-900 tracking-tight">Overview Dashboard</h1>
            {isSyncing && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-sans font-bold uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                Syncing
              </div>
            )}
          </div>
          <p className="text-slate-500 font-sans text-xs mt-1">Quick summary of all leads and sales.</p>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 z-[60]">
            <SearchableSelect 
              value={selectedSalesPerson} 
              onValueChange={setSelectedSalesPerson}
              options={salesPersonsList}
              allLabel="All Sales Persons"
            />
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
              setIsSyncing(true);
              window.dispatchEvent(new CustomEvent('crm_leads_refresh'));
              setTimeout(() => setIsSyncing(false), 800);
            }}
            disabled={isSyncing}
            title="Manual Refresh"
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin text-indigo-500" : ""} />
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20 text-[10px] font-heading font-medium uppercase tracking-wider h-10 px-5 rounded-xl shrink-0">Export</Button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <motion.div 
              whileHover={{ y: -6, scale: 1.01 }}
              whileTap={{ scale: 0.97, y: 0 }}
              className={`relative rounded-2xl bg-gradient-to-br ${stat.bgGradient} border-2 border-white/90 border-b-[5px] border-b-slate-200 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.08),_inset_0_2px_8px_rgba(255,255,255,1),_inset_0_-2px_6px_rgba(0,0,0,0.03)] hover:border-b-[5px] hover:border-b-slate-300 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15),_0_8px_16px_-4px_rgba(0,0,0,0.06),_inset_0_2px_8px_rgba(255,255,255,1)] transition-all duration-300 overflow-hidden group backdrop-blur-sm`}
            >
              {/* Premium sweep shine animation on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/80 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[100%] translate-x-[-100%] transition-all duration-700 ease-in-out z-0 pointer-events-none" />
              
              <div className="p-3 sm:p-4 relative z-10">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-heading uppercase tracking-widest font-extrabold truncate">{stat.title}</div>
                  <div className={`flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] font-sans font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm bg-white border border-slate-100 shrink-0 ${
                    stat.change.startsWith('Active') || stat.change.startsWith('Won') 
                      ? 'text-emerald-600' 
                      : stat.change.startsWith('In') 
                        ? 'text-indigo-600'
                        : 'text-rose-600'
                  }`}>
                    {stat.change}
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl sm:text-2xl font-sans font-extrabold text-slate-800 tracking-tight">{stat.value || 0}</div>
                  <motion.div 
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white text-slate-700 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05),_inset_0_1px_2px_rgba(255,255,255,1)] border border-slate-100 group-hover:bg-gradient-to-br group-hover:${stat.iconGradient} group-hover:text-white group-hover:${stat.shadowColor} group-hover:border-transparent transition-all duration-300`}
                  >
                    <stat.icon className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white border-border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full">
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Geographic Distribution</CardTitle>
              <CardDescription className="text-slate-500 font-sans">Lead concentration across India</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] sm:h-[450px] p-0 relative -mt-4">
              <IndiaMap leads={filteredLeads} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <Card className="bg-white border-border shadow-sm hover:shadow-md transition-all duration-300 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Month-wise Analysis</CardTitle>
              <CardDescription className="text-slate-500 font-sans">New lead entries per month</CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData?.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                  <YAxis stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    formatter={(value: any) => [value, 'New Leads']}
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #1e293b', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leadsCount" 
                    name="New Leads"
                    stroke="#6366f1" 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border-border shadow-sm hover:shadow-md transition-all duration-300 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Pipeline Mix</CardTitle>
              <CardDescription className="text-slate-500 font-sans">Lead distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-72 flex flex-col justify-center">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData?.funnel}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData?.funnel?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '2px solid #1e293b', borderRadius: '8px', fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4">
                {chartData?.funnel?.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-[10px] text-slate-400 font-heading font-medium truncate uppercase tracking-tight">{entry.name}</span>
                    <span className="ml-auto text-[10px] text-slate-900 font-sans font-bold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white border-border shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Lead Sources</CardTitle>
              <CardDescription className="text-slate-500 font-sans">Origin of new prospects</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData?.funnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} style={{ fontFamily: 'Poppins, sans-serif' }} />
                  <YAxis stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} style={{ fontFamily: 'Poppins, sans-serif' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #1e293b', borderRadius: '8px', fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-slate-900 border-none shadow-lg text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-[10px] text-slate-400 uppercase tracking-widest font-heading font-bold">Recent Pipeline Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <Avatar className="w-8 h-8 rounded-full shrink-0 border border-slate-600 group-hover:border-indigo-500/50 transition-colors">
                        <AvatarImage src={getEmbeddableUrl(avatars[item.rep.toLowerCase().trim()])} referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-slate-700 text-slate-300 font-bold">
                          <Users size={14} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs text-slate-300 leading-snug font-sans">
                          <span className="font-semibold text-white">{item.rep}</span> moved <span className="text-slate-100">{item.company}</span> to <span className="text-indigo-400 font-semibold capitalize">{item.action}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-sans font-medium italic">{formatDateTime(item.time)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-4">No recent activity</div>
                )}
               </div>
               <Button variant="ghost" className="w-full mt-6 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 uppercase tracking-widest font-heading font-medium">View Full Audit Log</Button>
            </CardContent>
         </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
