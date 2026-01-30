"use client";

import { useEffect, useMemo, useState } from "react";
import { cached } from "@/lib/cache";

type State<T> = { loading: boolean; data: T | null; error: string };

export function useCachedAsync<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  deps: any[] = [],
  ttlMs = 15_000
): State<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<State<T>>({ loading: true, data: null, error: "" });

  const refresh = useMemo(
    () => async () => {
      if (!key) return;
      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const data = await cached(key, fetcher, ttlMs);
        setState({ loading: false, data, error: "" });
      } catch (e: any) {
        setState({ loading: false, data: null, error: e?.message ?? "Error" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ...deps]
  );

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { ...state, refresh };
}
