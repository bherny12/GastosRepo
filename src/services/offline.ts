import { normalizeSupabaseError } from "@/lib/supabase";

const QUEUE_KEY = "gastos-monica-pending-operations";

export interface PendingOperation {
  id: string;
  type: "transaction" | "customer" | "product";
  payload: unknown;
  createdAt: string;
}

export function queueOperation(operation: Omit<PendingOperation, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const current = readQueue();
  current.push({ ...operation, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
}

export function readQueue(): PendingOperation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as PendingOperation[];
  } catch {
    return [];
  }
}

export function clearQueuedOperation(id: string) {
  if (typeof window === "undefined") return;
  const next = readQueue().filter((operation) => operation.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
}

export async function safeAction<T>(action: () => Promise<T>) {
  try {
    return { data: await action(), error: "" };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) };
  }
}
