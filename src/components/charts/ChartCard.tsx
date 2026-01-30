"use client";

import { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"rounded-3xl border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl " + className}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h3 className="text-base font-semibold text-white/90">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/55">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="px-4 pb-5 pt-3">
        <div className="h-[260px] min-h-[260px] w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
