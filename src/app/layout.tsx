import "./globals.css";
import AppShell from "@/components/AppShell";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "Ministerio Águilas",
  description: "Casa de Dios Cruzada Cristiana — Reporte de lectura bíblica y oración",
};

import { AuthProvider } from "@/lib/auth";
import OAuthUrlCleaner from "./OAuthUrlCleaner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <OAuthUrlCleaner />
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}


