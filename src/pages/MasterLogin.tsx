import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MASTER_PASSWORD } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import { Crown, Lock, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

const MasterLogin = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (password === MASTER_PASSWORD) {
        localStorage.setItem('cfms_master', 'true');
        navigate('/master');
      } else {
        setError('Invalid master password');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/8 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-20 right-20 w-2 h-2 rounded-full bg-primary/30 animate-particle" />
      <div className="absolute bottom-32 left-16 w-1.5 h-1.5 rounded-full bg-accent/20 animate-particle" style={{ animationDelay: '3s' }} />

      <div className="w-full max-w-md relative z-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-all duration-300 group animate-in">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        <div className="flex flex-col items-center mb-10 animate-in-delay-1">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl animate-glow-master" />
            <div className="absolute -inset-8 rounded-full bg-primary/5 blur-3xl" />
            <CFMSLogo size={80} className="ring-2 ring-primary/30 shadow-[0_0_40px_-8px_hsl(265_72%_58%/0.3)] animate-float" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Master Control</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-primary/40" />
            <p className="text-muted-foreground text-[11px] tracking-[0.25em] flex items-center gap-2">
              <Crown className="w-3 h-3 text-primary animate-pulse-soft" />
              SUPREME ACCESS ONLY
            </p>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </div>

        <div className="glass-master p-8 space-y-6 animate-in-delay-2 shimmer-overlay">
          <div>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-primary mb-3 tracking-[0.2em]">
              <Lock className="w-4 h-4" />
              MASTER PASSWORD
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter master password"
                className="input-glass w-full text-sm pr-10"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Crown className="w-4 h-4 text-primary/30" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 text-sm font-bold tracking-wide py-3.5">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
            {loading ? 'Authenticating...' : 'Access Master Panel'}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 animate-in-delay-3">
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-primary/50 animate-pulse" />
            <span>ENCRYPTED</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <p className="text-muted-foreground/30 text-[10px] tracking-[0.15em]">MASTER CONTROL ONLY</p>
        </div>
      </div>
    </div>
  );
};

export default MasterLogin;