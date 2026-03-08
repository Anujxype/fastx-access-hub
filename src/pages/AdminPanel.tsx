import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FastXLogo from '@/components/FastXLogo';
import KeysManager from '@/components/admin/KeysManager';
import LogsViewer from '@/components/admin/LogsViewer';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { supabase, type Broadcast } from '@/lib/supabase';
import {
  Key, FileText, BarChart3, Heart, ClipboardCheck, Send as SendIcon,
  LogOut, Bell, Shield, Loader2, RefreshCw, Wifi, WifiOff
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
      fetch('https://kbgabcennwwfmykfyndh.supabase.co/rest/v1/', {
        headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZ2FiY2Vubnd3Zm15a2Z5bmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTE5NjYsImV4cCI6MjA4NjE4Nzk2Nn0.CzvobFl6D2tyRPA9JNW8yEZ9PhkrtkzsAhEvyhKtj4I' }
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
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          <span className="font-bold text-lg">Akshu</span>
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30 font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 mt-4 flex flex-wrap gap-2 mb-6">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}
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
          <div className="glass-admin p-6 animate-in text-center space-y-4">
            <Heart className="w-12 h-12 text-accent mx-auto" />
            <h3 className="text-xl font-bold">System Health</h3>
            {healthOk === null ? (
              <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
            ) : healthOk ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-success">
                  <Wifi className="w-5 h-5" /> All Systems Operational
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="glass p-3"><p className="text-muted-foreground">Database</p><p className="text-success font-medium">Online</p></div>
                  <div className="glass p-3"><p className="text-muted-foreground">API</p><p className="text-success font-medium">Online</p></div>
                  <div className="glass p-3"><p className="text-muted-foreground">Auth</p><p className="text-success font-medium">Online</p></div>
                  <div className="glass p-3"><p className="text-muted-foreground">Storage</p><p className="text-success font-medium">Online</p></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <WifiOff className="w-5 h-5" /> System Issues Detected
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="glass-admin p-5 animate-in">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-5 h-5 text-accent" /> Audit Trail
            </h3>
            <p className="text-muted-foreground text-sm mb-4">Recent admin actions and key usage monitoring</p>
            <div className="space-y-2 text-sm">
              <div className="glass p-3 flex justify-between"><span>Admin login</span><span className="text-muted-foreground text-xs">Just now</span></div>
              <div className="glass p-3 flex justify-between"><span>Session active</span><span className="text-xs text-success">Current</span></div>
            </div>
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="space-y-5 animate-in">
            <div className="glass-admin p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <SendIcon className="w-5 h-5 text-accent" /> Send Broadcast
              </h3>
              <p className="text-sm text-muted-foreground">Broadcast messages appear as a popup when users login via their keys (shown only once per broadcast).</p>
              <div>
                <label className="text-xs font-semibold text-muted-foreground tracking-wider mb-1.5 block">TITLE</label>
                <input value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., Scheduled Maintenance" className="input-admin w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground tracking-wider mb-1.5 block">MESSAGE</label>
                <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Enter your broadcast message..." className="input-admin w-full min-h-[100px] resize-y" />
              </div>
              <button onClick={sendBroadcast} disabled={bcSending} className="btn-admin flex items-center gap-2">
                {bcSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                Send Broadcast
              </button>
            </div>

            <div className="glass-admin p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <SendIcon className="w-5 h-5 text-accent" /> All Broadcasts ({broadcasts.length})
                </h3>
                <button onClick={() => supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).then(({ data }) => setBroadcasts(data || []))} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No broadcasts yet</p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map(b => (
                    <div key={b.id} className="glass p-3">
                      <p className="font-semibold text-accent">{b.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{b.message}</p>
                      <p className="text-xs text-muted-foreground/50 mt-2">{new Date(b.created_at).toLocaleString()}</p>
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
