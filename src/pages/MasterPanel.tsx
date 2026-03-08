import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type ManagedPanel, type Broadcast, ALL_ENDPOINT_PATHS, ENDPOINTS, generateLicenseKey, generateSlug } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import LogsViewer from '@/components/admin/LogsViewer';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import KeysManager from '@/components/admin/KeysManager';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Crown, LogOut, Plus, ToggleLeft, ToggleRight, Trash2,
  Settings, Send as SendIcon, BarChart3, FileText, Key,
  Loader2, RefreshCw, Copy, Eye, EyeOff, Lock,
  ArrowLeft, Shield, Activity, Globe, Clock, Users,
  CheckSquare, Square, ChevronRight
} from 'lucide-react';

const TABS = [
  { id: 'panels', label: 'Panels', icon: Shield },
  { id: 'broadcasts', label: 'Broadcasts', icon: SendIcon },
  { id: 'logs', label: 'All Logs', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const MasterPanel = () => {
  const [tab, setTab] = useState('panels');
  const [panels, setPanels] = useState<ManagedPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState<ManagedPanel | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'keys' | 'logs' | 'endpoints'>('overview');

  // Create panel form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('admin123');
  const [newExpiry, setNewExpiry] = useState('');
  const [creating, setCreating] = useState(false);

  // Broadcast
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcTarget, setBcTarget] = useState<string>('all');
  const [bcSending, setBcSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  // Password change
  const [changingPassword, setChangingPassword] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('cfms_master')) navigate('/master-login');
  }, [navigate]);

  const fetchPanels = async () => {
    setLoading(true);
    const { data } = await supabase.from('managed_panels').select('*').order('created_at', { ascending: false });
    setPanels(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPanels(); }, []);

  useEffect(() => {
    if (tab === 'broadcasts') {
      supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setBroadcasts(data || []));
    }
  }, [tab]);

  const createPanel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const licenseKey = generateLicenseKey();
    const slug = generateSlug(newName.trim());
    // Check slug uniqueness
    const { data: existing } = await supabase.from('managed_panels').select('id').eq('slug', slug).maybeSingle();
    if (existing) {
      toast({ title: 'Error', description: `A panel with URL "/${slug}" already exists. Use a different name.`, variant: 'destructive' });
      setCreating(false);
      return;
    }
    const { error } = await supabase.from('managed_panels').insert({
      panel_name: newName.trim(),
      slug,
      master_license_key: licenseKey,
      panel_password: newPassword || 'admin123',
      expiry_date: newExpiry || null,
      allowed_endpoints: ALL_ENDPOINT_PATHS,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Panel Created', description: `URL: /${slug} | License: ${licenseKey}` });
      setNewName(''); setNewPassword('admin123'); setNewExpiry(''); setShowCreate(false);
    }
    await fetchPanels();
    setCreating(false);
  };

  const togglePanel = async (panel: ManagedPanel) => {
    const updated = { ...panel, is_active: !panel.is_active };
    await supabase.from('managed_panels').update({ is_active: updated.is_active }).eq('id', panel.id);
    setPanels(panels.map(p => p.id === panel.id ? updated : p));
    if (selectedPanel?.id === panel.id) setSelectedPanel(updated);
    toast({ title: updated.is_active ? 'Panel Enabled' : 'Panel Disabled', description: panel.panel_name });
  };

  const deletePanel = async (id: string) => {
    if (!confirm('Delete this panel permanently? All associated keys and logs will be unlinked.')) return;
    await supabase.from('managed_panels').delete().eq('id', id);
    setPanels(panels.filter(p => p.id !== id));
    if (selectedPanel?.id === id) setSelectedPanel(null);
    toast({ title: 'Panel Deleted' });
  };

  const changePassword = async (panelId: string) => {
    if (!newPass.trim()) return;
    await supabase.from('managed_panels').update({ panel_password: newPass.trim() }).eq('id', panelId);
    setPanels(panels.map(p => p.id === panelId ? { ...p, panel_password: newPass.trim() } : p));
    setChangingPassword(null); setNewPass('');
    toast({ title: 'Password Updated' });
  };

  const toggleEndpoint = async (panel: ManagedPanel, endpoint: string) => {
    const current = panel.allowed_endpoints || [];
    const updated = current.includes(endpoint) ? current.filter(e => e !== endpoint) : [...current, endpoint];
    await supabase.from('managed_panels').update({ allowed_endpoints: updated }).eq('id', panel.id);
    setPanels(panels.map(p => p.id === panel.id ? { ...p, allowed_endpoints: updated } : p));
    if (selectedPanel?.id === panel.id) setSelectedPanel({ ...panel, allowed_endpoints: updated });
  };

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) return;
    setBcSending(true);
    await supabase.from('broadcasts').insert({
      title: bcTitle.trim(),
      message: bcMessage.trim(),
      target_panel_id: bcTarget === 'all' ? null : bcTarget,
    });
    setBcTitle(''); setBcMessage(''); setBcTarget('all');
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(50);
    setBroadcasts(data || []);
    setBcSending(false);
    toast({ title: 'Broadcast Sent', description: 'Message delivered to all targeted panels' });
  };

  const deleteBroadcast = async (id: string) => {
    await supabase.from('broadcasts').delete().eq('id', id);
    setBroadcasts(broadcasts.filter(b => b.id !== id));
    toast({ title: 'Broadcast Deleted' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleLogout = () => {
    localStorage.removeItem('cfms_master');
    navigate('/master-login');
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <CFMSLogo size={36} className="ring-2 ring-primary/20" />
          <div>
            <span className="font-bold text-lg leading-none">CFMS</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider align-middle bg-primary/15 text-primary border border-primary/25">MASTER</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:flex items-center gap-1.5 mr-2">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-primary">SUPREME</span>
          </span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm transition-all">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 sm:px-6 mt-5 mb-6">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedPanel(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive ? 'text-primary border border-primary/30 bg-primary/10' : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/50'}`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-6">
        {/* ===== PANELS TAB ===== */}
        {tab === 'panels' && !selectedPanel && (
          <div className="space-y-5 animate-in">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-admin p-3.5"><p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">TOTAL PANELS</p><p className="text-2xl font-extrabold text-accent">{panels.length}</p></div>
              <div className="glass-admin p-3.5"><p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">ACTIVE</p><p className="text-2xl font-extrabold text-success">{panels.filter(p => p.is_active).length}</p></div>
              <div className="glass-admin p-3.5"><p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">DISABLED</p><p className="text-2xl font-extrabold text-destructive">{panels.filter(p => !p.is_active).length}</p></div>
              <div className="glass-admin p-3.5"><p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">EXPIRED</p><p className="text-2xl font-extrabold text-destructive">{panels.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date()).length}</p></div>
            </div>

            {/* Create Button */}
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5">
              <Plus className="w-4 h-4" /> {showCreate ? 'Cancel' : 'Create New Panel'}
            </button>

            {/* Create Form */}
            {showCreate && (
              <div className="glass-admin p-5 space-y-4 animate-in">
                <h3 className="font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-accent" /> New Panel</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">PANEL NAME *</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Panel Alpha" className="input-admin w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">PANEL PASSWORD</label>
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="admin123" className="input-admin w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">EXPIRY DATE (OPTIONAL)</label>
                    <input type="datetime-local" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="input-admin w-full text-sm" />
                  </div>
                </div>
                <button onClick={createPanel} disabled={creating || !newName.trim()} className="btn-admin flex items-center gap-2 text-sm">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Panel
                </button>
              </div>
            )}

            {/* Panel List */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
            ) : panels.length === 0 ? (
              <div className="glass-admin p-8 text-center">
                <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No panels created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {panels.map(panel => {
                  const expired = panel.expiry_date && new Date(panel.expiry_date) < new Date();
                  return (
                    <div key={panel.id} className={`glass p-5 space-y-3 transition-all hover:border-accent/25 ${!panel.is_active || expired ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{panel.panel_name}</h3>
                            {!panel.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">DISABLED</span>}
                            {expired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">EXPIRED</span>}
                          </div>
                          <p className="text-xs text-accent font-mono mt-1">{panel.master_license_key}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">/{panel.slug}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => togglePanel(panel)} className="p-1.5 hover:bg-secondary/50 rounded transition-colors" title={panel.is_active ? 'Disable (Kill Switch)' : 'Enable'}>
                            {panel.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5 text-destructive" />}
                          </button>
                          <button onClick={() => copyToClipboard(panel.master_license_key)} className="p-1.5 hover:bg-secondary/50 rounded transition-colors"><Copy className="w-4 h-4 text-muted-foreground" /></button>
                          <button onClick={() => deletePanel(panel.id)} className="p-1.5 hover:bg-destructive/10 rounded transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Created: {format(new Date(panel.created_at), 'dd/MM/yyyy')}</span>
                        <span>Endpoints: {(panel.allowed_endpoints || []).length}/{ALL_ENDPOINT_PATHS.length}</span>
                        {panel.expiry_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(panel.expiry_date), 'dd/MM/yyyy')}</span>}
                      </div>

                      {/* Password change */}
                      {changingPassword === panel.id ? (
                        <div className="flex gap-2 animate-in">
                          <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" className="input-admin flex-1 text-sm" type="password" />
                          <button onClick={() => changePassword(panel.id)} className="btn-admin text-xs px-3 py-1.5">Save</button>
                          <button onClick={() => setChangingPassword(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                        </div>
                      ) : null}

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setSelectedPanel(panel); setDetailTab('overview'); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all">
                          <Settings className="w-3.5 h-3.5" /> Details
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => setChangingPassword(changingPassword === panel.id ? null : panel.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
                          <Lock className="w-3.5 h-3.5" /> Password
                        </button>
                        <button onClick={() => copyToClipboard(`${window.location.origin}/${panel.slug || panel.id}`)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
                          <Globe className="w-3.5 h-3.5" /> Copy URL
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PANEL DETAILS ===== */}
        {tab === 'panels' && selectedPanel && (
          <div className="space-y-5 animate-in">
            <button onClick={() => setSelectedPanel(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group text-sm">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Panels
            </button>

            <div className="glass-admin p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {selectedPanel.panel_name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedPanel.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {selectedPanel.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </h2>
                  <p className="text-xs text-accent font-mono mt-1">{selectedPanel.master_license_key}</p>
                  <p className="text-xs text-muted-foreground mt-1">URL: {window.location.origin}/{selectedPanel.slug}</p>
                </div>
                <button onClick={() => togglePanel(selectedPanel)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPanel.is_active ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                  {selectedPanel.is_active ? <><ToggleLeft className="w-4 h-4" /> Kill Switch</> : <><ToggleRight className="w-4 h-4" /> Enable</>}
                </button>
              </div>
            </div>

            {/* Detail Sub-tabs */}
            <div className="flex gap-1.5">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Activity },
                { id: 'endpoints' as const, label: 'Endpoints', icon: Globe },
                { id: 'keys' as const, label: 'Keys', icon: Key },
                { id: 'logs' as const, label: 'Logs', icon: FileText },
              ].map(t => (
                <button key={t.id} onClick={() => setDetailTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${detailTab === t.id ? 'bg-accent/20 text-accent border border-accent/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'}`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <div className="space-y-4 animate-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass p-4">
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">PANEL PASSWORD</p>
                    <p className="font-mono text-sm text-accent">{selectedPanel.panel_password}</p>
                  </div>
                  <div className="glass p-4">
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">CREATED</p>
                    <p className="text-sm">{format(new Date(selectedPanel.created_at), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="glass p-4">
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">EXPIRY</p>
                    <p className="text-sm">{selectedPanel.expiry_date ? format(new Date(selectedPanel.expiry_date), 'dd MMM yyyy HH:mm') : 'No expiry'}</p>
                  </div>
                  <div className="glass p-4">
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">ENDPOINTS</p>
                    <p className="text-sm">{(selectedPanel.allowed_endpoints || []).length} / {ALL_ENDPOINT_PATHS.length}</p>
                  </div>
                </div>

                {/* Change password inline */}
                <div className="glass-admin p-4">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-accent" /> Change Panel Password</h4>
                  <div className="flex gap-2">
                    <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" className="input-admin flex-1 text-sm" />
                    <button onClick={() => changePassword(selectedPanel.id)} disabled={!newPass.trim()} className="btn-admin text-xs px-4">Update</button>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'endpoints' && (
              <div className="glass-admin p-5 animate-in">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Allowed Endpoints</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ENDPOINTS.map(ep => {
                    const enabled = (selectedPanel.allowed_endpoints || []).includes(ep.endpoint);
                    return (
                      <button key={ep.endpoint} onClick={() => toggleEndpoint(selectedPanel, ep.endpoint)}
                        className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium transition-all text-left ${enabled ? 'bg-success/10 text-success border border-success/20' : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border/50'}`}>
                        {enabled ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 flex-shrink-0" />}
                        <div>
                          <p className="font-mono">{ep.endpoint}</p>
                          <p className="text-[10px] opacity-60">{ep.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {detailTab === 'keys' && <KeysManager panelId={selectedPanel.id} />}
            {detailTab === 'logs' && <LogsViewer panelId={selectedPanel.id} />}
          </div>
        )}

        {/* ===== BROADCASTS TAB ===== */}
        {tab === 'broadcasts' && (
          <div className="space-y-5 animate-in">
            <div className="glass-admin p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <h3 className="font-bold text-sm flex items-center gap-2"><SendIcon className="w-4 h-4 text-accent" /> Send Broadcast</h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">TARGET</label>
                <select value={bcTarget} onChange={e => setBcTarget(e.target.value)} className="input-admin w-full text-sm">
                  <option value="all">All Panels (Global)</option>
                  {panels.map(p => <option key={p.id} value={p.id}>{p.panel_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">TITLE</label>
                <input value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., Maintenance Notice" className="input-admin w-full text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">MESSAGE</label>
                <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Enter broadcast message..." className="input-admin w-full min-h-[80px] resize-y text-sm" />
              </div>
              <button onClick={sendBroadcast} disabled={bcSending || !bcTitle.trim() || !bcMessage.trim()} className="btn-admin flex items-center gap-2 text-sm">
                {bcSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />} Send
              </button>
            </div>

            <div className="glass-admin p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4"><SendIcon className="w-4 h-4 text-accent" /> Sent ({broadcasts.length})</h3>
              {broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No broadcasts yet</p>
              ) : (
                <div className="space-y-2">
                  {broadcasts.map(b => (
                    <div key={b.id} className="glass p-3.5 hover:border-accent/20 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-accent text-sm">{b.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{b.message}</p>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground/50">{format(new Date(b.created_at), 'dd MMM yyyy HH:mm')}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                              {b.target_panel_id ? panels.find(p => p.id === b.target_panel_id)?.panel_name || 'Specific' : 'Global'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== LOGS TAB ===== */}
        {tab === 'logs' && <LogsViewer />}

        {/* ===== ANALYTICS TAB ===== */}
        {tab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
};

export default MasterPanel;
