"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, PageFade, Button, Input } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { KeyRound, User2, Save, ArrowLeft } from "lucide-react";

function friendlyErr(e: any) {
  const m = String(e?.message || e || "").toLowerCase();
  if (m.includes("jwt")) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (m.includes("password") && m.includes("6")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("rate")) return "Demasiados intentos. Intenta de nuevo en unos minutos.";
  return "Ocurrió un error.";
}

export default function PerfilPage() {
  const router = useRouter();
  const { loading: authLoading, session, profile, error: authError, refresh } = useMyProfile();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    setName(profile?.name ?? "");
  }, [profile?.name]);

  const canSaveName = useMemo(() => {
    const n = name.trim();
    return !!session && n.length >= 2 && n !== (profile?.name ?? "");
  }, [name, session, profile?.name]);

  async function saveName() {
    setMsg("");
    if (!session) return;
    const n = name.trim();
    if (n.length < 2) {
      setMsg("Escribe un nombre válido.");
      return;
    }
    try {
      setSavingName(true);
      const res = await supabase.from("profiles").update({ name: n }).eq("id", session.user.id);
      if (res.error) throw res.error;
      setMsg("✅ Nombre actualizado.");
      // refresca perfil local
      try {
        await refresh();
      } catch {}
    } catch (e) {
      setMsg(friendlyErr(e));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    setMsg("");
    if (!session) return;
    if (!pw1 || pw1.length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (pw1 !== pw2) {
      setMsg("Las contraseñas no coinciden.");
      return;
    }
    try {
      setSavingPw(true);
      const res = await supabase.auth.updateUser({ password: pw1 });
      if (res.error) throw res.error;
      setPw1("");
      setPw2("");
      setMsg("✅ Contraseña actualizada.");
    } catch (e) {
      setMsg(friendlyErr(e));
    } finally {
      setSavingPw(false);
    }
  }

  if (authLoading) return <LoadingCard text="Cargando sesión…" />;

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Perfil</Title>
            <Subtitle>Inicia sesión para editar tu perfil.</Subtitle>
            {authError && <div className="text-amber-200 text-sm mt-2">{authError}</div>}
            <div className="mt-4">
              <Button onClick={() => (window.location.href = "/")}>Ir a inicio</Button>
            </div>
          </Card>
        </PageFade>
      </Container>
    );
  }

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Button
                className="mb-3 bg-white/10 text-white border border-white/10 hover:bg-white/15"
                onClick={() => router.back()}
              >
                <ArrowLeft size={16} className="mr-2" />
                Volver
              </Button>
              <Title>Mi perfil</Title>
              <Subtitle>Actualiza tu nombre y tu contraseña.</Subtitle>
              {msg && <div className="text-amber-200 text-sm mt-2">{msg}</div>}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <User2 size={16} className="opacity-80" />
                <div className="text-sm font-semibold">Nombre</div>
              </div>
              <div className="text-xs text-white/60 mb-1">Nombre visible</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              <div className="mt-3">
                <Button disabled={!canSaveName || savingName} onClick={saveName}>
                  <Save size={16} className="mr-2" />
                  {savingName ? "Guardando…" : "Guardar nombre"}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound size={16} className="opacity-80" />
                <div className="text-sm font-semibold">Contraseña</div>
              </div>
              <div className="grid gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Nueva contraseña</div>
                  <Input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Confirmar contraseña</div>
                  <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repite la contraseña" />
                </div>
                <div className="pt-1">
                  <Button disabled={savingPw} onClick={savePassword}>
                    <Save size={16} className="mr-2" />
                    {savingPw ? "Guardando…" : "Guardar contraseña"}
                  </Button>
                </div>
                <div className="text-xs text-white/50">
                  Tip: si cambias tu contraseña, tu sesión seguirá activa en este dispositivo.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </PageFade>
    </Container>
  );
}
