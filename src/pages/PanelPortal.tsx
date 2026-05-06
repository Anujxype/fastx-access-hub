import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, API_BASE, ENDPOINTS, fetchAllEndpoints, getDeviceInfo, getGeoInfo, type ManagedPanel } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import AlertBanner from '@/components/AlertBanner';
import {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck, Flame, Truck,
  LogOut, User, Loader2, Zap, X, Terminal, Copy, Check, ChevronRight, Activity
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck, Flame, Truck,
};

const PanelPortal = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<ManagedPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [allEndpoints, setAllEndpoints] = useState(ENDPOINTS);
  const [selectedEndpoint, setSelectedEndpoint] = useState<typeof ENDPOINTS[0] | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const keyName = localStorage.getItem('cfms_key_name') || 'User';
  const keyId = localStorage.getItem('cfms_key_id');
  const panelId = localStorage.getItem('cfms_panel_id');

  useEffect(() => {
    if (!slug) return;
    const init = async () => {
      const [{ data }, endpoints] = await Promise.all([
        supabase.from('managed_panels').select('*').eq('slug', slug.toLowerCase()).single(),
        fetchAllEndpoints(),
      ]);
      if (!data) { navigate(`/${slug}`); return; }
      setPanel(data);
      setAllEndpoints(endpoints);

      const storedPortal = localStorage.getItem(`cfms_portal_${data.id}`);
      if (storedPortal !== 'true') { navigate(`/${slug}`); return; }

      const expired = data.expiry_date && new Date(data.expiry_date) < new Date();
      if (!data.is_active || expired) { navigate(`/${slug}`); return; }

      setLoading(false);
    };
    init();
  }, [slug, navigate]);

  const allowedEndpoints = panel?.allowed_endpoints || [];
  const filteredEndpoints = allEndpoints.filter(ep => allowedEndpoints.includes(ep.endpoint));

  const handleSearch = async () => {
    if (!selectedEndpoint || !query.trim() || !panel) return;
    setSearchLoading(true); setError(''); setResult(null);
    try {
      const url = `${API_BASE}${selectedEndpoint.endpoint}?${selectedEndpoint.param}=${encodeURIComponent(query.trim())}`;
      const [res, geo] = await Promise.all([fetch(url), getGeoInfo()]);
      const data = await res.json();
      await supabase.from('api_logs').insert({
        key_id: keyId, key_name: keyName, endpoint: selectedEndpoint.endpoint,
        query: query.trim(), status: res.ok ? 'success' : 'error',
        device: getDeviceInfo(), user_agent: navigator.userAgent,
        panel_id: panel.id, ip_address: geo.ip, location: geo.location,
      });
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
      const geo = await getGeoInfo();
      await supabase.from('api_logs').insert({
        key_id: keyId, key_name: keyName, endpoint: selectedEndpoint.endpoint,
        query: query.trim(), status: 'error', device: getDeviceInfo(), user_agent: navigator.userAgent,
        panel_id: panel.id, ip_address: geo.ip, location: geo.location,
      });
    } finally { setSearchLoading(false); }
  };

  const handleLogout = () => {
    if (panel) localStorage.removeItem(`cfms_portal_${panel.id}`);
    localStorage.removeItem('cfms_key');
    localStorage.removeItem('cfms_key_name');
    localStorage.removeItem('cfms_key_id');
    localStorage.removeItem('cfms_panel_id');
    navigate(`/${slug}`);
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pb-12 relative">
      <div className="fixed inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="fixed top-0 -left-32 w-96 h-96 rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 -right-32 w-96 h-96 rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />

      {panel && <AlertBanner panelId={panel.id} />}

      <header className="glass-strong sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0 animate-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 rounded-lg bg-primary/15 blur-md" />
            <CFMSLogo size={32} className="relative" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base block leading-tight truncate max-w-[180px] sm:max-w-none">{panel?.panel_name} — {keyName}</span>
            <span className="text-[9px] text-muted-foreground tracking-wider">PORTAL SESSION</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex text-[10px] bg-primary/15 text-primary px-2.5 py-1 rounded-full border border-primary/25 font-semibold tracking-wider items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block mr-1.5 animate-pulse" />
            Portal
          </span>
          <button onClick={handleLogout} aria-label="Log out" className="p-2 sm:px-3 sm:py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all group inline-flex items-center gap-1.5">
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline text-xs font-semibold">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
        <div className="glass p-4 mb-6 animate-fade-in-up flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 min-w-0 relative">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">Secure Session Active</p>
              <p className="text-[11px] text-muted-foreground truncate">{getDeviceInfo()} • {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-lg bg-success/10 border border-success/20 items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-success" />
          </div>
        </div>

        <h2 className="text-xs font-semibold text-primary tracking-[0.25em] mb-4 flex items-center gap-2.5 animate-in">
          <Zap className="w-3.5 h-3.5" />
          SELECT ENDPOINT
          <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent ml-2" />
        </h2>

        {filteredEndpoints.length === 0 ? (
          <div className="glass-strong p-8 text-center">
            <p className="text-muted-foreground">No endpoints enabled for this panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
            {filteredEndpoints.map((ep, i) => {
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
                    isActive ? 'bg-primary/15 shadow-[0_0_12px_-2px_hsl(160_84%_39%/0.3)]' : 'bg-secondary/50 group-hover:bg-primary/10'
                  }`}>
                    <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary/70'}`} />
                  </div>
                  <p className={`font-semibold text-sm transition-colors duration-300 ${isActive ? 'text-primary' : 'text-foreground'}`}>{ep.label}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <p className="text-[10px] text-muted-foreground font-mono opacity-60">{ep.endpoint}</p>
                    <ChevronRight className={`w-3 h-3 transition-all duration-300 ${isActive ? 'text-primary opacity-100 translate-x-0' : 'text-muted-foreground opacity-0 -translate-x-1'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedEndpoint && (
          <div className="glass-strong p-6 space-y-5 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center relative">
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
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Enter ${selectedEndpoint.param}...`}
                className="input-glass flex-1 text-sm" autoFocus
              />
              <button onClick={handleSearch} disabled={searchLoading} className="btn-primary px-5 rounded-xl flex items-center gap-2">
                {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
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
                <button onClick={copyResult} className="absolute top-3 right-3 p-2 rounded-lg bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all duration-300">
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

export default PanelPortal;
