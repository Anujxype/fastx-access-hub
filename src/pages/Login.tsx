import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import { Key, Shield, Loader2, Sparkles, ArrowRight, Zap } from 'lucide-react';

const Login = () => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('fastx_key');
    if (stored) navigate('/portal');
  }, [navigate]);

  const handleLogin = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_value', key.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!data) { setError('Invalid or inactive access key'); setLoading(false); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setError('This key has expired'); setLoading(false); return; }

      await supabase.from('api_keys').update({ uses: (data.uses || 0) + 1 }).eq('id', data.id);
      localStorage.setItem('fastx_key', data.key_value);
      localStorage.setItem('fastx_key_name', data.name);
      localStorage.setItem('fastx_key_id', data.id);

      const { data: broadcasts } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(1);
      if (broadcasts && broadcasts.length > 0) {
        const lastSeen = localStorage.getItem('fastx_last_broadcast');
        if (lastSeen !== broadcasts[0].id) {
          localStorage.setItem('fastx_broadcast', JSON.stringify(broadcasts[0]));
          localStorage.setItem('fastx_last_broadcast', broadcasts[0].id);
        }
      }
      navigate('/portal');
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-30" />
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
          <h1 className="text-5xl font-black tracking-tight mb-3">
            <span className="text-gradient-primary">CFMS</span>
          </h1>
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
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your access key"
                className="input-glass w-full text-sm pr-10"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Zap className="w-4 h-4 text-primary/30" />
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? 'Verifying...' : 'Access Portal'}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-muted-foreground hover:text-accent text-sm transition-all duration-300 hover:tracking-wider group inline-flex items-center gap-1.5"
            >
              Admin Access
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
            AKSHU SECURITY PROTOCOL
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
