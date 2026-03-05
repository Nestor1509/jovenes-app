"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Container, Badge, Button } from "@/components/ui";
import {
  LogOut,
  BarChart3,
  ClipboardList,
  Users,
  Shield,
  Home,
  Menu,
  X,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function roleLabel(role?: string) {
  if (!role) return "";
  if (role === "admin") return "Admin";
  if (role === "leader") return "Líder";
  return "Joven";
}

type NavItem = {
  href: string;
  label: string;
  icon: any;
  show: (role?: string, hasSession?: boolean) => boolean;
};

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
  const { loading, session, profile, error, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [hideReport, setHideReport] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    window.addEventListener("report_lock_changed", update as any);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("report_lock_changed", update as any);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    if (mobileOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [mobileOpen]);

  async function salir() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  const role = profile?.role;
  const hasSession = !!session?.user?.id;

  const userLine = useMemo(() => {
    if (!hasSession) {
      if (loading) return "Verificando…";
      if (error) return error;
      return "Sin sesión";
    }

    const name = profile?.name?.trim() ? profile.name : "Usuario";
    const r = roleLabel(role) || (profile ? "" : "Cargando…");
    return r ? `${name} — ${r}` : name;
  }, [hasSession, loading, error, profile?.name, role, profile]);

  const items: NavItem[] = [
    { href: "/", label: "Inicio", icon: Home, show: () => true },
    { href: "/reporte", label: "Reporte", icon: ClipboardList, show: (_r, has) => !!has && !hideReport },
    { href: "/mis-estadisticas", label: "Mis estadísticas", icon: BarChart3, show: (_r, has) => !!has },
    { href: "/ranking", label: "Ranking", icon: Trophy, show: (_r, has) => !!has },
    { href: "/lider", label: "Líder", icon: Users, show: (r, has) => !!has && r === "leader" },
    { href: "/admin", label: "Admin", icon: Shield, show: (r, has) => !!has && r === "admin" },
    { href: "/admin/general", label: "Todas", icon: BarChart3, show: (r, has) => !!has && r === "leader" },
  ];

  const visibleItems = items.filter((it) => it.show(role, hasSession));

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 md:supports-[backdrop-filter]:bg-zinc-950/70 md:supports-[backdrop-filter]:backdrop-blur">
      {/* ✅ overflow-x-hidden aquí evita el “corte” del layout en móvil */}
      <Container className="flex items-center justify-between py-3 overflow-x-hidden">
        <Link href="/" className="group flex items-center gap-3 select-none min-w-0" prefetch>
          <div className="h-10 w-10 rounded-2xl glass grid place-items-center shadow-soft text-sm font-semibold shrink-0">
            MA
          </div>

          {/* ✅ min-w-0 + truncate real */}
          <div className="leading-tight min-w-0">
            <div className="font-semibold tracking-tight truncate">Ministerio Águilas</div>
            <div className="text-xs text-white/60 truncate">Casa de Dios Cruzada Cristiana</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {visibleItems.map((it) => {
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

          {hasSession && (
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

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <Button
            variant="ghost"
            onClick={() => setMobileOpen(true)}
            className="px-3"
            aria-label="Abrir menú"
            title="Menú"
          >
            <Menu size={18} />
          </Button>
        </div>
      </Container>

      {/* ✅ también overflow-x-hidden aquí */}
      <Container className="pb-2 overflow-x-hidden">
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Badge className="gap-2 min-w-0 max-w-full">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80 shrink-0" />
              <span className="truncate min-w-0">{userLine}</span>
            </Badge>
            <div className="text-xs text-white/50 hidden md:block shrink-0">
              {loading && !hasSession ? "Verificando sesión…" : hasSession ? "Sesión activa" : "Sin sesión"}
            </div>
          </div>
        </motion.div>
      </Container>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              key="overlay"
              aria-label="Cerrar menú"
              className="fixed inset-0 z-[60] bg-black/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="fixed right-0 top-0 z-[70] h-full w-[88vw] max-w-sm border-l border-white/10 bg-zinc-950 overflow-x-hidden"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                <div className="text-sm font-semibold">Menú</div>
                <Button variant="ghost" onClick={() => setMobileOpen(false)} className="px-3" aria-label="Cerrar">
                  <X size={18} />
                </Button>
              </div>

              <div className="p-3">
                <div className="grid gap-2">
                  {visibleItems.map((it) => {
                    const active = pathname === it.href || pathname.startsWith(it.href + "/");
                    const Icon = it.icon;
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        prefetch
                        className={[
                          "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border transition min-w-0",
                          active
                            ? "bg-zinc-800/70 border-white/15"
                            : "bg-zinc-900/60 border-white/10 hover:bg-zinc-800/60",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center shrink-0">
                            <Icon size={18} className={active ? "opacity-100" : "opacity-85"} />
                          </span>
                          <span className="font-medium truncate min-w-0">{it.label}</span>
                        </span>
                        <ChevronRight size={18} className="opacity-60 shrink-0" />
                      </Link>
                    );
                  })}

                  {hasSession && (
                    <button
                      onClick={salir}
                      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border border-white/10 bg-zinc-900/60 hover:bg-zinc-800/60 transition min-w-0"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center shrink-0">
                          <LogOut size={18} className="opacity-85" />
                        </span>
                        <span className="font-medium truncate min-w-0">Cerrar sesión</span>
                      </span>
                      <ChevronRight size={18} className="opacity-60 shrink-0" />
                    </button>
                  )}
                </div>

                <div className="mt-4 text-xs text-white/50">
                  {loading && !hasSession ? "Verificando sesión…" : hasSession ? "Sesión activa" : "Sin sesión"}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
