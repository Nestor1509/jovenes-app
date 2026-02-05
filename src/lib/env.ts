/**
 * Runtime-safe environment helpers.
 *
 * Next.js will inline NEXT_PUBLIC_* vars on the client, but server envs may be missing
 * in misconfigured deployments. These helpers fail fast with a clear error message.
 */

export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Missing required environment variable: ${name}`);
}

export function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
