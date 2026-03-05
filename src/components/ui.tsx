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
        // ✅ Container no debe “arreglar” overflow escondiendo cosas.
        // Lo correcto es evitar que los hijos empujen el ancho del viewport.
        "mx-auto w-full max-w-6xl max-w-full px-4 min-w-0",
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
  // Evita warnings por props no válidas en motion
  const { onDrag, onDragStart, onDragEnd, ...safeProps } = props as any;

  return (
    <motion.div
      // ✅ QUITADO: whileHover puede causar glitches en algunos móviles.
      // Si quieres hover “premium”, hazlo solo en desktop con Tailwind (md:hover:-translate-y-0.5).
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "glass rounded-2xl p-5 shadow-glow transition will-change-transform",
        "hover:bg-white/[0.07] hover:border-white/15",
        // ✅ evita que contenido/sombras internas fuercen ancho
        "min-w-0 max-w-full w-full",
        // ✅ evita que brillos/absolutos se salgan del card
        "overflow-hidden",
        // ✅ hover solo desktop (opcional). Si no lo quieres, bórralo.
        "md:hover:-translate-y-0.5",
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
        // ✅ textos largos no deben empujar el viewport
        "min-w-0 max-w-full break-words",
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
        "min-w-0 max-w-full break-words",
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
    // ✅ evita empujes en flex/grid
    "min-w-0 max-w-full";

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
  return <input className={cn("input min-w-0 max-w-full", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "input pr-8 transition-colors hover:border-white/20 focus:border-amber-400/40",
        "min-w-0 max-w-full",
        className
      )}
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
      className={cn("min-w-0 max-w-full", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-soft min-w-0 max-w-full overflow-hidden">
      <div className="text-xs text-white/60 truncate">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight truncate">{value}</div>
    </div>
  );
}

/**
 * ✅ Badge anti-overflow real:
 * - IMPORTANTE: para que `truncate` funcione, el padre debe permitir encogerse (`min-w-0`)
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
  return <div className={cn("animate-pulse rounded-2xl bg-white/10 min-w-0 max-w-full", className)} />;
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
      <div className="space-y-2 min-w-0 max-w-full">
        <Title className="text-lg">{title}</Title>
        <Subtitle>{description}</Subtitle>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
