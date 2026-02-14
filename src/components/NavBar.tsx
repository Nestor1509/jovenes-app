"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Badge, Button } from "@/components/ui";
import {
  LogOut,
  BarChart3,
  ClipboardList,
  Users,
  Shield,
  Home,
  Globe,
  Menu,
  X,
  ChevronRight,
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
  const { loading, session, profile, error } = useMyProfile();
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

  // Cierra el menú móvil cuando cambias de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Evita scroll del contenido de fondo cuando el drawer está abierto
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
  }, [loading, session, profile?.name, role, error]);

  const items: NavItem[] = [
    { href: "/", label: "Inicio", icon: Home, show: () => true },
    { href: "/publico", label: "Público", icon: Globe, show: () => true },
    { href: "/reporte", label: "Reporte", icon: ClipboardList, show: (_r, has) => !!has && !hideReport },
    { href: "/mis-estadisticas", label: "Mis estadísticas", icon: BarChart3, show: (_r, has) => !!has },
    { href: "/perfil", label: "Perfil", icon: Users, show: (_r, has) => !!has },
    { href: "/lider", label: "Líder", icon: Users, show: (r, has) => !!has && (r === "leader" || r === "admin") },
    { href: "/admin", label: "Admin", icon: Shield, show: (r, has) => !!has && r === "admin" },
    { href: "/admin/general", label: "Todas", icon: BarChart3, show: (r, has) => !!has && r === "admin" },
  ];

  const visibleItems = items.filter((it) => it.show(role, !!session));

  return (
    // En móviles algunos navegadores no aplican bien backdrop-filter y se ve "fantasma".
    // Damos un fondo más sólido como fallback y solo bajamos la opacidad cuando hay soporte.
    <div className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 md:supports-[backdrop-filter]:bg-zinc-950/70 md:supports-[backdrop-filter]:backdrop-blur">
      <Container className="flex items-center justify-between py-3">
        <Link href="/" className="group flex items-center gap-3 select-none" prefetch>
          <div className="h-10 w-10 rounded-2xl glass grid place-items-center shadow-soft text-sm font-semibold">
            MA
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Ministerio Águilas</div>
            <div className="text-xs text-white/60">Casa de Dios Cruzada Cristiana</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
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

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
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

      <Container className="pb-2">
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="flex items-center justify-between gap-3">
            <Badge className="gap-2 truncate">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80 shrink-0" />
              <span className="truncate">{userLine}</span>
            </Badge>
            <div className="text-xs text-white/50 hidden md:block">
              {loading ? "Verificando sesión…" : session ? "Sesión activa" : "Sin sesión"}
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
              className="fixed right-0 top-0 z-[70] h-full w-[88vw] max-w-sm border-l border-white/10 bg-zinc-950"
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
                          "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border transition",
                          active
                            ? "bg-zinc-800/70 border-white/15"
                            : "bg-zinc-900/60 border-white/10 hover:bg-zinc-800/60",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-3">
                          <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
                            <Icon size={18} className={active ? "opacity-100" : "opacity-85"} />
                          </span>
                          <span className="font-medium">{it.label}</span>
                        </span>
                        <ChevronRight size={18} className="opacity-60" />
                      </Link>
                    );
                  })}

                  {!!session && (
                    <button
                      onClick={salir}
                      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border border-white/10 bg-zinc-900/60 hover:bg-zinc-800/60 transition"
                    >
                      <span className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
                          <LogOut size={18} className="opacity-85" />
                        </span>
                        <span className="font-medium">Cerrar sesión</span>
                      </span>
                      <ChevronRight size={18} className="opacity-60" />
                    </button>
                  )}
                </div>

                <div className="mt-4 text-xs text-white/50">
                  {loading ? "Verificando sesión…" : session ? "Sesión activa" : "Sin sesión"}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
