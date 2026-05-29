import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type ManagedPanel, type Broadcast, ALL_ENDPOINT_PATHS, ENDPOINTS, fetchAllEndpoints, invalidateEndpointsCache, generateLicenseKey, generateSlug } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import { useMasterAuth, type MasterRole } from '@/hooks/useMasterAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import {
  Crown, LogOut, Plus, ToggleLeft, ToggleRight, Trash2,
  Settings, Send as SendIcon, BarChart3, FileText, Key,
  Loader2, RefreshCw, Copy, Eye, EyeOff, Lock,
  ArrowLeft, Shield, Activity, Globe, Clock, Users,
  CheckSquare, Square, ChevronRight, Pencil, UserCircle
} from 'lucide-react';

// Heavy admin tabs are split out so opening MasterPanel doesn't pull recharts
// (~250 kB) and the full keys/logs editors. Each tab is fetched on first click.
const LogsViewer            = lazy(() => import('@/components/admin/LogsViewer'));
const AnalyticsDashboard    = lazy(() => import('@/components/admin/AnalyticsDashboard'));
const KeysManager           = lazy(() => import('@/components/admin/KeysManager'));
const CustomEndpointManager = lazy(() => import('@/components/admin/CustomEndpointManager'));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const TABS = [
  { id: 'panels', label: 'Panels', icon: Shield },
  { id: 'endpoints', label: 'Endpoints', icon: Globe },
  { id: 'broadcasts', label: 'Broadcasts', icon: SendIcon },
  { id: 'logs', label: 'All Logs', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'admins', label: 'Admins', icon: Users },
];

const ROLE_BADGE: Record<MasterRole, { label: string; color: string }> = {
  full: { label: 'FULL ACCESS', color: 'bg-primary/15 text-primary border-primary/25' },
  limited: { label: 'LIMITED', color: 'bg-accent/15 text-accent border-accent/25' },
  monitor: { label: 'MONITOR', color: 'bg-success/15 text-success border-success/25' },
};

const MASTER_PANELS_CACHE_KEY = 'cfms_master_panels_cache';

export const readCachedPanels = (): ManagedPanel[] => {
  try {
    const raw = sessionStorage.getItem(MASTER_PANELS_CACHE_KEY) || localStorage.getItem(MASTER_PANELS_CACHE_KEY);
    if (!raw) return [];
    const { panels, ts }: { panels: ManagedPanel[]; ts: number } = JSON.parse(raw);
    return Array.isArray(panels) && Date.now() - ts < 5 * 60 * 1000 ? panels : [];
  } catch { return []; }
};

export const writeCachedPanels = (panels: ManagedPanel[]) => {
  const payload = JSON.stringify({ panels, ts: Date.now() });
  try { sessionStorage.setItem(MASTER_PANELS_CACHE_KEY, payload); } catch {}
  try { localStorage.setItem(MASTER_PANELS_CACHE_KEY, payload); } catch {}
};

const MasterPanel = () => {
  const [tab, setTab] = useState('panels');
  const [panels, setPanels] = useState<ManagedPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState<ManagedPanel | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'keys' | 'logs' | 'endpoints'>('overview');
  const [allEndpoints, setAllEndpoints] = useState(ENDPOINTS);
  const [showProfile, setShowProfile] = useState(false);

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

  // Admin management
  const [admins, setAdmins] = useState<{ id: string; email: string; role: string; display_name: string | null }[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'full' | 'limited' | 'monitor'>('monitor');
  const [newAdminName, setNewAdminName] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const navigate = useNavigate();
  const {
    user, masterAdmin, role, isPasswordAuth, loading: authLoading,
    signOut, canManage, canDelete, canChangePasswords, canKillSwitch,
    canSendBroadcast, canManageAdmins
  } = useMasterAuth();

  const isAuthenticated = !authLoading && (!!masterAdmin || isPasswordAuth);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !masterAdmin && !isPasswordAuth) {
      navigate('/master-login');
    }
  }, [authLoading, masterAdmin, isPasswordAuth, navigate]);

  // Fetch panels - only when authenticated
  const fetchPanels = useCallback(async () => {
    if (!isAuthenticated) return;
    const cachedPanels = readCachedPanels();
    if (cachedPanels.length) {
      setPanels(cachedPanels);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase.from('managed_panels').select('*').order('created_at', { ascending: false });
      if (error) {
        toast({ title: 'Error loading panels', description: error.message, variant: 'destructive' });
        // Don't wipe cached panels on a DB error — keep what we have
      } else {
        const freshPanels = data || [];
        setPanels(freshPanels);
        writeCachedPanels(freshPanels);
        // Keep selectedPanel in sync with the latest DB data
        setSelectedPanel(prev => prev ? freshPanels.find(p => p.id === prev.id) ?? prev : null);
      }
    } catch (err) {
      if (!cachedPanels.length) toast({ title: 'Network issue', description: 'Showing the dashboard shell. Retry when the connection improves.', variant: 'destructive' });
    }
    setLoading(false);
  }, [isAuthenticated]);

  // Initial data load - only after auth is confirmed
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPanels();
    fetchAllEndpoints().then(setAllEndpoints);
  }, [isAuthenticated, fetchPanels]);

  // Safety valve: if the network is very slow, never leave the UI stuck in
  // a permanent loading spinner — resolve after 10 s regardless.
  useEffect(() => {
    if (!isAuthenticated) return;
    const safety = setTimeout(() => setLoading(false), 10_000);
    return () => clearTimeout(safety);
  }, [isAuthenticated]);

  // Tab-specific data loading
  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === 'broadcasts') {
      supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(50)
        .then(({ data, error }) => { if (!error) setBroadcasts(data || []); });
    }
    if (tab === 'endpoints') {
      // Always invalidate before loading so newly created endpoints are visible
      invalidateEndpointsCache();
      fetchAllEndpoints().then(setAllEndpoints);
    }
    if (tab === 'admins') {
      fetchAdmins();
    }
    // When leaving the endpoints tab, invalidate so panel views pick up changes
    return () => {
      if (tab === 'endpoints') invalidateEndpointsCache();
    };
  }, [tab, isAuthenticated]);

  // Refresh endpoints when returning to panels tab with a selected panel
  useEffect(() => {
    if (tab === 'panels' && selectedPanel) {
      fetchAllEndpoints().then(setAllEndpoints);
    }
  }, [tab, selectedPanel?.id]);

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    const { data, error } = await supabase.from('master_admins').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error loading admins', description: error.message, variant: 'destructive' });
    } else {
      setAdmins(data || []);
    }
    setAdminsLoading(false);
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    const { error } = await supabase.from('master_admins').insert({
      email: newAdminEmail.trim().toLowerCase(),
      role: newAdminRole,
      display_name: newAdminName.trim() || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Admin Added', description: `${newAdminEmail.trim()} added as ${newAdminRole}` });
      setNewAdminEmail(''); setNewAdminName(''); setNewAdminRole('monitor');
      await fetchAdmins();
    }
    setAddingAdmin(false);
  };

  const removeAdmin = async (id: string, email: string) => {
    // Prevent removing yourself - check both Google auth and password auth
    if (email === user?.email || (isPasswordAuth && !user)) {
      toast({ title: 'Error', description: 'You cannot remove yourself', variant: 'destructive' });
      return;
    }
    if (!confirm(`Remove ${email} from master admins?`)) return;
    const { error } = await supabase.from('master_admins').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchAdmins();
    toast({ title: 'Admin Removed', description: email });
  };

  const updateAdminRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from('master_admins').update({ role: newRole }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchAdmins();
    toast({ title: 'Role Updated' });
  };

  const createPanel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const licenseKey = generateLicenseKey();
      const slug = generateSlug(newName.trim());

      if (!slug) {
        toast({ title: 'Error', description: 'Invalid panel name. Use alphanumeric characters.', variant: 'destructive' });
        return;
      }

      // Check slug uniqueness
      const { data: existing, error: checkErr } = await supabase.from('managed_panels').select('id').eq('slug', slug).maybeSingle();
      if (checkErr) {
        toast({ title: 'Error', description: 'Failed to check slug uniqueness: ' + checkErr.message, variant: 'destructive' });
        return;
      }
      if (existing) {
        toast({ title: 'Error', description: `A panel with URL "/${slug}" already exists. Use a different name.`, variant: 'destructive' });
        return;
      }

      // Check password uniqueness
      const passwordToUse = newPassword || 'admin123';
      const { data: pwDup } = await supabase
        .from('managed_panels')
        .select('id')
        .eq('panel_password', passwordToUse)
        .maybeSingle();
      if (pwDup) {
        toast({ title: 'Error', description: 'This password is already used by another panel. Choose a unique password.', variant: 'destructive' });
        return;
      }

      // Fetch latest endpoints for default assignment
      const latestEndpoints = await fetchAllEndpoints();
      const allPaths = latestEndpoints.map(e => e.endpoint);

      const insertData = {
        panel_name: newName.trim(),
        slug,
        master_license_key: licenseKey,
        panel_password: passwordToUse,
        expiry_date: newExpiry || null,
        allowed_endpoints: allPaths,
        is_active: true,
      };
      if (import.meta.env.DEV) console.log('Creating panel:', insertData);

      const { data: created, error } = await supabase.from('managed_panels').insert(insertData).select();
      if (error) {
        toast({ title: 'Error creating panel', description: error.message, variant: 'destructive' });
      } else {
        if (import.meta.env.DEV) console.log('Panel created successfully:', created);
        toast({ title: 'Panel Created', description: `URL: /${slug} | License: ${licenseKey}` });
        setNewName(''); setNewPassword('admin123'); setNewExpiry(''); setShowCreate(false);
        await fetchPanels();
      }
    } catch (err: any) {
      toast({ title: 'Unexpected Error', description: err?.message || 'Failed to create panel', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const togglePanel = async (panel: ManagedPanel) => {
    const newActive = !panel.is_active;
    const { error } = await supabase.from('managed_panels').update({ is_active: newActive }).eq('id', panel.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const updated = { ...panel, is_active: newActive };
    const newPanels = panels.map(p => p.id === panel.id ? updated : p);
    setPanels(newPanels);
    writeCachedPanels(newPanels);
    if (selectedPanel?.id === panel.id) setSelectedPanel(updated);
    toast({ title: newActive ? 'Panel Enabled' : 'Panel Disabled', description: panel.panel_name });
  };

  const deletePanel = async (id: string) => {
    if (!confirm('Delete this panel permanently? All associated keys and logs will be unlinked.')) return;
    const { error } = await supabase.from('managed_panels').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const newPanels = panels.filter(p => p.id !== id);
    setPanels(newPanels);
    writeCachedPanels(newPanels);
    if (selectedPanel?.id === id) setSelectedPanel(null);
    toast({ title: 'Panel Deleted' });
  };

  const changePassword = async (panelId: string) => {
    if (!newPass.trim()) return;
    // Check password uniqueness
    const { data: pwDup } = await supabase
      .from('managed_panels')
      .select('id')
      .eq('panel_password', newPass.trim())
      .neq('id', panelId)
      .maybeSingle();
    if (pwDup) {
      toast({ title: 'Error', description: 'This password is already used by another panel. Choose a unique password.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('managed_panels').update({ panel_password: newPass.trim() }).eq('id', panelId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const updatedPanels = panels.map(p => p.id === panelId ? { ...p, panel_password: newPass.trim() } : p);
    setPanels(updatedPanels);
    writeCachedPanels(updatedPanels);
    if (selectedPanel?.id === panelId) setSelectedPanel({ ...selectedPanel, panel_password: newPass.trim() });
    setChangingPassword(null); setNewPass('');
    toast({ title: 'Password Updated' });
  };

  const toggleEndpoint = async (panel: ManagedPanel, endpoint: string) => {
    const current = panel.allowed_endpoints || [];
    const updated = current.includes(endpoint) ? current.filter(e => e !== endpoint) : [...current, endpoint];
    const { error } = await supabase.from('managed_panels').update({ allowed_endpoints: updated }).eq('id', panel.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const updatedPanel = { ...panel, allowed_endpoints: updated };
    const newPanels = panels.map(p => p.id === panel.id ? updatedPanel : p);
    setPanels(newPanels);
    writeCachedPanels(newPanels);
    if (selectedPanel?.id === panel.id) setSelectedPanel(updatedPanel);
  };

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) return;
    setBcSending(true);
    const { error } = await supabase.from('broadcasts').insert({
      title: bcTitle.trim(),
      message: bcMessage.trim(),
      target_panel_id: bcTarget === 'all' ? null : bcTarget,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setBcSending(false);
      return;
    }
    setBcTitle(''); setBcMessage(''); setBcTarget('all');
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(50);
    setBroadcasts(data || []);
    setBcSending(false);
    toast({ title: 'Broadcast Sent', description: 'Message delivered to all targeted panels' });
  };

  const deleteBroadcast = async (id: string) => {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setBroadcasts(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Broadcast Deleted' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleLogout = async () => {
    localStorage.removeItem('cfms_master');
    localStorage.removeItem('cfms_master_role');
    await signOut();
    navigate('/master-login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <CFMSLogo size={36} className="ring-2 ring-primary/20" />
          <div>
            <span className="font-bold text-lg leading-none">DRMS</span>
            {role && <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider align-middle border ${ROLE_BADGE[role].color}`}>{ROLE_BADGE[role].label}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={() => setShowProfile(v => !v)}
            aria-haspopup="dialog"
            aria-expanded={showProfile}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} className="w-7 h-7 rounded-full ring-2 ring-primary/25" alt={`${masterAdmin?.display_name || user?.email || 'User'} avatar`} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/25">
                <span className="text-xs font-bold text-primary">
                  {(masterAdmin?.display_name || user?.email || "A")[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="hidden sm:inline text-[11px] font-medium text-muted-foreground max-w-[120px] truncate">
              {masterAdmin?.display_name || user?.email || (isPasswordAuth ? "Admin" : "")}
            </span>
          </button>

          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-40 bg-background/25 backdrop-blur-sm"
                onClick={() => setShowProfile(false)}
              />

              <div className="absolute right-0 top-full mt-3 z-50 origin-top-right profile-ticket-pop w-[min(20rem,calc(100vw-2rem))]">
                <div className="profile-ticket">
                  <div className="shimmer-overlay">
                    {/* Profile header */}
                    <div className="relative px-6 pt-6 pb-5 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent" />
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
                      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-accent/10 blur-2xl" />

                      <div className="relative flex items-center gap-4">
                        {user?.user_metadata?.avatar_url ? (
                          <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 blur-sm opacity-80" />
                            <img
                              src={user.user_metadata.avatar_url}
                              className="relative w-14 h-14 rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                              alt={`${masterAdmin?.display_name || user?.email || 'User'} avatar`}
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 blur-sm opacity-80" />
                            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
                              <span className="text-xl font-bold text-primary">
                                {(masterAdmin?.display_name || user?.email || "A")[0].toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[15px] truncate">
                            {masterAdmin?.display_name || (isPasswordAuth ? "Password Admin" : "Admin")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {user?.email || (isPasswordAuth ? "Local authentication" : "")}
                          </p>
                          {role && (
                            <span
                              className={`inline-flex items-center mt-2 text-[10px] px-2.5 py-1 rounded-full font-semibold tracking-wider border ${ROLE_BADGE[role].color}`}
                            >
                              <Crown className="w-3 h-3 mr-1.5" />
                              {ROLE_BADGE[role].label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="glass-master px-6 py-4 rounded-none border-x-0 profile-ticket__perforation">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-primary">{panels.length}</p>
                          <p className="text-[10px] text-muted-foreground tracking-wider font-medium">PANELS</p>
                        </div>
                        <div className="text-center border-x border-border/30">
                          <p className="text-lg font-extrabold text-success">{panels.filter(p => p.is_active).length}</p>
                          <p className="text-[10px] text-muted-foreground tracking-wider font-medium">ACTIVE</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-accent">{isPasswordAuth && !user ? "PWD" : "OAuth"}</p>
                          <p className="text-[10px] text-muted-foreground tracking-wider font-medium">AUTH</p>
                        </div>
                      </div>
                    </div>

                    {/* Logout */}
                    <div className="glass-strong rounded-none border-x-0 border-b-0 px-6 py-4 profile-ticket__perforation">
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          handleLogout();
                        }}
                        className="profile-ticket__logout w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-destructive bg-destructive/8 hover:bg-destructive/15 border border-destructive/15 hover:border-destructive/30"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>

      </header>

      {/* Tabs */}
      <div className="px-4 sm:px-6 mt-5 mb-6">
        <nav className="flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="Master panel sections">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            if (t.id === 'admins' && role === 'monitor') return null;
            return (
              <button key={t.id} role="tab" aria-selected={isActive} onClick={() => { setTab(t.id); setSelectedPanel(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-[0_0_16px_-4px_hsl(265_72%_58%/0.25)]' : 'text-foreground/70 border border-border/40 bg-secondary/25 hover:text-foreground hover:bg-secondary/60 hover:border-border/60'}`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 sm:px-6">
        {/* ===== PANELS TAB ===== */}
        {tab === 'panels' && !selectedPanel && (
          <div className="space-y-5 animate-in">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-admin p-4 relative overflow-hidden group hover:border-accent/20 transition-all">
                <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-accent/8 blur-xl group-hover:bg-accent/15 transition-all" />
                <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">TOTAL PANELS</p>
                <p className="text-2xl font-extrabold text-accent">{panels.length}</p>
              </div>
              <div className="glass-admin p-4 relative overflow-hidden group hover:border-success/20 transition-all">
                <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-success/8 blur-xl group-hover:bg-success/15 transition-all" />
                <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">ACTIVE</p>
                <p className="text-2xl font-extrabold text-success">{panels.filter(p => p.is_active).length}</p>
              </div>
              <div className="glass-admin p-4 relative overflow-hidden group hover:border-destructive/20 transition-all">
                <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-destructive/8 blur-xl group-hover:bg-destructive/15 transition-all" />
                <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">DISABLED</p>
                <p className="text-2xl font-extrabold text-destructive">{panels.filter(p => !p.is_active).length}</p>
              </div>
              <div className="glass-admin p-4 relative overflow-hidden group hover:border-destructive/20 transition-all">
                <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-destructive/8 blur-xl group-hover:bg-destructive/15 transition-all" />
                <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">EXPIRED</p>
                <p className="text-2xl font-extrabold text-destructive">{panels.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date()).length}</p>
              </div>
            </div>

            {/* Create Button - canManage (full + limited) */}
            {canManage && (
              <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5">
                <Plus className="w-4 h-4" /> {showCreate ? 'Cancel' : 'Create New Panel'}
              </button>
            )}

            {/* Create Form */}
            {showCreate && canManage && (
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

            {/* Panel List — show cached panels immediately even if still refreshing */}
            {loading && panels.length === 0 ? (
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
                          {canKillSwitch && (
                            <button onClick={() => togglePanel(panel)} className="p-1.5 hover:bg-secondary/50 rounded transition-colors" title={panel.is_active ? 'Disable (Kill Switch)' : 'Enable'}>
                              {panel.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5 text-destructive" />}
                            </button>
                          )}
                          <button onClick={() => copyToClipboard(panel.master_license_key)} className="p-1.5 hover:bg-secondary/50 rounded transition-colors"><Copy className="w-4 h-4 text-muted-foreground" /></button>
                          {canDelete && (
                            <button onClick={() => deletePanel(panel.id)} className="p-1.5 hover:bg-destructive/10 rounded transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Created: {format(new Date(panel.created_at), 'dd/MM/yyyy')}</span>
                        <span>Endpoints: {(panel.allowed_endpoints || []).length}/{allEndpoints.length}</span>
                        {panel.expiry_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(panel.expiry_date), 'dd/MM/yyyy')}</span>}
                      </div>

                      {/* Password change */}
                      {changingPassword === panel.id ? (
                        <div className="flex gap-2 animate-in">
                          <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" className="input-admin flex-1 text-sm" type="password" />
                          <button onClick={() => changePassword(panel.id)} className="btn-admin text-xs px-3 py-1.5">Save</button>
                          <button onClick={() => { setChangingPassword(null); setNewPass(''); }} className="text-xs text-muted-foreground px-2">Cancel</button>
                        </div>
                      ) : null}

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setSelectedPanel(panel); setDetailTab('overview'); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all">
                          <Settings className="w-3.5 h-3.5" /> Details
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        {canChangePasswords && (
                          <button onClick={() => { setChangingPassword(changingPassword === panel.id ? null : panel.id); setNewPass(''); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
                            <Lock className="w-3.5 h-3.5" /> Password
                          </button>
                        )}
                        <button onClick={() => copyToClipboard(`${window.location.origin}/${panel.slug}`)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
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
                {canKillSwitch && (
                  <button onClick={() => togglePanel(selectedPanel)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPanel.is_active ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                    {selectedPanel.is_active ? <><ToggleRight className="w-4 h-4" /> Kill Switch</> : <><ToggleLeft className="w-4 h-4" /> Enable</>}
                  </button>
                )}
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${detailTab === t.id ? 'bg-accent/20 text-accent border border-accent/30' : 'text-foreground/70 border border-border/40 bg-secondary/20 hover:text-foreground hover:bg-secondary/50'}`}>
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
                    <p className="text-sm">{(selectedPanel.allowed_endpoints || []).length} / {allEndpoints.length}</p>
                  </div>
                </div>

                {canChangePasswords && (
                  <div className="glass-admin p-4">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-accent" /> Change Panel Password</h4>
                    <div className="flex gap-2">
                      <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" className="input-admin flex-1 text-sm" />
                      <button onClick={() => changePassword(selectedPanel.id)} disabled={!newPass.trim()} className="btn-admin text-xs px-4">Update</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'endpoints' && (
              <div className="glass-admin p-5 animate-in space-y-5">
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Allowed Endpoints</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allEndpoints.map(ep => {
                      const enabled = (selectedPanel.allowed_endpoints || []).includes(ep.endpoint);
                      return (
                        <button key={ep.endpoint} onClick={() => canManage ? toggleEndpoint(selectedPanel, ep.endpoint) : null}
                          disabled={!canManage}
                          className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium transition-all text-left ${enabled ? 'bg-success/10 text-success border border-success/20' : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border/50'} ${!canManage ? 'cursor-not-allowed opacity-70' : ''}`}>
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

                <div className="glass p-4">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" /> API Usage Reference
                  </h4>
                  <div className="space-y-1.5">
                    {allEndpoints.map(ep => (
                      <div key={ep.endpoint} className="flex items-center gap-2 text-xs font-mono p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${(selectedPanel.allowed_endpoints || []).includes(ep.endpoint) ? 'bg-success' : 'bg-destructive/40'}`} />
                        <span className="text-muted-foreground">{ep.label}:</span>
                        <span className="text-accent truncate">{ep.endpoint}?{ep.param}=&#123;value&#125;</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${ep.endpoint}?${ep.param}={value}`); toast({ title: 'Copied', description: `${ep.endpoint} format copied` }); }}
                          className="ml-auto p-1 hover:bg-accent/10 rounded transition-colors flex-shrink-0"
                        >
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'keys' && <Suspense fallback={<TabFallback />}><KeysManager panelId={selectedPanel.id} /></Suspense>}
            {detailTab === 'logs' && <Suspense fallback={<TabFallback />}><LogsViewer panelId={selectedPanel.id} /></Suspense>}
          </div>
        )}

        {/* ===== BROADCASTS TAB ===== */}
        {tab === 'broadcasts' && (
          <div className="space-y-5 animate-in">
            {canSendBroadcast ? (
              <div className="glass-admin p-6 space-y-5 relative overflow-hidden shimmer-overlay">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent/5 blur-[80px]" />
                
                <h3 className="font-bold text-base flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                    <SendIcon className="w-4 h-4 text-accent" />
                  </div>
                  Send Broadcast
                </h3>
                
                <div>
                  <label className="text-[10px] font-semibold text-accent/70 tracking-[0.2em] mb-2 block flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> TARGET
                  </label>
                  <select value={bcTarget} onChange={e => setBcTarget(e.target.value)} className="input-admin w-full text-sm">
                    <option value="all">All Panels (Global)</option>
                    {panels.map(p => <option key={p.id} value={p.id}>{p.panel_name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-semibold text-accent/70 tracking-[0.2em] mb-2 block">TITLE</label>
                  <input value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., Maintenance Notice" className="input-admin w-full text-sm" />
                </div>
                
                <div>
                  <label className="text-[10px] font-semibold text-accent/70 tracking-[0.2em] mb-2 block">MESSAGE</label>
                  <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Enter broadcast message..." className="input-admin w-full min-h-[100px] resize-y text-sm leading-relaxed" />
                </div>
                
                <button onClick={sendBroadcast} disabled={bcSending || !bcTitle.trim() || !bcMessage.trim()} className="btn-admin flex items-center gap-2.5 text-sm px-6">
                  {bcSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />} Send Broadcast
                </button>
              </div>
            ) : (
              <div className="glass-admin p-5 text-center">
                <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Monitor role: broadcast sending is disabled</p>
              </div>
            )}

            <div className="glass-admin p-6 relative overflow-hidden">
              <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-primary/5 blur-[60px]" />
              <h3 className="font-bold text-base flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                Broadcast History
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 font-mono border border-primary/15">{broadcasts.length}</span>
              </h3>
              {broadcasts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                    <SendIcon className="w-6 h-6 text-muted-foreground/20" />
                  </div>
                  <p className="text-muted-foreground text-sm">No broadcasts sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map((b, i) => (
                    <div key={b.id} className="glass p-4 hover:border-primary/20 transition-all group animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-primary text-sm">{b.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border inline-flex items-center gap-1 ${b.target_panel_id ? 'border-accent/20 bg-accent/8 text-accent/80' : 'border-primary/15 bg-primary/5 text-primary/80'}`}>
                              <Globe className="w-2.5 h-2.5" />
                              {b.target_panel_id ? panels.find(p => p.id === b.target_panel_id)?.panel_name || 'Targeted' : 'Global'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{b.message}</p>
                          <p className="text-[10px] text-muted-foreground/40 mt-2 font-mono">{format(new Date(b.created_at), 'dd MMM yyyy • HH:mm')}</p>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => deleteBroadcast(b.id)}
                            className="p-2 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Delete broadcast"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== ENDPOINTS TAB ===== */}
        {tab === 'endpoints' && <Suspense fallback={<TabFallback />}><CustomEndpointManager /></Suspense>}

        {/* ===== LOGS TAB ===== */}
        {tab === 'logs' && <Suspense fallback={<TabFallback />}><LogsViewer /></Suspense>}

        {/* ===== ANALYTICS TAB ===== */}
        {tab === 'analytics' && <Suspense fallback={<TabFallback />}><AnalyticsDashboard /></Suspense>}

        {/* ===== ADMINS TAB ===== */}
        {tab === 'admins' && (
          <div className="space-y-5 animate-in">
            {canManageAdmins ? (
              <div className="glass-admin p-5 space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Add Master Admin</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">GMAIL ADDRESS *</label>
                    <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="admin@gmail.com" className="input-admin w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">DISPLAY NAME</label>
                    <input value={newAdminName} onChange={e => setNewAdminName(e.target.value)} placeholder="Optional name" className="input-admin w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">ROLE</label>
                    <select value={newAdminRole} onChange={e => setNewAdminRole(e.target.value as 'full' | 'limited' | 'monitor')} className="input-admin w-full text-sm">
                      <option value="full">Full Access</option>
                      <option value="limited">Limited</option>
                      <option value="monitor">Monitor</option>
                    </select>
                  </div>
                </div>
                <button onClick={addAdmin} disabled={addingAdmin || !newAdminEmail.trim()} className="btn-admin flex items-center gap-2 text-sm">
                  {addingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Admin
                </button>
              </div>
            ) : (
              <div className="glass-admin p-5 text-center">
                <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Only full-access admins can manage admin accounts</p>
              </div>
            )}

            <div className="glass-admin p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-accent" /> Master Admins ({admins.length})</h3>
              {adminsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
              ) : admins.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No admins found</p>
              ) : (
                <div className="space-y-2.5">
                  {admins.map(a => (
                    <div key={a.id} className="glass p-4 flex items-center justify-between gap-3 group hover:border-accent/20 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserCircle className="w-8 h-8 text-muted-foreground/40 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{a.display_name || a.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {canManageAdmins ? (
                          <select value={a.role} onChange={e => updateAdminRole(a.id, e.target.value)} className="input-admin text-xs px-2 py-1">
                            <option value="full">Full</option>
                            <option value="limited">Limited</option>
                            <option value="monitor">Monitor</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider border ${ROLE_BADGE[a.role as MasterRole]?.color || 'bg-muted text-muted-foreground'}`}>
                            {a.role.toUpperCase()}
                          </span>
                        )}
                        {canManageAdmins && a.email !== user?.email && (
                          <button onClick={() => removeAdmin(a.id, a.email)} className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterPanel;
