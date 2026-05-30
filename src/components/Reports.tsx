import { useState, useEffect, useMemo } from 'react';
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
  Table as TableIcon
} from 'lucide-react';
import { useApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
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

  const handleExport = () => {
    if (!leads || leads.length === 0) {
      import('sonner').then(({ toast }) => toast.error('No data available to export'));
      return;
    }

    // Extract all unique headers
    const headers = Array.from(new Set(leads.flatMap(Object.keys)));
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => 
        headers.map(header => {
          let cell = lead[header] === null || lead[header] === undefined ? '' : String(lead[header]);
          // Escape quotes and wrap in quotes if cell contains comma, quote or newline
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            cell = `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `NEW_FMS_Data_${formatDateToDMY(new Date().toISOString())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    import('sonner').then(({ toast }) => toast.success('Data exported successfully'));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const cached = localStorage.getItem('crm_leads_cache');
        if (cached) {
          try { setLeads(JSON.parse(cached)); } catch(e) {}
        }
        const data = await request('/api/leads');
        if (data && Array.isArray(data)) {
          setLeads(data);
          localStorage.setItem('crm_leads_cache', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
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

  const leadStats = useMemo(() => {
    const groups: Record<string, any> = {};
    
    const filtered = selectedSalesPerson === 'ALL' 
      ? leads 
      : leads.filter(l => (l['Sales Person Name'] || l.owner_id || 'Unassigned').toLowerCase().trim() === selectedSalesPerson.toLowerCase().trim());

    filtered.forEach((l: any) => {
      const name = l['Sales Person Name'] || l.owner_id || 'Unassigned';
      if (!groups[name]) {
        groups[name] = { name, leads: 0, conversions: 0, value: 0 };
      }
      groups[name].leads++;
      if (l.status?.toUpperCase() === 'ORDER') {
        groups[name].conversions++;
        groups[name].value += Number(l.expected_value || 0);
      }
    });

    return Object.values(groups).sort((a: any, b: any) => b.leads - a.leads);
  }, [leads, selectedSalesPerson]);

  const dashboardMetrics = useMemo(() => {
    let inHand = 0;
    let quotationShared = 0;
    let meetingDone = 0;
    let rateShared = 0;
    let negotiation = 0;
    let orderReceived = 0;

    const filtered = selectedSalesPerson === 'ALL' 
      ? leads 
      : leads.filter(l => (l['Sales Person Name'] || l.owner_id || 'Unassigned').toLowerCase().trim() === selectedSalesPerson.toLowerCase().trim());

    filtered.forEach((l: any) => {
      const status = l.status?.toUpperCase();
      
      // Active Leads in hand (not closed)
      if (status !== 'CLOSED') {
        inHand++;
      }
      
      // Quotation shared (has quotation url or status is negotiation)
      if (l.quotation_url || l.negotiation_status?.toLowerCase().includes('quotation')) {
        quotationShared++;
      }

      // Meeting Done (has actual date or status passed meeting)
      if (l.meeting_actual_date || status === 'MEETING' || status === 'TECHNICAL_DISCUSSION' || status === 'NEGOTIATION' || status === 'ORDER') {
        meetingDone++;
      }

      // Rate Shared (has final price)
      if (l.final_price) {
        rateShared++;
      }

      // Negotiation Stage
      if (status === 'NEGOTIATION') {
        negotiation++;
      }

      // Order Received = WON (order_status === 'Recieved')
      if (l.order_status && l.order_status.toLowerCase().trim() === 'recieved') {
        orderReceived++;
      }
    });

    return { inHand, quotationShared, meetingDone, rateShared, negotiation, orderReceived };
  }, [leads, selectedSalesPerson]);


  return (
    <div className="space-y-6 lg:space-y-8 animate-in zoom-in-95 duration-500 pb-12 lg:pb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-semibold text-slate-900 tracking-tight">Lead Reports</h1>
          <p className="text-slate-500 font-sans text-xs mt-1">Detailed statistics on lead conversion and performance.</p>
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
            onClick={handleExport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20 text-[10px] font-heading font-medium uppercase tracking-wider h-10 px-5 rounded-xl shrink-0"
          >
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

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
  );
}
