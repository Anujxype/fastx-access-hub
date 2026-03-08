import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import FastXLogo from '@/components/FastXLogo';
import { Key, Shield, Loader2 } from 'lucide-react';

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
        .eq('key', key.trim())
        .eq('enabled', true)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!data) {
        setError('Invalid or inactive access key');
        setLoading(false);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This key has expired');
        setLoading(false);
        return;
      }

      // Increment uses
      await supabase.from('api_keys').update({ uses: (data.uses || 0) + 1 }).eq('id', data.id);

      localStorage.setItem('fastx_key', data.key);
      localStorage.setItem('fastx_key_name', data.name);
      localStorage.setItem('fastx_key_id', data.id);

      // Check for broadcasts
      const { data: broadcasts } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        <div className="flex flex-col items-center mb-8">
          <div className="animate-glow mb-6" style={{ animation: 'glowPulse 3s ease-in-out infinite' }}>
            <FastXLogo size={72} />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">
            Fast<span className="text-foreground">X</span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.2em] flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            SECURE ACCESS GATEWAY
          </p>
        </div>

        <div className="glass-strong p-6 space-y-5 animate-in-delay-1">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <Key className="w-4 h-4" />
              ACCESS KEY
            </label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your access key"
              className="input-glass w-full"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-destructive text-sm animate-fade-in">{error}</p>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            Access Portal
          </button>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Admin Access →
            </button>
          </div>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          Protected by Akshu Security Protocol
        </p>
      </div>
    </div>
  );
};

export default Login;
