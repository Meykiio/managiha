import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Profile, Store } from "../lib/types";
import { t } from "../i18n";

interface SignUpInput {
  email: string;
  password: string;
  storeName: string;
  fullName: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  store: Store | null;
  loading: boolean;
  storeMissing: boolean;
  userDataError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshStore: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapAuthError(message: string | undefined): string {
  switch (message) {
    case "Invalid login credentials":
      return t("auth.error.invalidCredentials");
    case "User already registered":
      return t("auth.error.userExists");
    case "Password should be at least 6 characters":
      return t("auth.error.passwordTooShort");
    case "Email not confirmed":
      return t("auth.error.emailNotConfirmed");
    default:
      return message || t("auth.error.generic");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [userDataReady, setUserDataReady] = useState(false);
  const [storeMissing, setStoreMissing] = useState(false);
  const [userDataError, setUserDataError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!_event.startsWith("INITIAL")) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const loadUserData = useCallback(
    async (signal: { cancelled: boolean }, retried: boolean) => {
      const [profileRes, storeRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("stores").select("*").eq("owner_id", userId).maybeSingle(),
      ]);
      if (signal.cancelled) return;
      const error = storeRes.error?.message ?? profileRes.error?.message ?? null;
      const authFailure =
        !retried &&
        error !== null &&
        /jwt|token|unauthorized|401|403|api key/i.test(error);
      if (authFailure) {
        await supabase.auth.refreshSession();
        return loadUserData(signal, true);
      }
      setUserDataError(error);
      setProfile(profileRes.data ?? null);
      setStore(storeRes.data ?? null);
      setStoreMissing(!storeRes.data && !error);
      setUserDataReady(true);
    },
    [userId]
  );

  useEffect(() => {
    const signal = { cancelled: false };
    if (!userId) {
      setProfile(null);
      setStore(null);
      setStoreMissing(false);
      setUserDataError(null);
      setUserDataReady(true);
      return;
    }
    setUserDataReady(false);
    loadUserData(signal, false);
    return () => {
      signal.cancelled = true;
    };
  }, [userId, loadUserData]);

  const loading = !sessionReady || !userDataReady;

  const refreshStore = useCallback(async () => {
    if (!userId) return;
    setUserDataReady(false);
    await loadUserData({ cancelled: false }, true);
  }, [userId, loadUserData]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const res = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(res.data ?? null);
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthError(error.message));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          store_name: input.storeName,
          full_name: input.fullName,
        },
      },
    });
    if (error) throw new Error(mapAuthError(error.message));
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(mapAuthError(error.message));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(mapAuthError(error.message));
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    store,
    loading,
    storeMissing,
    userDataError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshStore,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
