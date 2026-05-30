import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { LayoutDashboard, Eye, EyeOff, TrendingUp, Users, Target, BarChart3, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

  // Animation Variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      
      {/* Left Panel - Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-[#09090b] relative flex-col justify-between p-12 overflow-hidden">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/20 blur-[120px] rounded-full mix-blend-screen" 
          />
        </div>
        
        {/* Floating Grid Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 border border-indigo-400/20">
            <LayoutDashboard className="text-white" size={20} />
          </div>
          <span className="text-white font-heading font-black text-2xl tracking-widest uppercase">CRM</span>
        </motion.div>

        {/* Main Content & Text Animation */}
        <div className="z-10 w-full max-w-lg relative">
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-5xl xl:text-6xl font-black text-white leading-[1.1] font-heading uppercase tracking-tight">
              <motion.span variants={fadeUpVariant}>Accelerate</motion.span>
              <motion.span variants={fadeUpVariant} className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Your Sales</motion.span>
              <motion.span variants={fadeUpVariant}>Pipeline.</motion.span>
            </div>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-slate-400 text-lg leading-relaxed font-medium max-w-md"
          >
            An enterprise-grade platform to track, analyze, and convert leads with powerful AI-driven insights.
          </motion.p>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mt-12 grid grid-cols-2 gap-4"
          >
            {[
              { icon: TrendingUp, label: "Analytics" },
              { icon: Users, label: "Team Sync" },
              { icon: Target, label: "Conversion" },
              { icon: Zap, label: "Automation" }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                variants={fadeUpVariant}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md cursor-pointer transition-colors"
              >
                <div className="p-2 bg-indigo-500/20 rounded-lg"><item.icon className="text-indigo-400" size={18} /></div>
                <span className="text-slate-200 text-sm font-semibold uppercase tracking-wider">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Floating Glassmorphic CRM Preview Card */}
          <motion.div 
            initial={{ opacity: 0, x: 50, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 100 }}
            className="absolute -right-16 -bottom-12 w-64 p-4 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl hidden xl:block"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-xs font-bold uppercase tracking-wider">Conversion Rate</span>
              <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded-md">+14.2%</span>
            </div>
            <div className="flex items-end gap-2 h-16 w-full">
              {[40, 70, 45, 90, 65, 100, 85].map((height, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 1, delay: 1 + (i * 0.1) }}
                  className="flex-1 bg-indigo-500 rounded-sm opacity-80"
                />
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="z-10 flex items-center justify-between w-full border-t border-white/10 pt-6 mt-12"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Enterprise Security</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">
            Developed By <span className="text-indigo-400">Deepak Sahu</span>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 relative min-h-[100dvh] lg:min-h-screen overflow-hidden">
        
        {/* Subtle mobile background decoration */}
        <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[70%] h-[40%] bg-indigo-300/20 blur-[80px] rounded-full z-0" />
        <div className="lg:hidden absolute bottom-[-10%] left-[-10%] w-[70%] h-[40%] bg-cyan-300/20 blur-[80px] rounded-full z-0" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] bg-white/80 sm:bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-indigo-900/5 border border-white sm:border-slate-100/80 relative z-10 backdrop-blur-2xl sm:backdrop-blur-none mt-4 sm:mt-0"
        >
          {/* Mobile Logo inside the card */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:hidden flex items-center justify-center gap-3 mb-6"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="text-white" size={16} />
            </div>
            <span className="text-slate-900 font-heading font-black text-xl tracking-widest uppercase">CRM</span>
          </motion.div>
          
          <div className="space-y-2 text-center sm:text-left">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl font-black text-slate-900 font-heading tracking-tight uppercase"
            >
              Welcome Back
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-slate-500 font-medium text-sm leading-relaxed"
            >
              Enter your credentials to securely access your workspace and manage your pipeline.
            </motion.p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-4"
            >
              <div className="space-y-1.5 group">
                <Label htmlFor="email" className="text-[11px] uppercase font-bold text-slate-500 tracking-widest group-focus-within:text-indigo-600 transition-colors">User ID / Email</Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    type="text" 
                    placeholder="Enter your ID or Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 font-medium px-4 rounded-xl focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all border focus-visible:border-indigo-500 focus-visible:bg-white shadow-sm placeholder:text-slate-400 text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5 group">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] uppercase font-bold text-slate-500 tracking-widest group-focus-within:text-indigo-600 transition-colors">Password</Label>
                  <a href="#" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors">Forgot Password?</a>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 font-medium px-4 pr-12 rounded-xl focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all border focus-visible:border-indigo-500 focus-visible:bg-white shadow-sm placeholder:text-slate-400 text-sm tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 pt-1">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded w-4 h-4"
                />
                <label htmlFor="remember" className="text-[11px] uppercase font-bold text-slate-500 tracking-wider cursor-pointer select-none">Remember me for 30 days</label>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="pt-2"
            >
              <Button 
                 type="submit" 
                 className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold h-12 rounded-xl uppercase tracking-widest text-xs shadow-lg shadow-slate-900/10 hover:shadow-indigo-600/20 transition-all duration-300 border-0 group relative overflow-hidden"
                 disabled={loading}
              >
                {/* Button Hover Glow Effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>

                {loading ? (
                  <div className="flex items-center justify-center gap-2 relative z-10 w-full">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 relative z-10 w-full">
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>
        
        {/* Mobile Footer inside the right panel flow */}
        <div className="lg:hidden absolute bottom-6 w-full text-center z-10">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            Developed By <span className="text-indigo-600">Deepak Sahu</span>
          </p>
        </div>
      </div>
    </div>
  );
}
