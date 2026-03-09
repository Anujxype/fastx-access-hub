import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type ManagedPanel } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import KeysManager from '@/components/admin/KeysManager';
import LogsViewer from '@/components/admin/LogsViewer';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AlertBanner from '@/components/AlertBanner';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Key, FileText, BarChart3, Heart, ClipboardCheck, Send as SendIcon,
  LogOut, Bell, Shield, Loader2, Lock, ArrowLeft, ArrowRight,
  Activity, Server, Database, Globe, ShieldOff,
  WifiOff
} from 'lucide-react';

const TABS = [
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'settings', label: 'Settings', icon: ClipboardCheck },
] as const;

const HEALTH_SERVICES = [
  { name: 'Database', icon: Database, status: 'Online' },
  { name: 'API Gateway', icon: Globe, status: 'Online' },
  { name: 'Auth Service', icon: Lock, status: 'Online' },
  { name: 'Storage', icon: Server, status: 'Online' },
] as const;

const SubAdminPanel = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [panel, setPanel] = useState<ManagedPanel | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState('keys');
  const [disabled, setDisabled] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  // Password change
  const [changingPass, setChangingPass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Fetch panel data by slug
  useEffect(() => {
    if (!slug) return;
    const fetchPanel = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('managed_panels').select('*').eq('slug', slug.toLowerCase()).single();
      if (error || !data) {
        navigate(`/${slug}`);
        return;
      }
      setPanel(data);
      setPanelId(data.id);
      // Check if panel is active and not expired
      const expired = data.expiry_date && new Date(data.expiry_date) < new Date();
      if (!data.is_active || expired) {
        setDisabled(true);
      }
      // Check localStorage for existing session
      const storedAuth = localStorage.getItem(`cfms_panel_${data.id}`);
      if (storedAuth === 'true') {
        setAuthenticated(true);
      } else {
        navigate(`/${slug}`);
        return;
      }
      setLoading(false);
    };
    fetchPanel();
  }, [slug, navigate]);

  // Real-time kill switch
  useEffect(() => {
    if (!panelId) return;
    const channel = supabase
      .channel(`panel-status-${panelId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'managed_panels',
        filter: `id=eq.${panelId}`,
      }, (payload) => {
        const updated = payload.new as ManagedPanel;
        setPanel(updated);
        const expired = updated.expiry_date && new Date(updated.expiry_date) < new Date();
        if (!updated.is_active || expired) {
          setDisabled(true);
          toast({ title: 'Panel Disabled', description: 'This panel has been deactivated by the Master Admin.', variant: 'destructive' });
        } else {
          setDisabled(false);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [panelId]);

  // Health check with timeout
  useEffect(() => {
    if (tab !== 'health' || !authenticated) return;
    setHealthOk(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch('https://rwmbuxgyynlyusmyaovg.supabase.co/rest/v1/', {
      headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bWJ1eGd5eW5seXVzbXlhb3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTIzMDQsImV4cCI6MjA4ODUyODMwNH0.F9mRsjHY7xTJNCIhzOyB8FGpkgb_XjRP6NcOm59hNak' },
      signal: controller.signal,
    })
      .then(r => setHealthOk(r.ok))
      .catch(() => setHealthOk(false))
      .finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [tab, authenticated]);

  const handleLogout = () => {
    if (panelId) localStorage.removeItem(`cfms_panel_${panelId}`);
    navigate(`/${slug}`);
  };

  const handleChangePassword = async () => {
    if (!panel || !panelId) return;
    if (oldPass !== panel.panel_password) {
      toast({ title: 'Error', description: 'Current password is incorrect', variant: 'destructive' });
      return;
    }
    if (!newPass.trim() || newPass.length < 4) {
      toast({ title: 'Error', description: 'New password must be at least 4 characters', variant: 'destructive' });
      return;
    }
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
    await supabase.from('managed_panels').update({ panel_password: newPass.trim() }).eq('id', panelId);
    setPanel({ ...panel, panel_password: newPass.trim() });
    setOldPass(''); setNewPass(''); setChangingPass(false);
    toast({ title: 'Password Updated', description: 'Your panel password has been changed' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  // Disabled state
  if (disabled) {
    return (
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
          <p className="text-muted-foreground text-sm mb-4">
            {panel?.panel_name || 'This panel'} has been deactivated or the license has expired.
          </p>
          <p className="text-xs text-muted-foreground mb-6">Contact your Master Administrator for assistance.</p>
          <button onClick={() => navigate(`/${slug}`)} className="flex items-center gap-2 text-muted-foreground hover:text-primary mx-auto transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </button>
        </div>
      </div>
    );
  }

  // Authenticated panel view
  return (
    <div className="min-h-screen pb-8">
      {/* Alert Banner */}
      {panelId && <AlertBanner panelId={panelId} />}

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <CFMSLogo size={36} className="ring-2 ring-accent/20" />
          <div>
            <span className="font-bold text-lg leading-none">{panel?.panel_name}</span>
            <span className="ml-2 text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full border border-accent/25 font-semibold tracking-wider align-middle">ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-success font-medium">ONLINE</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm transition-all">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 sm:px-6 mt-5 mb-6">
        <nav className="flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="Panel sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} role="tab" aria-selected={isActive} aria-controls={`tabpanel-${t.id}`} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-accent/20 to-accent/10 text-accent border border-accent/30 shadow-[0_0_16px_-4px_hsl(38_92%_50%/0.25)]' : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/50'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 sm:px-6" role="tabpanel" id={`tabpanel-${tab}`}>
        {tab === 'keys' && panelId && <KeysManager panelId={panelId} />}
        {tab === 'logs' && panelId && <LogsViewer panelId={panelId} />}
        {tab === 'analytics' && panelId && <AnalyticsDashboard panelId={panelId} />}

        {tab === 'health' && (
          <div className="space-y-4 animate-in">
            <div className="glass-admin p-6 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full bg-accent/15 blur-lg animate-glow-admin" />
                <div className="relative w-full h-full rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-accent" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1">System Health</h3>
              {healthOk === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mt-4" />
              ) : healthOk ? (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-full bg-success/10 border border-success/20 mx-auto w-fit">
                    <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                    <span className="text-success font-semibold text-sm">All Systems Operational</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { name: 'Database', icon: Database, status: 'Online' },
                      { name: 'API Gateway', icon: Globe, status: 'Online' },
                      { name: 'Auth Service', icon: Lock, status: 'Online' },
                      { name: 'Storage', icon: Server, status: 'Online' },
                    ].map(s => (
                      <div key={s.name} className="glass p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <s.icon className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{s.name}</p>
                          <p className="text-success font-semibold text-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />{s.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-destructive py-2.5 px-5 rounded-full bg-destructive/10 border border-destructive/20 mx-auto w-fit mt-4">
                  <WifiOff className="w-4 h-4" />
                  <span className="font-semibold text-sm">System Issues Detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-5 animate-in">
            <div className="glass-admin p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-accent" /> Panel Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass p-4">
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">PANEL NAME</p>
                  <p className="text-sm font-medium">{panel?.panel_name}</p>
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">LICENSE KEY</p>
                  <p className="text-xs font-mono text-accent">{panel?.master_license_key}</p>
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">ENDPOINTS</p>
                  <p className="text-sm">{(panel?.allowed_endpoints || []).length} enabled</p>
                </div>
                <div className="glass p-4">
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-wider mb-1">EXPIRY</p>
                  <p className="text-sm">{panel?.expiry_date ? format(new Date(panel.expiry_date), 'dd MMM yyyy') : 'No expiry'}</p>
                </div>
              </div>
            </div>

            <div className="glass-admin p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-accent" /> Change Password</h3>
              {changingPass ? (
                <div className="space-y-3 animate-in">
                  <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Current password" className="input-admin w-full text-sm" />
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" className="input-admin w-full text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleChangePassword} disabled={!oldPass || !newPass} className="btn-admin text-sm px-4 py-2">Update Password</button>
                    <button onClick={() => { setChangingPass(false); setOldPass(''); setNewPass(''); }} className="text-sm text-muted-foreground px-3">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setChangingPass(true)} className="btn-admin text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Change Password
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubAdminPanel;
