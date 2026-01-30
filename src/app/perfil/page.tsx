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

  async function savePassword() {
    setBusy(true);
    setMsg(null);
    try {
      if (!canSavePw) throw new Error("Verifica la contraseña (mínimo 6 caracteres y deben coincidir).");
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      setMsg({ kind: "ok", text: "Contraseña actualizada." });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Error actualizando contraseña" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFade>
      <Container className="py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Title>Perfil</Title>
            <Subtitle>Actualiza tu nombre y tu contraseña.</Subtitle>
          </div>
          {profile && (
            <Badge>Rol: {profile.role === "admin" ? "Admin" : profile.role === "leader" ? "Líder" : "Joven"}</Badge>
          )}
        </div>

        {loading && <LoadingCard />}
        {!loading && !session && (
          <Card className="mt-6">
            <div className="text-lg">
              <Title>Necesitas iniciar sesión</Title>
            </div>
            <Subtitle>Vuelve a la página de inicio para entrar.</Subtitle>
          </Card>
        )}

        {!loading && session && profile && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4 opacity-80" />
                <div className="text-lg">
                  <Title>Nombre</Title>
                </div>
              </div>
              <div className="mt-1">
                <Subtitle>Este nombre se muestra en rankings y reportes.</Subtitle>
              </div>

              <div className="mt-4 space-y-3">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
                <Button disabled={!canSaveName || busy} onClick={saveName}>
                  Guardar nombre
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 opacity-80" />
                <div className="text-lg">
                  <Title>Contraseña</Title>
                </div>
              </div>
              <div className="mt-1">
                <Subtitle>Recomendación: usa una contraseña fuerte.</Subtitle>
              </div>

              <div className="mt-4 space-y-3">
                <Input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="Nueva contraseña" />
                <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repite la nueva contraseña" />
                <Button disabled={!canSavePw || busy} onClick={savePassword}>
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
