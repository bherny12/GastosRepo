import { createClient, type User } from "@supabase/supabase-js";

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  bucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "receipts",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
};

export const supabaseMissingKeys = Object.entries(supabaseConfig)
  .filter(([key, value]) => key !== "appUrl" && key !== "bucket" && !value)
  .map(([key]) => key);

export const isSupabaseConfigured = supabaseMissingKeys.length === 0;

export const supabase = createClient(
  supabaseConfig.url || "https://example.supabase.co",
  supabaseConfig.anonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export interface CurrentUser {
  $id: string;
  id: string;
  email: string;
  name: string;
  raw: User;
}

export class FriendlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendlyError";
  }
}

export function ensureSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new FriendlyError("Falta configurar la conexión segura con Supabase. Revise las variables del archivo .env.local.");
  }
}

export function normalizeSupabaseError(error: unknown) {
  if (error instanceof FriendlyError) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const raw = String((error as { message?: unknown }).message ?? "");
    const lower = raw.toLowerCase();
    if (lower.includes("invalid login credentials")) return "El correo o la contraseña no coinciden.";
    if (lower.includes("email not confirmed")) return "Falta confirmar el correo antes de iniciar sesión.";
    if (lower.includes("row-level security")) return "Su sesión no tiene permiso para realizar esta acción.";
    if (lower.includes("duplicate key")) return "Ese registro ya existe.";
    if (lower.includes("violates check constraint")) return "Revise los datos ingresados.";
  }
  return "No se pudo completar la acción. Inténtelo nuevamente.";
}

export function toCurrentUser(user: User): CurrentUser {
  return {
    $id: user.id,
    id: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Doña Mónica"),
    raw: user
  };
}

export function toDocument<T extends Record<string, unknown>>(row: T) {
  const id = String(row.id ?? row.$id ?? "");
  return {
    ...row,
    $id: id,
    $createdAt: String(row.created_at ?? row.createdAt ?? ""),
    $updatedAt: String(row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt ?? ""),
    $permissions: []
  } as T & { $id: string; $createdAt: string; $updatedAt: string; $permissions: string[] };
}
