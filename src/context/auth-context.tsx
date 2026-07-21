"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isSupabaseConfigured, normalizeSupabaseError } from "@/lib/supabase";
import { ensureStarterRecords, getOrCreateAnonymousUser, getOrCreateProfile, sendPasswordRecovery, updateProfile, type CurrentUser } from "@/services/supabase-service";
import type { Profile, WithDocument } from "@/types/domain";
import type { ProfileInput } from "@/validations/schemas";
import { useToast } from "@/components/ui/toast";

const localUser: CurrentUser = {
  $id: "local-dona-monica",
  id: "local-dona-monica",
  email: "",
  name: "Doña Mónica",
  raw: {} as CurrentUser["raw"]
};

const localProfile: WithDocument<Profile> = {
  $id: "local-profile",
  $createdAt: new Date().toISOString(),
  $updatedAt: new Date().toISOString(),
  $permissions: [],
  userId: localUser.$id,
  fullName: "Doña Mónica",
  email: "",
  phone: "",
  avatar: "",
  currency: "PEN",
  timezone: "America/Lima",
  language: "es",
  dateFormat: "dd/MM/yyyy",
  weekStartsOn: "monday",
  theme: "light",
  textScale: 1,
  pinEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

interface AuthContextValue {
  user: CurrentUser | null;
  profile: WithDocument<Profile> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  recoverPassword: (email: string) => Promise<boolean>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  saveProfile: (profileId: string, input: ProfileInput) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(localUser);
  const [profile, setProfile] = useState<WithDocument<Profile> | null>(localProfile);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(localUser);
      setProfile(localProfile);
      setLoading(false);
      return;
    }
    try {
      const current = await getOrCreateAnonymousUser();
      const userProfile = await getOrCreateProfile(current);
      await ensureStarterRecords(current.$id);
      setUser(current);
      setProfile(userProfile);
    } catch (error) {
      setUser(localUser);
      setProfile(localProfile);
      showToast({ tone: "error", title: "No se pudo abrir Supabase", message: normalizeSupabaseError(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    root.style.fontSize = `${profile.textScale * 16}px`;
    if (profile.theme === "dark") root.classList.add("dark");
    if (profile.theme === "light") root.classList.remove("dark");
    if (profile.theme === "system") root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      async login() {
        await refreshProfile();
        return true;
      },
      async signUp() {
        await refreshProfile();
        return true;
      },
      async logoutUser() {
        await refreshProfile();
      },
      async recoverPassword(email) {
        try {
          await sendPasswordRecovery(email);
          showToast({ tone: "success", title: "Revise su correo", message: "Enviamos el enlace para recuperar la contraseña." });
          return true;
        } catch (error) {
          showToast({ tone: "error", title: "No se pudo enviar el enlace", message: normalizeSupabaseError(error) });
          return false;
        }
      },
      async resetPassword() {
        showToast({ tone: "info", title: "Inicio de sesión desactivado", message: "La app ahora entra directamente." });
        return true;
      },
      refreshProfile,
      async saveProfile(profileId, input) {
        if (!isSupabaseConfigured || profileId === "local-profile") {
          setProfile({ ...localProfile, ...input, updatedAt: new Date().toISOString(), $updatedAt: new Date().toISOString() });
          showToast({ tone: "success", title: "Perfil guardado en este dispositivo" });
          return true;
        }
        try {
          const saved = await updateProfile(profileId, input);
          setProfile(saved);
          showToast({ tone: "success", title: "Perfil guardado" });
          return true;
        } catch (error) {
          showToast({ tone: "error", title: "No se pudo guardar", message: normalizeSupabaseError(error) });
          return false;
        }
      }
    }),
    [loading, profile, refreshProfile, showToast, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) return null;
  return children;
}
