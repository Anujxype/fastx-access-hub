import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_PASSWORD } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import { Shield, Lock, ArrowLeft, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!password.trim()) return;
    setError('');
    if (password.trim() === ADMIN_PASSWORD) {
      localStorage.setItem('cfms_admin', 'true');
      // Store trimmed password so adminApi comparison is always consistent
      localStorage.setItem('cfms_admin_pwd', password.trim());
      navigate('/admin');
    } else {
      setError('Invalid admin password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-accent/5 blur-[120px] animate-float" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 rounded-full bg-accent/8 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-24 right-24 w-2 h-2 rounded-full bg-accent/25 animate-particle" />
      <div className="absolute bottom-40 left-20 w-1.5 h-1.5 rounded-full bg-accent/20 animate-particle" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-all duration-300 group animate-in">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Portal
        </button>

        <div className="flex flex-col items-center mb-10 animate-in-delay-1">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl animate-glow-admin" />
            <div className="absolute -inset-8 rounded-full bg-accent/5 blur-3xl" />
            <CFMSLogo size={80} className="ring-2 ring-accent/30 shadow-[0_0_40px_-8px_hsl(38_92%_50%/0.3)] animate-float" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">DRMS Admin</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-accent/40" />
            <p className="text-muted-foreground text-[11px] tracking-[0.25em] flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-accent animate-pulse-soft" />
              RESTRICTED ACCESS
            </p>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-accent/40" />
          </div>
        </div>

        <div className="glass-admin p-8 space-y-6 animate-in-delay-2 shimmer-overlay">
          <div>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-accent mb-3 tracking-[0.2em]">
              <Lock className="w-4 h-4" />
              ADMIN PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter admin password"
                className="input-admin w-full text-sm pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/40 hover:text-accent transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
              {error}
            </div>
          )}

          <button onClick={handleLogin} className="btn-admin w-full flex items-center justify-center gap-3 text-sm font-bold tracking-wide py-3.5">
            <Shield className="w-5 h-5" />
            Access Admin Panel
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 animate-in-delay-3">
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-accent/50 animate-pulse" />
            <span>MONITORED</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <p className="text-muted-foreground/30 text-[10px] tracking-[0.15em]">ACCESS IS LOGGED</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;