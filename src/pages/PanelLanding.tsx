import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type ManagedPanel } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import { Key, Shield, Loader2, Sparkles, ArrowRight, Zap, Lock, Users, ShieldOff } from 'lucide-react';

const PanelLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<ManagedPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Portal login state
  const [mode, setMode] = useState<'choose' | 'portal' | 'admin'>('choose');
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    const fetchPanel = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('managed_panels')
        .select('*')
        .eq('slug', slug.toLowerCase())
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPanel(data);
      const expired = data.expiry_date && new Date(data.expiry_date) < new Date();
      if (!data.is_active || expired) {
        setDisabled(true);
      }

      // Check existing sessions
      const storedPortal = localStorage.getItem(`cfms_portal_${data.id}`);
      if (storedPortal === 'true') {
        navigate(`/${slug}/portal`);
        return;
      }
      const storedAdmin = localStorage.getItem(`cfms_panel_${data.id}`);
      if (storedAdmin === 'true') {
        navigate(`/${slug}/admin`);
        return;
      }

      setLoading(false);
    };
    fetchPanel();
  }, [slug, navigate]);

  const handlePortalLogin = async () => {
    if (!key.trim() || !panel) return;
    setLoginLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_value', key.trim())
        .eq('is_active', true)
        .eq('panel_id', panel.id)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!data) { setError('Invalid or inactive access key'); setLoginLoading(false); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setError('This key has expired'); setLoginLoading(false); return; }

      await supabase.from('api_keys').update({ uses: (data.uses || 0) + 1 }).eq('id', data.id);
      localStorage.setItem(`cfms_portal_${panel.id}`, 'true');
      localStorage.setItem('fastx_key', data.key_value);
      localStorage.setItem('fastx_key_name', data.name);
      localStorage.setItem('fastx_key_id', data.id);
      localStorage.setItem('fastx_panel_id', panel.id);
      navigate(`/${slug}/portal`);
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (!password || !panel) return;
    setLoginLoading(true);
    setError('');
    setTimeout(() => {
      if (password === panel.panel_password) {
        localStorage.setItem(`cfms_panel_${panel.id}`, 'true');
        navigate(`/${slug}/admin`);
      } else {
        setError('Invalid panel password');
      }
      setLoginLoading(false);
    }, 500);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-black mb-2">Panel Not Found</h1>
        <p className="text-muted-foreground text-sm">The panel "{slug}" does not exist.</p>
      </div>
    </div>
  );

  if (disabled) return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-10" />
      <div className="w-full max-w-md text-center relative z-10 animate-in">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-destructive/15 blur-xl" />
          <div className="relative w-full h-full rounded-2xl bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <h1 className="text-3xl font-black mb-2">Panel Disabled</h1>
        <p className="text-muted-foreground text-sm mb-4">{panel?.panel_name || 'This panel'} has been deactivated or expired.</p>
        <p className="text-xs text-muted-foreground">Contact your administrator for assistance.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary/8 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-10 animate-in">
          <div className="relative mb-6 animate-float">
            <div className="absolute -inset-4 rounded-2xl bg-primary/15 blur-2xl" />
            <CFMSLogo size={80} />
          </div>
          <h1 className="text-3xl font-black">{panel?.panel_name}</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <p className="text-muted-foreground text-[11px] tracking-[0.3em] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" />
              SECURE ACCESS
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse-soft" />
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </div>

        {mode === 'choose' && (
          <div className="space-y-4 animate-in-delay-1">
            {/* Portal Access */}
            <button
              onClick={() => setMode('portal')}
              className="glass-strong w-full p-6 text-left group hover:border-primary/30 transition-all duration-300 shimmer-overlay"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <Key className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Portal Access</h3>
                  <p className="text-xs text-muted-foreground">Login with your API key to access endpoints</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </button>

            {/* Admin Access */}
            <button
              onClick={() => setMode('admin')}
              className="glass-strong w-full p-6 text-left group hover:border-accent/30 transition-all duration-300 shimmer-overlay"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-all">
                  <Shield className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Admin Panel</h3>
                  <p className="text-xs text-muted-foreground">Manage keys, logs, and analytics</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          </div>
        )}

        {mode === 'portal' && (
          <div className="glass-strong p-8 space-y-6 animate-in-delay-1 shimmer-overlay">
            <button onClick={() => { setMode('choose'); setError(''); setKey(''); }} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-all">
              ← Back
            </button>
            <div>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-primary mb-3 tracking-[0.2em]">
                <Key className="w-4 h-4" /> ACCESS KEY
              </label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePortalLogin()}
                placeholder="Enter your access key"
                className="input-glass w-full text-sm"
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2.5 text-destructive text-sm p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-in">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                {error}
              </div>
            )}
            <button onClick={handlePortalLogin} disabled={loginLoading} className="btn-primary w-full flex items-center justify-center gap-3 text-sm font-bold py-3.5">
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {loginLoading ? 'Verifying...' : 'Access Portal'}
              {!loginLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {mode === 'admin' && (
          <div className="glass-strong p-8 space-y-6 animate-in-delay-1 shimmer-overlay">
            <button onClick={() => { setMode('choose'); setError(''); setPassword(''); }} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-all">
              ← Back
            </button>
            <div>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-accent mb-3 tracking-[0.2em]">
                <Lock className="w-4 h-4" /> PANEL PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter panel password"
                className="input-admin w-full text-sm"
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2.5 text-destructive text-sm p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-in">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                {error}
              </div>
            )}
            <button onClick={handleAdminLogin} disabled={loginLoading} className="btn-admin w-full flex items-center justify-center gap-3 text-sm font-bold py-3.5">
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {loginLoading ? 'Authenticating...' : 'Access Admin'}
              {!loginLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-8 animate-in-delay-3">
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
            <span>ENCRYPTED</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <p className="text-muted-foreground/30 text-[10px] tracking-[0.15em]">CFMS PROTOCOL</p>
        </div>
      </div>
    </div>
  );
};

export default PanelLanding;
