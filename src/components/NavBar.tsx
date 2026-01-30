"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Badge, Button } from "@/components/ui";
import { LogOut, BarChart3, ClipboardList, Users, Shield, Home, Globe } from "lucide-react";
import { motion } from "framer-motion";

function roleLabel(role?: string) {
  if (!role) return "";
  if (role === "admin") return "Admin";
  if (role === "leader") return "Líder";
  return "Joven";
}

type NavItem = { href: string; label: string; icon: any; show: (role?: string, hasSession?: boolean) => boolean };

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function lockKey(dateISO: string) {
  return `report_lock_${dateISO}`;
}

export default function NavBar() {
  const { loading, session, profile, error } = useMyProfile();
  const pathname = usePathname();
  const router = useRouter();

  const [hideReport, setHideReport] = useState(false);

  useEffect(() => {
    const update = () => {
      try {
        setHideReport(localStorage.getItem(lockKey(todayISO())) === "1");
      } catch {
        setHideReport(false);
      }
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  async function salir() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const role = profile?.role;

  const userLine = useMemo(() => {
    if (loading) return "Cargando…";
    if (error && !session) return error;
    if (!session) return "Sin sesión";
    return `${profile?.name ?? "Usuario"} — ${roleLabel(role)}`;
  }, [loading, session, profile?.name, role]);

  const items: NavItem[] = [
    { href: "/", label: "Inicio", icon: Home, show: () => true },
    { href: "/publico", label: "Público", icon: Globe, show: () => true },
    { href: "/reporte", label: "Reporte", icon: ClipboardList, show: (_r, has) => !!has && !hideReport },
    { href: "/mis-estadisticas", label: "Mis estadísticas", icon: BarChart3, show: (_r, has) => !!has },
    { href: "/lider", label: "Líder", icon: Users, show: (r, has) => !!has && (r === "leader" || r === "admin") },
    { href: "/admin", label: "Admin", icon: Shield, show: (r, has) => !!has && r === "admin" },
    { href: "/admin/general", label: "Todas", icon: BarChart3, show: (r, has) => !!has && r === "admin" },
  ];

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <Container className="flex items-center justify-between py-3">
        <Link href="/" className="group flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl glass grid place-items-center shadow-soft text-sm font-semibold">MA</div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Ministerio Águilas</div>
            <div className="text-xs text-white/60">Casa de Dios Cruzada Cristiana</div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {items
            .filter((it) => it.show(role, !!session))
            .map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition border",
                    active ? "bg-white/10 border-white/15" : "bg-white/5 border-white/10 hover:bg-white/10",
                  ].join(" ")}
                  prefetch
                >
                  <Icon size={16} className={active ? "opacity-100" : "opacity-80"} />
                  <span>{it.label}</span>
                </Link>
              );
            })}

          {!!session && (
            <button
              onClick={salir}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition"
              title="Cerrar sesión"
            >
              <LogOut size={16} className="opacity-80" />
              <span>Salir</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/publico" className="btn-ghost inline-flex items-center gap-2">
            <Globe size={16} /> Público
          </Link>
          {!!session ? (
            <Button variant="ghost" onClick={salir} className="px-3">
              <LogOut size={16} />
            </Button>
          ) : null}
        </div>
      </Container>

      <Container className="pb-2">
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="flex items-center justify-between">
            <Badge className="gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              {userLine}
            </Badge>
            <div className="text-xs text-white/50 hidden md:block">
              {loading ? "Verificando sesión…" : session ? "Sesión activa" : "Sin sesión"}
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
