import React, { useState, useEffect } from 'react';
import { 
  User, 
  Database, 
  Lock, 
  Bell, 
  Shield, 
  Globe, 
  Smartphone,
  Save,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { useApi } from '../lib/api';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const { request } = useApi();
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'CRM') {
      async function loadNotice() {
        try {
          const res = await request('/api/notice');
          if (res && res.notice) {
            setNotice(res.notice);
          }
        } catch (err: any) {
          console.error('Failed to load notice:', err);
        }
      }
      loadNotice();
    }
  }, [user, request]);

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotice(true);
    try {
      await request('/api/notice', {
        method: 'POST',
        body: JSON.stringify({ notice })
      });
      toast.success('Notice updated successfully in Master sheet!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update notice');
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Configuration</h1>
        <p className="text-slate-500 mt-1 font-medium text-sm">Manage your operational workspace and identity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          {[
            { icon: User, label: 'Personal Information' },
            { icon: Database, label: 'Cloud Integrations' },
            { icon: Shield, label: 'Security Protocols' },
            { icon: Bell, label: 'Event Logging' },
            { icon: Globe, label: 'Universal Routing' },
          ].map((item, i) => (
            <Button 
              key={i} 
              variant="ghost" 
              className={`w-full justify-start gap-3 h-11 px-4 text-[10px] font-bold uppercase tracking-widest transition-all ${i === 0 ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
               <item.icon size={16} />
               <span>{item.label}</span>
            </Button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-slate-900 text-lg font-bold">Identity Profile</CardTitle>
                <CardDescription className="text-slate-500 font-medium text-xs">Public credentials used for pipeline management.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Full Registered Name</Label>
                      <Input defaultValue={user?.name} className="bg-slate-50 border-slate-200 text-slate-900 h-11 focus-visible:ring-indigo-500/20" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Route Email Address</Label>
                      <Input defaultValue={user?.email} className="bg-slate-50 border-slate-200 text-slate-900 h-11 focus-visible:ring-indigo-500/20" />
                   </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">System Permission Tier</Label>
                   <Input value={user?.role} readOnly className="bg-slate-50 border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-widest cursor-not-allowed h-11" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Unique Operator ID</Label>
                   <Input value={user?.employee_id || 'CRM-882-SYS'} readOnly className="bg-slate-50 border-slate-100 text-slate-400 font-mono text-[10px] cursor-not-allowed h-11" />
                </div>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest h-11 px-8 shadow-sm transition-all" onClick={handleSave} disabled={isSaving}>
                   {isSaving ? 'Synchronizing...' : 'Update Registry'}
                </Button>
             </CardContent>
          </Card>

          {/* Admin & CRM Only Notice Configuration Card */}
          {(user?.role === 'ADMIN' || user?.role === 'CRM') && (
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden border-indigo-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <CardHeader className="bg-indigo-50/20 border-b border-indigo-100/30">
                  <div className="flex items-center gap-2">
                     <Megaphone size={18} className="text-indigo-600 animate-pulse" />
                     <CardTitle className="text-slate-900 text-lg font-bold">Workspace Notice</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 font-medium text-xs">
                     Set the high-priority running notice shown dynamically to all users. 
                     This message is saved to the <strong className="font-semibold text-indigo-600">Master</strong> sheet at cell <strong className="font-semibold text-indigo-600">B2</strong>.
                  </CardDescription>
               </CardHeader>
               <CardContent className="pt-6">
                  <form onSubmit={handleSaveNotice} className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="notice-input" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block font-heading font-semibold">Notice Content</Label>
                        <textarea
                           id="notice-input"
                           className="flex min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus-visible:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 disabled:opacity-50 font-sans leading-relaxed"
                           placeholder="Type notice message to display continuously to everyone..."
                           value={notice}
                           onChange={(e) => setNotice(e.target.value)}
                           required
                        />
                     </div>
                     <Button 
                        type="submit"
                        disabled={isSavingNotice}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest h-11 px-8 shadow-sm transition-all"
                     >
                        {isSavingNotice ? 'Saving Notice...' : 'Save Notice'}
                     </Button>
                  </form>
               </CardContent>
            </Card>
          )}

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-slate-900 text-lg font-bold">Workspace Nodes</CardTitle>
                <CardDescription className="text-slate-500 font-medium text-xs">Manage external database and drive nodes.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between p-5 rounded-xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm">
                          <Database size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900">Google Sheets Core</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Connection Protocol</p>
                       </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold text-[10px] px-2 py-0.5 rounded-full">CONNECTED</Badge>
                </div>

                <div className="flex items-center justify-between p-5 rounded-xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm">
                          <Smartphone size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900">Mobile Hub (WhatsApp)</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Quick interaction triggers</p>
                       </div>
                    </div>
                    <Switch defaultChecked />
                </div>

                <Separator className="bg-slate-100" />
                
                <div className="flex flex-col gap-2 pt-2">
                   <p className="text-[10px] font-extrabold uppercase text-rose-500 tracking-widest flex items-center gap-2">
                      <Shield size={12} /> Critical Zone
                   </p>
                   <p className="text-xs text-slate-400 font-medium">Deactivating the operator node will terminate all active pipeline assignments.</p>
                   <Button variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 justify-start w-fit p-0 h-auto font-bold text-[10px] uppercase tracking-widest mt-2">Deactivate Node Access</Button>
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
