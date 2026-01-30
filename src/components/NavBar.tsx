"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useMyProfile } from "@/lib/useMyProfile";
import { Container, Badge, Button } from "@/components/ui";
import { LogOut, BarChart3, ClipboardList, Users, Shield, Home, Globe, Menu, X } from "lucide-react";
import { motion } from "framer-motion";

function roleLabel(role?: string) {
  if (!role) return "";
  if (role === "admin") return "Admin";
  if (role === "leader") return "Líder";
  return "Joven";
}

type NavItem = { href: string; label: string; icon: any; show: (role?: string, hasSession?: boolean) => boolean };

export default function NavBar() {
  const { loading, session, profile } = useMyProfile();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function salir() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const role = profile?.role;

  const userLine = useMemo(() => {
    if (loading) return "Cargando…";
    if (!session) return "Sin sesión";
    return `${profile?.name ?? "Usuario"} — ${roleLabel(role)}`;
  }, [loading, session, profile?.name, role]);

  const items: NavItem[] = [
    { href: "/", label: "Inicio", icon: Home, show: () => true },
    { href: "/publico", label: "Público", icon: Globe, show: () => true },
    { href: "/reporte", label: "Reporte", icon: ClipboardList, show: (_r, has) => !!has },
    { href: "/mis-estadisticas", label: "Mis estadísticas", icon: BarChart3, show: (_r, has) => !!has },
    { href: "/lider", label: "Líder", icon: Users, show: (r, has) => !!has && (r === "leader" || r === "admin") },
    { href: "/admin", label: "Admin", icon: Shield, show: (r, has) => !!has && r === "admin" },
    { href: "/admin/general", label: "Todas", icon: BarChart3, show: (r, has) => !!has && r === "admin" },
  ];

  const visibleItems = items.filter((it) => it.show(role, !!session));

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <Container className="flex items-center justify-between py-2 sm:py-3">
        <Link href="/" className="group flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl glass grid place-items-center shadow-soft text-sm font-semibold shrink-0">MA</div>
          <div className="leading-tight min-w-0">
            <div className="font-semibold tracking-tight truncate">Ministerio Águilas</div>
            <div className="text-xs text-white/60 hidden sm:block truncate">Casa de Dios Cruzada Cristiana</div>
          </div>
        </Link>

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

        <div className="flex items-center gap-1.5 md:hidden">
          <Button
            variant="ghost"
            className="h-10 w-10 px-0"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </Container>

      {/* Línea de sesión (solo escritorio para no ocupar altura en móvil) */}
      <Container className="pb-2 hidden md:block">
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

      {/* Menú móvil */}
      {mobileOpen ? (
        <div className="md:hidden border-t border-white/10 bg-zinc-950/70 backdrop-blur">
          <Container className="py-3">
            <div className="flex flex-col gap-2">
              <Badge className="gap-2 w-fit">
                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                {userLine}
              </Badge>

              <div className="mt-2 grid gap-2">
                {visibleItems.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + "/");
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-base border transition",
                        active ? "bg-white/10 border-white/15" : "bg-white/5 border-white/10 hover:bg-white/10",
                      ].join(" ")}
                    >
                      <Icon size={18} className={active ? "opacity-100" : "opacity-80"} />
                      <span className="font-medium">{it.label}</span>
                    </Link>
                  );
                })}
              </div>

              {!!session ? (
                <Button
                  variant="subtle"
                  className="mt-2 h-11 justify-start rounded-2xl"
                  onClick={() => {
                    setMobileOpen(false);
                    salir();
                  }}
                >
                  <LogOut size={18} className="opacity-80" />
                  Cerrar sesión
                </Button>
              ) : null}
            </div>
          </Container>
        </div>
      ) : null}
    </div>
  );
}
