import { useState, useEffect } from 'react';
import { ENDPOINTS, AVAILABLE_ICONS, invalidateEndpointsCache, type CustomEndpoint } from '@/lib/supabase';
import { listCustomEndpoints, createCustomEndpoint, deleteCustomEndpoint, resolveAuth } from '@/lib/adminApi';
import {
  Plus, Trash2, Loader2, RefreshCw, Globe, Search,
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, FileCheck, Flame, Truck,
  Shield, User, Key, Database, Server, Cpu, Hash,
  type LucideIcon,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Static map of the icons exposed in AVAILABLE_ICONS. Importing the full
// `lucide-react` namespace pulled in ~760 kB (135 kB gzip) of unused icons.
const ICON_MAP: Record<string, LucideIcon> = {
  Smartphone, Fingerprint, Mail, FileText, Send, Building2,
  CreditCard, Wallet, CircleDollarSign, Car, Search, FileCheck,
  Flame, Truck, Globe, Shield, User, Key, Database, Server, Cpu, Hash,
};

const CustomEndpointManager = () => {
  const [endpoints, setEndpoints] = useState<CustomEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [label, setLabel] = useState('');
  const [endpoint, setEndpoint] = useState('/');
  const [param, setParam] = useState('');
  const [icon, setIcon] = useState('Search');

  const fetchEndpoints = async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const data = await listCustomEndpoints();
      if (signal?.cancelled) return;
      setEndpoints(data);
    } catch (err) {
      if (signal?.cancelled) return;
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to fetch custom endpoints', variant: 'destructive' });
      // Keep existing list — don't wipe on transient network error
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  };

  useEffect(() => {
    const signal = { cancelled: false };
    fetchEndpoints(signal);
    return () => { signal.cancelled = true; };
  }, []);

  const createEndpoint = async () => {
    if (!label.trim() || !endpoint.trim() || !param.trim()) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Check duplicates against predefined + custom
    const allPaths = [...ENDPOINTS.map(e => e.endpoint), ...endpoints.map(e => e.endpoint)];
    if (allPaths.includes(path)) {
      toast({ title: 'Duplicate Endpoint', description: `Endpoint "${path}" already exists`, variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      await createCustomEndpoint(resolveAuth(), {
        endpoint: path,
        param: param.trim(),
        label: label.trim(),
        icon,
      });
      invalidateEndpointsCache();
      toast({ title: 'Endpoint Created', description: `"${label.trim()}" (${path}) added successfully` });
      setLabel(''); setEndpoint('/'); setParam(''); setIcon('Search');
      setShowForm(false);
      await fetchEndpoints();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create endpoint', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deleteEndpoint = async (id: string, name: string) => {
    if (!confirm(`Delete custom endpoint "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCustomEndpoint(resolveAuth(), id);
      invalidateEndpointsCache();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete endpoint', variant: 'destructive' });
      return;
    }
    setEndpoints(endpoints.filter(e => e.id !== id));
    toast({ title: 'Endpoint Deleted', description: `"${name}" has been removed` });
  };

  const getIcon = (iconName: string) => {
    const IconComp = ICON_MAP[iconName];
    return IconComp ? <IconComp className="w-4 h-4" /> : <Search className="w-4 h-4" />;
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 animate-in">
        <div className="glass-admin p-3.5">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">PREDEFINED</p>
          <p className="text-2xl font-extrabold text-accent">{ENDPOINTS.length}</p>
        </div>
        <div className="glass-admin p-3.5">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">CUSTOM</p>
          <p className="text-2xl font-extrabold text-primary">{endpoints.length}</p>
        </div>
      </div>

      {/* Create Toggle */}
      <div className="animate-in-delay-1">
        <button onClick={() => setShowForm(!showForm)} className="btn-admin flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Add Custom Endpoint'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-admin p-5 space-y-4 animate-in">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4 text-accent" /> New Custom Endpoint
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">LABEL *</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., DL Lookup" className="input-admin w-full text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">ENDPOINT PATH *</label>
              <input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="/dl" className="input-admin w-full text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">QUERY PARAM *</label>
              <input value={param} onChange={e => setParam(e.target.value)} placeholder="e.g., number" className="input-admin w-full text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">ICON</label>
              <select value={icon} onChange={e => setIcon(e.target.value)} className="input-admin w-full text-sm">
                {AVAILABLE_ICONS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="glass p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              {getIcon(icon)}
            </div>
            <div>
              <p className="text-sm font-semibold">{label || 'Endpoint Label'}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{endpoint || '/path'}?{param || 'param'}=&#123;value&#125;</p>
            </div>
          </div>

          <button onClick={createEndpoint} disabled={creating || !label.trim() || !param.trim()} className="btn-admin flex items-center gap-2 text-sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Endpoint
          </button>
        </div>
      )}

      {/* Predefined Endpoints */}
      <div className="glass-admin p-5 animate-in-delay-1">
        <h3 className="font-bold flex items-center gap-2 text-sm mb-4">
          <Globe className="w-4 h-4 text-accent" /> Predefined Endpoints ({ENDPOINTS.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ENDPOINTS.map(ep => (
            <div key={ep.endpoint} className="glass p-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                {getIcon(ep.icon)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{ep.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{ep.endpoint}?{ep.param}=&#123;v&#125;</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Endpoints */}
      <div className="glass-admin p-5 animate-in-delay-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-primary" /> Custom Endpoints ({endpoints.length})
          </h3>
          <button onClick={fetchEndpoints} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No custom endpoints yet</p>
            <p className="text-muted-foreground text-xs mt-1">Add one to extend the API</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {endpoints.map(ep => (
              <div key={ep.id} className="glass p-4 flex items-center justify-between hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    {getIcon(ep.icon)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ep.label}</p>
                    <p className="text-[10px] text-accent font-mono">{ep.endpoint}?{ep.param}=&#123;value&#125;</p>
                  </div>
                </div>
                <button onClick={() => deleteEndpoint(ep.id, ep.label)}
                  className="p-2 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomEndpointManager;
