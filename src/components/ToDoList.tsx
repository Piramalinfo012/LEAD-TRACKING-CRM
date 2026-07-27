import React, { useEffect, useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Plus, 
  Calendar, 
  User, 
  Check, 
  MessageSquare, 
  Filter, 
  PlusCircle, 
  Sparkles,
  ClipboardList,
  CheckCircle,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface ToDoItem {
  id: string;
  date: string;
  sales_person_id: string;
  sales_person_name: string;
  task_plan: string;
  status: 'Pending' | 'Completed' | string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export default function ToDoList() {
  const { user } = useAuth();
  const { request, loading } = useApi();
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  
  // Morning form state
  const [newPlans, setNewPlans] = useState<string[]>(['']);
  const [taskDate, setTaskDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Evening complete form state
  const [activeCompletingId, setActiveCompletingId] = useState<string | null>(null);
  const [eveningRemarks, setEveningRemarks] = useState('');
  
  // Filters
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  const fetchTodos = async () => {
    try {
      const data = await request('/api/todo');
      if (Array.isArray(data)) {
        // Sort newest first
        const sorted = [...data].sort((a, b) => b.id.localeCompare(a.id));
        setTodos(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const validPlans = newPlans.filter(p => p.trim());
    if (validPlans.length === 0) {
      toast.error('Please enter at least one task plan');
      return;
    }

    try {
      const created = await request('/api/todo', {
        method: 'POST',
        body: JSON.stringify({
          date: taskDate,
          plan: validPlans.join('\n'),
        }),
      });

      if (created && created.success) {
        toast.success('Morning plan(s) saved successfully!');
        setNewPlans(['']);
        setIsDialogOpen(false);
        if (created.tasks && created.tasks.length > 0) {
          setTodos(prev => [...created.tasks, ...prev].sort((a, b) => b.id.localeCompare(a.id)));
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save morning plan');
    }
  };

  const handleCompleteTodo = async (id: string) => {
    if (!eveningRemarks.trim()) {
      toast.error('Please enter evening remarks/comments to complete the task');
      return;
    }

    try {
      const res = await request(`/api/todo/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Completed',
          remarks: eveningRemarks,
        }),
      });

      if (res && res.success) {
        toast.success('Task marked as Done!');
        setActiveCompletingId(null);
        setEveningRemarks('');
        setTodos(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed', remarks: eveningRemarks } : t));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete task');
    }
  };

  // Get unique list of salespeople for filter (Admins/CRMs only)
  const salesPersonsList = useMemo(() => {
    const list = new Set<string>();
    todos.forEach(t => {
      if (t.sales_person_name) list.add(t.sales_person_name);
    });
    return ['All', ...Array.from(list)];
  }, [todos]);

  // Filtered todos
  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      const matchUser = selectedUserFilter === 'All' || t.sales_person_name === selectedUserFilter;
      const matchStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchDate = !selectedDateFilter || t.date.includes(selectedDateFilter) || t.created_at.includes(selectedDateFilter);
      return matchUser && matchStatus && matchDate;
    });
  }, [todos, selectedUserFilter, statusFilter, selectedDateFilter]);

  const isAdminOrCrm = user?.role === 'ADMIN' || user?.role === 'CRM';

  return (
    <div className="p-0 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-900 border border-slate-800 p-4 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={12} />
              Daily Planning System
            </div>
            <h1 className="text-2xl md:text-4xl font-heading font-black tracking-tight text-white uppercase">
              Sales To-Do List
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-xl">
              Morning plan set karo aur evening me completed task mark karke sheet sync karo. Maintain your daily schedule seamlessly.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-heading font-bold text-lg md:text-xl shadow-lg">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-slate-400 font-medium">Logged in as</div>
              <div className="text-xs md:text-sm font-semibold text-white">{user?.name}</div>
              <div className="text-[9px] md:text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{user?.role}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters Bar & Add Button */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-400" />
            <span className="text-sm font-bold text-slate-200">Filters</span>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 w-full md:w-auto">
            {/* Date Filter */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-xs text-slate-400">Date:</span>
              <Input 
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white text-xs h-9 rounded-lg flex-1 sm:flex-none sm:max-w-[140px]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-white text-xs h-9 px-3 rounded-lg outline-none focus:border-indigo-500 flex-1 sm:flex-none"
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Sales Person Filter (Admin Only) */}
            {isAdminOrCrm && (
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-xs text-slate-400">Person:</span>
                <select 
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white text-xs h-9 px-3 rounded-lg outline-none focus:border-indigo-500 flex-1 sm:flex-none"
                >
                  {salesPersonsList.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Add Task Dialog Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg h-9 font-bold shadow-lg w-full sm:w-auto ml-0 sm:ml-auto md:ml-2 px-4 mt-2 sm:mt-0">
                  <Plus size={16} className="mr-1.5" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-heading text-white flex items-center gap-2">
                    <PlusCircle size={20} className="text-indigo-400" />
                    Morning Plan Assignment
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTodo} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-date" className="text-slate-300 text-xs font-semibold">Date</Label>
                    <div className="relative">
                      <Input 
                        id="task-date"
                        type="date"
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 pl-10"
                      />
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    <Label className="text-slate-300 text-xs font-semibold">Morning Task(s) / Plan</Label>
                    {newPlans.map((plan, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea 
                          placeholder={`Task ${index + 1}...`}
                          rows={2}
                          value={plan}
                          onChange={(e) => {
                            const updated = [...newPlans];
                            updated[index] = e.target.value;
                            setNewPlans(updated);
                          }}
                          className="bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 resize-none flex-1"
                        />
                        {newPlans.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setNewPlans(newPlans.filter((_, i) => i !== index))} 
                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2 h-auto rounded-xl"
                          >
                            <X size={16} />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setNewPlans([...newPlans, ''])} 
                      className="w-full border-dashed border-slate-700 bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800 h-10 rounded-xl text-xs font-medium"
                    >
                      <Plus size={14} className="mr-1.5" /> ADD ANOTHER TASK
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 font-heading font-bold shadow-lg mt-4"
                  >
                    {loading ? 'ASSIGNING...' : 'ASSIGN MORNING PLAN'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading && todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
              <span className="text-slate-400 text-sm">Syncing tasks with Google Sheets...</span>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <ClipboardList size={48} className="text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No Tasks Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-1">
                Click on "Add Task" to create a new morning plan or adjust your filters.
              </p>
            </div>
          ) : (
            <div>
              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-300 font-heading uppercase text-xs tracking-wider">
                      <th className="p-4 font-semibold whitespace-nowrap">Date</th>
                      {isAdminOrCrm && <th className="p-4 font-semibold whitespace-nowrap">Sales Person</th>}
                      <th className="p-4 font-semibold min-w-[250px]">Morning Plan</th>
                      <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                      <th className="p-4 font-semibold min-w-[200px]">Action / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTodos.map((todo) => {
                      const isPending = todo.status !== 'Completed';
                      const isCompleting = activeCompletingId === todo.id;

                      return (
                        <tr key={todo.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 whitespace-nowrap text-slate-300 align-top">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Calendar size={14} className="text-indigo-400" />
                              {todo.date}
                            </div>
                          </td>
                          
                          {isAdminOrCrm && (
                            <td className="p-4 whitespace-nowrap align-top">
                              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 w-fit">
                                <User size={12} className="text-slate-500" />
                                <span className="font-semibold">{todo.sales_person_name}</span>
                              </div>
                            </td>
                          )}

                          <td className="p-4 text-slate-200 align-top">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{todo.task_plan}</p>
                          </td>

                          <td className="p-4 whitespace-nowrap align-top">
                            <Badge className={
                              isPending 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }>
                              {isPending ? (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} /> Pending
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <CheckCircle size={12} /> Completed
                                </span>
                              )}
                            </Badge>
                          </td>

                          <td className="p-4 align-top">
                            {!isPending && todo.remarks ? (
                              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1 mb-1">
                                  <MessageSquare size={10} className="text-emerald-500" />
                                  Evening Remarks
                                </div>
                                <p className="text-slate-300 text-xs italic leading-relaxed">{todo.remarks}</p>
                              </div>
                            ) : isPending && !isCompleting ? (
                              <Button 
                                onClick={() => {
                                  setActiveCompletingId(todo.id);
                                  setEveningRemarks('');
                                }}
                                className="bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg h-8 text-xs px-3 w-full sm:w-auto transition-all duration-200"
                              >
                                <Check size={14} className="mr-1.5" />
                                MARK AS DONE
                              </Button>
                            ) : isPending && isCompleting ? (
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 min-w-[200px]">
                                <Input 
                                  placeholder="Enter remarks..."
                                  value={eveningRemarks}
                                  onChange={(e) => setEveningRemarks(e.target.value)}
                                  className="bg-slate-900 border-slate-800 text-white text-xs h-8 rounded-lg"
                                />
                                <div className="flex items-center gap-2">
                                  <Button 
                                    onClick={() => handleCompleteTodo(todo.id)}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg h-7 text-[10px] font-bold px-3 flex-1"
                                  >
                                    Save
                                  </Button>
                                  <Button 
                                    variant="ghost"
                                    onClick={() => setActiveCompletingId(null)}
                                    className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg h-7 text-[10px] px-2"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-800/50">
                {filteredTodos.map((todo) => {
                  const isPending = todo.status !== 'Completed';
                  const isCompleting = activeCompletingId === todo.id;
                  
                  return (
                    <div key={todo.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                          <Calendar size={14} className="text-indigo-400" />
                          {todo.date}
                        </div>
                        <Badge className={
                            isPending 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }>
                            {isPending ? (
                              <span className="flex items-center gap-1"><Clock size={10} /> Pending</span>
                            ) : (
                              <span className="flex items-center gap-1"><CheckCircle size={10} /> Done</span>
                            )}
                        </Badge>
                      </div>
                      
                      {isAdminOrCrm && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 w-fit">
                          <User size={12} className="text-slate-500" />
                          <span className="font-semibold">{todo.sales_person_name}</span>
                        </div>
                      )}
                      
                      <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {todo.task_plan}
                      </div>

                      <div className="pt-2">
                          {!isPending && todo.remarks ? (
                            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1 mb-1">
                                <MessageSquare size={10} className="text-emerald-500" />
                                Remarks
                              </div>
                              <p className="text-slate-300 text-xs italic leading-relaxed">{todo.remarks}</p>
                            </div>
                          ) : isPending && !isCompleting ? (
                            <Button 
                              onClick={() => {
                                setActiveCompletingId(todo.id);
                                setEveningRemarks('');
                              }}
                              className="bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg h-9 text-xs px-3 w-full transition-all duration-200"
                            >
                              <Check size={14} className="mr-1.5" />
                              MARK AS DONE
                            </Button>
                          ) : isPending && isCompleting ? (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                              <Input 
                                placeholder="Enter remarks..."
                                value={eveningRemarks}
                                onChange={(e) => setEveningRemarks(e.target.value)}
                                className="bg-slate-900 border-slate-800 text-white text-xs h-9 rounded-lg"
                              />
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleCompleteTodo(todo.id)}
                                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg h-8 text-[11px] font-bold px-3 flex-1"
                                >
                                  Save
                                </Button>
                                <Button 
                                  variant="ghost"
                                  onClick={() => setActiveCompletingId(null)}
                                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg h-8 text-[11px] px-3"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
