"use client";

type Entry<T> = { value: T; expiresAt: number };

const mem = new Map<string, Entry<any>>();

export function getCache<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  mem.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache(prefix?: string) {
  if (!prefix) return mem.clear();
  for (const k of Array.from(mem.keys())) {
    if (k.startsWith(prefix)) mem.delete(k);
  }
}

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlMs = 15_000): Promise<T> {
  const hit = getCache<T>(key);
  if (hit !== null) return hit;
  const value = await fetcher();
  setCache(key, value, ttlMs);
  return value;
}

export function invalidate(prefix: string) {
  clearCache(prefix);
}
