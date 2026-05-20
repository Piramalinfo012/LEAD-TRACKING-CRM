import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { LayoutDashboard, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { request, loading } = useApi();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.token, data.user);
      toast.success('Access initialized');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] relative overflow-hidden">
      {/* Background Animated Blobs */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 z-0"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 w-full max-w-md"
      >
        <Card className="bg-white/80 backdrop-blur-xl border-slate-200 shadow-2xl p-4 overflow-hidden relative">
          <CardHeader className="space-y-4 pt-4 pb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
              className="mx-auto w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <LayoutDashboard className="text-white" size={24} />
            </motion.div>
            <div className="text-center space-y-1">
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <CardTitle className="text-2xl font-black tracking-tighter text-slate-950 uppercase">
                  CRM
                </CardTitle>
                <CardDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Lead Management System
                </CardDescription>
              </motion.div>
            </div>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="text-xs uppercase font-bold text-slate-700 tracking-widest pl-1">User ID / Email</Label>
                <Input 
                  id="email" 
                  type="text" 
                  placeholder="Enter your ID or Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-950 h-12 font-bold px-4 rounded-xl focus-visible:ring-indigo-500/20 transition-all border-2 focus-visible:border-indigo-600 shadow-sm placeholder:text-slate-400"
                />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between pl-1">
                  <Label htmlFor="password" className="text-xs uppercase font-bold text-slate-700 tracking-widest">Password</Label>
                  <a href="#" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">Forgot?</a>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-950 h-12 font-bold px-4 pr-12 rounded-xl focus-visible:ring-indigo-500/20 transition-all border-2 focus-visible:border-indigo-600 shadow-sm placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 transition-colors p-2"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex items-center space-x-3 pl-1"
              >
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-slate-400 data-[state=checked]:bg-indigo-600 rounded-md h-5 w-5"
                />
                <label htmlFor="remember" className="text-xs uppercase font-bold text-slate-700 tracking-widest cursor-pointer select-none">Remember Me</label>
              </motion.div>
            </CardContent>
            
            <CardFooter className="pt-6 pb-4">
              <motion.div 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full"
              >
                <Button 
                   type="submit" 
                   className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold h-14 rounded-xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-slate-950/20 transition-all border-0"
                   disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : 'Sign In'}
                </Button>
              </motion.div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-10 w-full text-center"
      >
        <p className="text-xs text-slate-600 font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          Developed By <span className="text-indigo-600 font-black">Deepak Sahu</span>
        </p>
      </motion.div>
    </div>
  );
}
