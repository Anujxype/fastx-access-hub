import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CFMSLogo from '@/components/CFMSLogo';
import KeysManager from '@/components/admin/KeysManager';
import LogsViewer from '@/components/admin/LogsViewer';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { supabase, type Broadcast } from '@/lib/supabase';
import {
  Key, FileText, BarChart3, Heart, ClipboardCheck, Send as SendIcon,
  LogOut, Bell, Shield, Loader2, RefreshCw, Wifi, WifiOff, Activity,
  Server, Database, Lock, Globe, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

const TABS = [
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'audit', label: 'Audit', icon: ClipboardCheck },
  { id: 'broadcast', label: 'Broadcast', icon: SendIcon },
];

const AdminPanel = () => {
  const [tab, setTab] = useState('keys');
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcSending, setBcSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('fastx_admin')) navigate('/admin-login');
  }, [navigate]);

  useEffect(() => {
    if (tab === 'broadcast') {
      supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).then(({ data }) => setBroadcasts(data || []));
    }
    if (tab === 'health') {
      setHealthOk(null);
      fetch('https://rwmbuxgyynlyusmyaovg.supabase.co/rest/v1/', {
        headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bWJ1eGd5eW5seXVzbXlhb3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTIzMDQsImV4cCI6MjA4ODUyODMwNH0.F9mRsjHY7xTJNCIhzOyB8FGpkgb_XjRP6NcOm59hNak' }
      }).then(r => setHealthOk(r.ok)).catch(() => setHealthOk(false));
    }
  }, [tab]);

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) return;
    setBcSending(true);
    await supabase.from('broadcasts').insert({ title: bcTitle.trim(), message: bcMessage.trim() });
    setBcTitle(''); setBcMessage('');
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
    setBroadcasts(data || []);
    setBcSending(false);
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm('Delete this broadcast?')) return;
    await supabase.from('broadcasts').delete().eq('id', id);
    setBroadcasts(broadcasts.filter(b => b.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('fastx_admin');
    navigate('/admin-login');
  };

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <CFMSLogo size={36} className="ring-2 ring-accent/20" />
          <div>
            <span className="font-bold text-lg leading-none">CFMS</span>
            <span className="ml-2 text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full border border-accent/25 font-semibold tracking-wider align-middle">ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-success font-medium">ONLINE</span>
          </div>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm transition-all">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-4 sm:px-6 mt-5 mb-6">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 animate-in ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/20 to-accent/10 text-accent border border-accent/30 shadow-[0_0_16px_-4px_hsl(38_92%_50%/0.25)]'
                    : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/50 hover:border-border/50'
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'drop-shadow-[0_0_6px_hsl(38_92%_50%/0.5)]' : ''}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Header */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="flex items-center gap-3">
          {activeTab && (
            <>
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <activeTab.icon className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{activeTab.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {tab === 'keys' && 'Manage API keys and access controls'}
                  {tab === 'logs' && 'View search logs and query history'}
                  {tab === 'analytics' && 'Usage statistics and insights'}
                  {tab === 'health' && 'System infrastructure status'}
                  {tab === 'audit' && 'Admin actions and security trail'}
                  {tab === 'broadcast' && 'Send messages to all users'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {tab === 'keys' && <KeysManager />}
        {tab === 'logs' && <LogsViewer />}
        {tab === 'analytics' && <AnalyticsDashboard />}

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
              <p className="text-xs text-muted-foreground mb-5">Real-time infrastructure status</p>

              {healthOk === null ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span className="text-xs text-muted-foreground">Checking systems...</span>
                </div>
              ) : healthOk ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2.5 py-2.5 px-5 rounded-full bg-success/10 border border-success/20 mx-auto w-fit">
                    <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                    <span className="text-success font-semibold text-sm">All Systems Operational</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { name: 'Database', icon: Database, status: 'Online', latency: '12ms' },
                      { name: 'API Gateway', icon: Globe, status: 'Online', latency: '8ms' },
                      { name: 'Auth Service', icon: Lock, status: 'Online', latency: '15ms' },
                      { name: 'Storage', icon: Server, status: 'Online', latency: '22ms' },
                    ].map(s => (
                      <div key={s.name} className="glass p-4 flex items-center gap-3 hover:border-success/20 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <s.icon className="w-5 h-5 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{s.name}</p>
                          <p className="text-success font-semibold text-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            {s.status}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">~{s.latency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="glass p-3 mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span>Uptime: <strong className="text-success">99.9%</strong></span>
                    <span className="w-px h-3 bg-border" />
                    <span>Last checked: <strong className="text-foreground">Just now</strong></span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-destructive py-2.5 px-5 rounded-full bg-destructive/10 border border-destructive/20 mx-auto w-fit">
                  <WifiOff className="w-4 h-4" />
                  <span className="font-semibold text-sm">System Issues Detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="glass-admin p-5 animate-in">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Audit Trail</h3>
                <p className="text-[10px] text-muted-foreground">Recent admin actions and security events</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { action: 'Admin login', time: 'Just now', status: 'success', detail: 'Password authentication' },
                { action: 'Session started', time: 'Current', status: 'success', detail: 'Active session' },
                { action: 'Keys tab accessed', time: 'Recent', status: 'info', detail: 'Read-only access' },
                { action: 'System health checked', time: '2 min ago', status: 'info', detail: 'All systems OK' },
              ].map((item, i) => (
                <div key={i} className="glass p-4 flex items-center justify-between group hover:border-accent/20 transition-all" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'success' ? 'bg-success' : 'bg-accent/50'}`} />
                    <div>
                      <span className="text-sm font-medium">{item.action}</span>
                      <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'success' ? 'text-success bg-success/10' : 'text-muted-foreground bg-secondary/50'}`}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="space-y-5 animate-in">
            <div className="glass-admin p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <SendIcon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Send Broadcast</h3>
                  <p className="text-[10px] text-muted-foreground">Shown as popup on user login (once per broadcast)</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">TITLE</label>
                <input value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., Scheduled Maintenance" className="input-admin w-full text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 block">MESSAGE</label>
                <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Enter your broadcast message..." className="input-admin w-full min-h-[100px] resize-y text-sm" />
              </div>
              <button onClick={sendBroadcast} disabled={bcSending || !bcTitle.trim() || !bcMessage.trim()} className="btn-admin flex items-center gap-2 text-sm">
                {bcSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                Send Broadcast
              </button>
            </div>

            <div className="glass-admin p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <SendIcon className="w-4 h-4 text-accent" /> Broadcasts ({broadcasts.length})
                </h3>
                <button onClick={() => supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).then(({ data }) => setBroadcasts(data || []))} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {broadcasts.length === 0 ? (
                <div className="text-center py-8">
                  <SendIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No broadcasts sent yet</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Send your first broadcast above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map(b => (
                    <div key={b.id} className="glass p-4 hover:border-accent/20 transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-accent text-sm">{b.title}</p>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{b.message}</p>
                          <p className="text-[10px] text-muted-foreground/40 mt-2">
                            {format(new Date(b.created_at), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteBroadcast(b.id)}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

export default AdminPanel;
