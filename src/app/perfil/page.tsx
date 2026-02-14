"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, Button, Input, PageFade, Badge } from "@/components/ui";
import { KeyRound, User2 } from "lucide-react";
import LoadingCard from "@/components/LoadingCard";

export default function PerfilPage() {
  const { loading, session, profile, refresh } = useMyProfile();
  const [name, setName] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const canSaveName = useMemo(
    () => !!profile && name.trim().length >= 2 && name.trim() !== (profile?.name ?? ""),
    [name, profile]
  );
  const canSavePw = useMemo(() => pw1.length >= 6 && pw1 === pw2, [pw1, pw2]);

  async function saveName() {
    if (!profile) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", profile.id);
      if (error) throw error;
      setMsg({ kind: "ok", text: "Nombre actualizado." });
      await refresh();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Error actualizando nombre" });
    } finally {
      setBusy(false);
    }
  }
}
