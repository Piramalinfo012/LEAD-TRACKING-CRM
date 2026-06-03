import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { LayoutDashboard, Eye, EyeOff, TrendingUp, Users, Target, BarChart3, ArrowRight, ShieldCheck, Zap, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, Variants } from 'framer-motion';

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
  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const fadeUpVariant: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring' as const, 
        stiffness: 300, 
        damping: 24 
      } 
    },
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

      {/* Right Panel - Login Form (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 relative min-h-screen overflow-hidden">
        
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

      {/* Mobile-Only Layout — Premium Dark Theme */}
      <div className="lg:hidden w-full h-[100dvh] flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(165deg, #0a0a1a 0%, #0f0e2a 30%, #120d28 60%, #0a0a1a 100%)' }}>
        
        {/* Animated Aurora Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div 
            animate={{ 
              x: [0, 30, -20, 0],
              y: [0, -40, 20, 0],
              scale: [1, 1.3, 0.9, 1],
              opacity: [0.4, 0.6, 0.3, 0.4],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-15%] left-[-20%] w-[70%] h-[50%] bg-indigo-600/25 blur-[100px] rounded-full"
          />
          <motion.div 
            animate={{ 
              x: [0, -30, 20, 0],
              y: [0, 30, -20, 0],
              scale: [1, 1.2, 1.1, 1],
              opacity: [0.3, 0.5, 0.25, 0.3],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[10%] right-[-15%] w-[60%] h-[45%] bg-violet-500/20 blur-[100px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute top-[40%] left-[20%] w-[50%] h-[40%] bg-cyan-500/15 blur-[90px] rounded-full"
          />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        {/* Floating glass particles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[
            { top: '12%', left: '8%', size: '6px', delay: 0, dur: 6 },
            { top: '25%', left: '85%', size: '4px', delay: 1, dur: 8 },
            { top: '65%', left: '15%', size: '5px', delay: 2, dur: 7 },
            { top: '78%', left: '75%', size: '3px', delay: 3, dur: 9 },
            { top: '45%', left: '92%', size: '4px', delay: 1.5, dur: 6.5 },
          ].map((p, i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [0, -15, 0, 15, 0],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
              className="absolute rounded-full bg-white/20 backdrop-blur-sm"
              style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
            />
          ))}
        </div>

        {/* Top Section — Logo & Brand */}
        <div className="flex-shrink-0 flex flex-col items-center justify-end px-6 pb-4 pt-12 relative z-10" style={{ height: '30%', minHeight: '180px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
            className="relative mb-4"
          >
            {/* Outer glow ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-8px] rounded-2xl"
              style={{ background: 'conic-gradient(from 0deg, transparent, rgba(99,102,241,0.4), transparent, rgba(139,92,246,0.3), transparent)' }}
            />
            <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/10">
              <LayoutDashboard className="text-white" size={28} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl font-heading font-black tracking-[0.25em] text-white uppercase select-none">CRM</h1>
            <p className="text-[11px] text-indigo-300/60 font-medium tracking-[0.3em] uppercase mt-1">Lead Management System</p>
          </motion.div>
        </div>

        {/* Bottom Card — Glassmorphic Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 relative z-10 flex flex-col"
        >
          {/* Frosted glass card */}
          <div 
            className="flex-1 rounded-t-[2rem] px-7 pt-8 pb-6 flex flex-col justify-between border-t border-white/[0.08] shadow-[0_-20px_60px_-15px_rgba(99,102,241,0.15)]"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
          >
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center mb-6"
              >
                <h2 className="text-[22px] font-heading font-black text-white uppercase tracking-wider">Welcome Back</h2>
                <p className="text-[12px] text-slate-400/80 font-medium mt-1.5 tracking-wide">Sign in to continue to your workspace</p>
              </motion.div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input — Frosted Glass */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="relative group">
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/20 via-transparent to-violet-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className="relative border border-white/[0.08] focus-within:border-indigo-500/40 rounded-2xl px-4 py-2.5 flex flex-col transition-all h-[58px] justify-center shadow-lg shadow-black/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-[9px] font-bold text-indigo-300/50 uppercase tracking-[0.2em]">User ID / Email</span>
                      <input 
                        type="text"
                        placeholder="Enter your email or ID"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-0 bg-transparent p-0 h-6 text-[14px] font-semibold text-white placeholder:text-white/20 focus:outline-none focus:ring-0 mt-0.5 w-full"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Password Input — Frosted Glass */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <div className="relative group">
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/20 via-transparent to-violet-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className="relative border border-white/[0.08] focus-within:border-indigo-500/40 rounded-2xl px-4 py-2.5 flex flex-col transition-all h-[58px] justify-center shadow-lg shadow-black/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-[9px] font-bold text-indigo-300/50 uppercase tracking-[0.2em]">Password</span>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="border-0 bg-transparent p-0 h-6 text-[14px] font-semibold text-white placeholder:text-white/20 focus:outline-none focus:ring-0 mt-0.5 w-full tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-indigo-400 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Remember Me */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="flex items-center space-x-3 pt-0.5"
                >
                  <Checkbox 
                    id="mobile-remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-white/15 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded w-4 h-4"
                  />
                  <label htmlFor="mobile-remember" className="text-[10px] uppercase font-bold text-white/30 tracking-wider cursor-pointer select-none">Remember me for 30 days</label>
                </motion.div>

                {/* Premium Sign In Button */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="pt-3"
                >
                  <Button 
                     type="submit" 
                     className="w-full h-[52px] rounded-2xl uppercase tracking-[0.2em] text-[11px] font-black border-0 group relative overflow-hidden shadow-2xl shadow-indigo-600/25 transition-all duration-300 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                     style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
                     disabled={loading}
                  >
                    {/* Shimmer sweep effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                      />
                    </div>
                    
                    {loading ? (
                      <div className="flex items-center justify-center gap-3 w-full relative z-10">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-white/90">Authenticating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 w-full relative z-10">
                        <span className="text-white">Sign In</span>
                        <ArrowRight size={15} className="text-white/80 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>

            {/* Footer with security badge */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-4 flex flex-col items-center gap-2 shrink-0"
            >
              <div className="flex items-center gap-1.5 text-white/15">
                <ShieldCheck size={12} />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Secured Connection</span>
              </div>
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.25em]">
                Developed By <span className="text-indigo-400/60">Deepak Sahu</span>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
