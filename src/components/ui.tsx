"use client";

import React, { ComponentPropsWithoutRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: DivProps) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4", className)} {...props} />;
}

export function PageFade({ className, ...props }: ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "glass rounded-2xl p-5 shadow-glow transition will-change-transform hover:bg-white/[0.07] hover:border-white/15",
        className
      )}
      {...props}
    />
  );
}

export function Title({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />;
}

export function Subtitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-white/70", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-white/80",
        className
      )}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

type ButtonProps = ComponentPropsWithoutRef<typeof motion.button> & {
  /**
   * Visual style of the button (not related to framer-motion `variants`).
   */
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.09]",
    ghost:
      "border-transparent bg-transparent text-white/90 hover:bg-white/[0.06]",
    danger:
      "border-red-500/30 bg-red-500/15 text-red-100 hover:bg-red-500/25",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/20 focus:bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: DivProps) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-white/[0.06]", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center", className)}>
      {icon ? <div className="mx-auto mb-3 flex justify-center">{icon}</div> : null}
      {title ? <div className="text-base font-semibold">{title}</div> : null}
      {description ? <div className="mt-1 text-sm text-white/60">{description}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}


export function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
        className
      )}
    >
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
