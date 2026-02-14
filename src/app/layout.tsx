import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Ministerio Águilas",
  description: "Casa de Dios Cruzada Cristiana — Reporte de lectura bíblica y oración",
};

import { AuthProvider } from "@/lib/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}


