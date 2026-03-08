import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type MasterRole = 'full' | 'limited' | 'monitor';

interface MasterAdmin {
  email: string;
  role: MasterRole;
  display_name: string | null;
}

interface MasterAuthState {
  user: User | null;
  masterAdmin: MasterAdmin | null;
  role: MasterRole | null;
  loading: boolean;
  error: string | null;
}

export function useMasterAuth() {
  const [state, setState] = useState<MasterAuthState>({
    user: null,
    masterAdmin: null,
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email;
        const { data, error } = await supabase
          .from('master_admins')
          .select('email, role, display_name')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          setState({ user: session.user, masterAdmin: null, role: null, loading: false, error: 'Failed to verify admin status' });
        } else if (!data) {
          setState({ user: session.user, masterAdmin: null, role: null, loading: false, error: `Access denied: ${email} is not a registered master admin` });
        } else {
          setState({ user: session.user, masterAdmin: data as MasterAdmin, role: data.role as MasterRole, loading: false, error: null });
        }
      } else {
        setState({ user: null, masterAdmin: null, role: null, loading: false, error: null });
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email;
        const { data, error } = await supabase
          .from('master_admins')
          .select('email, role, display_name')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          setState({ user: session.user, masterAdmin: null, role: null, loading: false, error: 'Failed to verify admin status' });
        } else if (!data) {
          setState({ user: session.user, masterAdmin: null, role: null, loading: false, error: `Access denied: ${email} is not a registered master admin` });
        } else {
          setState({ user: session.user, masterAdmin: data as MasterAdmin, role: data.role as MasterRole, loading: false, error: null });
        }
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/master-login',
      },
    });
    if (error) {
      setState(s => ({ ...s, loading: false, error: error.message }));
    }
  };

  const signOut = async () => {
    localStorage.removeItem('cfms_master');
    localStorage.removeItem('cfms_master_role');
    setState({ user: null, masterAdmin: null, role: null, loading: false, error: null });
    try { await supabase.auth.signOut(); } catch {}
  };

  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('cfms_master_role') : null;
  const isPasswordAuth = typeof window !== 'undefined' && localStorage.getItem('cfms_master') === 'true' && !!storedRole;
  const effectiveRole: MasterRole | null = state.role ?? (
    storedRole === 'full' || storedRole === 'limited' || storedRole === 'monitor'
      ? (storedRole as MasterRole)
      : null
  );

  // Permission helpers
  const canManage = effectiveRole === 'full' || effectiveRole === 'limited';
  const canDelete = effectiveRole === 'full';
  const canChangePasswords = effectiveRole === 'full';
  const canKillSwitch = effectiveRole === 'full';
  const canManageAdmins = effectiveRole === 'full';
  const canSendBroadcast = effectiveRole === 'full' || effectiveRole === 'limited';

  return {
    ...state,
    role: effectiveRole,
    isPasswordAuth,
    signInWithGoogle,
    signOut,
    canManage,
    canDelete,
    canChangePasswords,
    canKillSwitch,
    canManageAdmins,
    canSendBroadcast,
  };
}
