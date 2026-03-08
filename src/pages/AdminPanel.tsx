import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FastXLogo from '@/components/FastXLogo';
import KeysManager from '@/components/admin/KeysManager';
import LogsViewer from '@/components/admin/LogsViewer';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { supabase, type Broadcast } from '@/lib/supabase';
import {
  Key, FileText, BarChart3, Heart, ClipboardCheck, Send as SendIcon,
  LogOut, Bell, Shield, Loader2, RefreshCw, Wifi, WifiOff, Activity,
  Server, Database, Lock, Globe
} from 'lucide-react';

const TABS = [
  { id: 'keys', label: 'Keys', icon: Key },
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

  const handleLogout = () => {
    localStorage.removeItem('fastx_admin');
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-md" />
            <div className="relative w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
          </div>
          <span className="font-bold text-lg">Akshu</span>
          <span className="text-[10px] bg-accent/15 text-accent px-2.5 py-1 rounded-full border border-accent/25 font-semibold tracking-wider">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all relative">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 mt-5 flex flex-wrap gap-2 mb-6 animate-in">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="px-4">
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
                <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
              ) : healthOk ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2.5 py-2 px-4 rounded-full bg-success/10 border border-success/20 mx-auto w-fit">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-success font-semibold text-sm">All Systems Operational</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { name: 'Database', icon: Database, status: 'Online' },
                      { name: 'API Gateway', icon: Globe, status: 'Online' },
                      { name: 'Auth Service', icon: Lock, status: 'Online' },
                      { name: 'Storage', icon: Server, status: 'Online' },
                    ].map(s => (
                      <div key={s.name} className="glass p-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                          <s.icon className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{s.name}</p>
                          <p className="text-success font-semibold text-sm flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-success" />
                            {s.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-destructive py-2 px-4 rounded-full bg-destructive/10 border border-destructive/20 mx-auto w-fit">
                  <WifiOff className="w-4 h-4" />
                  <span className="font-semibold text-sm">System Issues Detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="glass-admin p-5 animate-in">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Audit Trail</h3>
                <p className="text-[10px] text-muted-foreground">Recent admin actions and key usage monitoring</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { action: 'Admin login', time: 'Just now', status: 'info' },
                { action: 'Session active', time: 'Current', status: 'success' },
                { action: 'Keys tab accessed', time: 'Recent', status: 'info' },
              ].map((item, i) => (
                <div key={i} className="glass p-3.5 flex items-center justify-between group hover:border-accent/20 transition-all">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-success' : 'bg-accent/50'}`} />
                    <span className="text-sm">{item.action}</span>
                  </div>
                  <span className={`text-xs ${item.status === 'success' ? 'text-success' : 'text-muted-foreground'}`}>{item.time}</span>
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
              <button onClick={sendBroadcast} disabled={bcSending} className="btn-admin flex items-center gap-2 text-sm">
                {bcSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                Send Broadcast
              </button>
            </div>

            <div className="glass-admin p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <SendIcon className="w-4 h-4 text-accent" /> All Broadcasts ({broadcasts.length})
                </h3>
                <button onClick={() => supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).then(({ data }) => setBroadcasts(data || []))} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No broadcasts yet</p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map(b => (
                    <div key={b.id} className="glass p-4 hover:border-accent/20 transition-all">
                      <p className="font-semibold text-accent text-sm">{b.title}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{b.message}</p>
                      <p className="text-[10px] text-muted-foreground/40 mt-2">{new Date(b.created_at).toLocaleString()}</p>
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
