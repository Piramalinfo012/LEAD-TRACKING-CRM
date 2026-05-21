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
import { formatDateToDMY } from '../lib/utils';
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
        const data = await request('/api/leads');
        if (data && Array.isArray(data)) {
          setLeads(data);
        }
      } catch (err) {
        console.error('Failed to load report data:', err);
      }
    }
    loadData();
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
                     color: 'purple' 
                   },
                 ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-heading uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">{item.label}</p>
                          <p className="text-lg font-sans font-semibold text-slate-900 mt-0.5">{item.value}</p>
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
                        <td className="px-6 py-4 font-sans font-semibold text-slate-900">{row.name}</td>
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
