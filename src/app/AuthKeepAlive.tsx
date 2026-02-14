"use client";

import { useAuthKeepAlive } from "@/lib/useAuthKeepAlive";

export default function AuthKeepAlive() {
  useAuthKeepAlive();
  return null;
}
