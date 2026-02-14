"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OAuthUrlCleaner() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    const hasOAuthError =
      url.searchParams.has("error") ||
      url.searchParams.has("error_code") ||
      url.searchParams.has("error_description");

    if (hasOAuthError) {
      // Limpia la URL sin recargar la página
      router.replace("/");
    }
  }, [router]);

  return null;
}
