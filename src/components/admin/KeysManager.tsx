import { useState, useEffect, useMemo } from 'react';
import { supabase, generateKey, type ApiKey } from '@/lib/supabase';
import {
  Plus, RefreshCw, Key, Copy, Trash2, Eye, EyeOff,
  Clock, Globe, Loader2, ToggleLeft, ToggleRight,
  Search, CheckCircle, AlertCircle, Filter, Download,
  ArrowUpDown, Shield
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from '@/hooks/use-toast';

type SortField = 'name' | 'created_at' | 'uses';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'disabled' | 'expired';

const KeysManager = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [allowedIps, setAllowedIps] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Keys fetch error:', error);
      toast({ title: 'Error', description: 'Failed to fetch API keys', variant: 'destructive' });
      setKeys([]);
      setLoading(false);
      return;
    }
    setKeys((data || []).filter((k: any) => k.key_value));
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const isExpired = (key: ApiKey) => key.expires_at && isPast(new Date(key.expires_at));

  const filteredKeys = useMemo(() => {
    let result = [...keys];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(k =>
        k.name.toLowerCase().includes(q) ||
        k.key_value.toLowerCase().includes(q) ||
        (k.allowed_ips && k.allowed_ips.toLowerCase().includes(q))
      );
    }

    // Filter
    if (filterStatus === 'active') result = result.filter(k => k.is_active && !isExpired(k));
    if (filterStatus === 'disabled') result = result.filter(k => !k.is_active);
    if (filterStatus === 'expired') result = result.filter(k => isExpired(k));

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'uses') cmp = a.uses - b.uses;
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [keys, search, filterStatus, sortField, sortDir]);

  const createKey = async () => {
    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Key name is required', variant: 'destructive' });
      return;
    }
    // Check duplicate names
    if (keys.some(k => k.name.toLowerCase() === name.trim().toLowerCase())) {
      toast({ title: 'Duplicate Name', description: 'A key with this name already exists', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const val = keyValue.trim() || generateKey();
    const { error } = await supabase.from('api_keys').insert({
      name: name.trim(),
      key_value: val,
      expires_at: expiresAt || null,
      allowed_ips: allowedIps || null,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to create key', variant: 'destructive' });
    } else {
      toast({ title: 'Key Created', description: `"${name.trim()}" has been created successfully` });
      setName(''); setKeyValue(''); setExpiresAt(''); setAllowedIps('');
      setShowCreateForm(false);
    }
    await fetchKeys();
    setCreating(false);
  };

  const toggleKey = async (id: string, currentState: boolean) => {
    const { error } = await supabase.from('api_keys').update({ is_active: !currentState }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to toggle key', variant: 'destructive' });
      return;
    }
    setKeys(keys.map(k => k.id === id ? { ...k, is_active: !currentState } : k));
    toast({ title: !currentState ? 'Key Enabled' : 'Key Disabled', description: `Key has been ${!currentState ? 'enabled' : 'disabled'}` });
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this key permanently? This action cannot be undone.')) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete key', variant: 'destructive' });
      return;
    }
    setKeys(keys.filter(k => k.id !== id));
    toast({ title: 'Key Deleted', description: 'API key has been permanently deleted' });
  };

  const copyKey = (val: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: 'Copied', description: 'Key copied to clipboard' });
  };

  const exportKeys = () => {
    const csv = [
      'Name,Key,Status,Uses,Created,Expires,AllowedIPs',
      ...keys.map(k => `"${k.name}","${k.key_value}",${k.is_active ? 'active' : 'disabled'},${k.uses},"${k.created_at}","${k.expires_at || ''}","${k.allowed_ips || ''}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cfms-keys-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Keys exported as CSV' });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const stats = useMemo(() => ({
    total: keys.length,
    active: keys.filter(k => k.is_active && !isExpired(k)).length,
    disabled: keys.filter(k => !k.is_active).length,
    expired: keys.filter(k => isExpired(k)).length,
    totalUses: keys.reduce((sum, k) => sum + k.uses, 0),
  }), [keys]);

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in">
        {[
          { label: 'TOTAL KEYS', value: stats.total, color: 'text-accent' },
          { label: 'ACTIVE', value: stats.active, color: 'text-success' },
          { label: 'EXPIRED', value: stats.expired, color: 'text-destructive' },
          { label: 'TOTAL USES', value: stats.totalUses, color: 'text-accent' },
        ].map(s => (
          <div key={s.label} className="glass-admin p-3.5">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create Key Toggle */}
      <div className="animate-in-delay-1">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-admin flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          {showCreateForm ? 'Cancel' : 'Create New Key'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="glass-admin p-5 space-y-4 animate-in">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4 text-accent" />
            New API Key
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">KEY NAME *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., User Alpha" className="input-admin w-full text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">KEY VALUE (AUTO IF EMPTY)</label>
              <div className="flex gap-2">
                <input value={keyValue} onChange={e => setKeyValue(e.target.value)} placeholder="Auto-generated" className="input-admin flex-1 text-sm" />
                <button onClick={() => setKeyValue(generateKey())} className="px-3 py-2 glass-admin hover:bg-accent/10 transition-colors" title="Generate">
                  <RefreshCw className="w-4 h-4 text-accent" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> VALID UNTIL (OPTIONAL)
              </label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="input-admin w-full text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> ALLOWED IPS (OPTIONAL)
              </label>
              <input value={allowedIps} onChange={e => setAllowedIps(e.target.value)} placeholder="e.g. 192.168.1.1, 10.0.0.1" className="input-admin w-full text-sm" />
            </div>
          </div>
          <button onClick={createKey} disabled={creating || !name.trim()} className="btn-admin flex items-center gap-2 text-sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Key
          </button>
        </div>
      )}

      {/* Keys List */}
      <div className="glass-admin p-5 animate-in-delay-1">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-accent" />
            API Keys ({filteredKeys.length})
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={exportKeys} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" title="Export CSV">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={fetchKeys} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search keys by name, value, or IP..."
              className="input-admin w-full text-sm pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'active', 'disabled', 'expired'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === f
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && (
                  <span className="ml-1 text-[10px] opacity-60">
                    ({f === 'active' ? stats.active : f === 'disabled' ? stats.disabled : stats.expired})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 mb-3 text-xs">
          {([['name', 'Name'], ['created_at', 'Date'], ['uses', 'Uses']] as [SortField, string][]).map(([field, label]) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                sortField === field ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              {label}
              {sortField === field && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              {search || filterStatus !== 'all' ? 'No keys match your filters' : 'No keys yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKeys.map(k => {
              const expired = isExpired(k);
              return (
                <div key={k.id} className={`glass p-4 space-y-2 transition-all hover:border-accent/20 ${expired ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{k.name}</p>
                        {expired && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">EXPIRED</span>
                        )}
                      </div>
                      <p className="text-sm text-accent font-mono mt-0.5">
                        {showKey[k.id] ? k.key_value : (k.key_value || '').substring(0, 8) + '•••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleKey(k.id, k.is_active)} className="p-1.5 hover:bg-secondary/50 rounded transition-colors" title={k.is_active ? 'Disable' : 'Enable'}>
                        {k.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5 text-destructive" />}
                      </button>
                      <button onClick={() => setShowKey(s => ({ ...s, [k.id]: !s[k.id] }))} className="p-1.5 hover:bg-secondary/50 rounded transition-colors">
                        {showKey[k.id] ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4 text-accent" />}
                      </button>
                      <button onClick={() => copyKey(k.key_value)} className="p-1.5 hover:bg-secondary/50 rounded transition-colors">
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteKey(k.id)} className="p-1.5 hover:bg-destructive/10 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Created: {format(new Date(k.created_at), 'dd/MM/yyyy')}</span>
                    <span>Uses: <strong className="text-foreground">{k.uses}</strong></span>
                    <span className={`inline-flex items-center gap-1.5 ${k.is_active ? 'text-success' : 'text-destructive'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-success' : 'bg-destructive'}`} />
                      {k.is_active ? 'Active' : 'Disabled'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {k.expires_at ? (expired ? 'Expired ' : 'Expires ') + format(new Date(k.expires_at), 'dd/MM/yyyy HH:mm') : 'No expiry'}
                    </span>
                  </div>
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {k.allowed_ips || 'Any IP'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeysManager;
