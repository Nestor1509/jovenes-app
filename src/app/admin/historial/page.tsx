"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Card, Title, Subtitle, PageFade, Input, Select, Button, Skeleton, EmptyState } from "@/components/ui";
import LoadingCard from "@/components/LoadingCard";
import { ArrowLeft, RefreshCw, Shield, Search } from "lucide-react";

type LogRow = {
  id: number;
  created_at: string;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_name: string | null;
  details: any;
};

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const ACTIONS = [
  "",
  "CREATE_USER",
  "UPDATE_USER_PROFILE",
  "RESET_PASSWORD",
  "DELETE_USER",
  "CREATE_GROUP",
  "UPDATE_GROUP",
  "DELETE_GROUP",
] as const;

export default function AdminHistorialPage() {
  const { loading: authLoading, session, profile } = useMyProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(0);
  const pageSize = 50;

  async function load() {
    setError("");
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) {
        setRows([]);
        setCount(0);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        from,
        to,
        q: q.trim(),
        action,
        limit: String(pageSize),
        offset: String(page * pageSize),
      });

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar el historial.");

      setRows((data?.rows ?? []) as LogRow[]);
      setCount(Number(data?.count ?? 0));
    } catch (e: any) {
      setError(String(e?.message || "Error"));
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    if (!profile || profile.role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.access_token, profile?.role, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count]);

  if (authLoading) return <LoadingCard text="Cargando sesión…" />;

  if (!session) {
    return (
      <Container>
        <PageFade>
          <Card>
            <Title>Inicia sesión</Title>
            <Subtitle>Necesitas iniciar sesión para ver esta página.</Subtitle>
          </Card>
        </PageFade>
      </Container>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <Container>
        <PageFade>
          <Card className="border-red-500/20 bg-red-500/10">
            <Title>Acceso restringido</Title>
            <Subtitle>Esta página es solo para administradores.</Subtitle>
          </Card>
        </PageFade>
      </Container>
    );
  }

  return (
    <Container>
      <PageFade>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <Link href="/admin" className="text-white/70 hover:text-white inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Volver
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <Shield size={18} className="opacity-80" />
              <Title>Historial (auditoría)</Title>
            </div>
            <Subtitle>Solo Admin. Registro de acciones sensibles.</Subtitle>
          </div>

          <Button onClick={load} className="inline-flex items-center gap-2">
            <RefreshCw size={16} /> Recargar
          </Button>
        </div>

        <Card className="mb-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs text-white/60 mb-1">Buscar</div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <Input className="pl-9" placeholder="Admin / acción / objetivo…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="text-xs text-white/60 mb-1">Acción</div>
              <Select value={action} onChange={(e) => setAction(e.target.value)}>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{a ? a : "Todas"}</option>
                ))}
              </Select>
            </div>

            <div>
              <div className="text-xs text-white/60 mb-1">Desde</div>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            <div>
              <div className="text-xs text-white/60 mb-1">Hasta</div>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={() => {
                setPage(0);
                load();
              }}
            >
              Aplicar filtros
            </Button>
            <div className="text-xs text-white/60">{count} eventos</div>
          </div>
        </Card>

        {error && (
          <Card className="border-red-500/20 bg-red-500/10 mb-6">
            <div className="text-sm text-red-200">{error}</div>
          </Card>
        )}

        {loading ? (
          <Card>
            <div className="grid gap-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState title="Sin eventos" description="No hay acciones registradas con esos filtros." />
        ) : (
          <Card>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-3">Fecha</th>
                    <th className="text-left py-3 pr-3">Admin</th>
                    <th className="text-left py-3 pr-3">Acción</th>
                    <th className="text-left py-3 pr-3">Objetivo</th>
                    <th className="text-left py-3 pr-3">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-3 whitespace-nowrap text-white/80">{fmtDateTime(r.created_at)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{r.actor_name ?? "—"}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs">{r.action}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="text-white/90">{r.target_name ?? "—"}</div>
                        <div className="text-xs text-white/60">{r.target_type ?? ""}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <pre className="text-xs text-white/60 whitespace-pre-wrap break-words max-w-[520px]">
                          {r.details ? JSON.stringify(r.details, null, 2) : ""}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/60">Página {page + 1} de {totalPages}</div>
              <div className="flex items-center gap-2">
                <Button disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
                <Button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            </div>
          </Card>
        )}
      </PageFade>
    </Container>
  );
}
