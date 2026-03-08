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
        redirectTo: `${window.location.origin}/master-login`,
      },
    });
    if (error) {
      setState(s => ({ ...s, loading: false, error: error.message }));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cfms_master');
    setState({ user: null, masterAdmin: null, role: null, loading: false, error: null });
  };

  // Permission helpers
  const canManage = state.role === 'full' || state.role === 'limited';
  const canDelete = state.role === 'full';
  const canChangePasswords = state.role === 'full';
  const canKillSwitch = state.role === 'full';
  const canManageAdmins = state.role === 'full';
  const canSendBroadcast = state.role === 'full' || state.role === 'limited';

  return {
    ...state,
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
