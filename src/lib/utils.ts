import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withTimeout<T>(value: any, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );

  return Promise.race([Promise.resolve(value) as Promise<T>, timeout]);
}

