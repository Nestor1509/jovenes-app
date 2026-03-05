"use client";

import { AuthProvider } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthProvider>
      <div className="min-h-dvh">
        <NavBar />

        {/* overflow-x-hidden: evita scroll horizontal por efectos/blur */}
        <div className="relative overflow-x-hidden">
          {/* Background glows */}
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>

          {/* Animación de transición entre páginas */}
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              /**
               * 🔑 Mobile-first:
               * - antes: py-6 (hacía que se sintiera “bajado” y raro con el sticky)
               * - ahora: pt-4 pb-10 (respira, no se superpone, no se ve “centrado raro”)
               * - en sm+: mantenemos el look original
               */
              className="relative w-full pt-4 pb-10 sm:py-8"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </AuthProvider>
  );
}
