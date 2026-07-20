export async function hashPin(pin: string, salt: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function saveDevicePin(userId: string, pin: string) {
  const salt = crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(`pin:${userId}`, JSON.stringify({ salt, hash }));
}

export async function verifyDevicePin(userId: string, pin: string) {
  const raw = localStorage.getItem(`pin:${userId}`);
  if (!raw) return false;
  const saved = JSON.parse(raw) as { salt: string; hash: string };
  return (await hashPin(pin, saved.salt)) === saved.hash;
}

export function removeDevicePin(userId: string) {
  localStorage.removeItem(`pin:${userId}`);
}

export function hasDevicePin(userId?: string) {
  if (!userId) return false;
  return Boolean(localStorage.getItem(`pin:${userId}`));
}
