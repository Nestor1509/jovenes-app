"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, Button, Input, PageFade, Badge } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { KeyRound, User2, ArrowLeft } from "lucide-react";

type TargetProfile = { id: string; name: string; role: string; group_id: string | null };

export default function AdminUserPerfilPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;
  const router = useRouter();
  const { loading, session, profile: me } = useMyProfile();

  const [target, setTarget] = useState<TargetProfile | null>(null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAdmin = me?.role === "admin";

  useEffect(() => {
    async function load() {
      if (!userId || !isAdmin) return;
      setMsg(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,role,group_id")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
      setTarget((data as any) ?? null);
      setName((data as any)?.name ?? "");
    }
    load();
  }, [userId, isAdmin]);

  const canSaveName = useMemo(() => !!target && name.trim().length >= 2 && name.trim() !== (target?.name ?? ""), [name, target]);
  const canSavePw = useMemo(() => pw.length >= 6, [pw]);

  async function adminUpdate(payload: { name?: string; password?: string }) {
    if (!session?.access_token) throw new Error("Sesión inválida.");
    const res = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, ...payload }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error ?? "Error");
    return j;
  }

  async function saveName() {
    if (!target) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminUpdate({ name: name.trim() });
      setMsg({ kind: "ok", text: "Nombre actualizado." });
      setTarget({ ...target, name: name.trim() });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function resetPw() {
    setBusy(true);
    setMsg(null);
    try {
      if (!canSavePw) throw new Error("La contraseña debe tener mínimo 6 caracteres.");
      await adminUpdate({ password: pw });
      setPw("");
      setMsg({ kind: "ok", text: "Contraseña actualizada para el usuario." });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Error" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageFade>
        <Container className="py-8">
          <LoadingCard />
        </Container>
      </PageFade>
    );
  }

  if (!session) {
    return (
      <PageFade>
        <Container className="py-8">
          <Card>
            <div className="text-lg">
              <Title>Sin sesión</Title>
            </div>
            <Subtitle>Inicia sesión para continuar.</Subtitle>
          </Card>
        </Container>
      </PageFade>
    );
  }

  if (!isAdmin) {
    return (
      <PageFade>
        <Container className="py-8">
          <Card>
            <div className="text-lg">
              <Title>Acceso denegado</Title>
            </div>
            <Subtitle>Solo Admin puede editar perfiles de otros usuarios.</Subtitle>
          </Card>
        </Container>
      </PageFade>
    );
  }

  return (
    <PageFade>
      <Container className="py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5 transition" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Title>Editar usuario</Title>
            </div>
            <Subtitle>Admin: cambia nombre o resetea la contraseña de un usuario.</Subtitle>
          </div>
          {target && <Badge>{target.role}</Badge>}
        </div>

        {!target ? (
          <Card className="mt-6">
            <Subtitle>Cargando usuario…</Subtitle>
          </Card>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4 opacity-80" />
                <div className="text-lg">
                  <Title>Nombre</Title>
                </div>
              </div>
              <div className="mt-1">
                <Subtitle>ID: {target.id}</Subtitle>
              </div>

              <div className="mt-4 space-y-3">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <Button disabled={!canSaveName || busy} onClick={saveName}>
                  Guardar nombre
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 opacity-80" />
                <div className="text-lg">
                  <Title>Resetear contraseña</Title>
                </div>
              </div>
              <div className="mt-1">
                <Subtitle>El usuario podrá iniciar sesión con la nueva contraseña.</Subtitle>
              </div>

              <div className="mt-4 space-y-3">
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña" />
                <Button disabled={!canSavePw || busy} onClick={resetPw}>
                  Cambiar contraseña
                </Button>
                <p className="text-xs opacity-70">Mínimo 6 caracteres.</p>
              </div>
            </Card>
          </div>
        )}

        {msg && (
          <div className="mt-4">
            <Card className={msg.kind === "ok" ? "border-emerald-400/20" : "border-rose-400/20"}>
              <div className={msg.kind === "ok" ? "text-emerald-200" : "text-rose-200"}>
                <Subtitle>{msg.text}</Subtitle>
              </div>
            </Card>
          </div>
        )}
      </Container>
    </PageFade>
  );
}
