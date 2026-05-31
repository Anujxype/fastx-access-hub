import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, fetchAllEndpoints } from '@/lib/supabase';
import { fbValidateKey } from '@/lib/firebase';
import CFMSLogo from '@/components/CFMSLogo';
import Starfield from '@/components/Starfield';
import { Key, Shield, Loader2, Sparkles, ArrowRight, Zap, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('cfms_key');
    // Only redirect to global portal if logged in with a GLOBAL key (no panel scope).
    // Panel logins set cfms_panel_id; if that's set the key is panel-scoped and
    // should NOT get access to the global /portal (all endpoints).
    const panelId = localStorage.getItem('cfms_panel_id');
    if (stored && !panelId) navigate('/portal');
    // Pre-warm endpoint cache while user types their key so Portal renders instantly.
    else {
      // Clear any stale panel scope that might have leaked from a previous panel session
      if (stored && panelId) {
        localStorage.removeItem('cfms_key');
        localStorage.removeItem('cfms_key_name');
        localStorage.removeItem('cfms_key_id');
        localStorage.removeItem('cfms_panel_id');
      }
      void fetchAllEndpoints();
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    let navigated = false;
    try {
      // RPC validates + atomically increments uses, returns null if invalid/expired/disabled
      const { data, error: dbError } = await supabase.rpc('validate_access_key', { p_key: key.trim() });
      if (dbError) throw dbError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError('Invalid, inactive, or expired access key'); return; }

      localStorage.setItem('cfms_key', row.key_value);
      localStorage.setItem('cfms_key_name', row.name);
      localStorage.setItem('cfms_key_id', row.id);
      // Ensure no stale panel scope bleeds into the global portal
      localStorage.removeItem('cfms_panel_id');

      navigated = true;
      navigate('/portal');
    } catch (err: unknown) {
      // Supabase failed (timeout / cold start) — try Firebase as fallback
      const fbRow = await fbValidateKey(key.trim());
      if (fbRow) {
        localStorage.setItem('cfms_key', fbRow.key_value);
        localStorage.setItem('cfms_key_name', fbRow.name);
        localStorage.setItem('cfms_key_id', fbRow.id);
        localStorage.removeItem('cfms_panel_id');
        navigated = true;
        navigate('/portal');
        return;
      }
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      // Only reset loading if we didn't navigate away (avoids state update on unmounted component)
      if (!navigated) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Starfield />
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary/8 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[160px]" />
      
      <div className="absolute top-20 left-20 w-2 h-2 rounded-full bg-primary/30 animate-particle" />
      <div className="absolute top-40 right-32 w-1.5 h-1.5 rounded-full bg-primary/25 animate-particle" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-1/3 w-1 h-1 rounded-full bg-primary/20 animate-particle" style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-1/3 right-20 w-1.5 h-1.5 rounded-full bg-accent/20 animate-particle" style={{ animationDelay: '3.5s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-12 animate-in">
          <div className="relative mb-8 animate-glow-pulse animate-float">
            <div className="absolute -inset-4 rounded-2xl bg-primary/15 blur-2xl" />
            <div className="absolute -inset-8 rounded-3xl bg-primary/5 blur-3xl" />
            <CFMSLogo size={88} />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2">
            <span className="text-gradient-primary">DRMS</span>
          </h1>
          <p className="text-xs text-muted-foreground/80 tracking-wide mb-2">Debt Recovery Management System</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <p className="text-muted-foreground text-[11px] tracking-[0.3em] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" />
              SECURE ACCESS GATEWAY
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" />
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </div>

        <div className="glass-strong p-8 space-y-6 animate-in-delay-1 animate-border-glow shimmer-overlay">
          <div>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-primary mb-3 tracking-[0.2em]">
              <Key className="w-4 h-4" />
              ACCESS KEY
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your access key"
                className="input-glass w-full text-sm pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3 text-sm font-bold tracking-wide py-3.5">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? 'Verifying...' : 'Access Portal'}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>

          <div className="text-center pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-muted-foreground hover:text-accent text-sm transition-all duration-300 hover:tracking-wider group inline-flex items-center gap-1.5"
            >
              Admin Access
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-muted-foreground/20">|</span>
            <button
              onClick={() => navigate('/master-login')}
              className="text-muted-foreground hover:text-primary text-sm transition-all duration-300 hover:tracking-wider group inline-flex items-center gap-1.5"
            >
              Master Panel
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 animate-in-delay-3">
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
            <span>ENCRYPTED</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <p className="text-muted-foreground/30 text-[10px] tracking-[0.15em]">
            DRMS SECURITY PROTOCOL
          </p>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-primary/50 animate-pulse" />
            <span>ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;