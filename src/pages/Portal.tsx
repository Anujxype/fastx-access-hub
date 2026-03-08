import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, API_BASE, ENDPOINTS, getDeviceInfo } from '@/lib/supabase';
import FastXLogo from '@/components/FastXLogo';
import {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck,
  LogOut, User, Loader2, Zap, X, Terminal, Copy, Check
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck,
};

const Portal = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<typeof ENDPOINTS[0] | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [broadcast, setBroadcast] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const keyName = localStorage.getItem('fastx_key_name') || 'User';
  const keyId = localStorage.getItem('fastx_key_id');

  useEffect(() => {
    if (!localStorage.getItem('fastx_key')) { navigate('/'); return; }
    const bc = localStorage.getItem('fastx_broadcast');
    if (bc) { setBroadcast(JSON.parse(bc)); localStorage.removeItem('fastx_broadcast'); }
  }, [navigate]);

  const handleSearch = async () => {
    if (!selectedEndpoint || !query.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const url = `${API_BASE}${selectedEndpoint.endpoint}?${selectedEndpoint.param}=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      await supabase.from('api_logs').insert({
        key_id: keyId, key_name: keyName, endpoint: selectedEndpoint.endpoint,
        query: query.trim(), status: res.ok ? 'success' : 'error',
        device: getDeviceInfo(), user_agent: navigator.userAgent,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Request failed');
      await supabase.from('api_logs').insert({
        key_id: keyId, key_name: keyName, endpoint: selectedEndpoint.endpoint,
        query: query.trim(), status: 'error', device: getDeviceInfo(), user_agent: navigator.userAgent,
      });
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('fastx_key');
    localStorage.removeItem('fastx_key_name');
    localStorage.removeItem('fastx_key_id');
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
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <FastXLogo size={32} />
          <span className="font-bold text-lg">{keyName}</span>
          <span className="text-[10px] bg-primary/15 text-primary px-2.5 py-1 rounded-full border border-primary/25 font-semibold tracking-wider">Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <User className="w-4.5 h-4.5" />
          </button>
          <button onClick={handleLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Broadcast popup */}
      {broadcast && (
        <div className="mx-4 mt-4 glass-admin p-4 animate-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
          <button onClick={() => setBroadcast(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-accent mb-1 text-sm">{broadcast.title}</h3>
          <p className="text-xs text-muted-foreground">{broadcast.message}</p>
        </div>
      )}

      <div className="px-4 mt-6">
        <h2 className="text-xs font-semibold text-primary tracking-[0.2em] mb-5 flex items-center gap-2 animate-in">
          <Zap className="w-3.5 h-3.5" />
          SELECT ENDPOINT
        </h2>

        {/* Endpoint Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ENDPOINTS.map((ep, i) => {
            const Icon = iconMap[ep.icon] || Search;
            const isActive = selectedEndpoint?.endpoint === ep.endpoint;
            return (
              <button
                key={ep.endpoint}
                onClick={() => { setSelectedEndpoint(ep); setResult(null); setQuery(''); setError(''); }}
                className={`${isActive ? 'endpoint-card-active' : 'endpoint-card'} animate-in`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isActive ? 'bg-primary/15' : 'bg-secondary/50'} transition-colors`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'} transition-colors`} />
                </div>
                <p className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-foreground'} transition-colors`}>{ep.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1.5 opacity-70">{ep.endpoint}</p>
              </button>
            );
          })}
        </div>

        {/* Query Section */}
        {selectedEndpoint && (
          <div className="glass-strong p-5 space-y-4 animate-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{selectedEndpoint.label}</h3>
                <p className="text-[10px] text-primary/70">Search by <span className="font-semibold text-primary">{selectedEndpoint.param}</span></p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Enter ${selectedEndpoint.param}...`}
                className="input-glass flex-1 text-sm"
                autoFocus
              />
              <button onClick={handleSearch} disabled={loading} className="btn-primary px-4 rounded-lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-[10px] text-primary/40 font-mono tracking-wide">
              GET {selectedEndpoint.endpoint}?{selectedEndpoint.param}={'{value}'}
            </p>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm animate-in p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                {error}
              </div>
            )}

            {result && (
              <div className="glass p-4 animate-in relative group">
                <button
                  onClick={copyResult}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="text-[11px] text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
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
