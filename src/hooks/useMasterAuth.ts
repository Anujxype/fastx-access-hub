import { useState, useEffect, useRef, useCallback } from 'react';
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

async function checkMasterAdmin(email: string | undefined) {
  if (!email) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('master_admins')
      .select('email, role, display_name')
      .eq('email', email)
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: { message: 'Network error checking admin status' } };
  }
}

function isValidRole(role: string | null): role is MasterRole {
  return role === 'full' || role === 'limited' || role === 'monitor';
}

export function useMasterAuth() {
  const [state, setState] = useState<MasterAuthState>({
    user: null,
    masterAdmin: null,
    role: null,
    loading: true,
    error: null,
  });
  const initialized = useRef(false);

  const processUser = useCallback(async (user: User | null) => {
    if (user) {
      setState(s => ({ ...s, loading: true, error: null }));
      const { data, error } = await checkMasterAdmin(user.email);
      if (error) {
        setState({ user, masterAdmin: null, role: null, loading: false, error: 'Failed to verify admin status' });
      } else if (!data) {
        setState({ user, masterAdmin: null, role: null, loading: false, error: `Access denied: ${user.email} is not a registered master admin` });
      } else {
        const validRole = isValidRole(data.role) ? data.role : 'monitor';
        localStorage.setItem('cfms_master', 'true');
        localStorage.setItem('cfms_master_role', validRole);
        setState({ user, masterAdmin: data as MasterAdmin, role: validRole, loading: false, error: null });
      }
    } else {
      setState({ user: null, masterAdmin: null, role: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    // 1. Check existing session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (ignore) return;
      initialized.current = true;
      await processUser(session?.user ?? null);
    });

    // 2. Listen for future auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initialized.current) return; // Skip until getSession completes
      await processUser(session?.user ?? null);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [processUser]);

  const signInWithGoogle = useCallback(async () => {
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
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('cfms_master');
    localStorage.removeItem('cfms_master_role');
    setState({ user: null, masterAdmin: null, role: null, loading: false, error: null });
    try { await supabase.auth.signOut(); } catch {}
  }, []);

  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('cfms_master_role') : null;
  const isPasswordAuth = typeof window !== 'undefined' && localStorage.getItem('cfms_master') === 'true' && isValidRole(storedRole) && !state.user;
  const effectiveRole: MasterRole | null = state.role ?? (isValidRole(storedRole) ? storedRole : null);

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
