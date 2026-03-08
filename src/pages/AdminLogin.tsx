import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_PASSWORD } from '@/lib/supabase';
import { Shield, Lock, Loader2, ArrowLeft } from 'lucide-react';

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
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mb-4 glow-admin">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm tracking-[0.15em] mt-1">RESTRICTED ACCESS</p>
        </div>

        <div className="glass-admin p-6 space-y-5 animate-in-delay-1">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-accent mb-2">
              <Lock className="w-4 h-4" />
              ADMIN PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
              className="input-admin w-full"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-destructive text-sm animate-fade-in">{error}</p>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-admin w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            Access Admin Panel
          </button>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          Administrative access is logged and monitored
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
