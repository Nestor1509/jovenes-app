type Entry<T> = { value: T; expires: number };

const mem = new Map<string, Entry<any>>();

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs = 15000): Promise<T> {
  const now = Date.now();
  const hit = mem.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const value = await fn();
  mem.set(key, { value, expires: now + ttlMs });
  return value;
}

export function invalidate(keyPrefix?: string) {
  if (!keyPrefix) {
    mem.clear();
    return;
  }
  for (const k of Array.from(mem.keys())) {
    if (k.startsWith(keyPrefix)) mem.delete(k);
  }
}
