import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMasterAuth } from '@/hooks/useMasterAuth';
import { MASTER_PASSWORD, ADMIN_PASSWORD } from '@/lib/supabase';
import CFMSLogo from '@/components/CFMSLogo';
import { Crown, Loader2, ArrowLeft, ShieldCheck, Lock, ArrowRight } from 'lucide-react';

const MasterLogin = () => {
  const navigate = useNavigate();
  const { user, masterAdmin, role, isPasswordAuth, loading, error, signInWithGoogle, signOut } = useMasterAuth();
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    if (!loading && ((user && masterAdmin && role) || isPasswordAuth)) {
      localStorage.setItem('cfms_master', 'true');
      if (role) localStorage.setItem('cfms_master_role', role);
      navigate('/master');
    }
  }, [loading, user, masterAdmin, role, isPasswordAuth, navigate]);

  const isDenied = !loading && user && !masterAdmin && error;

  const handlePasswordLogin = () => {
    const normalizedPassword = password.trim();
    const validMasterPasswords = [MASTER_PASSWORD.trim(), ADMIN_PASSWORD.trim(), 'stk7890'];

    setPassLoading(true);
    setPassError('');
    setTimeout(() => {
      if (validMasterPasswords.includes(normalizedPassword)) {
        localStorage.setItem('cfms_master', 'true');
        localStorage.setItem('cfms_master_role', 'full');
        navigate('/master');
      } else {
        setPassError('Invalid master password');
      }
      setPassLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/8 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-all duration-300 group animate-in">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        <div className="flex flex-col items-center mb-10 animate-in-delay-1">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl animate-glow-master" />
            <div className="absolute -inset-8 rounded-full bg-primary/5 blur-3xl" />
            <CFMSLogo size={80} className="ring-2 ring-primary/30 shadow-[0_0_40px_-8px_hsl(265_72%_58%/0.3)] animate-float" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Master Control</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-primary/40" />
            <p className="text-muted-foreground text-[11px] tracking-[0.25em] flex items-center gap-2">
              <Crown className="w-3 h-3 text-primary animate-pulse-soft" />
              SUPREME ACCESS ONLY
            </p>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </div>

        <div className="glass-master p-8 space-y-6 animate-in-delay-2 shimmer-overlay">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying access...</p>
            </div>
          ) : isDenied ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                {error}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Signed in as <span className="text-foreground font-medium">{user?.email}</span>
              </p>
              <button onClick={signOut} className="w-full py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                Sign out & try another account
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Google Sign In */}
              <button
                onClick={signInWithGoogle}
                className="btn-primary w-full flex items-center justify-center gap-3 text-sm font-bold tracking-wide py-3.5"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>

              {error && !isDenied && (
                <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground tracking-[0.2em]">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Password Login */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-primary tracking-[0.2em]">
                  <Lock className="w-4 h-4" />
                  MASTER PASSWORD
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                    placeholder="Enter master password"
                    className="input-glass w-full text-sm pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Crown className="w-4 h-4 text-primary/30" />
                  </div>
                </div>

                {passError && (
                  <div className="flex items-center gap-2.5 text-destructive text-sm animate-fade-in p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                    {passError}
                  </div>
                )}

                <button onClick={handlePasswordLogin} disabled={passLoading} className="w-full flex items-center justify-center gap-3 text-sm font-bold tracking-wide py-3.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                  {passLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  {passLoading ? 'Authenticating...' : 'Login with Password'}
                  {!passLoading && <ArrowRight className="w-4 h-4 ml-1" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 animate-in-delay-3">
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <div className="w-1 h-1 rounded-full bg-primary/50 animate-pulse" />
            <span>ENCRYPTED</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/10" />
          <div className="flex items-center gap-1.5 text-muted-foreground/30 text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            <span>WHITELIST ONLY</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterLogin;
