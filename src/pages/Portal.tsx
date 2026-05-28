import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, API_BASE, ENDPOINTS, fetchAllEndpoints, getDeviceInfo, getGeoInfo } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import Starfield from '@/components/Starfield';
import {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck, Flame, Truck,
  Globe, Shield, User, Key, Database, Server, Cpu, Hash,
  LogOut, Loader2, Zap, X, Terminal, Copy, Check, ChevronRight, Activity
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck, Flame, Truck,
  Globe, Shield, User, Key, Database, Server, Cpu, Hash,
};

const Portal = () => {
  const [allEndpoints, setAllEndpoints] = useState(ENDPOINTS);
  const [selectedEndpoint, setSelectedEndpoint] = useState<typeof ENDPOINTS[0] | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [broadcast, setBroadcast] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const keyName = localStorage.getItem('cfms_key_name') || 'User';
  const keyId = localStorage.getItem('cfms_key_id');

  useEffect(() => {
    if (!localStorage.getItem('cfms_key')) { navigate('/'); return; }
    // Clean up any stale broadcast data left by the Login page
    try { localStorage.removeItem('cfms_broadcast'); } catch {}
    fetchAllEndpoints().then(setAllEndpoints);
    // Fetch the latest broadcast directly so we don't race with the fire-and-forget
    // in Login.tsx that writes to localStorage before Portal mounts.
    supabase.rpc('get_latest_broadcast', { p_panel_id: null }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      const lastSeen = localStorage.getItem('cfms_last_broadcast');
      if (lastSeen !== row.id) {
        setBroadcast(row);
        localStorage.setItem('cfms_last_broadcast', row.id);
      }
    }).catch(() => { /* non-critical — silently ignore */ });
  }, [navigate]);

  const handleSearch = async () => {
    if (!selectedEndpoint || !query.trim()) return;
    setLoading(true); setError(''); setResult(null);
    const ep = selectedEndpoint.endpoint;
    const q = query.trim();
    const url = `${API_BASE}${ep}?${selectedEndpoint.param}=${encodeURIComponent(q)}`;

    const logCall = (status: 'success' | 'error') => {
      void getGeoInfo().then(geo => supabase.rpc('log_api_call', {
        p_key_id: keyId, p_key_name: keyName, p_endpoint: ep, p_query: q,
        p_status: status, p_device: getDeviceInfo(), p_user_agent: navigator.userAgent,
        p_ip: geo.ip, p_location: geo.location, p_panel_id: null,
      }));
    };

    try {
      // 20 s upstream timeout — was unbounded, causing UI to hang on dead providers
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      let data: unknown = null;
      try { data = await res.json(); } catch { data = { raw: await res.text().catch(() => '') }; }
      setResult(data);
      if (!res.ok) setError(`Upstream returned HTTP ${res.status}`);
      logCall(res.ok ? 'success' : 'error');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
      logCall('error');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('cfms_key');
    localStorage.removeItem('cfms_key_name');
    localStorage.removeItem('cfms_key_id');
    navigate('/');
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen pb-12 relative">
      <Starfield />
      <div className="fixed inset-0 dot-grid opacity-15 pointer-events-none" />
      <div className="fixed top-0 -left-32 w-96 h-96 rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 -right-32 w-96 h-96 rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />

      <header className="glass-strong sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0 animate-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 rounded-lg bg-primary/15 blur-md" />
            <CFMSLogo size={32} className="relative" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base block leading-tight truncate max-w-[140px] sm:max-w-none">{keyName}</span>
            <span className="text-[9px] text-muted-foreground tracking-wider">ACTIVE SESSION</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex text-[10px] bg-primary/15 text-primary px-2.5 py-1 rounded-full border border-primary/25 font-semibold tracking-wider items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block mr-1.5 animate-pulse" />
            Portal
          </span>
          <button aria-label="User profile" className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <User className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} aria-label="Log out" className="p-2 sm:px-3 sm:py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all group inline-flex items-center gap-1.5">
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline text-xs font-semibold">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
        {broadcast && (
          <div className="glass-admin p-4 mb-5 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
            <button onClick={() => setBroadcast(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Activity className="w-4 h-4 text-accent" />
              </div>
              <div className="pr-6">
                <h3 className="font-bold text-accent mb-1 text-sm">{broadcast.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{broadcast.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Secure Session banner */}
        <div className="glass p-4 mb-6 animate-fade-in-up flex items-center justify-between gap-3 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 min-w-0 relative">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">Secure Session Active</p>
              <p className="text-[11px] text-muted-foreground truncate">{getDeviceInfo()} • {navigator.platform || 'Web'} • {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-lg bg-success/10 border border-success/20 items-center justify-center flex-shrink-0 relative">
            <Activity className="w-4 h-4 text-success" />
          </div>
        </div>

        <h2 className="text-xs font-semibold text-primary tracking-[0.25em] mb-4 flex items-center gap-2.5 animate-in">
          <Zap className="w-3.5 h-3.5" />
          SELECT ENDPOINT
          <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent ml-2" />
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
          {allEndpoints.map((ep, i) => {
            const Icon = iconMap[ep.icon] || Search;
            const isActive = selectedEndpoint?.endpoint === ep.endpoint;
            return (
              <button
                key={ep.endpoint}
                onClick={() => { setSelectedEndpoint(ep); setResult(null); setQuery(''); setError(''); }}
                className={`${isActive ? 'endpoint-card-active' : 'endpoint-card'} animate-in group`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary/15 shadow-[0_0_12px_-2px_hsl(160_84%_39%/0.3)]' 
                    : 'bg-secondary/50 group-hover:bg-primary/10'
                }`}>
                  <Icon className={`w-5 h-5 transition-all duration-300 ${
                    isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary/70'
                  }`} />
                </div>
                <p className={`font-semibold text-sm transition-colors duration-300 ${
                  isActive ? 'text-primary' : 'text-foreground'
                }`}>{ep.label}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <p className="text-[10px] text-muted-foreground font-mono opacity-60">{ep.endpoint}</p>
                  <ChevronRight className={`w-3 h-3 transition-all duration-300 ${
                    isActive ? 'text-primary opacity-100 translate-x-0' : 'text-muted-foreground opacity-0 -translate-x-1'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>

        {selectedEndpoint && (
          <div className="glass-strong p-6 space-y-5 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
              <div className="w-full h-px bg-primary" style={{ animation: 'scanline 4s linear infinite' }} />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse-soft" />
                <Terminal className="w-5 h-5 text-primary relative" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{selectedEndpoint.label}</h3>
                <p className="text-[11px] text-muted-foreground">
                  Query by <span className="text-primary font-semibold">{selectedEndpoint.param}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Enter ${selectedEndpoint.param}...`}
                className="input-glass flex-1 text-sm"
                autoFocus
              />
              <button onClick={handleSearch} disabled={loading} className="btn-primary px-5 rounded-xl flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <p className="text-[10px] text-primary/40 font-mono tracking-wider">
                GET {selectedEndpoint.endpoint}?{selectedEndpoint.param}={'{value}'}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="glass p-5 animate-fade-in-up relative group">
                <button
                  onClick={copyResult}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-success font-mono tracking-wider">RESPONSE OK</span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-muted-foreground/50 font-mono">JSON</span>
                </div>
                <pre className="text-[11px] text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portal;
