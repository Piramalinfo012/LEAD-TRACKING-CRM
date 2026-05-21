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
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { useApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import IndiaMap from './IndiaMap';

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

export default function Dashboard() {
  const { request, loading } = useApi();
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('ALL');

  useEffect(() => {
    async function fetchData() {
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
        console.error(err);
      }
    }
    fetchData();
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
    if (!selectedSalesPerson || selectedSalesPerson === 'ALL') {
      return leads;
    }
    return leads.filter(l => (l['Sales Person Name'] || l.owner_id || 'Unassigned').toLowerCase().trim() === selectedSalesPerson.toLowerCase().trim());
  }, [leads, selectedSalesPerson]);

  const stats = useMemo(() => {
    return {
      totalLeads: filteredLeads.length,
      activeLeads: filteredLeads.filter((l: any) => {
        const st = l.status?.toUpperCase() || 'COLD';
        return st !== 'CLOSED' && st !== 'ORDER';
      }).length,
      closedLeads: filteredLeads.filter((l: any) => l.status?.toUpperCase() === 'CLOSED').length,
      convertedOrders: filteredLeads.filter((l: any) => l.status?.toUpperCase() === 'ORDER').length,
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
        if (!l.created_at) return false;
        const d = new Date(l.created_at);
        return d.getMonth() === idx;
      });
      return {
        month: months[idx],
        sales: monthLeads.length,
      };
    });

    const funnel = [
      { name: 'Cold', value: filteredLeads.filter(l => (l.status?.toUpperCase() || 'COLD') === 'COLD').length },
      { name: 'Lead', value: filteredLeads.filter(l => l.status?.toUpperCase() === 'LEAD').length },
      { name: 'Meeting', value: filteredLeads.filter(l => l.status?.toUpperCase() === 'MEETING').length },
      { name: 'Tech Talk', value: filteredLeads.filter(l => l.status?.toUpperCase() === 'TECHNICAL_DISCUSSION').length },
      { name: 'Negotiation', value: filteredLeads.filter(l => l.status?.toUpperCase() === 'NEGOTIATION').length },
      { name: 'Order', value: filteredLeads.filter(l => l.status?.toUpperCase() === 'ORDER').length },
    ];

    return {
      funnel,
      trends
    };
  }, [filteredLeads]);

  const recentActivities = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 5)
      .map(l => {
        const rep = l['Sales Person Name'] || l.owner_id || 'Representative';
        const company = l['Party Name'] || l.company_name || 'Prospect';
        const action = l.status ? l.status.toLowerCase().replace('_', ' ') : 'Created';
        const time = l.updated_at || l.created_at ? new Date(l.updated_at || l.created_at).toLocaleDateString() : 'Recently';
        return { rep, company, action, time };
      });
  }, [filteredLeads]);

  const statCards = [
    { title: 'Total Leads', value: stats?.totalLeads, icon: Users, bgGradient: 'from-blue-50/80 to-indigo-50/30', iconGradient: 'from-blue-500 to-indigo-600', shadowColor: 'shadow-blue-500/20', change: 'Active' },
    { title: 'Active Leads', value: stats?.activeLeads, icon: Clock, bgGradient: 'from-purple-50/80 to-fuchsia-50/30', iconGradient: 'from-purple-500 to-fuchsia-600', shadowColor: 'shadow-purple-500/20', change: 'In Progress' },
    { title: 'Closed Leads', value: stats?.closedLeads, icon: ArrowDownRight, bgGradient: 'from-rose-50/80 to-orange-50/30', iconGradient: 'from-rose-500 to-orange-500', shadowColor: 'shadow-rose-500/20', change: 'Lost/Inactive' },
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
          <h1 className="text-xl lg:text-2xl font-heading font-semibold text-slate-900 tracking-tight">Overview Dashboard</h1>
          <p className="text-slate-500 font-sans text-xs mt-1">Quick summary of all leads and sales.</p>
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
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20 text-[10px] font-heading font-medium uppercase tracking-wider h-10 px-5 rounded-xl shrink-0">Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <motion.div 
              whileHover={{ y: -6, scale: 1.01 }}
              whileTap={{ scale: 0.97, y: 0 }}
              className={`relative rounded-2xl bg-gradient-to-br ${stat.bgGradient} border-2 border-white/90 border-b-[5px] border-b-slate-200 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.08),_inset_0_2px_8px_rgba(255,255,255,1),_inset_0_-2px_6px_rgba(0,0,0,0.03)] hover:border-b-[5px] hover:border-b-slate-300 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15),_0_8px_16px_-4px_rgba(0,0,0,0.06),_inset_0_2px_8px_rgba(255,255,255,1)] transition-all duration-300 overflow-hidden group backdrop-blur-sm`}
            >
              {/* Premium sweep shine animation on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/80 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[100%] translate-x-[-100%] transition-all duration-700 ease-in-out z-0 pointer-events-none" />
              
              <div className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] text-slate-500 font-heading uppercase tracking-widest font-extrabold">{stat.title}</div>
                  <div className={`flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full shadow-sm bg-white border border-slate-100 ${
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
                  <div className="text-2xl font-sans font-extrabold text-slate-800 tracking-tight">{stat.value || 0}</div>
                  <motion.div 
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    className={`p-2 rounded-xl bg-white text-slate-700 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05),_inset_0_1px_2px_rgba(255,255,255,1)] border border-slate-100 group-hover:bg-gradient-to-br group-hover:${stat.iconGradient} group-hover:text-white group-hover:${stat.shadowColor} group-hover:border-transparent transition-all duration-300`}
                  >
                    <stat.icon size={18} strokeWidth={2.5} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white border-border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full">
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Geographic Distribution</CardTitle>
              <CardDescription className="text-slate-500 font-sans">Lead concentration across India</CardDescription>
            </CardHeader>
            <CardContent className="h-[450px] p-0 relative -mt-4">
              <IndiaMap leads={filteredLeads} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <Card className="bg-white border-border shadow-sm hover:shadow-md transition-all duration-300 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 font-heading text-sm font-semibold uppercase tracking-wider">Revenue Trend</CardTitle>
              <CardDescription className="text-slate-500 font-sans">Monthly conversion growth</CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData?.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                  <YAxis stroke="#1e293b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #1e293b', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 group-hover:border-indigo-500/50 transition-colors">
                        <Users size={14} className="text-slate-400" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs text-slate-300 leading-snug font-sans">
                          <span className="font-semibold text-white">{item.rep}</span> moved <span className="text-slate-100">{item.company}</span> to <span className="text-indigo-400 font-semibold capitalize">{item.action}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-sans font-medium italic">{item.time}</p>
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
