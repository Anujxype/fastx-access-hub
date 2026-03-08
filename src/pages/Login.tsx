import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import FastXLogo from '@/components/FastXLogo';
import { Key, Shield, Loader2, Sparkles } from 'lucide-react';

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
      {/* Ambient background orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-primary/8 blur-[100px] animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 animate-in">
          <div className="relative mb-6 animate-glow-pulse animate-float">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
            <FastXLogo size={80} />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-primary to-[hsl(160_70%_55%)] bg-clip-text text-transparent">Fast</span>
            <span className="text-foreground">X</span>
          </h1>
          <p className="text-muted-foreground text-xs tracking-[0.25em] flex items-center gap-2 mt-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            SECURE ACCESS GATEWAY
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-strong p-7 space-y-5 animate-in-delay-1 animate-border-glow">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-primary mb-2.5 tracking-wider">
              <Key className="w-4 h-4" />
              ACCESS KEY
            </label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your access key"
              className="input-glass w-full text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm animate-in p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2.5 text-sm font-bold tracking-wide">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? 'Verifying...' : 'Access Portal'}
          </button>

          <div className="text-center pt-1">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-muted-foreground hover:text-accent text-sm transition-all duration-300 hover:tracking-wide"
            >
              Admin Access →
            </button>
          </div>
        </div>

        <p className="text-center text-muted-foreground/40 text-[10px] mt-8 tracking-[0.15em] animate-in-delay-3">
          PROTECTED BY AKSHU SECURITY PROTOCOL
        </p>
      </div>
    </div>
  );
};

export default Login;
