import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Ministerio Águilas",
  description: "Casa de Dios Cruzada Cristiana — Reporte de lectura bíblica y oración",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
