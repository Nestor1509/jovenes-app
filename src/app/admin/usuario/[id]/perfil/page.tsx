"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile, Profile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, PageFade, Button, Input } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { ArrowLeft, KeyRound, User2, Save, ShieldAlert } from "lucide-react";

function friendlyErr(e: any) {
  const m = String(e?.message || e || "").toLowerCase();
  if (m.includes("jwt")) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (m.includes("not authorized") || m.includes("no autorizado")) return "No autorizado.";
  if (m.includes("permission")) return "No tienes permisos para esta acción.";
  return "Ocurrió un error.";
}

export default function AdminEditarPerfilPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const { loading: authLoading, session, profile: me, error: authError } = useMyProfile();

  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [msg, setMsg] = useState("");

  const [person, setPerson] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    setRestricted(false);

    if (!session) {
      setLoading(false);
      return;
    }
    if (authError) {
      setMsg(authError);
      setLoading(false);
      return;
    }
    if (!me || me.role !== "admin") {
      setRestricted(true);
      setLoading(false);
      return;
    }
    if (!userId) {
      setMsg("Falta el ID.");
      setLoading(false);
      return;
    }

    const pRes = await supabase.from("profiles").select("id,name,role,group_id").eq("id", userId).maybeSingle();
    if (pRes.error) {
      setMsg("No se pudo cargar el perfil. Revisa policies de profiles.");
      setRestricted(true);
      setLoading(false);
      return;
    }
    const p = pRes.data as Profile | null;
    if (!p) {
      setMsg("No se encontró el perfil.");
      setLoading(false);
      return;
    }
    setPerson(p);
    setName(p.name ?? "");
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, me?.role, userId]);

  const canSave = useMemo(() => {
    if (!session || restricted) return false;
    const n = name.trim();
    const nameChanged = !!person && n.length >= 2 && n !== (person.name ?? "");
    const pwChanged = pw.trim().length >= 6;
    return nameChanged || pwChanged;
  }, [name, pw, session, restricted, person]);

  async function save() {
    setMsg("");
    if (!session || restricted || !userId) return;

    const payload: any = { userId };
    const n = name.trim();
    if (person && n.length >= 2 && n !== (person.name ?? "")) payload.name = n;
    if (pw.trim()) payload.password = pw.trim();

    if (payload.password && payload.password.length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Error.");
      setMsg("✅ Cambios guardados.");
      setPw("");
      await load();
    } catch (e) {
      setMsg(friendlyErr(e));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <LoadingCard text="Cargando sesión…" />;

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Editar perfil</Title>
            <Subtitle>Inicia sesión para ver esta página.</Subtitle>
            <div className="mt-4">
              <Button onClick={() => (window.location.href = "/")}>Ir a inicio</Button>
            </div>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (loading) return <LoadingCard text="Cargando perfil…" />;

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

              <Title>Editar perfil</Title>
              <Subtitle>Admin · Puedes cambiar el nombre o resetear la contraseña.</Subtitle>

              {restricted && (
                <div className="text-red-300 text-sm mt-2 inline-flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Acceso restringido.
                </div>
              )}
              {msg && <div className="text-amber-200 text-sm mt-2">{msg}</div>}
              {person && !restricted && (
                <div className="text-sm text-white/70 mt-1">
                  {person.name} · {person.role === "admin" ? "Admin" : person.role === "leader" ? "Líder" : "Joven"}
                </div>
              )}
            </div>
          </div>

          {!restricted && person && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <User2 size={16} className="opacity-80" />
                  <div className="text-sm font-semibold">Nombre</div>
                </div>
                <div className="text-xs text-white/60 mb-1">Nombre visible</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound size={16} className="opacity-80" />
                  <div className="text-sm font-semibold">Reset de contraseña</div>
                </div>
                <div className="text-xs text-white/60 mb-1">Nueva contraseña (mínimo 6 caracteres)</div>
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña" />
                <div className="text-xs text-white/50 mt-2">
                  Esto cambia la contraseña del usuario seleccionado. El usuario podrá iniciar sesión con la nueva contraseña.
                </div>
              </Card>

              <div className="md:col-span-2">
                <Button disabled={!canSave || saving} onClick={save}>
                  <Save size={16} className="mr-2" />
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageFade>
    </Container>
  );
}
