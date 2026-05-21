import React, { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { User, UserRole } from '../types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
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
import { UserPlus, User as UserIcon, Shield, Mail, BadgeCheck, Edit2, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';

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
      setNewUser({
        name: '',
        email: '',
        role: UserRole.SALES,
        employee_id: '',
        password: 'password'
      });
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
      password: '' // empty means no change
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">User Management</h2>
          <p className="text-slate-500 font-medium text-sm">Control resource access and team hierarchy</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditingUser(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 h-11 px-6 shadow-sm shadow-indigo-500/20 uppercase tracking-widest text-[10px]" onClick={() => {
              setEditingUser(null);
              setNewUser({ name: '', email: '', role: UserRole.SALES, employee_id: '', password: 'password' });
            }}>
              <UserPlus size={16} /> Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-slate-200 text-slate-800 p-8 rounded-2xl shadow-2xl max-w-md">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                {editingUser ? 'Edit User Profile' : 'Create User Profile'}
              </DialogTitle>
              <DialogDescription className="sr-only">Add or edit a user in the system.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Name</Label>
                  <Input 
                    placeholder="Full identity name" 
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl focus-visible:ring-indigo-500/20"
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
                    className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl focus-visible:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Emp ID</Label>
                    <Input 
                      placeholder="EMP000" 
                      value={newUser.employee_id}
                      onChange={e => setNewUser({...newUser, employee_id: e.target.value})}
                      className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl focus-visible:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Role Type</Label>
                    <Select 
                      value={newUser.role} 
                      onValueChange={(v: UserRole) => setNewUser({...newUser, role: v})}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl focus-visible:ring-indigo-500/20">
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
                  <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-1">Password {editingUser && '(Leave blank to keep current)'}</Label>
                  <Input 
                    type="text"
                    placeholder="User password" 
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="bg-slate-50 border-slate-200 h-11 text-slate-900 font-medium px-4 rounded-xl focus-visible:ring-indigo-500/20"
                    required={!editingUser}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold h-12 uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-slate-900/10">
                  {editingUser ? 'Update Account' : 'Provision Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6 pl-8">Identity</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6">Credentials</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6">ID System</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6">Authorization</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-6 text-right pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No active user directory</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50/30 transition-colors group">
                  <TableCell className="py-5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                        <UserIcon size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1.5">{u.name}</span>
                        <span className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">Identity Active</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail size={12} className="text-slate-400" />
                        <span className="text-xs font-semibold">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="font-mono text-[10px] text-slate-500 border-slate-100 bg-slate-50/50 uppercase">{u.employee_id}</Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                       {u.role === UserRole.ADMIN ? (
                         <Badge className="bg-rose-50 text-rose-600 border-rose-100 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-rose-50">
                           <Shield size={10} className="mr-1" /> Manager
                         </Badge>
                       ) : (
                         <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-50">
                           Agent
                         </Badge>
                       )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right pr-8">
                     <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 h-auto rounded-lg">
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 h-auto rounded-lg">
                          <Trash2 size={16} />
                        </Button>
                     </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
