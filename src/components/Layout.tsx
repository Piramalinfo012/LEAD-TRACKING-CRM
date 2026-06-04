import React, { ReactNode, useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Table as TableIcon, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronRight,
  PlusCircle,
  Search,
  Bell,
  Snowflake,
  UserPlus,
  Calendar,
  Cpu,
  Handshake,
  ShoppingCart,
  X,
  Menu,
  Home,
  Clock,
  Layers,
  CheckCircle2,
  PhoneCall,
  Package,
  XCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from './ui/dialog';
import NewLeadDialog from './NewLeadDialog';
import LeadDetailsSheet from './LeadDetailsSheet';
import { useDebounce } from '../hooks/useDebounce';
import { useApi } from '../lib/api';
import { formatDateToDMY, getEmbeddableUrl } from '../lib/utils';
import { toast } from 'sonner';

interface LayoutProps {
  children: ReactNode;
}

function ProfilePictureDialog({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { request } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDP, setIsUploadingDP] = useState(false);

  const handleAvatarClick = () => {
    if (isUploadingDP) return;
    fileInputRef.current?.click();
  };

  const handleDPUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDP(true);
    const toastId = toast.loading('Uploading profile picture...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await request('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (uploadRes && uploadRes.webViewLink) {
        await request('/api/users/profile', {
          method: 'POST',
          body: JSON.stringify({ profile_url: uploadRes.webViewLink })
        });
        toast.success('Profile picture updated!', { id: toastId });
        
        if (user) {
          const updatedUser = { ...user, profile_url: uploadRes.webViewLink };
          localStorage.setItem('crm_user', JSON.stringify(updatedUser));
          window.location.reload(); 
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile picture', { id: toastId });
    } finally {
      setIsUploadingDP(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
           <DialogTitle className="text-center font-heading text-xl">Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-indigo-500/30 relative shadow-2xl">
            {user?.profile_url ? (
              <img src={getEmbeddableUrl(user.profile_url)} referrerPolicy="no-referrer" alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-6xl font-heading font-bold text-white">
                {user?.name?.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="w-full flex justify-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleDPUpload} 
            />
            <Button onClick={handleAvatarClick} disabled={isUploadingDP} className="bg-indigo-600 hover:bg-indigo-700 w-full font-heading uppercase tracking-widest h-12 rounded-xl">
              {isUploadingDP ? 'Uploading...' : 'Change Picture'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Sidebar({ className, onNewLead, isMobile, onNavItemClick }: { className?: string, onNewLead: () => void, isMobile?: boolean, onNavItemClick?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
    { name: 'Other', icon: Layers, path: '/other' },
    { name: 'User Management', icon: Users, path: '/users', roles: ['ADMIN', 'CRM'] },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const pipelineStages = [
    { name: 'Cold', icon: Snowflake, path: '/pipeline/cold' },
    { name: 'Lead', icon: UserPlus, path: '/pipeline/lead' },
    { name: 'Meeting', icon: Calendar, path: '/pipeline/meeting' },
    { name: 'Sample', icon: Package, path: '/pipeline/sample' },
    { name: 'Technical Discussion', icon: Cpu, path: '/pipeline/tech' },
    { name: 'Negotiation', icon: Handshake, path: '/pipeline/negotiation' },
    { name: 'Order', icon: ShoppingCart, path: '/pipeline/order' },
    { name: 'Lost Lead', icon: XCircle, path: '/pipeline/closed' },
  ];

  const filteredMenu = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className={`flex flex-col h-full bg-[#0f172a] text-slate-400 ${!isMobile ? 'w-64 border-r border-slate-800' : 'w-full'} ${className}`}>
        <div className="p-6 pb-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <div className="w-full h-full bg-slate-900/90 backdrop-blur-sm rounded-[11px] flex items-center justify-center">
                <span className="font-heading font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400 text-lg">C</span>
              </div>
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-heading font-black text-2xl tracking-tighter uppercase group-hover:to-slate-300 transition-colors">CRM</span>
          </Link>
        </div>
        
        <div className="px-5 mb-6 relative">
          <div className="absolute inset-x-5 -top-4 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50" />
          <Button 
            className="w-full relative overflow-hidden group justify-start gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-[0_0_20px_rgba(79,70,229,0.25)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] py-6 rounded-xl transition-all duration-300 transform hover:-translate-y-[1px]"
            onClick={onNewLead}
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0)_100%)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="flex items-center gap-3 z-10 relative">
              <div className="p-1.5 bg-white/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <PlusCircle size={18} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-heading font-bold tracking-[0.1em]">NEW LEAD</span>
            </div>
          </Button>
        </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <div className="text-[11px] font-heading uppercase tracking-wider text-slate-200 font-extrabold px-3 mb-2 mt-2 border-l-2 border-indigo-500/50 ml-1 pl-2">Main Menu</div>
        {filteredMenu.filter(i => i.name === 'Dashboard' || i.name === 'Reports' || i.name === 'Other').map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onNavItemClick} className="block relative">
              {isActive && (
                <motion.div
                  layoutId="sidebarHighlight"
                  className="absolute inset-0 bg-indigo-600/15 rounded-xl border border-indigo-500/10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <div className={`
                relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 z-10
                ${isActive 
                  ? 'text-white font-heading font-semibold' 
                  : 'hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 font-heading font-medium'}
              `}>
                <item.icon size={20} className={isActive ? 'text-indigo-400' : ''} />
                <span className="text-sm">{item.name === 'Dashboard' ? 'Home' : item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="sidebarActiveDot"
                    className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                  />
                )}
              </div>
            </Link>
          );
        })}

        <div className="text-[11px] font-heading uppercase tracking-wider text-slate-200 font-extrabold px-3 mb-2 mt-8 border-l-2 border-indigo-500/50 ml-1 pl-2">Lead Tracking</div>
        {pipelineStages.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onNavItemClick} className="block relative">
              {isActive && (
                <motion.div
                  layoutId="sidebarHighlight"
                  className="absolute inset-0 bg-indigo-600/15 rounded-xl border border-indigo-500/10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <div className={`
                relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 z-10
                ${isActive 
                  ? 'text-white font-heading font-semibold' 
                  : 'hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 font-heading font-medium'}
              `}>
                <item.icon size={20} className={isActive ? 'text-indigo-400' : ''} />
                <span className="text-sm">{item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="sidebarActiveDot"
                    className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                  />
                )}
              </div>
            </Link>
          );
        })}

        <div className="text-[11px] font-heading uppercase tracking-wider text-slate-200 font-extrabold px-3 mb-2 mt-8 border-l-2 border-indigo-500/50 ml-1 pl-2">Admin</div>
        {filteredMenu.filter(i => i.name !== 'Dashboard' && i.name !== 'Reports').map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onNavItemClick} className="block relative">
              {isActive && (
                <motion.div
                  layoutId="sidebarHighlight"
                  className="absolute inset-0 bg-indigo-600/15 rounded-xl border border-indigo-500/10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <div className={`
                relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 z-10
                ${isActive 
                  ? 'text-white font-heading font-semibold' 
                  : 'hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 font-heading font-medium'}
              `}>
                <item.icon size={20} className={isActive ? 'text-indigo-400' : ''} />
                <span className="text-sm">{item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="sidebarActiveDot"
                    className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-2 mb-4">
          <ProfilePictureDialog>
            <div className="relative group cursor-pointer">
              <Avatar className="w-10 h-10 ring-2 ring-indigo-500/20 transition-opacity group-hover:opacity-80">
                {user?.profile_url && <AvatarImage src={getEmbeddableUrl(user.profile_url)} referrerPolicy="no-referrer" alt={user?.name} className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-heading font-bold">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                <span className="text-[8px] text-white font-bold uppercase tracking-widest text-center leading-tight">View</span>
              </div>
            </div>
          </ProfilePictureDialog>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-heading font-semibold text-white truncate">{user?.name}</span>
            <span className="text-[10px] font-heading uppercase text-indigo-400 tracking-wider font-bold truncate">{user?.role}</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-slate-500 hover:text-white hover:bg-rose-500/10 hover:text-rose-400 h-11 rounded-xl transition-all duration-200 font-heading font-medium"
          onClick={logout}
        >
          <LogOut size={20} />
          <span className="text-xs uppercase tracking-wider">Logout</span>
        </Button>
      </div>
    </div>
  );
}

export function Shell({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const debouncedSearch = useDebounce(searchValue, 300);
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const { request } = useApi();
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [hasNotified, setHasNotified] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [noticeText, setNoticeText] = useState('Loading notice text...');
  const [selectedSearchLead, setSelectedSearchLead] = useState<any | null>(null);

  const searchResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 2) return [];
    const lowerQ = debouncedSearch.toLowerCase().trim();
    return leads.filter(l => {
      const name = String(l.company_name || l['Party Name'] || '').toLowerCase();
      const person = String(l.contact_person || l['Person Name'] || '').toLowerCase();
      const mob = String(l.mobile || l['Mobile No. '] || '').toLowerCase();
      const id = String(l.id || '').toLowerCase();
      return name.includes(lowerQ) || person.includes(lowerQ) || mob.includes(lowerQ) || id.includes(lowerQ);
    }).slice(0, 8); // show max 8 results
  }, [debouncedSearch, leads]);

  useEffect(() => {
    async function fetchNotice() {
      try {
        const res = await request('/api/notice');
        if (res && res.notice) {
          setNoticeText(res.notice);
        }
      } catch (err) {
        console.error('Failed to fetch notice:', err);
      }
    }
    fetchNotice();
    // Poll every 30 seconds for new notice updates
    const interval = setInterval(fetchNotice, 30000);
    return () => clearInterval(interval);
  }, [request]);

  const fetchLeads = async (silent = false) => {
    try {
      const cached = localStorage.getItem('crm_leads_cache');
      if (cached && !silent) {
        try { setLeads(JSON.parse(cached)); } catch(e) {}
      }
      const endpoint = silent ? '/api/leads' : '/api/leads?force=true';
      const data = await request(endpoint, { silent });
      if (data && Array.isArray(data)) {
        setLeads(data);
        localStorage.setItem('crm_leads_cache', JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('crm_leads_updated', { detail: data }));
      }
    } catch (err) {
      console.error('Error fetching leads for layout notifications:', err);
    }
  };

  useEffect(() => {
    fetchLeads(false);
    
    const interval = setInterval(() => {
      fetchLeads(true);
    }, 20000);
    
    return () => clearInterval(interval);
  }, [request]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchLeads(true);
    };
    window.addEventListener('crm_leads_refresh', handleRefresh);
    return () => window.removeEventListener('crm_leads_refresh', handleRefresh);
  }, [request]);

  const todayFollowups = useMemo(() => {
    const todayDMY = formatDateToDMY(new Date());
    return leads.filter(l => {
      const fd = l['Follow Up date'] || l.followup_date;
      return fd && formatDateToDMY(fd) === todayDMY;
    });
  }, [leads]);

  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const markAsRead = (leadId: string) => {
    if (!readNotifications.includes(leadId)) {
      const updated = [...readNotifications, leadId];
      setReadNotifications(updated);
      localStorage.setItem('crm_read_notifications', JSON.stringify(updated));
    }
  };

  const unreadCount = useMemo(() => {
    return todayFollowups.filter(l => !readNotifications.includes(String(l.id))).length;
  }, [todayFollowups, readNotifications]);

  useEffect(() => {
    if (leads.length > 0 && !hasNotified) {
      if (todayFollowups.length > 0) {
        toast.info(`🔔 You have ${todayFollowups.length} follow-up(s) scheduled for today!`, {
          duration: 8000
        });
      }
      setHasNotified(true);
    }
  }, [leads, todayFollowups, hasNotified]);

  const mobileNavItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Layers, path: '/other', label: 'Other' },
    { icon: PlusCircle, action: () => setIsNewLeadOpen(true), label: 'Add', primary: true },
    { icon: BarChart3, path: '/reports', label: 'Reports' },
    { icon: Settings, path: '/settings', label: 'Setup' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-slate-800">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar onNewLead={() => setIsNewLeadOpen(true)} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        <header className="h-16 lg:h-20 bg-white border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4 lg:gap-0 flex-1">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-500">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-none w-72">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Mobile navigation sidebar</SheetDescription>
                <Sidebar 
                  isMobile 
                  onNewLead={() => {
                    setIsNewLeadOpen(true);
                    setIsMobileMenuOpen(false);
                  }} 
                  onNavItemClick={() => setIsMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="max-w-md w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search leads..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 pr-10 bg-slate-50/50 border-none text-sm w-full focus-visible:ring-1 focus-visible:ring-indigo-500/20 shadow-none h-10 lg:h-11 rounded-xl"
              />
              {searchValue && (
                <button 
                  onClick={() => setSearchValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              
              {/* Search Dropdown */}
              <AnimatePresence>
                {searchValue && searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[100]"
                  >
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2 mb-1">Search Results</p>
                      {searchResults.map(result => (
                        <div 
                          key={result.id}
                          onClick={() => {
                            setSearchValue('');
                            let finalStage = 'cold';
                            if (result.closed_at || String(result.status || '').toUpperCase() === 'CLOSED') {
                              finalStage = 'closed';
                            } else if (result.order_planned_date && !result.order_actual_date) {
                              finalStage = 'order';
                            } else if (result.negotiation_planned_date && !result.negotiation_actual_date) {
                              finalStage = 'negotiation';
                            } else if (result.tech_planned_date && !result.tech_actual_date) {
                              finalStage = 'tech';
                            } else if (result.sample_planned_date && !result.sample_actual_date) {
                              finalStage = 'sample';
                            } else if (result.meeting_planned_date && !result.meeting_actual_date) {
                              finalStage = 'meeting';
                            } else if (result.lead_planned_date && !result.lead_actual_date) {
                              finalStage = 'lead';
                            }
                            navigate(`/pipeline/${finalStage}`);
                          }}
                          className="flex items-center justify-between p-3 hover:bg-indigo-50/60 rounded-lg cursor-pointer transition-colors group"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">{result.company_name || result['Party Name']}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="truncate">{result.contact_person || result['Person Name']}</span>
                              {result.mobile && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span className="font-mono">{result.mobile}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className="ml-3 shrink-0 uppercase text-[9px] font-heading bg-indigo-50 text-indigo-700 border-none">
                            {result.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 pl-4 relative">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-full relative transition-colors ${isNotificationsOpen ? 'text-indigo-600 bg-slate-50' : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white font-mono text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold border-2 border-white leading-none">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="fixed top-16 left-4 right-4 lg:left-auto lg:right-4 w-auto lg:w-96 z-[9999] shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
                    {/* Glass card */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-300/80 overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-white/20 rounded-xl p-1.5">
                              <Bell size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="text-white font-heading font-bold text-sm tracking-wide">Notifications</p>
                              <p className="text-indigo-200 text-[10px] font-sans">
                                {unreadCount > 0 ? `${unreadCount} unread follow-up${unreadCount > 1 ? 's' : ''} due today` : 'All caught up!'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsNotificationsOpen(false)}
                            className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="max-h-80 overflow-y-auto">
                        {todayFollowups.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {todayFollowups.map((l, index) => {
                              const partyName = l['Party Name'] || l.company_name || 'Prospect';
                              const spName = l.sales_person_name || l['Sales Person Name'] || l.owner_id || 'Unassigned';
                              const mobile = l['Mobile No. '] || l.mobile || '';
                              const isRead = readNotifications.includes(String(l.id));
                              return (
                                <div 
                                  key={l.id || index} 
                                  onClick={() => {
                                    markAsRead(String(l.id));
                                    setSelectedSearchLead(l);
                                    setIsNotificationsOpen(false);
                                  }}
                                  className={`px-5 py-3.5 transition-all group cursor-pointer relative ${
                                    isRead 
                                      ? 'bg-white hover:bg-slate-50/60 opacity-75' 
                                      : 'bg-indigo-50/30 hover:bg-indigo-50/60 font-semibold'
                                  }`}
                                >
                                  {/* Unread indicator dot */}
                                  {!isRead && (
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                  )}
                                  <div className="flex gap-3 items-start pl-1">
                                    {/* Icon */}
                                    <div className={`mt-0.5 rounded-xl p-2 shrink-0 transition-colors ${
                                      isRead 
                                        ? 'bg-slate-100 text-slate-500' 
                                        : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'
                                    }`}>
                                      <PhoneCall size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[13px] leading-snug truncate ${
                                        isRead ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'
                                      }`}>
                                        {partyName}
                                      </p>
                                      <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                                        Follow-up by <span className="font-semibold text-indigo-600">{spName}</span>
                                      </p>
                                      {mobile && (
                                        <p className="text-[10px] text-slate-400 font-mono mt-1">{mobile}</p>
                                      )}
                                    </div>
                                    {/* Badge */}
                                    {!isRead ? (
                                      <span className="shrink-0 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                                        Today
                                      </span>
                                    ) : (
                                      <span className="shrink-0 bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        Read
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
                            <div className="bg-emerald-50 rounded-full p-4">
                              <CheckCircle2 size={28} className="text-emerald-500" />
                            </div>
                            <p className="text-slate-700 font-semibold text-sm">All caught up!</p>
                            <p className="text-slate-400 text-xs text-center font-sans">No follow-ups scheduled for today.</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={11} />
                          <span className="text-[10px] font-sans">Updates every 30s</span>
                        </div>
                        <Link 
                          to="/leads" 
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-[10px] text-indigo-600 font-semibold font-heading uppercase tracking-wider cursor-pointer hover:text-indigo-800 transition-colors"
                        >
                          View All Leads →
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <ProfilePictureDialog>
              <Avatar className="w-8 h-8 lg:w-9 lg:h-9 cursor-pointer hover:ring-2 hover:ring-indigo-500/20 transition-all">
                {user?.profile_url && <AvatarImage src={getEmbeddableUrl(user.profile_url)} referrerPolicy="no-referrer" alt={user?.name} className="object-cover" />}
                <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-bold">
                  {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'ME'}
                </AvatarFallback>
              </Avatar>
            </ProfilePictureDialog>
          </div>
        </header>

        {/* Urgent Attention Notice Banner */}
        <div className="bg-rose-50/90 border-b border-rose-100 py-2 px-4 lg:px-8 flex items-center justify-between gap-3 text-rose-700 select-none overflow-hidden shrink-0 shadow-sm relative z-10">
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <span className="flex items-center gap-1.5 bg-red-600 text-white font-heading font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping inline-block"></span>
              NOTICE
            </span>
            <div className="relative flex-1 overflow-hidden h-7 flex items-center bg-red-50/50 rounded-lg px-2 border border-red-100/50">
              <div className="whitespace-nowrap font-heading text-xs font-bold uppercase tracking-widest text-red-600 animate-marquee inline-block">
                ⚠️ {noticeText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⚠️ {noticeText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⚠️ {noticeText}
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide pb-32 lg:pb-8 bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(3px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-lg border-t border-border flex items-center justify-around px-2 z-50">
          {mobileNavItems.map((item, idx) => {
            if (item.action) {
              return (
                <button 
                  key={idx}
                  onClick={item.action}
                  className="relative flex flex-col items-center justify-center gap-1 -mt-8"
                >
                  <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 border-4 border-white">
                    <item.icon size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 absolute bottom-[-20px]">{item.label}</span>
                </button>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <Link key={idx} to={item.path!} className={`flex flex-col items-center justify-center gap-1 flex-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <item.icon size={isActive ? 22 : 20} className={isActive ? 'animate-in fade-in zoom-in duration-200' : ''} />
                <span className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <footer className="hidden lg:block py-4 px-8 border-t border-border bg-white text-center text-[10px] text-slate-500 font-heading font-medium uppercase tracking-widest">
          Developed By <span className="text-indigo-600 font-heading font-bold">Deepak Sahu</span>
        </footer>
      </main>

      <NewLeadDialog 
        isOpen={isNewLeadOpen} 
        onClose={() => setIsNewLeadOpen(false)} 
        onSuccess={() => {
          setIsNewLeadOpen(false);
          // fetchLeads will be triggered by socket or manual refresh
        }}
      />

      <LeadDetailsSheet 
        lead={selectedSearchLead}
        isOpen={!!selectedSearchLead}
        onClose={() => setSelectedSearchLead(null)}
        onUpdate={() => {}}
      />
    </div>
  );
}
