"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Container, Card, Title, Subtitle, PageFade, Stat, Button } from "@/components/ui";

function formatearMinutos(min: number) {
  const t = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0;
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioSemanaISO(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inicioMesISO(dateISO: string) {
  return dateISO.slice(0, 7) + "-01";
}

type Totales = {
  total_bible_minutes: number;
  total_prayer_minutes: number;
  total_reports: number;
};

export default function MisEstadisticasPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [nombre, setNombre] = useState<string>("");
  const [rol, setRol] = useState<string>("");

  const [week, setWeek] = useState<Totales>({ total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 });
  const [month, setMonth] = useState<Totales>({ total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 });
  const [all, setAll] = useState<Totales>({ total_bible_minutes: 0, total_prayer_minutes: 0, total_reports: 0 });

  const today = useMemo(() => hoyISO(), []);
  const weekStart = useMemo(() => inicioSemanaISO(today), [today]);
  const monthStart = useMemo(() => inicioMesISO(today), [today]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const userId = sess.session.user.id;

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", userId)
        .single();

      if (pErr || !p) {
        setMsg("No se pudo cargar tu perfil.");
        setLoading(false);
        return;
      }

      setNombre(p.name);
      setRol(p.role);

      const sumar = (rows: any[]): Totales => {
        let b = 0, o = 0, c = 0;
        for (const r of rows) {
          b += Number(r.bible_minutes ?? 0);
          o += Number(r.prayer_minutes ?? 0);
          c += 1;
        }
        return { total_bible_minutes: b, total_prayer_minutes: o, total_reports: c };
      };

      const { data: wRows } = await supabase
        .from("reports")
        .select("bible_minutes, prayer_minutes, report_date")
        .eq("user_id", userId)
        .gte("report_date", weekStart)
        .lte("report_date", today);

      setWeek(sumar(wRows ?? []));

      const { data: mRows } = await supabase
        .from("reports")
        .select("bible_minutes, prayer_minutes, report_date")
        .eq("user_id", userId)
        .gte("report_date", monthStart)
        .lte("report_date", today);

      setMonth(sumar(mRows ?? []));

      const { data: aRows } = await supabase
        .from("reports")
        .select("bible_minutes, prayer_minutes")
        .eq("user_id", userId);

      setAll(sumar(aRows ?? []));

      setLoading(false);
    })();
  }, [today, weekStart, monthStart]);

  const rolBonito = rol === "admin" ? "Admin" : rol === "leader" ? "Líder" : "Joven";

  return (
    <Container>
      <PageFade>
        <div className="grid gap-6">
          <div>
            <Title>Mis estadísticas</Title>
            <Subtitle>
              {nombre ? `${nombre} — ${rolBonito}` : "Cargando…"}
            </Subtitle>
          </div>

          {msg && <div className="text-red-300 text-sm">{msg}</div>}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="text-sm font-medium mb-1">Semana</div>
              <div className="text-xs text-white/60 mb-4">Desde {weekStart}</div>
              <div className="grid gap-2">
                <Stat label="Lectura" value={formatearMinutos(week.total_bible_minutes)} />
                <Stat label="Oración" value={formatearMinutos(week.total_prayer_minutes)} />
                <Stat label="Reportes" value={week.total_reports} />
              </div>
            </Card>

            <Card>
              <div className="text-sm font-medium mb-1">Mes</div>
              <div className="text-xs text-white/60 mb-4">Desde {monthStart}</div>
              <div className="grid gap-2">
                <Stat label="Lectura" value={formatearMinutos(month.total_bible_minutes)} />
                <Stat label="Oración" value={formatearMinutos(month.total_prayer_minutes)} />
                <Stat label="Reportes" value={month.total_reports} />
              </div>
            </Card>

            <Card>
              <div className="text-sm font-medium mb-1">Histórico</div>
              <div className="text-xs text-white/60 mb-4">Todo el tiempo</div>
              <div className="grid gap-2">
                <Stat label="Lectura" value={formatearMinutos(all.total_bible_minutes)} />
                <Stat label="Oración" value={formatearMinutos(all.total_prayer_minutes)} />
                <Stat label="Reportes" value={all.total_reports} />
              </div>
            </Card>
          
          {rol === "admin" && (
            <Card className="border-aguila-500/20 bg-aguila-500/10">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Mostrar todas las estadísticas</div>
                  <div className="text-sm text-white/70 mt-1">
                    Incluye también las estadísticas del <span className="text-white/90">admin</span> (vista general).
                  </div>
                </div>
                <Link href="/admin/general">
                  <Button variant="primary">Ver estadísticas generales</Button>
                </Link>
              </div>
            </Card>
          )}
</div>

          {loading && <div className="text-sm text-white/70">Cargando…</div>}
        </div>
      </PageFade>
    </Container>
  );
}
