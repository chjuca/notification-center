import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";

export const metadata: Metadata = {
  title: "Notification Center",
  description: "Gestión de notificaciones por email, SMS y push",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        <main className="container py-4">
          <p className="h4 mb-4">Notification Center</p>
          {children}
        </main>
      </body>
    </html>
  );
}
