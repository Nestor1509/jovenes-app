import "./globals.css";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/lib/auth";
import OAuthUrlCleaner from "./OAuthUrlCleaner";
import AuthKeepAlive from "./AuthKeepAlive";

export const metadata = {
  title: "Ministerio Águilas",
  description: "Casa de Dios Cruzada Cristiana — Reporte de lectura bíblica y oración",
};

// ✅ CLAVE para móvil (evita zoom raro + ancho incorrecto)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full w-full overflow-x-hidden">
      <body className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white antialiased">
        <AuthProvider>
          <OAuthUrlCleaner />
          <AuthKeepAlive />

          {/* ✅ evita que algo con position/blur “se salga” */}
          <div className="min-h-screen w-full overflow-x-hidden">
            <NavBar />
            <main className="w-full overflow-x-hidden">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
