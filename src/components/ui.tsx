"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";

import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement>;
type PageFadeProps = HTMLMotionProps<"div">;

export function Container({ className, ...props }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4", className)} {...props} />
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
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "glass rounded-2xl p-5 shadow-glow transition will-change-transform hover:bg-white/[0.07] hover:border-white/15",
        className
      )}
      {...safeProps}
    >
      {children}
    </motion.div>
  );
}


export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/70 leading-relaxed">{children}</p>;
}

type BtnVariant = "primary" | "ghost" | "subtle";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles: Record<BtnVariant, string> = {
    primary: "btn-primary text-zinc-950",
    ghost: "btn-ghost text-white",
    subtle: "rounded-xl px-4 py-2 text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10",
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
  return <input className={cn("input", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("input pr-8", className)}
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
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}


export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-soft">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80", className)}>{children}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/10", className)} />;
}
