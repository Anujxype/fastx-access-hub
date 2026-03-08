import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, API_BASE, ENDPOINTS, getDeviceInfo } from '@/lib/supabase';
import FastXLogo from '@/components/FastXLogo';
import {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck,
  LogOut, User, Loader2, Zap, X
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
  const navigate = useNavigate();

  const keyName = localStorage.getItem('fastx_key_name') || 'User';
  const keyId = localStorage.getItem('fastx_key_id');

  useEffect(() => {
    if (!localStorage.getItem('fastx_key')) {
      navigate('/');
      return;
    }
    const bc = localStorage.getItem('fastx_broadcast');
    if (bc) {
      setBroadcast(JSON.parse(bc));
      localStorage.removeItem('fastx_broadcast');
    }
  }, [navigate]);

  const handleSearch = async () => {
    if (!selectedEndpoint || !query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const url = `${API_BASE}${selectedEndpoint.endpoint}?${selectedEndpoint.param}=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      // Log the query
      await supabase.from('api_logs').insert({
        key_id: keyId,
        key_name: keyName,
        endpoint: selectedEndpoint.endpoint,
        query: query.trim(),
        status: res.ok ? 'success' : 'error',
        device: getDeviceInfo(),
        user_agent: navigator.userAgent,
      });

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Request failed');
      await supabase.from('api_logs').insert({
        key_id: keyId,
        key_name: keyName,
        endpoint: selectedEndpoint.endpoint,
        query: query.trim(),
        status: 'error',
        device: getDeviceInfo(),
        user_agent: navigator.userAgent,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fastx_key');
    localStorage.removeItem('fastx_key_name');
    localStorage.removeItem('fastx_key_id');
    navigate('/');
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <FastXLogo size={32} />
          <span className="font-bold text-lg">{keyName}</span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30 font-medium">Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <User className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Broadcast popup */}
      {broadcast && (
        <div className="mx-4 mt-4 glass-admin p-4 animate-in relative">
          <button onClick={() => setBroadcast(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-accent mb-1">{broadcast.title}</h3>
          <p className="text-sm text-muted-foreground">{broadcast.message}</p>
        </div>
      )}

      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-primary tracking-[0.15em] mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          SELECT ENDPOINT
        </h2>

        {/* Endpoint Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ENDPOINTS.map(ep => {
            const Icon = iconMap[ep.icon] || Search;
            const isActive = selectedEndpoint?.endpoint === ep.endpoint;
            return (
              <button
                key={ep.endpoint}
                onClick={() => { setSelectedEndpoint(ep); setResult(null); setQuery(''); setError(''); }}
                className={isActive ? 'endpoint-card-active text-left' : 'endpoint-card text-left'}
              >
                <Icon className={`w-6 h-6 mb-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>{ep.label}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{ep.endpoint}</p>
              </button>
            );
          })}
        </div>

        {/* Query Section */}
        {selectedEndpoint && (
          <div className="glass-strong p-5 space-y-4 animate-in">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <h3 className="font-bold">{selectedEndpoint.label}</h3>
            </div>
            <p className="text-sm text-primary">
              Search by <span className="font-semibold">{selectedEndpoint.param}</span>
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Enter ${selectedEndpoint.param}...`}
                className="input-glass flex-1"
              />
              <button onClick={handleSearch} disabled={loading} className="btn-primary px-4">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-xs text-primary/60 font-mono">
              GET {selectedEndpoint.endpoint}?{selectedEndpoint.param}={'{value}'}
            </p>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {result && (
              <div className="glass p-4 mt-4 animate-in">
                <pre className="text-xs text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap">
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
