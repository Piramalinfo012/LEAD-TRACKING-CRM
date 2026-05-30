import React, { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { User, UserRole } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from './ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';
import { UserPlus, User as UserIcon, Shield, Mail, Edit2, Trash2, Key, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getEmbeddableUrl } from '../lib/utils';

export default function UserManagement() {
  const { request, loading } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: UserRole.SALES,
    employee_id: '',
    password: 'password'
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await request('/api/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await request(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(newUser),
        });
        toast.success('User updated successfully');
      } else {
        await request('/api/users', {
          method: 'POST',
          body: JSON.stringify(newUser),
        });
        toast.success('User added successfully');
      }
      setIsAddOpen(false);
      setEditingUser(null);
      setNewUser({ name: '', email: '', role: UserRole.SALES, employee_id: '', password: 'password' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await request(`/api/users/${id}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      password: ''
    });
    setIsAddOpen(true);
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === UserRole.ADMIN) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
          <Shield size={9} /> Admin
        </span>
      );
    }
    if (role === UserRole.CRM) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
          CRM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
        Sales
      </span>
    );
  };

  const AddUserDialog = (
    <Dialog open={isAddOpen} onOpenChange={(open) => {
      setIsAddOpen(open);
      if (!open) setEditingUser(null);
    }}>
      <DialogTrigger asChild>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 h-11 px-5 shadow-sm shadow-indigo-500/20 uppercase tracking-widest text-[10px] rounded-xl w-full sm:w-auto"
          onClick={() => {
            setEditingUser(null);
            setNewUser({ name: '', email: '', role: UserRole.SALES, employee_id: '', password: 'password' });
          }}
        >
          <UserPlus size={15} /> Add New User
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-slate-200 text-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md mx-4 sm:mx-auto">
        <DialogHeader className="mb-5">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
            {editingUser ? 'Edit User Profile' : 'Create User Profile'}
          </DialogTitle>
          <DialogDescription className="sr-only">Add or edit a user in the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Name</Label>
            <Input
              placeholder="Full identity name"
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})}
              className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Email</Label>
            <Input
              type="email"
              placeholder="Corporate email address"
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value})}
              className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Emp ID</Label>
              <Input
                placeholder="EMP000"
                value={newUser.employee_id}
                onChange={e => setNewUser({...newUser, employee_id: e.target.value})}
                className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Role</Label>
              <Select value={newUser.role} onValueChange={(v: UserRole) => setNewUser({...newUser, role: v})}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 p-1 rounded-xl shadow-xl">
                  <SelectItem value={UserRole.ADMIN}>ADMIN</SelectItem>
                  <SelectItem value={UserRole.SALES}>SALES</SelectItem>
                  <SelectItem value={UserRole.CRM}>CRM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">
              Password {editingUser && '(Leave blank to keep)'}
            </Label>
            <Input
              type="text"
              placeholder="User password"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl"
              required={!editingUser}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="submit" className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold h-12 uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-slate-900/10">
              {editingUser ? 'Update Account' : 'Provision Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight flex items-center gap-2">
            <Users size={22} className="text-indigo-600" /> User Management
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">Control resource access and team hierarchy</p>
        </div>
        {AddUserDialog}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <UserIcon size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">{users.length} Active Users</p>
          <p className="text-[10px] text-indigo-500">Team directory</p>
        </div>
      </div>

      {/* Mobile: Card layout, Desktop: hidden */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.length === 0 ? (
          <div className="text-center py-14 text-slate-300 font-bold uppercase tracking-widest text-[10px]">
            No active user directory
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              {/* Top row: avatar + name + role badge + actions */}
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 ring-2 ring-indigo-500/10 shrink-0">
                  {u.profile_url && <AvatarImage src={getEmbeddableUrl(u.profile_url)} referrerPolicy="no-referrer" />}
                  <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-sm">
                    {u.name?.charAt(0) || <UserIcon size={16} />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getRoleBadge(u.role)}
                    <span className="text-[10px] font-mono text-slate-400">{u.employee_id}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(u)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="my-3 border-t border-slate-50" />

              {/* Details row */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail size={11} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] font-medium truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Key size={11} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] font-mono text-slate-400">{u.password ? u.password : '••••••••'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table layout, Mobile: hidden */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 pl-6 text-left">Identity</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 text-left">Email</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 text-left">Password</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 text-left">Emp ID</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 text-left">Role</th>
                <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                    No active user directory
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 ring-2 ring-indigo-500/10">
                          {u.profile_url && <AvatarImage src={getEmbeddableUrl(u.profile_url)} referrerPolicy="no-referrer" />}
                          <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs">
                            {u.name?.charAt(0) || <UserIcon size={14} />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none mb-1">{u.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Identity Active</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs font-semibold text-slate-600">{u.email}</span>
                    </td>
                    <td className="py-4">
                      <span className="text-[11px] font-mono text-slate-400">{u.password || '••••••••'}</span>
                    </td>
                    <td className="py-4">
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg uppercase">{u.employee_id}</span>
                    </td>
                    <td className="py-4">{getRoleBadge(u.role)}</td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}