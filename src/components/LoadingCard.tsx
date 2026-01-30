"use client";

import { Container, Card } from "@/components/ui";

export default function LoadingCard({ text = "Cargando…" }: { text?: string }) {
  return (
    <Container>
      <Card className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <div className="text-sm text-white/70">{text}</div>
      </Card>
    </Container>
  );
}
