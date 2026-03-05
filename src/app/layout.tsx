import "./globals.css";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/lib/auth";
import OAuthUrlCleaner from "./OAuthUrlCleaner";
import AuthKeepAlive from "./AuthKeepAlive";

export const metadata = {
  title: "Ministerio Águilas",
  description: "Casa de Dios Cruzada Cristiana — Reporte de lectura bíblica y oración",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <OAuthUrlCleaner />
          <AuthKeepAlive />
          <div className="app-shell">
            <NavBar />
            <main className="app-main">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
