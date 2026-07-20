"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isSupabaseConfigured, normalizeSupabaseError } from "@/lib/supabase";
import { completePasswordRecovery, ensureStarterRecords, getCurrentUser, getOrCreateProfile, loginWithEmail, logout, sendPasswordRecovery, updateProfile, type CurrentUser } from "@/services/supabase-service";
import { hasDevicePin, verifyDevicePin } from "@/services/pin";
import type { Profile, WithDocument } from "@/types/domain";
import type { ProfileInput } from "@/validations/schemas";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

interface AuthContextValue {
  user: CurrentUser | null;
  profile: WithDocument<Profile> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  recoverPassword: (email: string) => Promise<boolean>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  saveProfile: (profileId: string, input: ProfileInput) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<WithDocument<Profile> | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const current = await getCurrentUser();
      const userProfile = await getOrCreateProfile(current);
      await ensureStarterRecords(current.$id);
      setUser(current);
      setProfile(userProfile);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
      async login(email, password) {
        try {
          setLoading(true);
          const logged = await loginWithEmail(email, password);
          const userProfile = await getOrCreateProfile(logged);
          await ensureStarterRecords(logged.$id);
          setUser(logged);
          setProfile(userProfile);
          showToast({ tone: "success", title: "Bienvenida", message: "Su sesión quedó lista." });
          return true;
        } catch (error) {
          showToast({ tone: "error", title: "No se pudo iniciar sesión", message: normalizeSupabaseError(error) });
          return false;
        } finally {
          setLoading(false);
        }
      },
      async logoutUser() {
        await logout().catch(() => undefined);
        setUser(null);
        setProfile(null);
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
      async resetPassword(userId, secret, password) {
        try {
          await completePasswordRecovery(userId, secret, password);
          showToast({ tone: "success", title: "Contraseña actualizada", message: "Ahora puede iniciar sesión con su nueva contraseña." });
          return true;
        } catch (error) {
          showToast({ tone: "error", title: "No se pudo cambiar la contraseña", message: normalizeSupabaseError(error) });
          return false;
        }
      },
      refreshProfile,
      async saveProfile(profileId, input) {
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
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pinRequired, setPinRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, pathname, router, user]);

  useEffect(() => {
    if (!user || !profile) return;
    setPinRequired(profile.pinEnabled && hasDevicePin(user.$id) && sessionStorage.getItem(`pin-unlocked:${user.$id}`) !== "true");
  }, [profile, user]);

  if (!isSupabaseConfigured) return <MissingConfigScreen />;
  if (loading || (!user && pathname !== "/login")) return <LoadingScreen />;
  if (!user || !profile) return null;

  if (pinRequired && !unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-ink">
        <section className="w-full max-w-sm rounded-lg bg-white p-6 shadow-soft">
          <div className="mx-auto mb-5 h-24 w-24 overflow-hidden rounded-2xl shadow-soft">
            <Image src="/logo.png" alt="Los gastos de Doña Mónica" width={96} height={96} className="h-full w-full object-cover" />
          </div>
          <h1 className="text-center font-display text-3xl font-semibold">Ingrese su PIN</h1>
          <p className="mt-2 text-center text-sm text-ink/65">Acceso rápido desde este dispositivo.</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await verifyDevicePin(user.$id, pin);
              if (!ok) {
                setPinError("El PIN no coincide.");
                return;
              }
              sessionStorage.setItem(`pin-unlocked:${user.$id}`, "true");
              setUnlocked(true);
            }}
          >
            <Field label="PIN" error={pinError}>
              <Input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" autoFocus />
            </Field>
            <Button className="w-full" size="lg">Entrar</Button>
          </form>
        </section>
      </main>
    );
  }

  return children;
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center text-ink">
      <div>
        <div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl shadow-soft">
          <Image src="/logo.png" alt="Logo" width={96} height={96} className="h-full w-full object-cover" priority />
        </div>
        <p className="mt-5 font-display text-2xl font-semibold">Los gastos de Doña Mónica</p>
        <p className="mt-2 text-sm text-ink/65">Cargando sus datos.</p>
      </div>
    </main>
  );
}

function MissingConfigScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-ink">
      <section className="max-w-lg rounded-lg bg-white p-6 shadow-soft">
        <div className="mb-5 h-20 w-20 overflow-hidden rounded-2xl shadow-soft">
          <Image src="/logo.png" alt="Los gastos de Doña Mónica" width={80} height={80} className="h-full w-full object-cover" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Falta conectar Supabase</h1>
        <p className="mt-3 text-sm text-ink/70">Configure las variables públicas de Supabase en `.env.local` para activar autenticación, base de datos y archivos.</p>
        <div className="mt-4 rounded-lg bg-linen p-4 text-sm text-ink/80">
          NEXT_PUBLIC_SUPABASE_URL<br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY<br />
          NEXT_PUBLIC_SUPABASE_BUCKET<br />
          NEXT_PUBLIC_APP_URL
        </div>
      </section>
    </main>
  );
}



