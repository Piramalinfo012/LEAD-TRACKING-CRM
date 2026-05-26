import React, { ReactNode, useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Home
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from './ui/dialog';
import NewLeadDialog from './NewLeadDialog';
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
    { name: 'User Management', icon: Users, path: '/users', roles: ['ADMIN', 'CRM'] },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const pipelineStages = [
    { name: 'Cold', icon: Snowflake, path: '/pipeline/cold' },
    { name: 'Lead', icon: UserPlus, path: '/pipeline/lead' },
    { name: 'Meeting', icon: Calendar, path: '/pipeline/meeting' },
    { name: 'Technical Discussion', icon: Cpu, path: '/pipeline/tech' },
    { name: 'Negotiation', icon: Handshake, path: '/pipeline/negotiation' },
    { name: 'Order', icon: ShoppingCart, path: '/pipeline/order' },
  ];

  const filteredMenu = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className={`flex flex-col h-full bg-[#0f172a] text-slate-400 ${!isMobile ? 'w-64 border-r border-slate-800' : 'w-full'} ${className}`}>
      <div className="p-6 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center font-heading font-bold text-indigo-600 shadow-sm border border-indigo-100">C</div>
          <span className="text-white font-heading font-semibold text-xl tracking-tight uppercase">CRM</span>
        </Link>
      </div>
      
      <div className="px-4 mb-4">
        <Button 
          className="w-full justify-start gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md shadow-indigo-500/20 py-6 font-heading font-medium"
          onClick={onNewLead}
        >
          <PlusCircle size={20} />
          <span className="text-sm tracking-wide">NEW LEAD</span>
        </Button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <div className="text-[11px] font-heading uppercase tracking-wider text-slate-200 font-extrabold px-3 mb-2 mt-2 border-l-2 border-indigo-500/50 ml-1 pl-2">Main Menu</div>
        {filteredMenu.filter(i => i.name === 'Dashboard' || i.name === 'Reports').map((item) => {
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
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const debouncedSearch = useDebounce(searchValue, 300);
  const location = useLocation();

  const { request } = useApi();
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [hasNotified, setHasNotified] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [noticeText, setNoticeText] = useState('Loading notice text...');

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

  useEffect(() => {
    async function fetchLeads() {
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
        console.error('Error fetching leads for layout notifications:', err);
      }
    }
    fetchLeads();
  }, [request]);

  const todayFollowups = useMemo(() => {
    const todayDMY = formatDateToDMY(new Date());
    return leads.filter(l => {
      const fd = l['Follow Up date'] || l.followup_date;
      return fd && formatDateToDMY(fd) === todayDMY;
    });
  }, [leads]);

  useEffect(() => {
    if (leads.length > 0 && !hasNotified) {
      if (todayFollowups.length > 0) {
        toast.info(`🔔 You have ${todayFollowups.length} follow-up(s) scheduled for today!`, {
          duration: 8000,
        });
        todayFollowups.forEach(l => {
          const partyName = l['Party Name'] || l.company_name || 'Prospect';
          toast.success(`Today follow up with ${partyName}`, {
            duration: 10000,
          });
        });
      }
      setHasNotified(true);
    }
  }, [leads, todayFollowups, hasNotified]);

  const mobileNavItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Kanban, path: '/pipeline/lead', label: 'Stages' },
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
        <header className="h-16 lg:h-20 bg-white border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 flex-shrink-0 shadow-sm">
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
                placeholder="Search..." 
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
                {todayFollowups.length > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white font-mono text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold border-2 border-white leading-none">
                    {todayFollowups.length}
                  </span>
                )}
              </Button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 font-heading uppercase tracking-wider">Notifications</span>
                      {todayFollowups.length > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {todayFollowups.length} today
                        </span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto pt-1">
                      {todayFollowups.length > 0 ? (
                        todayFollowups.map((l, index) => {
                          const partyName = l['Party Name'] || l.company_name || 'Prospect';
                          const spName = l['Sales Person Name'] || l.owner_id || 'Unassigned';
                          return (
                            <div key={l.id || index} className="px-4 py-3 hover:bg-slate-50/80 border-b border-dashed border-slate-100/80 last:border-none transition flex gap-3 items-start">
                              <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5 shrink-0 animate-pulse" />
                              <div className="space-y-0.5 text-left">
                                <p className="text-xs font-semibold text-slate-900 leading-snug">
                                  Today follow up with <span className="text-indigo-600 font-bold">{partyName}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 font-sans font-medium">
                                  Assigned to: {spName}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-6 text-center text-slate-400 font-sans text-xs italic">
                          No follow-ups scheduled for today.
                        </div>
                      )}
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

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide pb-32 lg:pb-8 bg-slate-50/50">
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
            window.location.reload();
         }}
      />
    </div>
  );
}
