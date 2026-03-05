"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";
import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement>;
type PageFadeProps = HTMLMotionProps<"div">;

export function Container({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        // ✅ clave para evitar el “corte” a la derecha en móvil:
        // - overflow-x-hidden: corta cualquier 1px/2px que se salga por fonts, transforms, etc.
        // - min-w-0: permite truncar hijos en flex/grid sin empujar ancho
        "mx-auto w-full max-w-6xl px-4 overflow-x-hidden min-w-0",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string; children: React.ReactNode }) {
  const { onDrag, onDragStart, onDragEnd, ...safeProps } = props as any;

  return (
    <motion.div
      // Hover no existe en móvil, pero no hace daño en desktop.
      // ✅ Evitamos que una micro-traslación cause overflow visual:
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        // ✅ overflow-hidden evita que brillos/gradientes internos se “salgan”
        "glass rounded-2xl p-5 shadow-glow transition will-change-transform overflow-hidden",
        "hover:bg-white/[0.07] hover:border-white/15",
        // ✅ min-w-0 ayuda a truncar contenido interno en layouts flex
        "min-w-0",
        className
      )}
      {...safeProps}
    >
      {children}
    </motion.div>
  );
}

export function Title({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-2xl font-semibold tracking-tight",
        // ✅ protege de textos largos en móvil
        "min-w-0 break-words",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function Subtitle({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm text-white/70 leading-relaxed",
        // ✅ protege de textos largos en móvil
        "min-w-0 break-words",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

type BtnVariant = "primary" | "ghost" | "subtle";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold outline-none " +
    "transition focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-0 " +
    "disabled:opacity-60 disabled:cursor-not-allowed " +
    // ✅ evita empujar layout por contenido raro
    "min-w-0";

  const styles: Record<BtnVariant, string> = {
    primary: "btn-primary text-zinc-950",
    ghost: "btn-ghost text-white",
    subtle:
      "bg-white/5 border border-white/10 hover:bg-white/10 " +
      "focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-0",
  };

  const { onDrag, onDragStart, onDragEnd, ...safeProps } = props as any;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(base, styles[variant], "active:translate-y-[0.5px]", className)}
      {...safeProps}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input min-w-0", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("input pr-8 transition-colors hover:border-white/20 focus:border-amber-400/40 min-w-0", className)}
      {...props}
    />
  );
}

export function PageFade({ className, children, ...props }: PageFadeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      // ✅ por si PageFade envuelve grids/flex
      className={cn("min-w-0", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-soft min-w-0 overflow-hidden">
      <div className="text-xs text-white/60 truncate">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight truncate">{value}</div>
    </div>
  );
}

/**
 * ✅ Badge anti-overflow:
 * - No empuja el layout
 * - Trunca contenido si hace falta
 */
export function Badge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80",
        "min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/10", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-white/10", className)} />;
}

export function EmptyState({
  title = "Sin datos",
  description = "Aún no hay información para mostrar.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="space-y-2 min-w-0">
        <Title className="text-lg">{title}</Title>
        <Subtitle>{description}</Subtitle>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
