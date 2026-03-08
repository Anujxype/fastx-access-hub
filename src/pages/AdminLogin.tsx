import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_PASSWORD } from '@/lib/supabase';
import { Shield, Lock, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem('fastx_admin', 'true');
        navigate('/admin');
      } else {
        setError('Invalid admin password');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Amber ambient orbs */}
      <div className="absolute top-1/3 -left-32 w-64 h-64 rounded-full bg-accent/5 blur-[100px] animate-float" />
      <div className="absolute bottom-1/3 -right-32 w-64 h-64 rounded-full bg-accent/8 blur-[100px] animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-all duration-300 group animate-in"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Portal
        </button>

        <div className="flex flex-col items-center mb-10 animate-in-delay-1">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-glow-admin" />
            <div className="relative w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
              <Shield className="w-10 h-10 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground text-xs tracking-[0.2em] mt-2 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-accent" />
            RESTRICTED ACCESS
          </p>
        </div>

        <div className="glass-admin p-7 space-y-5 animate-in-delay-2">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-accent mb-2.5 tracking-wider">
              <Lock className="w-4 h-4" />
              ADMIN PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
              className="input-admin w-full text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm animate-in p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-admin w-full flex items-center justify-center gap-2.5 text-sm font-bold tracking-wide">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? 'Authenticating...' : 'Access Admin Panel'}
          </button>
        </div>

        <p className="text-center text-muted-foreground/40 text-[10px] mt-8 tracking-[0.15em] animate-in-delay-3">
          ADMINISTRATIVE ACCESS IS LOGGED AND MONITORED
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
