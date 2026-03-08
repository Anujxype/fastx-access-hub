import { useState, useEffect } from 'react';
import { supabase, generateKey, type ApiKey } from '@/lib/supabase';
import {
  Plus, RefreshCw, Key, Shield, Copy, Trash2, Eye, EyeOff,
  Clock, Globe, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { format } from 'date-fns';

const KeysManager = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [allowedIps, setAllowedIps] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    setKeys(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const val = keyValue.trim() || generateKey();
    await supabase.from('api_keys').insert({
      name: name.trim(),
      key_value: val,
      expires_at: expiresAt || null,
      allowed_ips: allowedIps || null,
    });
    setName(''); setKeyValue(''); setExpiresAt(''); setAllowedIps('');
    await fetchKeys();
    setCreating(false);
  };

  const toggleKey = async (id: string, currentState: boolean) => {
    await supabase.from('api_keys').update({ is_active: !currentState }).eq('id', id);
    setKeys(keys.map(k => k.id === id ? { ...k, is_active: !currentState } : k));
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this key permanently?')) return;
    await supabase.from('api_keys').delete().eq('id', id);
    setKeys(keys.filter(k => k.id !== id));
  };

  const copyKey = (val: string) => {
    navigator.clipboard.writeText(val);
  };

  return (
    <div className="space-y-6">
      {/* Create Key */}
      <div className="glass-admin p-5 space-y-4 animate-in">
        <h3 className="font-bold flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent" />
          Create New Key
        </h3>

        <div>
          <label className="text-xs font-semibold text-muted-foreground tracking-wider mb-1.5 block">KEY NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., User Alpha" className="input-admin w-full" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground tracking-wider mb-1.5 block">KEY VALUE (AUTO IF EMPTY)</label>
          <div className="flex gap-2">
            <input value={keyValue} onChange={e => setKeyValue(e.target.value)} placeholder="Auto-generated" className="input-admin flex-1" />
            <button onClick={() => setKeyValue(generateKey())} className="px-3 py-2 glass-admin hover:bg-accent/10 transition-colors">
              <RefreshCw className="w-4 h-4 text-accent" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> VALID UNTIL (OPTIONAL)
          </label>
          <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="input-admin w-full" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> ALLOWED IPS (COMMA-SEPARATED, OPTIONAL)
          </label>
          <input value={allowedIps} onChange={e => setAllowedIps(e.target.value)} placeholder="e.g. 192.168.1.1, 10.0.0.1" className="input-admin w-full" />
        </div>

        <button onClick={createKey} disabled={creating} className="btn-admin flex items-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Key
        </button>
      </div>

      {/* Active Keys */}
      <div className="glass-admin p-5 animate-in-delay-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            Active Keys ({keys.length})
          </h3>
          <button onClick={fetchKeys} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No keys yet</p>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className="glass p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{k.name}</p>
                    <p className="text-sm text-accent font-mono">
                      {showKey[k.id] ? k.key_value : k.key_value.substring(0, 8) + '•••••'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                  <span>Uses: {k.uses}</span>
                  <span className={k.is_active ? 'status-active' : 'status-disabled'}>
                    <span className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-success' : 'bg-destructive'}`} />
                    {k.is_active ? 'Active' : 'Disabled'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {k.expires_at ? format(new Date(k.expires_at), 'dd/MM/yyyy') : 'No expiry'}
                  </span>
                </div>
                {k.allowed_ips && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {k.allowed_ips}
                  </p>
                )}
                {!k.allowed_ips && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Any IP
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeysManager;
